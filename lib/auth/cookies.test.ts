// lib/auth/cookies.test.ts
import { describe, it, expect } from 'vitest';
import { SESSION_COOKIE, sessionCookieOptions, clearedSessionCookieOptions } from './cookies';

describe('session cookie options', () => {
  it('exposes a stable cookie name', () => {
    expect(SESSION_COOKIE).toBe('vmt_session');
  });
  it('is httpOnly, lax, root-path with a 30-day default maxAge', () => {
    const o = sessionCookieOptions();
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe('lax');
    expect(o.path).toBe('/');
    expect(o.maxAge).toBe(60 * 60 * 24 * 30);
  });
  it('cleared options expire the cookie immediately', () => {
    expect(clearedSessionCookieOptions().maxAge).toBe(0);
  });
});
