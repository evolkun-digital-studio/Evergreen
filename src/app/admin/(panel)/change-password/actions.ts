"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireActionUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import { runAction, UserFacingError } from "@/lib/actions";

export async function changePasswordAction(input: unknown) {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = z.object({ current: z.string().min(1).max(200), password: z.string().min(12).max(200), confirm: z.string() }).parse(input);
    if (data.password !== data.confirm) throw new UserFacingError("Passwords do not match.");
    await connectDB();
    const record = await User.findById(user.id).select("+passwordHash").lean();
    if (!record || !(await bcrypt.compare(data.current, record.passwordHash))) throw new UserFacingError("Current password is incorrect.");
    await User.updateOne({ _id: record._id }, { $set: { passwordHash: await hashPassword(data.password) } });
  }, "Password changed");
}
