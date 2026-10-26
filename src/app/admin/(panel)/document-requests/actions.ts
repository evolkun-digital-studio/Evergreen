"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { CompanyDocument, DocumentAccessRequest, type DocumentAccessRequestDoc } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { createRawToken, hashToken } from "@/lib/auth/tokens";
import { runAction, UserFacingError } from "@/lib/actions";
import { EXPIRY_DAYS, evaluateGrant, type GrantScope } from "@/lib/documents/grant";
import {
  approvalEmail,
  approvalLink,
  rejectionEmail,
  revocationEmail,
  sendToRequester,
} from "@/lib/documents/request-emails";
import { logServerError } from "@/lib/log";

const idSchema = z.string().refine((value) => mongoose.isValidObjectId(value), "Invalid request");

const approveSchema = z.object({
  scope: z.enum(["all", "selected"]),
  documentIds: z.array(idSchema).max(200).default([]),
  expiryDays: z.union(EXPIRY_DAYS.map((d) => z.literal(d)) as [z.ZodLiteral<1>, z.ZodLiteral<7>, z.ZodLiteral<30>, z.ZodLiteral<90>]),
});

/** What happened to the approval email. When it was not sent, `link` lets the admin pass it on by hand. */
export type Delivery = { emailed: boolean; link: string };

async function loadRequest(id: string) {
  await connectDB();
  const request = await DocumentAccessRequest.findById(idSchema.parse(id));
  if (!request) throw new UserFacingError("This request no longer exists.");
  return request;
}

const stateOf = (r: DocumentAccessRequestDoc) =>
  evaluateGrant({
    status: r.status,
    grant: r.grant ? { scope: r.grant.scope as GrantScope, documentIds: r.grant.documentIds.map(String), expiresAt: r.grant.expiresAt } : null,
  });

const scopeLabel = (scope: GrantScope, count: number) =>
  scope === "all" ? "the whole document library" : `${count} selected document${count === 1 ? "" : "s"}`;

/** Emails the approval link; a mail failure never undoes the decision, the admin gets the link instead. */
async function deliverApproval(request: DocumentAccessRequestDoc & { _id: mongoose.Types.ObjectId }, rawToken: string): Promise<Delivery> {
  const link = approvalLink(request._id.toString(), rawToken);
  const grant = request.grant;
  let emailed = false;
  if (grant) {
    try {
      const result = await sendToRequester(
        request.email,
        approvalEmail({ name: request.name, link, expiresAt: grant.expiresAt, scopeLabel: scopeLabel(grant.scope as GrantScope, grant.documentIds.length) }),
      );
      emailed = result === "sent";
    } catch (error) {
      logServerError("[document request approval email]", error);
    }
  }
  if (emailed) await DocumentAccessRequest.updateOne({ _id: request._id }, { $set: { "grant.lastEmailedAt": new Date() } });
  else if (process.env.NODE_ENV !== "production") console.log(`[document access link] ${request.email} ${link}`);
  return { emailed, link };
}

export async function approveRequestAction(id: string, input: unknown) {
  return runAction(async () => {
    const user = await requireActionUser("manageDocuments");
    const data = approveSchema.parse(input);
    const request = await loadRequest(id);
    if (stateOf(request) === "valid") throw new UserFacingError("This request is already approved. Revoke it first to change what is shared.");

    let documentIds: string[] = [];
    if (data.scope === "selected") {
      const found = await CompanyDocument.find({ _id: { $in: data.documentIds } }, { _id: 1 }).lean();
      documentIds = found.map((d) => d._id.toString());
      if (!documentIds.length) throw new UserFacingError("Choose at least one document, or share the whole library.");
    }

    const rawToken = createRawToken();
    const now = new Date();
    request.status = "approved";
    request.grant = {
      scope: data.scope,
      documentIds: documentIds.map((d) => new mongoose.Types.ObjectId(d)),
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(now.getTime() + data.expiryDays * 24 * 60 * 60 * 1000),
      approvedBy: new mongoose.Types.ObjectId(user.id),
      approvedAt: now,
      lastEmailedAt: null,
    };
    request.decidedBy = new mongoose.Types.ObjectId(user.id);
    request.decidedAt = now;
    request.decisionNote = "";
    await request.save();

    const delivery = await deliverApproval(request, rawToken);
    revalidatePath("/admin/document-requests");
    return delivery;
  });
}

export async function rejectRequestAction(id: string, note: string) {
  return runAction(async () => {
    const user = await requireActionUser("manageDocuments");
    const text = z.string().trim().max(500).parse(note);
    const request = await loadRequest(id);
    if (request.status !== "pending") throw new UserFacingError("Only pending requests can be rejected.");
    request.status = "rejected";
    request.decisionNote = text;
    request.decidedBy = new mongoose.Types.ObjectId(user.id);
    request.decidedAt = new Date();
    await request.save();
    await sendToRequester(request.email, rejectionEmail({ name: request.name, note: text })).catch((error) =>
      logServerError("[document request rejection email]", error),
    );
    revalidatePath("/admin/document-requests");
  }, "Request rejected");
}

export async function revokeRequestAction(id: string) {
  return runAction(async () => {
    const user = await requireActionUser("manageDocuments");
    const request = await loadRequest(id);
    if (request.status !== "approved") throw new UserFacingError("Only approved requests can be revoked.");
    request.status = "revoked";
    request.decidedBy = new mongoose.Types.ObjectId(user.id);
    request.decidedAt = new Date();
    await request.save();
    await sendToRequester(request.email, revocationEmail({ name: request.name })).catch((error) =>
      logServerError("[document request revocation email]", error),
    );
    revalidatePath("/admin/document-requests");
  }, "Access revoked");
}

/** Issues a fresh token (the raw one is never stored) and emails it; the previous link stops working. */
export async function resendRequestAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageDocuments");
    const request = await loadRequest(id);
    if (stateOf(request) !== "valid" || !request.grant) throw new UserFacingError("Only active approvals can be re-sent. Approve the request again.");
    const rawToken = createRawToken();
    request.grant.tokenHash = hashToken(rawToken);
    await request.save();
    const delivery = await deliverApproval(request, rawToken);
    revalidatePath("/admin/document-requests");
    return delivery;
  });
}
