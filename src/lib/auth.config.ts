import type { NextAuthConfig } from "next-auth";

// Edge-safe config used by middleware. Does NOT import bcrypt / Prisma.
// The full provider with `authorize` lives in `@/lib/auth`.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [], // populated in @/lib/auth
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: "OWNER" | "MANAGER"; businessId: string };
        token.id = u.id;
        token.role = u.role;
        token.businessId = u.businessId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "OWNER" | "MANAGER";
        session.user.businessId = token.businessId as string;
      }
      return session;
    },
  },
};
