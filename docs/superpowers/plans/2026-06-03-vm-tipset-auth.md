# VM-tipset 2026 — Plan 2: Auth & konton

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Username + password authentication with signed-cookie sessions, an admin-seeded first account, and an admin-only endpoint to create accounts — all decoupled from Supabase behind a repository interface so the logic is fully unit-testable without a live database.

**Architecture:** Pure auth primitives (`password`, `session`, `cookies`) are unit-tested directly. Data access is an interface (`UserRepository`) with two implementations: an in-memory fake (for tests) and a thin Supabase adapter (verified once real credentials exist). API route handlers and middleware are thin glue over these; their wiring is verified by `npm run build` (TypeScript) plus the unit tests of the logic they call. Password hashing uses bcrypt in the Node runtime; session verification uses `jose` (JWT) which also runs in the edge middleware.

**Tech Stack:** Next.js 15 route handlers + middleware, `bcryptjs`, `jose`, `@supabase/supabase-js`, `tsx` (seed script), Vitest.

This is **Plan 2 of 5** (after Foundation & scoring). It needs no live Supabase to complete; the only human step is later: creating the Supabase project and pasting credentials, then running the seed + migration.

---

## What needs the human (deferred, NOT blocking this plan)
- A Supabase project: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- A `SESSION_SECRET` (any 32+ char random string — can be generated locally).
- Running `supabase/migrations/0001_users.sql` against the project, then `npm run seed:admin`.

This plan builds everything to read those from env and leaves them blank in `.env.example`.

---

## File structure created by this plan

| File | Responsibility |
|------|----------------|
| `.env.example` | All env vars (blank) the app reads |
| `supabase/migrations/0001_users.sql` | `users` table |
| `lib/supabase.ts` | Lazy Supabase admin client from env |
| `lib/auth/password.ts` | bcrypt hash/verify |
| `lib/auth/session.ts` | jose JWT sign/verify + `SessionPayload` |
| `lib/auth/cookies.ts` | session cookie name + options |
| `lib/db/userRepository.ts` | `UserRepository` interface + `UserRecord`/`NewUser` |
| `lib/db/inMemoryUserRepository.ts` | in-memory impl for tests |
| `lib/db/supabaseUserRepository.ts` | Supabase impl (`mapRow` mapping) |
| `lib/db/repository.ts` | factory returning the Supabase repo |
| `lib/auth/loginService.ts` | `authenticate(repo, username, password)` |
| `app/api/auth/login/route.ts`, `logout/route.ts`, `me/route.ts` | auth endpoints |
| `app/api/admin/users/route.ts` | admin-only create/list users |
| `middleware.ts` | route protection (redirect to /login) |
| `scripts/seed-admin.ts` | one-time admin creation |
| `app/login/page.tsx` | minimal functional login form |

---

## Task 0: Dependencies, env, Supabase client, users migration

**Files:** modify `package.json`; create `.env.example`, `supabase/migrations/0001_users.sql`, `lib/supabase.ts`.

- [ ] **Step 1: Add dependencies to `package.json`** (merge into existing `dependencies`/`devDependencies`, keep existing entries)

Add to `dependencies`:
```json
"@supabase/supabase-js": "2.46.1",
"bcryptjs": "2.4.3",
"jose": "5.9.6"
```
Add to `devDependencies`:
```json
"@types/bcryptjs": "2.4.6",
"tsx": "4.19.2"
```
Add to `scripts`:
```json
"seed:admin": "tsx scripts/seed-admin.ts"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: adds the packages, no errors. (If a pinned version is unavailable, bump to nearest patch and note it.)

- [ ] **Step 3: Create `.env.example`**

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Session (any 32+ char random string)
SESSION_SECRET=

# One-time admin seed
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=Carl

# Football results API (used in Plan 4)
FOOTBALL_DATA_TOKEN=
```

- [ ] **Step 4: Create `supabase/migrations/0001_users.sql`**

```sql
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  is_admin boolean not null default false,
  avatar_url text,
  color text not null default '#2b5fd0',
  created_at timestamptz not null default now()
);
```

- [ ] **Step 5: Create `lib/supabase.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Server-side Supabase client using the service role key. Lazily created. */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: compiles (no type errors).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example supabase/ lib/supabase.ts
git commit -m "chore: add auth deps, env example, supabase client, users migration"
```

---

## Task 1: Password hashing

**Files:** Create `lib/auth/password.ts`, `lib/auth/password.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('hunter2', hash)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
  it('produces a different hash each time (salted)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/password.test.ts`
Expected: FAIL — cannot resolve `./password`.

- [ ] **Step 3: Create `lib/auth/password.ts`**

```ts
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/password.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts lib/auth/password.test.ts
git commit -m "feat: add bcrypt password hashing"
```

---

## Task 2: Session tokens (JWT)

**Files:** Create `lib/auth/session.ts`, `lib/auth/session.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Create `lib/auth/session.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat: add JWT session tokens"
```

---

## Task 3: Session cookie options

**Files:** Create `lib/auth/cookies.ts`, `lib/auth/cookies.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/cookies.test.ts`
Expected: FAIL — cannot resolve `./cookies`.

- [ ] **Step 3: Create `lib/auth/cookies.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/cookies.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/cookies.ts lib/auth/cookies.test.ts
git commit -m "feat: add session cookie options"
```

---

## Task 4: User repository interface, in-memory impl, login service

**Files:** Create `lib/db/userRepository.ts`, `lib/db/inMemoryUserRepository.ts`, `lib/auth/loginService.ts`, `lib/auth/loginService.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/loginService.test.ts
import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from '../db/inMemoryUserRepository';
import { hashPassword } from './password';
import { authenticate } from './loginService';

async function repoWithCarl() {
  const repo = new InMemoryUserRepository();
  await repo.create({
    username: 'carl',
    displayName: 'Carl',
    passwordHash: await hashPassword('hunter2'),
    isAdmin: true,
    color: '#e23b3b',
  });
  return repo;
}

describe('authenticate', () => {
  it('returns a session payload for correct credentials', async () => {
    const repo = await repoWithCarl();
    const session = await authenticate(repo, 'carl', 'hunter2');
    expect(session).toEqual({ userId: expect.any(String), username: 'carl', isAdmin: true });
  });
  it('returns null for a wrong password', async () => {
    const repo = await repoWithCarl();
    expect(await authenticate(repo, 'carl', 'nope')).toBeNull();
  });
  it('returns null for an unknown username', async () => {
    const repo = await repoWithCarl();
    expect(await authenticate(repo, 'ghost', 'hunter2')).toBeNull();
  });
});

describe('InMemoryUserRepository', () => {
  it('rejects duplicate usernames', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({ username: 'carl', displayName: 'Carl', passwordHash: 'x', isAdmin: false, color: '#000' });
    await expect(
      repo.create({ username: 'carl', displayName: 'Carl2', passwordHash: 'y', isAdmin: false, color: '#111' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/loginService.test.ts`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Create `lib/db/userRepository.ts`**

```ts
export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  isAdmin: boolean;
  avatarUrl: string | null;
  color: string;
  createdAt: string;
}

export interface NewUser {
  username: string;
  displayName: string;
  passwordHash: string;
  isAdmin: boolean;
  color: string;
  avatarUrl?: string | null;
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: NewUser): Promise<UserRecord>;
  list(): Promise<UserRecord[]>;
}
```

- [ ] **Step 4: Create `lib/db/inMemoryUserRepository.ts`**

```ts
import type { NewUser, UserRecord, UserRepository } from './userRepository';

export class InMemoryUserRepository implements UserRepository {
  private users: UserRecord[] = [];
  private seq = 0;

  async findByUsername(username: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.username === username) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(user: NewUser): Promise<UserRecord> {
    if (await this.findByUsername(user.username)) {
      throw new Error(`username already exists: ${user.username}`);
    }
    const rec: UserRecord = {
      id: `u${++this.seq}`,
      username: user.username,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      isAdmin: user.isAdmin,
      avatarUrl: user.avatarUrl ?? null,
      color: user.color,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.users.push(rec);
    return rec;
  }

  async list(): Promise<UserRecord[]> {
    return [...this.users];
  }
}
```

- [ ] **Step 5: Create `lib/auth/loginService.ts`**

```ts
import type { UserRepository } from '../db/userRepository';
import { verifyPassword } from './password';
import type { SessionPayload } from './session';

/** Returns a session payload if the credentials are valid, else null. */
export async function authenticate(
  repo: UserRepository,
  username: string,
  password: string,
): Promise<SessionPayload | null> {
  const user = await repo.findByUsername(username);
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { userId: user.id, username: user.username, isAdmin: user.isAdmin };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/auth/loginService.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 7: Commit**

```bash
git add lib/db/userRepository.ts lib/db/inMemoryUserRepository.ts lib/auth/loginService.ts lib/auth/loginService.test.ts
git commit -m "feat: add user repository, in-memory impl, login service"
```

---

## Task 5: Supabase user repository

The chained query glue is verified once real credentials exist; the unit test here covers the snake_case↔camelCase row mapping, which is the only real logic.

**Files:** Create `lib/db/supabaseUserRepository.ts`, `lib/db/supabaseUserRepository.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/db/supabaseUserRepository.test.ts
import { describe, it, expect } from 'vitest';
import { mapRow } from './supabaseUserRepository';

describe('mapRow', () => {
  it('maps a snake_case row to a camelCase UserRecord', () => {
    const row = {
      id: 'abc',
      username: 'carl',
      display_name: 'Carl',
      password_hash: 'hash',
      is_admin: true,
      avatar_url: null,
      color: '#e23b3b',
      created_at: '2026-06-01T10:00:00.000Z',
    };
    expect(mapRow(row)).toEqual({
      id: 'abc',
      username: 'carl',
      displayName: 'Carl',
      passwordHash: 'hash',
      isAdmin: true,
      avatarUrl: null,
      color: '#e23b3b',
      createdAt: '2026-06-01T10:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/db/supabaseUserRepository.test.ts`
Expected: FAIL — cannot resolve `./supabaseUserRepository`.

- [ ] **Step 3: Create `lib/db/supabaseUserRepository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewUser, UserRecord, UserRepository } from './userRepository';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  is_admin: boolean;
  avatar_url: string | null;
  color: string;
  created_at: string;
}

export function mapRow(r: UserRow): UserRecord {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    passwordHash: r.password_hash,
    isAdmin: r.is_admin,
    avatarUrl: r.avatar_url,
    color: r.color,
    createdAt: r.created_at,
  };
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from('users').select('*').eq('username', username).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as UserRow) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as UserRow) : null;
  }

  async create(user: NewUser): Promise<UserRecord> {
    const { data, error } = await this.db
      .from('users')
      .insert({
        username: user.username,
        display_name: user.displayName,
        password_hash: user.passwordHash,
        is_admin: user.isAdmin,
        avatar_url: user.avatarUrl ?? null,
        color: user.color,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as UserRow);
  }

  async list(): Promise<UserRecord[]> {
    const { data, error } = await this.db.from('users').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data as UserRow[]).map(mapRow);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/db/supabaseUserRepository.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Create `lib/db/repository.ts`** (factory; no test — thin wiring verified by build)

```ts
import type { UserRepository } from './userRepository';
import { SupabaseUserRepository } from './supabaseUserRepository';
import { getSupabaseAdmin } from '../supabase';

export function getUserRepository(): UserRepository {
  return new SupabaseUserRepository(getSupabaseAdmin());
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/db/supabaseUserRepository.ts lib/db/supabaseUserRepository.test.ts lib/db/repository.ts
git commit -m "feat: add supabase user repository and factory"
```

---

## Task 6: Auth API routes (login, logout, me)

These are thin handlers; correctness of their logic is covered by Task 1–4 tests. Verification here is `npm run build` (types) plus a manual `curl` flow once Supabase is connected.

**Files:** Create `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`.

- [ ] **Step 1: Create `app/api/auth/login/route.ts`**

```ts
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
```

- [ ] **Step 2: Create `app/api/auth/logout/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { SESSION_COOKIE, clearedSessionCookieOptions } from '@/lib/auth/cookies';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', clearedSessionCookieOptions());
  return res;
}
```

- [ ] **Step 3: Create `app/api/auth/me/route.ts`**

```ts
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
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: compiles; the three routes appear under `/api/auth/*`.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/
git commit -m "feat: add login, logout, me auth routes"
```

---

## Task 7: Admin create/list users route + middleware protection

**Files:** Create `app/api/admin/users/route.ts`, `middleware.ts`.

- [ ] **Step 1: Create `app/api/admin/users/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/cookies';
import { verifySessionToken } from '@/lib/auth/session';
import { getUserRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth/password';

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.isAdmin ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const users = await getUserRepository().list();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id, username: u.username, displayName: u.displayName,
      isAdmin: u.isAdmin, color: u.color, avatarUrl: u.avatarUrl,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: {
    username?: string; displayName?: string; password?: string; color?: string; isAdmin?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { username, displayName, password, color, isAdmin } = body;
  if (!username || !displayName || !password || !color) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const repo = getUserRepository();
  if (await repo.findByUsername(username)) {
    return NextResponse.json({ error: 'username exists' }, { status: 409 });
  }
  const user = await repo.create({
    username, displayName, passwordHash: await hashPassword(password),
    isAdmin: Boolean(isAdmin), color,
  });
  return NextResponse.json(
    { user: { id: user.id, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin, color: user.color } },
    { status: 201 },
  );
}
```

- [ ] **Step 2: Create `middleware.ts`** (at repo root)

```ts
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
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: compiles; middleware is detected; `/api/admin/users` route present. (Note: `verifySessionToken` uses `jose`, which is edge-runtime compatible — middleware must NOT import bcrypt; confirm the build shows no edge-runtime errors.)

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/ middleware.ts
git commit -m "feat: add admin user route and session middleware"
```

---

## Task 8: Admin seed script + minimal login page

**Files:** Create `scripts/seed-admin.ts`, `app/login/page.tsx`.

- [ ] **Step 1: Create `scripts/seed-admin.ts`**

```ts
import { getUserRepository } from '../lib/db/repository';
import { hashPassword } from '../lib/auth/password';

async function main() {
  const username = process.env.ADMIN_USERNAME ?? process.argv[2];
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3];
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Carl';
  if (!username || !password) {
    console.error('Usage: ADMIN_USERNAME=.. ADMIN_PASSWORD=.. npm run seed:admin');
    process.exit(1);
  }
  const repo = getUserRepository();
  if (await repo.findByUsername(username)) {
    console.log(`admin "${username}" already exists`);
    return;
  }
  const user = await repo.create({
    username, displayName, passwordHash: await hashPassword(password),
    isAdmin: true, color: '#e23b3b',
  });
  console.log(`created admin "${user.username}" (${user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Create `app/login/page.tsx`** (minimal — Retro styling comes in Plan 5)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? 'inloggning misslyckades');
  }

  return (
    <main style={{ maxWidth: 360, margin: '12vh auto', padding: 24 }}>
      <h1>VM-tipset 2026</h1>
      <form onSubmit={onSubmit}>
        <input
          placeholder="Användarnamn"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Loggar in…' : 'Logga in'}
        </button>
        {error && <p style={{ color: '#e23b3b' }}>{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: compiles; `/login` route present.

- [ ] **Step 4: Run the full unit suite**

Run: `npm test`
Expected: all Plan 1 + Plan 2 unit tests pass (scoring + password + session + cookies + loginService + mapRow).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-admin.ts app/login/
git commit -m "feat: add admin seed script and login page"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §2 roles (admin creates accounts, no self-register) → Task 7 + Task 8; §11 security (bcrypt, HttpOnly/Secure/SameSite cookie, server-side ownership/admin checks, secrets in env) → Tasks 1/3/6/7 + `lib/supabase.ts`; design datamodell `users` → Task 0 migration + repository.
- **Placeholder scan:** none — full code for every step.
- **Type consistency:** `SessionPayload` is produced by `authenticate` and `createSessionToken`, consumed by `verifySessionToken` and the routes — same shape throughout. `UserRecord`/`NewUser` are the single source of truth used by both repository implementations and `mapRow`.
- **Edge-runtime safety:** middleware imports only `cookies.ts` + `session.ts` (jose), never bcrypt — keeps it edge-compatible.

## Definition of done
- `npm test` green (Plan 1 scoring + Plan 2 auth units).
- `npm run build` compiles (routes + middleware + login page).
- Decoupled from Supabase: everything testable with the in-memory repo; the Supabase adapter + seed are the only parts pending real credentials.
- Ready for Plan 3 (Excel template + upload + parsing).
