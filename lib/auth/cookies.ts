export const SESSION_COOKIE = 'vmt_session';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(maxAge: number = THIRTY_DAYS): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function clearedSessionCookieOptions(): CookieOptions {
  return sessionCookieOptions(0);
}
