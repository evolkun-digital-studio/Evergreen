// Pure rules for document access grants. No database or framework imports, so they unit-test in plain Node.

export const GRANT_COOKIE = "doc_grant";
export const EXPIRY_DAYS = [1, 7, 30, 90] as const;
export const DEFAULT_EXPIRY_DAYS = 7;

export type GrantScope = "all" | "selected";

export type RequestState = {
  status: "pending" | "approved" | "rejected" | "revoked";
  grant?: { scope: GrantScope; documentIds: string[]; expiresAt: Date } | null;
};

export type GrantState = "valid" | "expired" | "revoked" | "rejected" | "pending";

export function evaluateGrant(state: RequestState, now = new Date()): GrantState {
  if (state.status !== "approved") return state.status;
  if (!state.grant) return "pending";
  return state.grant.expiresAt.getTime() > now.getTime() ? "valid" : "expired";
}

export function grantCoversDocument(grant: { scope: GrantScope; documentIds: string[] }, documentId: string): boolean {
  return grant.scope === "all" || grant.documentIds.includes(documentId);
}

const OBJECT_ID = /^[a-f0-9]{24}$/;

/** Cookie value `<requestId>.<rawToken>`; base64url tokens contain no dots, so the first dot splits it. */
export function encodeGrantCookie(requestId: string, rawToken: string): string {
  return `${requestId}.${rawToken}`;
}

export function parseGrantCookie(value: string | undefined): { requestId: string; rawToken: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const requestId = value.slice(0, dot);
  const rawToken = value.slice(dot + 1);
  return OBJECT_ID.test(requestId) && rawToken ? { requestId, rawToken } : null;
}

export function grantCookieMaxAge(expiresAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}
