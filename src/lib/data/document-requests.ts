import "server-only";
import { timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";
import { CompanyDocument, DocumentAccessRequest, type DocumentAccessRequestDoc } from "@/lib/models";
import { toItem, type DocumentItem, type Lean } from "@/lib/data/documents";
import type { DocumentCategory } from "@/lib/documents/constants";
import { evaluateGrant, grantCoversDocument, parseGrantCookie, type GrantScope, type GrantState } from "@/lib/documents/grant";

export type PublicDocumentOption = { id: string; title: string; category: DocumentCategory };

/** Title and category only: this list is shown to visitors who are not signed in. */
export async function listPublicDocumentOptions(): Promise<PublicDocumentOption[]> {
  await connectDB();
  const docs = await CompanyDocument.find({ active: true }, { title: 1, category: 1 }).sort({ category: 1, title: 1 }).lean();
  return docs.map((d) => ({ id: d._id.toString(), title: d.title, category: d.category as DocumentCategory }));
}

export type ActiveGrant = { requestId: string; email: string; scope: GrantScope; documentIds: string[] };

const stateOf = (r: DocumentAccessRequestDoc) =>
  evaluateGrant({
    status: r.status,
    grant: r.grant ? { scope: r.grant.scope as GrantScope, documentIds: r.grant.documentIds.map(String), expiresAt: r.grant.expiresAt } : null,
  });

function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The request's grant if the token matches its stored hash and the grant is currently valid. */
export async function lookupByToken(requestId: string, rawToken: string): Promise<(ActiveGrant & { expiresAt: Date }) | null> {
  if (!mongoose.isValidObjectId(requestId)) return null;
  await connectDB();
  const request = await DocumentAccessRequest.findById(requestId).lean<DocumentAccessRequestDoc>();
  if (!request?.grant || stateOf(request) !== "valid") return null;
  if (!sameHash(hashToken(rawToken), request.grant.tokenHash)) return null;
  return {
    requestId: request._id.toString(),
    email: request.email,
    scope: request.grant.scope as GrantScope,
    documentIds: request.grant.documentIds.map(String),
    expiresAt: request.grant.expiresAt,
  };
}

/** Resolves the grant cookie on every request, so revoking or expiring takes effect at once. */
export async function resolveGrant(cookieValue: string | undefined): Promise<ActiveGrant | null> {
  const parsed = parseGrantCookie(cookieValue);
  if (!parsed) return null;
  const found = await lookupByToken(parsed.requestId, parsed.rawToken);
  if (!found) return null;
  return { requestId: found.requestId, email: found.email, scope: found.scope, documentIds: found.documentIds };
}

export async function listGrantedDocuments(grant: ActiveGrant): Promise<DocumentItem[]> {
  await connectDB();
  const filter = grant.scope === "all" ? { active: true } : { active: true, _id: { $in: grant.documentIds } };
  const docs = await CompanyDocument.find(filter).sort({ category: 1, title: 1 }).lean<Lean[]>();
  return docs.map((d) => toItem(d));
}

/** The document if the grant covers it and it is still active; null otherwise. */
export async function findGrantedDocument(grant: ActiveGrant, id: string) {
  if (!mongoose.isValidObjectId(id) || !grantCoversDocument(grant, id)) return null;
  await connectDB();
  return CompanyDocument.findOne({ _id: id, active: true }).lean<Lean>();
}

export type RequestItem = {
  id: string;
  name: string;
  email: string;
  company: string;
  purpose: string;
  requestedScope: GrantScope;
  requestedDocuments: { id: string; title: string }[];
  requestedCategories: DocumentCategory[];
  requestedDetails: string;
  status: DocumentAccessRequestDoc["status"];
  state: GrantState;
  grantScope: GrantScope | null;
  grantedDocuments: { id: string; title: string }[];
  expiresAt: string | null;
  decisionNote: string;
  createdAt: string;
  decidedAt: string | null;
};

export async function listRequests(): Promise<RequestItem[]> {
  await connectDB();
  const rows = await DocumentAccessRequest.find().sort({ createdAt: -1 }).limit(200).lean<DocumentAccessRequestDoc[]>();
  const ids = new Set<string>();
  for (const r of rows) for (const id of [...(r.requested?.documentIds ?? []), ...(r.grant?.documentIds ?? [])]) ids.add(String(id));
  const docs = await CompanyDocument.find({ _id: { $in: [...ids] } }, { title: 1 }).lean();
  const titles = new Map(docs.map((d) => [d._id.toString(), d.title]));
  const named = (list: mongoose.Types.ObjectId[]) => list.map((id) => ({ id: String(id), title: titles.get(String(id)) ?? "Deleted document" }));
  return rows.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    email: r.email,
    company: r.company ?? "",
    purpose: r.purpose,
    requestedScope: (r.requested?.scope ?? "all") as GrantScope,
    requestedDocuments: named((r.requested?.documentIds ?? [])),
    requestedCategories: (r.requested?.categories ?? []) as DocumentCategory[],
    requestedDetails: r.requested?.details ?? "",
    status: r.status,
    state: stateOf(r),
    grantScope: r.grant ? (r.grant.scope as GrantScope) : null,
    grantedDocuments: r.grant ? named(r.grant.documentIds) : [],
    expiresAt: r.grant?.expiresAt.toISOString() ?? null,
    decisionNote: r.decisionNote ?? "",
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

export async function countPendingRequests(): Promise<number> {
  await connectDB();
  return DocumentAccessRequest.countDocuments({ status: "pending" });
}
