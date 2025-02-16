// app/api/auth/[...nextauth]/route.js
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('Authorizing credentials...'); // Debug log
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials'); // Debug log
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        console.log('User found:', !!user); // Debug log (don't log the full user object)

        if (!user) {
          console.log('No user found'); // Debug log
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        console.log('Password valid:', isPasswordValid); // Debug log

        if (!isPasswordValid) {
          console.log('Invalid password'); // Debug log
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };