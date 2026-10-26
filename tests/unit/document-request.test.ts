import { describe, expect, it } from "vitest";
import { documentRequestSchema } from "@/lib/validation/document-request";
import { adminAlertEmail, approvalEmail, approvalLink, receiptEmail, rejectionEmail } from "@/lib/documents/request-emails";

const valid = { name: "Asha Rao", email: "asha@example.com", purpose: "Need the registration certificate for an audit." };

describe("documentRequestSchema", () => {
  it("trims and lowercases the email", () => {
    expect(documentRequestSchema.parse({ ...valid, email: "  A@B.COM " }).email).toBe("a@b.com");
  });

  it("treats the purpose as optional", () => {
    const { purpose: _purpose, ...withoutPurpose } = valid;
    expect(documentRequestSchema.parse(withoutPurpose).purpose).toBe("");
    expect(documentRequestSchema.parse({ ...valid, purpose: "   " }).purpose).toBe("");
  });

  it("accepts known document categories and rejects unknown ones", () => {
    expect(documentRequestSchema.parse({ ...valid, categories: ["Registrations"] }).categories).toEqual(["Registrations"]);
    expect(documentRequestSchema.parse(valid).categories).toEqual([]);
    expect(documentRequestSchema.safeParse({ ...valid, categories: ["Secrets"] }).success).toBe(false);
  });

  it("keeps an optional free-text note and caps its length", () => {
    expect(documentRequestSchema.parse({ ...valid, details: "  GST certificate, 2024 " }).details).toBe("GST certificate, 2024");
    expect(documentRequestSchema.parse(valid).details).toBe("");
    expect(documentRequestSchema.safeParse({ ...valid, details: "x".repeat(501) }).success).toBe(false);
  });

  it("accepts an empty document selection and defaults it to []", () => {
    expect(documentRequestSchema.parse(valid).documentIds).toEqual([]);
  });

  it("caps the document selection", () => {
    const ids = Array.from({ length: 51 }, () => "65f000000000000000000000");
    expect(documentRequestSchema.safeParse({ ...valid, documentIds: ids }).success).toBe(false);
  });
});

describe("request emails", () => {
  it("builds the approval link from the request id and token", () => {
    expect(approvalLink("65f000000000000000000000", "abc")).toBe(
      "https://evergreen.example/documents/access/65f000000000000000000000.abc",
    );
  });

  it("puts the link, scope and expiry date in the approval email", () => {
    const { text } = approvalEmail({
      name: "Asha",
      link: "https://evergreen.example/documents/access/x.y",
      expiresAt: new Date("2026-11-02T10:00:00.000Z"),
      scopeLabel: "the whole document library",
    });
    expect(text).toContain("https://evergreen.example/documents/access/x.y");
    expect(text).toContain("the whole document library");
    expect(text).toMatch(/2 Nov 2026/);
  });

  it("includes the rejection note only when given", () => {
    expect(rejectionEmail({ name: "Asha", note: "Not available to the public." }).text).toContain("Not available to the public.");
    expect(rejectionEmail({ name: "Asha", note: "" }).text).not.toContain("Note:");
  });

  it("tells the requester the request was received", () => {
    expect(receiptEmail({ name: "Asha" }).text).toContain("received");
  });

  it("gives the admin the requester's details", () => {
    const { text } = adminAlertEmail({
      name: "Asha",
      email: "a@b.com",
      company: "Acme",
      purpose: "Audit",
      scopeLabel: "2 documents",
      categories: ["Registrations"],
      details: "GST certificate",
    });
    for (const part of ["Asha", "a@b.com", "Acme", "Audit", "2 documents", "Registrations", "GST certificate"]) expect(text).toContain(part);
  });
});
