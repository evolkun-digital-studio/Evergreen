import "./_env";
import { sendTransactionalEmail, smtpSettings } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";

// Sends one test message through the SMTP settings in .env.local / .env:
//   npm run email:test -- you@example.com
// The same branded template and inline logo as the real emails, so you can check how it looks.

const to = process.argv[2]?.trim();
if (!to || !to.includes("@")) {
  console.error("Usage: npm run email:test -- you@example.com");
  process.exit(1);
}

const settings = smtpSettings();
if (!settings) {
  console.error("Email is not set up. Set SMTP_HOST and ENQUIRY_EMAIL_FROM (and SMTP_USER / SMTP_PASS if your server asks for a login) in .env.local.");
  process.exit(1);
}

const { host, port, secure } = settings.transport;
console.log(`Sending from ${settings.from} through ${host}:${port} (${secure ? "TLS" : "STARTTLS"}) to ${to} ...`);

try {
  await sendTransactionalEmail({
    to,
    subject: "Evergreen test email",
    ...renderEmail({
      preheader: "If you can read this, your SMTP settings work.",
      heading: "Your email settings work",
      paragraphs: ["This is a test message from the Evergreen website. Document access links, password resets and invitations will look like this."],
      facts: [
        { label: "Sent from", value: settings.from },
        { label: "Mail server", value: `${host}:${port}` },
      ],
      signoff: "Evergreen website",
    }),
  });
  console.log("Sent. Check the inbox (and the spam folder) of that address.");
} catch (error) {
  console.error("The mail server refused the message:", error instanceof Error ? error.message : error);
  process.exit(1);
}
