export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getUserRepository } from '@/lib/db/repository';
import { authenticate } from '@/lib/auth/loginService';
import { createSessionToken } from '@/lib/auth/session';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/cookies';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'missing credentials' }, { status: 400 });
  }
  const session = await authenticate(getUserRepository(), username, password);
  if (!session) {
    return NextResponse.json({ error: 'fel användarnamn eller lösenord' }, { status: 401 });
  }
  const token = await createSessionToken(session);
  const res = NextResponse.json({ user: { username: session.username, isAdmin: session.isAdmin } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
