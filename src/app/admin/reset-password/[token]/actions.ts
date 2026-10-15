"use server";

import { z } from "zod";
import { connectDB, withTransaction } from "@/lib/db";
import { AccountToken, User } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";

export type ResetState = { ok?: boolean; error?: string };
const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(200);

export async function resetPasswordAction(token: string, _previous: ResetState, formData: FormData): Promise<ResetState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0]?.message };
  if (formData.get("confirm") !== password.data) return { error: "Passwords do not match." };
  await connectDB();
  try {
    await withTransaction(async (session) => {
      const record = await AccountToken.findOneAndUpdate(
        { purpose: "password-reset", tokenHash: hashToken(token), usedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
        { returnDocument: "after", session },
      ).lean();
      if (!record?.userId) throw new Error("invalid-token");
      await User.updateOne({ _id: record.userId, active: true }, { $set: { passwordHash: await hashPassword(password.data) } }, { session });
    });
    return { ok: true };
  } catch {
    return { error: "This reset link is invalid or has expired." };
  }
}
