"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AccountToken, User } from "@/lib/models";
import { createRawToken, expiresInMinutes, hashToken, RESET_TOKEN_MINUTES } from "@/lib/auth/tokens";
import { hitRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/cms/constants";

export type ForgotState = { ok?: boolean; error?: string };
const schema = z.string().trim().toLowerCase().email();

export async function forgotPasswordAction(_previous: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = schema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
    await connectDB();
    const limit = await hitRateLimit(`password-reset:${ip}`, 5, 30 * 60);
    if (!limit.ok) return { error: "Too many requests. Please wait 30 minutes and try again." };
    const user = await User.findOne({ email: parsed.data, active: true }).select({ _id: 1, email: 1 }).lean();
    if (user) {
      await AccountToken.updateMany({ purpose: "password-reset", userId: user._id, usedAt: null }, { $set: { revokedAt: new Date() } });
      const raw = createRawToken();
      await AccountToken.create({
        purpose: "password-reset",
        tokenHash: hashToken(raw),
        userId: user._id,
        email: user.email,
        expiresAt: expiresInMinutes(RESET_TOKEN_MINUTES),
      });
      const link = `${SITE_URL}/admin/reset-password/${raw}`;
      const delivery = await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Evergreen CMS password",
        text: `Open this link within 30 minutes to reset your password:\n\n${link}\n\nIf you did not request this, ignore this email.`,
      });
      if (delivery === "unconfigured" && process.env.NODE_ENV !== "production") console.log(`[password reset link] ${link}`);
    }
    return { ok: true };
  } catch {
    return { error: "Service unavailable. Please try again shortly." };
  }
}
