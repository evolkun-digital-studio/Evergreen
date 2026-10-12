import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/cms/constants";

/**
 * Database-free part of the Auth.js config. The proxy imports only this so it can do a
 * cheap, optimistic JWT check; the real authorisation happens in the data access layer.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role?: Role }).role ?? "AUTHOR";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; name?: string | null; email?: string | null; image?: string | null };
  }
}
