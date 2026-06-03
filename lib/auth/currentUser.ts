import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './cookies';
import { verifySessionToken, type SessionPayload } from './session';

export async function currentUser(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}
