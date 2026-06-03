// lib/auth/session.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT } from 'jose';
import { createSessionToken, verifySessionToken, type SessionPayload } from './session';

const SECRET = 'test-secret-that-is-at-least-32-chars-long';

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

const payload: SessionPayload = { userId: 'u1', username: 'carl', isAdmin: true };

describe('session tokens', () => {
  it('round-trips a valid token', async () => {
    const token = await createSessionToken(payload);
    expect(await verifySessionToken(token)).toEqual(payload);
  });

  it('rejects a tampered token', async () => {
    const token = await createSessionToken(payload);
    const tampered = token.slice(0, -3) + 'aaa';
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const otherKey = new TextEncoder().encode('a-completely-different-secret-key-32xx');
    const foreign = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(otherKey);
    expect(await verifySessionToken(foreign)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const key = new TextEncoder().encode(SECRET);
    const past = Math.floor(Date.now() / 1000) - 60;
    const expired = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(past)
      .sign(key);
    expect(await verifySessionToken(expired)).toBeNull();
  });
});
