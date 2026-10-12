"use server";

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, User } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { hashPassword } from "@/lib/auth/password";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation/taxonomy";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function createUserAction(input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageUsers");
    const data = userCreateSchema.parse(input);
    await connectDB();
    if (await User.exists({ email: data.email })) throw new UserFacingError("A user with this email already exists.", { email: "Already registered" });
    const user = await User.create({ name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.password) });
    // Every user gets an author profile so their posts have a byline.
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
