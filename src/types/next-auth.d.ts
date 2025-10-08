import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      address: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    address: string;
    email?: string | null;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    address: string;
  }
}