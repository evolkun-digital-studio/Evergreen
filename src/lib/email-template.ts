import { site } from "@/config/site";

/** Content id of the inline logo; `sendTransactionalEmail` attaches the file under this id. */
export const EMAIL_LOGO_CID = "evergreen-logo";

export type EmailContent = {
  /** Grey preview line shown next to the subject in the inbox. */
  preheader?: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  /** Labelled details shown in a tinted box, e.g. what was approved and until when. */
  facts?: { label: string; value: string }[];
  button?: { label: string; url: string };
  /** Small print under the button. */
  notes?: string[];
  signoff?: string;
};

// Brand tokens from globals.css, inlined because mail apps ignore stylesheets.
const INK = "#10261C";
const MUTED = "#52645A";
const PRIMARY = "#1A6B37";
const PAPER = "#F5F7F6";
const LINE = "#DCE5DF";
const FONT = "Arial, Helvetica, sans-serif";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const withBreaks = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const addressLine = () =>
  `${site.address.street}, ${site.address.locality}, ${site.address.region} ${site.address.postalCode}`;

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const signoff = content.signoff ?? `The ${site.name} team`;
  const button = content.button && isHttpUrl(content.button.url) ? content.button : undefined;

  const paragraph = (value: string) =>
    `<p style="margin:0 0 16px;font:15px/1.65 ${FONT};color:${INK};">${withBreaks(value)}</p>`;

  const facts = content.facts?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${PAPER};border-radius:10px;">
        <tr><td style="padding:16px 20px;">
          ${content.facts
            .map(
              (fact, i) =>
                `<p style="margin:${i === 0 ? "0" : "12px"} 0 0;font:13px/1.4 ${FONT};color:${MUTED};">${escapeHtml(fact.label)}</p>
          <p style="margin:2px 0 0;font:15px/1.5 ${FONT};color:${INK};font-weight:bold;">${withBreaks(fact.value)}</p>`,
            )
            .join("\n          ")}
        </td></tr>
      </table>`
    : "";

  const buttonBlock = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
        <tr><td style="background:${PRIMARY};border-radius:8px;">
          <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;font:bold 15px/1 ${FONT};color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font:13px/1.6 ${FONT};color:${MUTED};">If the button does not work, copy this link into your browser:<br>
        <a href="${escapeHtml(button.url)}" style="color:${PRIMARY};word-break:break-all;">${escapeHtml(button.url)}</a></p>`
    : "";

  const notes = (content.notes ?? [])
    .map((note) => `<p style="margin:0 0 12px;font:13px/1.6 ${FONT};color:${MUTED};">${withBreaks(note)}</p>`)
    .join("\n      ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader ?? content.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="height:4px;font-size:0;line-height:0;background:${PRIMARY};border-radius:12px 12px 0 0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 32px 4px;">
        <img src="cid:${EMAIL_LOGO_CID}" width="180" alt="${escapeHtml(site.name)}" style="display:block;border:0;outline:none;height:auto;max-width:180px;">
      </td></tr>
      <tr><td style="padding:20px 32px 8px;">
        <h1 style="margin:0 0 16px;font:bold 22px/1.3 ${FONT};color:${INK};">${escapeHtml(content.heading)}</h1>
        ${content.greeting ? paragraph(content.greeting) : ""}
        ${content.paragraphs.map(paragraph).join("\n        ")}
        ${facts}
        ${buttonBlock}
        ${notes}
        <p style="margin:8px 0 24px;font:15px/1.65 ${FONT};color:${INK};">${escapeHtml(signoff)}</p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;border-top:1px solid ${LINE};">
        <p style="margin:0;font:12px/1.7 ${FONT};color:${MUTED};">
          <strong style="color:${INK};">${escapeHtml(site.legalName)}</strong><br>
          ${escapeHtml(addressLine())}<br>
          ${escapeHtml(site.phone)} &middot; ${escapeHtml(site.email)}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    content.greeting,
    ...content.paragraphs,
    ...(content.facts?.length ? ["", ...content.facts.map((f) => `${f.label}: ${f.value}`)] : []),
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    ...(content.notes?.length ? ["", ...content.notes] : []),
    "",
    signoff,
    "",
    "--",
    site.legalName,
    addressLine(),
    `${site.phone} | ${site.email}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  return { html, text };
}
