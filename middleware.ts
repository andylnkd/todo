import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// Define which routes are publicly accessible
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', // Matches /sign-in and /sign-in/*
  '/sign-up(.*)', // Matches /sign-up and /sign-up/*
  '/'             // Matches the home page exactly
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  // Check if the route is NOT public
  if (!isPublicRoute(req)) {
    // If it's not a public route, Clerk's default behavior
    // within the middleware will automatically protect it
    // by checking the auth state. No need for an explicit call here.
    // If you needed more complex logic (like role checks),
    // you would add it here using auth.userId, auth.has, etc.
    // and potentially return NextResponse.redirect(...) or NextResponse.next().
  }

  // If the route IS public (or if the non-public check passes implicitly),
  // the middleware allows the request to proceed without further action here.
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};