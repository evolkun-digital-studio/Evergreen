import { describe, expect, it } from "vitest";
import { createRawToken, expiresInMinutes, hashToken } from "@/lib/auth/tokens";

describe("account tokens", () => {
  it("hashes tokens deterministically without storing the raw value", () => {
    const raw = createRawToken();
    expect(raw).toHaveLength(43);
    expect(hashToken(raw)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(raw)).not.toContain(raw);
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("creates a 30 minute expiry", () => {
    const now = new Date("2026-10-14T10:00:00.000Z");
    expect(expiresInMinutes(30, now).toISOString()).toBe("2026-10-14T10:30:00.000Z");
  });
});
