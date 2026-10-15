"use server";

import { z } from "zod";
import { connectDB, withTransaction } from "@/lib/db";
import { AccountToken, Author, User } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { slugify, uniqueSlug } from "@/lib/slug";

export type AcceptState = { ok?: boolean; error?: string };
const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(200);

export async function acceptInviteAction(token: string, _previous: AcceptState, formData: FormData): Promise<AcceptState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0]?.message };
  if (formData.get("confirm") !== password.data) return { error: "Passwords do not match." };
  await connectDB();
  try {
    await withTransaction(async (session) => {
      const invite = await AccountToken.findOneAndUpdate(
        { purpose: "invitation", tokenHash: hashToken(token), usedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
        { returnDocument: "after", session },
      ).lean();
      if (!invite) throw new Error("invalid-invite");
      if (await User.exists({ email: invite.email }).session(session)) throw new Error("existing-user");
      const user = await User.create([{ name: invite.name, email: invite.email, role: invite.role, active: true, passwordHash: await hashPassword(password.data) }], { session }).then((rows) => rows[0]);
      if (invite.role === "VIEWER") return; // document-only accounts get no public author profile
      const slug = await uniqueSlug(slugify(invite.name) || "author", async (value) => Boolean(await Author.exists({ slug: value }).session(session)));
      const author = await Author.create([{ name: invite.name, slug, userId: user._id }], { session }).then((rows) => rows[0]);
      user.authorId = author._id;
      await user.save({ session });
    });
    return { ok: true };
  } catch {
    return { error: "This invitation is invalid, expired, or already used." };
  }
}
