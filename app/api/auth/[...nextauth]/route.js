// app/api/auth/[...nextauth]/route.js
import prisma from '@/lib/prisma';
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
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
      async authorize(credentials, req) {
        if (!credentials) {
          throw new Error('No credentials provided');
        }

        const { email, password } = credentials;

        if (!email || !password) {
          throw new Error('Please enter an email and password');
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: email
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true
            }
          });

          if (!user) {
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await compare(password, user.password);

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          // Return only the data needed for the session
          return {
            id: user.id.toString(), // Convert to string for JWT
            email: user.email,
            name: user.name,
            role: user.role
          };

        } catch (error) {
          console.error('Authorization error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
  logger: {
    error: (code, ...message) => {
      console.error(code, message);
    },
    warn: (code, ...message) => {
      console.warn(code, message);
    },
    debug: (code, ...message) => {
      console.debug(code, message);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };