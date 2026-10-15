import "server-only";

type Message = { to: string; subject: string; text: string };

export async function sendTransactionalEmail(message: Message): Promise<"sent" | "unconfigured"> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_EMAIL_FROM;
  if (!key || !from) return "unconfigured";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
  return "sent";
}
