import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/cookies';
import { verifySessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes guard themselves and must return JSON (not an HTML redirect),
  // so middleware only protects pages. The login page stays reachable logged out.
  if (pathname.startsWith('/api') || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)'],
};
