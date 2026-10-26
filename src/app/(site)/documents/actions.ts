"use server";

import mongoose from "mongoose";
import { headers } from "next/headers";
import { connectDB, isDbConfigured } from "@/lib/db";
import { CompanyDocument, DocumentAccessRequest } from "@/lib/models";
import { hitRateLimit } from "@/lib/rate-limit";
import { REQUEST_LIMITS } from "@/lib/documents/request-limits";
import { documentRequestSchema, type DocumentRequestInput } from "@/lib/validation/document-request";
import { adminAlertEmail, notifyAdmins, receiptEmail, sendToRequester } from "@/lib/documents/request-emails";
import { site } from "@/config/site";
import { logServerError } from "@/lib/log";

export type DocumentRequestResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitDocumentRequest(input: DocumentRequestInput): Promise<DocumentRequestResult> {
  const parsed = documentRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  // Bots fill the hidden field; accept silently so they learn nothing.
  if (data.website) return { ok: true };

  if (!isDbConfigured()) {
    return { ok: false, error: `The form is not connected yet. Please call or WhatsApp us on ${site.phone}.` };
  }

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    await connectDB();
    const [byIp, byEmail] = await Promise.all([
      hitRateLimit(`docreq:ip:${ip}`, REQUEST_LIMITS.perIp.max, REQUEST_LIMITS.perIp.windowSeconds),
      hitRateLimit(`docreq:email:${data.email}`, REQUEST_LIMITS.perEmail.max, REQUEST_LIMITS.perEmail.windowSeconds),
    ]);
    if (!byIp.ok || !byEmail.ok) {
      return { ok: false, error: `You have sent several requests recently. Please try again in a while, or call us on ${site.phone}.` };
    }

    // Keep only documents that exist and are active. Ticking none means the admin decides what to share,
    // guided by the types and the note the visitor gave (or the whole library if they gave neither).
    const wanted = [...new Set(data.documentIds.filter((id) => mongoose.isValidObjectId(id)))];
    const existing = wanted.length ? await CompanyDocument.find({ _id: { $in: wanted }, active: true }, { _id: 1 }).lean() : [];
    const documentIds = existing.map((d) => d._id);
    const scope = documentIds.length ? "selected" : "all";

    await DocumentAccessRequest.create({
      name: data.name,
      email: data.email,
      company: data.company,
      purpose: data.purpose,
      requested: { scope, documentIds, categories: data.categories, details: data.details },
      ip,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? "",
    });

    const scopeLabel =
      scope === "selected"
        ? `${documentIds.length} selected document${documentIds.length === 1 ? "" : "s"}`
        : data.categories.length || data.details
          ? "no specific files (see types and note)"
          : "the whole library";
    await Promise.all([
      sendToRequester(data.email, receiptEmail({ name: data.name })).catch((error) => logServerError("[document request receipt]", error)),
      notifyAdmins(
        adminAlertEmail({
          name: data.name,
          email: data.email,
          company: data.company,
          purpose: data.purpose,
          scopeLabel,
          categories: data.categories,
          details: data.details,
        }),
      ),
    ]);
    return { ok: true };
  } catch (error) {
    logServerError("[document request]", error);
    return { ok: false, error: `Something went wrong. Please call or WhatsApp us on ${site.phone}.` };
  }
}
