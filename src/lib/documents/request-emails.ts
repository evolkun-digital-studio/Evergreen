import "server-only";
import { SITE_URL } from "@/lib/cms/constants";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { logServerError } from "@/lib/log";
import { getNotificationRecipients } from "@/lib/data/settings";

type Message = { subject: string; text: string; html: string };

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export const approvalLink = (requestId: string, rawToken: string) => `${SITE_URL}/documents/access/${requestId}.${rawToken}`;

export function receiptEmail({ name }: { name: string }): Message {
  return {
    subject: "We received your document request",
    ...renderEmail({
      preheader: "Our admin team will reply to you by email very soon.",
      heading: "We received your request",
      greeting: `Hello ${name},`,
      paragraphs: [
        "Thank you for your request. Our admin team will review it and respond to you by email very soon.",
        "There is nothing else you need to do. If your request is approved, the access link arrives in a separate email.",
      ],
    }),
  };
}

export function approvalEmail(p: { name: string; link: string; expiresAt: Date; scopeLabel: string }): Message {
  return {
    subject: "Your document access has been approved",
    ...renderEmail({
      preheader: "Your private link to the documents is ready.",
      heading: "Your document access is approved",
      greeting: `Hello ${p.name},`,
      paragraphs: ["Your request has been approved. Use the button below to open the documents we are sharing with you."],
      facts: [
        { label: "You can open", value: p.scopeLabel },
        { label: "Link valid until", value: dateFmt.format(p.expiresAt) },
      ],
      button: { label: "Open documents", url: p.link },
      notes: ["Please do not forward this email. Anyone who has the link can open the documents until it expires or is withdrawn."],
    }),
  };
}

export function rejectionEmail({ name, note }: { name: string; note: string }): Message {
  return {
    subject: "Update on your document request",
    ...renderEmail({
      preheader: "We are unable to share the documents you asked for at this time.",
      heading: "Update on your document request",
      greeting: `Hello ${name},`,
      paragraphs: ["Thank you for your interest. We are unable to grant access to the documents you asked for at this time."],
      facts: note.trim() ? [{ label: "Note", value: note.trim() }] : [],
      notes: ["If you think this is a mistake, you can reply to this email or submit a new request."],
    }),
  };
}

export function revocationEmail({ name }: { name: string }): Message {
  return {
    subject: "Your document access has ended",
    ...renderEmail({
      preheader: "The link we sent you no longer works.",
      heading: "Your document access has ended",
      greeting: `Hello ${name},`,
      paragraphs: ["Your access to our documents has been withdrawn, and the link we sent you no longer works.", "You can submit a new request at any time."],
    }),
  };
}

export function adminAlertEmail(p: {
  name: string;
  email: string;
  company: string;
  purpose: string;
  scopeLabel: string;
  categories: readonly string[];
  details: string;
}): Message {
  return {
    subject: `New document access request: ${p.name}`,
    ...renderEmail({
      preheader: `${p.name} (${p.email}) is waiting for a decision.`,
      heading: "New document access request",
      paragraphs: [`${p.name} has asked for access to our documents.`],
      facts: [
        { label: "Name", value: p.name },
        { label: "Email", value: p.email },
        { label: "Company", value: p.company || "-" },
        { label: "Requested", value: p.scopeLabel },
        { label: "Types", value: p.categories.length ? p.categories.join(", ") : "-" },
        { label: "Looking for", value: p.details || "-" },
        { label: "Reason", value: p.purpose || "-" },
      ],
      button: { label: "Review request", url: `${SITE_URL}/admin/document-requests` },
      signoff: "Evergreen documents",
    }),
  };
}

export function sendToRequester(to: string, message: Message) {
  return sendTransactionalEmail({ to, ...message });
}

/** Emails the alert recipients (admin Settings, else ENQUIRY_EMAIL_TO); failures are logged, never thrown. */
export async function notifyAdmins(message: Message): Promise<void> {
  const recipients = await getNotificationRecipients().catch(() => []);
  await Promise.all(
    recipients.map((to) => sendTransactionalEmail({ to, ...message }).catch((error) => logServerError("[document request email]", error))),
  );
}
