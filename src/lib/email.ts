import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { site } from "@/config/site";
import { EMAIL_LOGO_CID } from "@/lib/email-template";
import { logServerError } from "@/lib/log";

/** `html` is the designed version; `text` stays as the fallback for mail apps that show plain text. */
type Message = { to: string | string[]; subject: string; text: string; html?: string; replyTo?: string };

type Env = Record<string, string | undefined>;

/**
 * SMTP settings from the environment, or null while email is not set up. `ENQUIRY_EMAIL_FROM` is the
 * sender address; SMTP_USER / SMTP_PASS are optional for relays that do not ask for a login.
 * Port 465 means implicit TLS; other ports (587 by default) upgrade with STARTTLS.
 */
export function smtpSettings(env: Env = process.env) {
  const host = env.SMTP_HOST?.trim();
  const from = env.ENQUIRY_EMAIL_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(env.SMTP_PORT) || 587;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE.trim().toLowerCase() === "true" : port === 465;
  const auth = env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined;
  return { transport: { host, port, secure, ...(auth ? { auth } : {}) }, from };
}

let cached: { key: string; transporter: Transporter } | null = null;

function transporterFor(transport: NonNullable<ReturnType<typeof smtpSettings>>["transport"]) {
  const key = JSON.stringify(transport);
  if (cached?.key !== key) cached = { key, transporter: nodemailer.createTransport(transport) };
  return cached.transporter;
}

let logoFile: Promise<Buffer | null> | null = null;

/** The logo is embedded in the message, so it shows even where the mail app blocks remote images. */
function loadLogo() {
  logoFile ??= readFile(path.join(process.cwd(), "public", site.logo)).catch((error) => {
    logServerError("[email] logo file not readable; sending without it", error);
    return null;
  });
  return logoFile;
}

/** Sends through the configured SMTP server. Throws when the server refuses the message. */
export async function sendTransactionalEmail(message: Message): Promise<"sent" | "unconfigured"> {
  const settings = smtpSettings();
  if (!settings) return "unconfigured";
  const logo = message.html?.includes(`cid:${EMAIL_LOGO_CID}`) ? await loadLogo() : null;
  await transporterFor(settings.transport).sendMail({
    from: settings.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(logo
      ? { attachments: [{ filename: "evergreen-logo.png", content: logo, contentType: "image/png", cid: EMAIL_LOGO_CID, contentDisposition: "inline" as const }] }
      : {}),
  });
  return "sent";
}
