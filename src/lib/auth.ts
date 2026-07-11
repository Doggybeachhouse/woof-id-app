import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { consumeTopUpReturnToken } from "@/lib/auth/topupReturnToken";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        magicToken: { label: "Magic Token", type: "text" },
        topupReturnToken: { label: "Top-up Return Token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;

        const topupReturnToken = credentials?.topupReturnToken?.trim();
        if (topupReturnToken) {
          const consumed = await consumeTopUpReturnToken(topupReturnToken);
          if (!consumed || consumed.email !== email) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          };
        }

        const magicToken = credentials?.magicToken?.trim();
        if (magicToken) {
          const consumed = await consumeAuthToken(magicToken, "magic");
          if (!consumed || consumed.email !== email) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          };
        }

        const password = credentials?.password ?? "";
        if (!password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, role: user.role, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id: string }).id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
