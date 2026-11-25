import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = [
    '/dashboard',
    '/portfolios',
    '/intelligence',
    '/reports',
    '/transactions',
    '/holdings',
    '/settings',
  ];

  const isProtected = protectedPaths.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected) {
    const sessionCookie =
      request.cookies.get('__session')?.value ||
      request.cookies.get('firebase_token')?.value ||
      request.cookies.get('auth_token')?.value;

    const devAuth = request.cookies.get('nexfolio_dev_auth')?.value;
    const hasAuth = Boolean(sessionCookie || devAuth);

    // If strictly in production and not authenticated, redirect to login
    if (!hasAuth && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portfolios/:path*',
    '/intelligence/:path*',
    '/reports/:path*',
    '/transactions/:path*',
    '/holdings/:path*',
    '/settings/:path*',
  ],
};
