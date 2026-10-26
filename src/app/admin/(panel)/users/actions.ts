"use server";

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, User } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { hashPassword } from "@/lib/auth/password";
import { createRawToken, expiresInMinutes, hashToken, INVITE_TOKEN_HOURS } from "@/lib/auth/tokens";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { SITE_URL, ROLES } from "@/lib/cms/constants";
import { AccountToken } from "@/lib/models";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation/taxonomy";
import { slugify, uniqueSlug } from "@/lib/slug";
import { z } from "zod";

const inviteSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(), role: z.enum(ROLES) });

async function issueInvite(data: z.infer<typeof inviteSchema>, createdById: string) {
  await AccountToken.updateMany({ purpose: "invitation", email: data.email, usedAt: null }, { $set: { revokedAt: new Date() } });
  const raw = createRawToken();
  await AccountToken.create({
    purpose: "invitation",
    tokenHash: hashToken(raw),
    email: data.email,
    name: data.name,
    role: data.role,
    createdById,
    expiresAt: expiresInMinutes(INVITE_TOKEN_HOURS * 60),
  });
  const link = `${SITE_URL}/admin/accept-invite/${raw}`;
  const delivery = await sendTransactionalEmail({
    to: data.email,
    subject: "You’re invited to Evergreen CMS",
    ...renderEmail({
      preheader: `Accept your invitation within ${INVITE_TOKEN_HOURS} hours.`,
      heading: "You’re invited to Evergreen CMS",
      greeting: `Hello ${data.name},`,
      paragraphs: [`You have been invited to join the Evergreen CMS. Accept the invitation within ${INVITE_TOKEN_HOURS} hours to set your password.`],
      button: { label: "Accept invitation", url: link },
    }),
  });
  if (delivery === "unconfigured" && process.env.NODE_ENV !== "production") console.log(`[invite link] ${link}`);
}

export async function inviteUserAction(input: unknown) {
  return runAction(async () => {
    const me = await requireActionUser("manageUsers");
    const data = inviteSchema.parse(input);
    await connectDB();
    if (await User.exists({ email: data.email })) throw new UserFacingError("A user with this email already exists.", { email: "Already registered" });
    await issueInvite(data, me.id);
  }, "Invitation sent");
}

export async function resendInviteAction(id: string) {
  return runAction(async () => {
    const me = await requireActionUser("manageUsers");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid invitation.");
    await connectDB();
    const invite = await AccountToken.findOne({ _id: id, purpose: "invitation", usedAt: null, revokedAt: null }).lean();
    if (!invite) throw new UserFacingError("This invitation is no longer active.");
    await issueInvite({ name: invite.name, email: invite.email, role: invite.role }, me.id);
  }, "Invitation resent");
}

export async function revokeInviteAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageUsers");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid invitation.");
    await connectDB();
    await AccountToken.updateOne({ _id: id, purpose: "invitation", usedAt: null }, { $set: { revokedAt: new Date() } });
  }, "Invitation revoked");
}

export async function createUserAction(input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageUsers");
    const data = userCreateSchema.parse(input);
    await connectDB();
    if (await User.exists({ email: data.email })) throw new UserFacingError("A user with this email already exists.", { email: "Already registered" });
    const user = await User.create({ name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.password) });
    // Every CMS user gets an author profile so their posts have a byline; viewers never write posts.
    if (data.role === "VIEWER") return;
    const slug = await uniqueSlug(slugify(data.name) || "author", async (s) => Boolean(await Author.exists({ slug: s })));
    const author = await Author.create({ name: data.name, slug, userId: user._id });
    await User.updateOne({ _id: user._id }, { $set: { authorId: author._id } });
  }, "User created");
}

export async function updateUserAction(id: string, input: unknown) {
  return runAction(async () => {
    const me = await requireActionUser("manageUsers");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid user.");
    const data = userUpdateSchema.parse(input);
    await connectDB();
    const target = await User.findById(id).lean();
    if (!target) throw new UserFacingError("This user no longer exists.");

    const losingAdmin = target.role === "ADMIN" && (data.role !== "ADMIN" || !data.active);
    if (losingAdmin) {
      const admins = await User.countDocuments({ role: "ADMIN", active: true });
      if (admins <= 1) throw new UserFacingError("There must be at least one active admin.");
    }
    if (id === me.id && !data.active) throw new UserFacingError("You can't deactivate your own account.");
    if (id === me.id && data.role !== "ADMIN") throw new UserFacingError("You can't demote your own account.");

    await User.updateOne(
      { _id: id },
      {
        $set: {
          name: data.name,
          role: data.role,
          active: data.active,
          authorId: data.authorId,
          ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
        },
      },
    );
    if (data.authorId) await Author.updateOne({ _id: data.authorId }, { $set: { userId: target._id } });
  }, "User updated");
}
