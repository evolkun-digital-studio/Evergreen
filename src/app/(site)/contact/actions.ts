"use server";

import { headers } from "next/headers";
import { connectDB, isDbConfigured } from "@/lib/db";
import { Enquiry } from "@/lib/models";
import { hitRateLimit } from "@/lib/rate-limit";
import { enquirySchema, type EnquiryInput } from "@/lib/validation/enquiry";
import { site } from "@/config/site";

export type EnquiryResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function notifyByEmail(e: { name: string; phone: string; email: string; company: string; service: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_EMAIL_TO;
  const from = process.env.ENQUIRY_EMAIL_FROM;
  if (!key || !to || !from) return;
  const text = [
    `Name: ${e.name}`,
    `Phone: ${e.phone}`,
    `Email: ${e.email || "-"}`,
    `Company: ${e.company || "-"}`,
    `Service: ${e.service}`,
    "",
    e.message,
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map(s => s.trim()),
      subject: `Pickup request: ${e.service} (${e.name})`,
      text,
      ...(e.email ? { reply_to: e.email } : {}),
    }),
  });
  if (!res.ok) console.error("Enquiry email failed", res.status, await res.text());
}

export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  // Bots fill the hidden field; accept silently so they learn nothing.
  if (data.website) return { ok: true };

  if (!isDbConfigured()) {
    return { ok: false, error: `The form is not connected yet. Please call or WhatsApp us on ${site.phone}.` };
  }

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    await connectDB();
    const limit = await hitRateLimit(`enquiry:${ip}`, 5, 60 * 60);
    if (!limit.ok) return { ok: false, error: "Too many requests from this connection. Please call or WhatsApp us instead." };

    const doc = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      service: data.service,
      message: data.message,
    };
    await Enquiry.create({ ...doc, userAgent: h.get("user-agent")?.slice(0, 300) ?? "" });
    await notifyByEmail(doc).catch(err => console.error("Enquiry email failed", err));
    return { ok: true };
  } catch (err) {
    console.error("Enquiry failed", err);
    return { ok: false, error: `Something went wrong. Please call or WhatsApp us on ${site.phone}.` };
  }
}
