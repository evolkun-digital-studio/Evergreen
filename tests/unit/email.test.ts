import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const { sendTransactionalEmail, smtpSettings } = await import("@/lib/email");

const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "ENQUIRY_EMAIL_FROM"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of SMTP_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  vi.clearAllMocks();
});
afterEach(() => {
  for (const key of SMTP_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("smtpSettings", () => {
  it("is null until a host and a sender address are set", () => {
    expect(smtpSettings({})).toBeNull();
    expect(smtpSettings({ SMTP_HOST: "smtp.example.com" })).toBeNull();
    expect(smtpSettings({ ENQUIRY_EMAIL_FROM: "Evergreen <a@b.com>" })).toBeNull();
  });

  it("defaults to port 587 with STARTTLS and no login", () => {
    const settings = smtpSettings({ SMTP_HOST: "smtp.example.com", ENQUIRY_EMAIL_FROM: "a@b.com" });
    expect(settings).toEqual({ transport: { host: "smtp.example.com", port: 587, secure: false }, from: "a@b.com" });
  });

  it("uses implicit TLS on port 465 and passes the login through", () => {
    const settings = smtpSettings({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
      SMTP_USER: "user",
      SMTP_PASS: "secret",
      ENQUIRY_EMAIL_FROM: "a@b.com",
    });
    expect(settings?.transport).toEqual({ host: "smtp.example.com", port: 465, secure: true, auth: { user: "user", pass: "secret" } });
  });

  it("lets SMTP_SECURE override the port-based default", () => {
    const settings = smtpSettings({ SMTP_HOST: "h", SMTP_PORT: "2525", SMTP_SECURE: "true", ENQUIRY_EMAIL_FROM: "a@b.com" });
    expect(settings?.transport.secure).toBe(true);
  });
});

describe("sendTransactionalEmail", () => {
  it("reports unconfigured and sends nothing without SMTP settings", async () => {
    await expect(sendTransactionalEmail({ to: "x@y.com", subject: "s", text: "t" })).resolves.toBe("unconfigured");
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends through the SMTP server with the configured sender", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.ENQUIRY_EMAIL_FROM = "Evergreen <docs@example.com>";
    await expect(sendTransactionalEmail({ to: ["x@y.com", "z@y.com"], subject: "Hello", text: "Body", replyTo: "r@y.com" })).resolves.toBe("sent");
    expect(sendMail).toHaveBeenCalledWith({
      from: "Evergreen <docs@example.com>",
      to: ["x@y.com", "z@y.com"],
      subject: "Hello",
      text: "Body",
      replyTo: "r@y.com",
    });
  });

  it("sends the HTML version and attaches the logo it points at", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.ENQUIRY_EMAIL_FROM = "docs@example.com";
    await sendTransactionalEmail({ to: "x@y.com", subject: "s", text: "plain", html: "<img src=\"cid:evergreen-logo\">" });
    const sent = sendMail.mock.calls[0][0];
    expect(sent.html).toContain("cid:evergreen-logo");
    expect(sent.text).toBe("plain");
    expect(sent.attachments).toEqual([
      expect.objectContaining({ cid: "evergreen-logo", filename: "evergreen-logo.png", contentType: "image/png", content: expect.any(Buffer) }),
    ]);
    expect(sent.attachments[0].content.subarray(1, 4).toString()).toBe("PNG");
  });

  it("attaches nothing when the HTML does not use the logo", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.ENQUIRY_EMAIL_FROM = "docs@example.com";
    await sendTransactionalEmail({ to: "x@y.com", subject: "s", text: "plain", html: "<p>hi</p>" });
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("attachments");
  });

  it("lets a delivery failure reach the caller", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.ENQUIRY_EMAIL_FROM = "docs@example.com";
    sendMail.mockRejectedValueOnce(new Error("535 authentication failed"));
    await expect(sendTransactionalEmail({ to: "x@y.com", subject: "s", text: "t" })).rejects.toThrow("535");
  });
});
