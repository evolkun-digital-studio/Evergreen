import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { hitRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { authConfig } from "./config";

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown, so both failure paths take the same time.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync(crypto.randomUUID(), 12));

function clientIp(request: Request | undefined): string {
  const forwarded = request?.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request?.headers.get("x-real-ip") || "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        await connectDB();
        const ipKey = `login:ip:${clientIp(request)}`;
        const emailKey = `login:email:${email}`;
        const [byIp, byEmail] = await Promise.all([
          hitRateLimit(ipKey, 20, 15 * 60),
          hitRateLimit(emailKey, 5, 15 * 60),
        ]);
        if (!byIp.ok || !byEmail.ok) throw new RateLimitedSignin();

        const user = await User.findOne({ email }).select("+passwordHash").lean();
        const valid = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
        if (!user || !valid || !user.active) return null;

        await Promise.all([
          resetRateLimit(emailKey),
          User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }),
        ]);
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
