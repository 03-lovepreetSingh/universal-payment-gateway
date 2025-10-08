import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
      },
      async authorize(credentials: any) {
        if (!credentials?.address || !credentials?.signature || !credentials?.message) {
          return null;
        }

        try {
          // Verify the signature
          const recoveredAddress = ethers.verifyMessage(
            credentials.message,
            credentials.signature
          );

          if (recoveredAddress.toLowerCase() !== credentials.address.toLowerCase()) {
            return null;
          }

          // Check if user exists, if not create one
          let user = await db.query.users.findFirst({
            where: eq(users.wallet, credentials.address.toLowerCase()),
          });

          if (!user) {
            const [newUser] = await db.insert(users).values({
              wallet: credentials.address.toLowerCase(),
              email: null,
              name: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            user = newUser;
          }

          return {
            id: user.id,
            address: user.wallet,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.address = user.address;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token.address) {
        session.user.address = token.address as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };