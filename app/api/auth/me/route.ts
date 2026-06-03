export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/cookies';
import { verifySessionToken } from '@/lib/auth/session';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return NextResponse.json({
    user: session ? { userId: session.userId, username: session.username, isAdmin: session.isAdmin } : null,
  });
}
