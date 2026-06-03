import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

export interface SessionPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET must be set');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload, expiresIn = '30d'): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId === 'string' &&
      typeof payload.username === 'string' &&
      typeof payload.isAdmin === 'boolean'
    ) {
      return { userId: payload.userId, username: payload.username, isAdmin: payload.isAdmin };
    }
    return null;
  } catch {
    return null;
  }
}
