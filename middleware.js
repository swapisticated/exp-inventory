import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If the user is not logged in and trying to access any page except auth pages,
    // redirect them to signin
    if (!req.nextauth.token && !req.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    // Match all paths except auth-related paths and static assets
    '/((?!auth|_next/static|_next/image|favicon.ico).*)',
  ],
};