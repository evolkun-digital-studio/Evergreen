import { describe, expect, it } from "vitest";
import {
  encodeGrantCookie,
  evaluateGrant,
  grantCookieMaxAge,
  grantCoversDocument,
  parseGrantCookie,
  type RequestState,
} from "@/lib/documents/grant";

const now = new Date("2026-10-26T10:00:00.000Z");
const future = new Date("2026-11-02T10:00:00.000Z");
const grant = (expiresAt: Date) => ({ scope: "all" as const, documentIds: [], expiresAt });
const ID = "65f000000000000000000000";

describe("evaluateGrant", () => {
  it("is valid for an approved request that has not expired", () => {
    expect(evaluateGrant({ status: "approved", grant: grant(future) }, now)).toBe("valid");
  });

  it("expires exactly at expiresAt", () => {
    expect(evaluateGrant({ status: "approved", grant: grant(now) }, now)).toBe("expired");
  });

  it.each(["revoked", "rejected", "pending"] as const)("reports %s", (status) => {
    const state: RequestState = { status, grant: grant(future) };
    expect(evaluateGrant(state, now)).toBe(status);
  });

  it("treats an approved request without a grant as pending", () => {
    expect(evaluateGrant({ status: "approved", grant: null }, now)).toBe("pending");
  });
});

describe("grantCoversDocument", () => {
  it("covers every document for scope all", () => {
    expect(grantCoversDocument({ scope: "all", documentIds: [] }, ID)).toBe(true);
  });

  it("covers only listed documents for scope selected", () => {
    expect(grantCoversDocument({ scope: "selected", documentIds: [ID] }, ID)).toBe(true);
    expect(grantCoversDocument({ scope: "selected", documentIds: [ID] }, "65f000000000000000000001")).toBe(false);
  });
});

describe("grant cookie", () => {
  it("round-trips a request id and token", () => {
    const value = encodeGrantCookie(ID, "tok-en_1");
    expect(parseGrantCookie(value)).toEqual({ requestId: ID, rawToken: "tok-en_1" });
  });

  it.each([undefined, "", "abc", "nothex.token", `${ID}.`, `${ID}`])("rejects malformed value %s", (value) => {
    expect(parseGrantCookie(value)).toBeNull();
  });

  it("never returns a negative max age", () => {
    expect(grantCookieMaxAge(new Date("2026-10-25T10:00:00.000Z"), now)).toBe(0);
    expect(grantCookieMaxAge(future, now)).toBe(7 * 24 * 3600);
  });
});
