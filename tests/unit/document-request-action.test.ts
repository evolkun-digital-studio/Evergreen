import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn().mockResolvedValue({});
const hitRateLimit = vi.fn();
const sendToRequester = vi.fn().mockResolvedValue("sent");
const notifyAdmins = vi.fn().mockResolvedValue(undefined);

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "vitest" }),
}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(), isDbConfigured: () => true }));
vi.mock("@/lib/models", () => ({
  CompanyDocument: { find: () => ({ lean: async () => [] }) },
  DocumentAccessRequest: { create },
}));
vi.mock("@/lib/rate-limit", () => ({ hitRateLimit }));
vi.mock("@/lib/documents/request-emails", () => ({
  adminAlertEmail: () => ({ subject: "s", text: "t", html: "h" }),
  receiptEmail: () => ({ subject: "s", text: "t", html: "h" }),
  notifyAdmins,
  sendToRequester,
}));
vi.mock("@/lib/log", () => ({ logServerError: vi.fn() }));

const { submitDocumentRequest } = await import("@/app/(site)/documents/actions");
const { REQUEST_LIMITS } = await import("@/lib/documents/request-limits");

const input = { name: "Asha Rao", email: "Asha@Example.com", purpose: "", documentIds: [] as string[] };

beforeEach(() => {
  vi.clearAllMocks();
  hitRateLimit.mockResolvedValue({ ok: true, remaining: 5 });
});

describe("submitDocumentRequest rate limiting", () => {
  it("counts each request against the visitor's IP and email", async () => {
    await submitDocumentRequest(input);
    expect(hitRateLimit).toHaveBeenCalledWith("docreq:ip:203.0.113.9", REQUEST_LIMITS.perIp.max, REQUEST_LIMITS.perIp.windowSeconds);
    expect(hitRateLimit).toHaveBeenCalledWith("docreq:email:asha@example.com", REQUEST_LIMITS.perEmail.max, REQUEST_LIMITS.perEmail.windowSeconds);
  });

  it("saves the request and sends emails while under the limit", async () => {
    await expect(submitDocumentRequest(input)).resolves.toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(1);
    expect(sendToRequester).toHaveBeenCalledTimes(1);
    expect(notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["IP", "docreq:ip:"],
    ["email", "docreq:email:"],
  ])("refuses, saves nothing and sends nothing once the %s limit is used up", async (_name, prefix) => {
    hitRateLimit.mockImplementation(async (key: string) => ({ ok: !key.startsWith(prefix), remaining: 0 }));
    const result = await submitDocumentRequest(input);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/several requests recently/i) });
    expect(create).not.toHaveBeenCalled();
    expect(sendToRequester).not.toHaveBeenCalled();
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it("is much looser than the old 5 per hour that blocked normal testing", () => {
    expect(REQUEST_LIMITS.perIp.max).toBeGreaterThanOrEqual(20);
    expect(REQUEST_LIMITS.perEmail.max).toBeGreaterThanOrEqual(10);
  });

  it("does not count a bot that filled the hidden field", async () => {
    await expect(submitDocumentRequest({ ...input, website: "http://spam" })).resolves.toEqual({ ok: true });
    expect(hitRateLimit).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
