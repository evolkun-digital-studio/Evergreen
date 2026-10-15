"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Enquiry } from "@/lib/models";
import { hitRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().or(z.literal("")),
  snapshot: z.object({ filingYear: z.string().max(20), eeeId: z.string().max(40), salesStartYear: z.string().max(20), quantityKg: z.string().max(40), targetKg: z.string().max(40) }),
});

export type EprLeadState = { ok?: boolean; error?: string };

export async function submitEprLead(_previous: EprLeadState, formData: FormData): Promise<EprLeadState> {
  let snapshot: unknown;
  try { snapshot = JSON.parse(String(formData.get("snapshot") ?? "")); } catch { return { error: "Recalculate your target and try again." }; }
  const parsed = schema.safeParse({ name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email") ?? "", snapshot });
  if (!parsed.success) return { error: "Check your contact details and try again." };
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    await connectDB();
    if (!(await hitRateLimit(`epr-lead:${ip}`, 5, 60 * 60)).ok) return { error: "Too many requests. Please try again later." };
    const { name, phone, email, snapshot: calculatorSnapshot } = parsed.data;
    await Enquiry.create({ name, phone, email, company: "", service: "EPR & Compliance", message: `EPR calculator target: ${calculatorSnapshot.targetKg} kg`, source: "epr-calculator", calculatorSnapshot, userAgent: h.get("user-agent")?.slice(0, 300) ?? "" });
    return { ok: true };
  } catch { return { error: "Service unavailable. Please call or WhatsApp Evergreen." }; }
}
