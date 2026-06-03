# VM-tipset 2026 — Plan 5: UI (Retro Panini), PWA & deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Retro Panini-VM interface — the hero "Loppet" race barometer, the leaderboard, the match list and the stats — plus the admin screens, make it an installable PWA, and write the deploy + credentials checklist.

**Architecture:** Pure view-model helpers (merge standings with users, build match views from fixtures+results, compute stats, position the race barometer) are unit-tested with no DB. The pages are Next.js server components that read through the repository factories and degrade gracefully to an empty shell when Supabase is not yet connected (so the styled app is viewable with `npm run dev` before any credentials exist). Styling uses the Tailwind retro tokens already in `tailwind.config.ts`. PWA = web manifest + icon + a small offline-shell service worker.

**Tech Stack:** Next.js 15 App Router (server + client components), Tailwind CSS, Vitest.

This is **Plan 5 of 5** (final). It consumes everything: scoring (1), auth (2), tips (3), results/standings (4). After it, the only remaining work is the human deploy steps in `DEPLOY.md`.

---

## File structure created by this plan

| File | Responsibility |
|------|----------------|
| `lib/view/barometer.ts` | pure: points → track position |
| `lib/view/standingsView.ts` | pure: standings + users → ranked view rows + movement |
| `lib/view/matchView.ts` | pure: db matches + fixtures → display match views |
| `lib/view/stats.ts` | pure: standings view → fun-fact cards |
| `lib/view/*.test.ts` | tests for the above |
| `lib/view/serverData.ts` | server-only loaders (graceful empty on no DB) |
| `components/{Avatar,Card,Pill,Nav,RaceBarometer,Leaderboard,MatchList,StatGrid}.tsx` | retro UI |
| `app/layout.tsx` (modify), `app/page.tsx` (Loppet), `app/tabell/page.tsx`, `app/matcher/page.tsx`, `app/statistik/page.tsx` | the four views |
| `app/login/page.tsx` (restyle), `app/tips/page.tsx` (restyle) | auth + upload, retro |
| `app/admin/page.tsx` + `components/admin/*` | admin dashboard |
| `app/manifest.ts`, `public/sw.js`, `components/RegisterSW.tsx`, `public/icon.svg` | PWA |
| `DEPLOY.md`, `README.md` | deploy + credentials checklist |

---

## Task 0: View-model helpers (pure, tested)

**Files:** Create `lib/view/barometer.ts`, `standingsView.ts`, `matchView.ts`, `stats.ts` and their `.test.ts`.

- [ ] **Step 1: Write `lib/view/barometer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { progressPercent } from './barometer';

describe('progressPercent', () => {
  it('is 0 at zero points and ~the cap at max', () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(168)).toBe(92);
  });
  it('is linear in between', () => {
    expect(progressPercent(84)).toBe(46);
  });
  it('clamps above max', () => {
    expect(progressPercent(200)).toBe(92);
  });
});
```

- [ ] **Step 2: Create `lib/view/barometer.ts`**

```ts
import { MAX_POINTS } from '../domain/rules';

/** Horizontal position (% from left) of a horse on the track. 0p→0%, max→92% (8% reserved for the finish). */
export function progressPercent(points: number, max: number = MAX_POINTS): number {
  const clamped = Math.max(0, Math.min(points, max));
  return Math.round((clamped / max) * 92);
}
```

- [ ] **Step 3: Write `lib/view/standingsView.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mergeStandings } from './standingsView';
import type { Standing } from '../results/types';
import type { UserRecord } from '../db/userRepository';

const bd = { matchPoints: 0, groupWinnerPoints: 0, mostGoalsPoints: 0, fewestGoalsPoints: 0, finalistPoints: 0, bronzePoints: 0, championPoints: 0 };
const user = (id: string, name: string, color: string): UserRecord => ({
  id, username: name.toLowerCase(), displayName: name, passwordHash: 'x', isAdmin: false, avatarUrl: null, color, createdAt: '',
});

describe('mergeStandings', () => {
  const users = [user('u1', 'Carl', '#e23b3b'), user('u2', 'Emil', '#2b5fd0')];
  const standings: Standing[] = [
    { userId: 'u1', rank: 1, prevRank: 2, totalPoints: 63, matchPoints: 50, bonusPoints: 13, breakdown: bd },
    { userId: 'u2', rank: 2, prevRank: 1, totalPoints: 58, matchPoints: 48, bonusPoints: 10, breakdown: bd },
  ];
  it('joins display info and computes movement', () => {
    const view = mergeStandings(standings, users);
    expect(view[0]).toMatchObject({ userId: 'u1', displayName: 'Carl', color: '#e23b3b', rank: 1, totalPoints: 63, movement: 'up' });
    expect(view[1].movement).toBe('down');
  });
  it('marks a never-before-ranked user as new', () => {
    const view = mergeStandings([{ ...standings[0], prevRank: null }], users);
    expect(view[0].movement).toBe('new');
  });
  it('sorts by rank and tolerates a missing user record', () => {
    const view = mergeStandings(standings, [users[0]]);
    expect(view.map((v) => v.rank)).toEqual([1, 2]);
    expect(view[1].displayName).toBe('Okänd'); // u2 record missing → fallback
  });
});
```

- [ ] **Step 4: Create `lib/view/standingsView.ts`**

```ts
import type { Standing } from '../results/types';
import type { UserRecord } from '../db/userRepository';

export type Movement = 'up' | 'down' | 'same' | 'new';

export interface StandingView {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  rank: number;
  prevRank: number | null;
  totalPoints: number;
  matchPoints: number;
  bonusPoints: number;
  movement: Movement;
}

function movementOf(rank: number, prevRank: number | null): Movement {
  if (prevRank === null) return 'new';
  if (prevRank > rank) return 'up';
  if (prevRank < rank) return 'down';
  return 'same';
}

export function mergeStandings(standings: Standing[], users: UserRecord[]): StandingView[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  return [...standings]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const u = byId.get(s.userId);
      return {
        userId: s.userId,
        displayName: u?.displayName ?? 'Okänd',
        color: u?.color ?? '#566087',
        avatarUrl: u?.avatarUrl ?? null,
        rank: s.rank,
        prevRank: s.prevRank,
        totalPoints: s.totalPoints,
        matchPoints: s.matchPoints,
        bonusPoints: s.bonusPoints,
        movement: movementOf(s.rank, s.prevRank),
      };
    });
}
```

- [ ] **Step 5: Write `lib/view/matchView.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toMatchViews } from './matchView';
import type { Match } from '../domain/types';
import type { Fixtures } from '../fixtures/types';

const fixtures: Fixtures = {
  season: '2026', firstKickoff: '2026-06-11T19:00:00Z',
  teams: [],
  matches: [
    { id: 'G001', stage: 'group', group: 'A', homeTeamId: 'mexico', awayTeamId: 'south-korea', homeLabel: 'Mexico', awayLabel: 'South Korea', kickoff: '2026-06-11T19:00:00Z', ground: 'Mexico City' },
  ],
};

describe('toMatchViews', () => {
  it('merges db result onto fixture labels + derives outcome', () => {
    const db: Match[] = [
      { id: 'G001', stage: 'group', group: 'A', homeTeamId: 'mexico', awayTeamId: 'south-korea', status: 'finished', homeScore: 2, awayScore: 1 },
    ];
    const [v] = toMatchViews(db, fixtures);
    expect(v).toMatchObject({ id: 'G001', homeLabel: 'Mexico', awayLabel: 'South Korea', status: 'finished', homeScore: 2, awayScore: 1, outcome: '1' });
  });
  it('falls back to fixture (scheduled) when there is no db row', () => {
    const [v] = toMatchViews([], fixtures);
    expect(v).toMatchObject({ id: 'G001', status: 'scheduled', homeScore: null, outcome: null });
  });
});
```

- [ ] **Step 6: Create `lib/view/matchView.ts`**

```ts
import type { Match, Pick } from '../domain/types';
import type { Fixtures } from '../fixtures/types';
import { matchOutcome } from '../scoring/outcome';

export interface MatchView {
  id: string;
  stage: string;
  group: string | null;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  outcome: Pick | null;
}

export function toMatchViews(dbMatches: Match[], fixtures: Fixtures): MatchView[] {
  const byId = new Map(dbMatches.map((m) => [m.id, m]));
  return fixtures.matches.map((f) => {
    const db = byId.get(f.id);
    const merged: Match = db ?? {
      id: f.id, stage: f.stage, group: f.group,
      homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId,
      status: 'scheduled', homeScore: null, awayScore: null,
    };
    return {
      id: f.id, stage: f.stage, group: f.group,
      homeLabel: f.homeLabel, awayLabel: f.awayLabel, kickoff: f.kickoff,
      status: merged.status, homeScore: merged.homeScore, awayScore: merged.awayScore,
      outcome: matchOutcome(merged),
    };
  });
}
```

- [ ] **Step 7: Write `lib/view/stats.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';
import type { StandingView } from './standingsView';

const v = (over: Partial<StandingView>): StandingView => ({
  userId: 'x', displayName: 'X', color: '#000', avatarUrl: null,
  rank: 1, prevRank: 1, totalPoints: 0, matchPoints: 0, bonusPoints: 0, movement: 'same', ...over,
});

describe('computeStats', () => {
  it('returns leader, best-on-results, biggest climber, most bonus', () => {
    const views = [
      v({ displayName: 'Carl', rank: 1, totalPoints: 63, matchPoints: 50, bonusPoints: 13, prevRank: 1, movement: 'same' }),
      v({ displayName: 'Emil', rank: 2, totalPoints: 58, matchPoints: 40, bonusPoints: 18, prevRank: 4, movement: 'up' }),
    ];
    const stats = computeStats(views);
    const byKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    expect(byKey.leader.who).toBe('Carl');
    expect(byKey.bestResults.who).toBe('Carl');     // highest matchPoints
    expect(byKey.climber.who).toBe('Emil');         // prevRank 4 → 2 = +2
    expect(byKey.mostBonus.who).toBe('Emil');       // highest bonusPoints
  });
  it('returns an empty list when there are no standings', () => {
    expect(computeStats([])).toEqual([]);
  });
});
```

- [ ] **Step 8: Create `lib/view/stats.ts`**

```ts
import type { StandingView } from './standingsView';

export interface Stat {
  key: string;
  label: string;
  value: string;
  who: string;
  emoji: string;
}

function top<T>(items: StandingView[], by: (s: StandingView) => number): StandingView | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => by(b) - by(a))[0];
}

export function computeStats(views: StandingView[]): Stat[] {
  if (views.length === 0) return [];
  const leader = top(views, (s) => -s.rank)!; // rank 1 → highest -rank
  const best = top(views, (s) => s.matchPoints)!;
  const climber = top(views, (s) => (s.prevRank ?? s.rank) - s.rank)!;
  const bonus = top(views, (s) => s.bonusPoints)!;
  const climb = (climber.prevRank ?? climber.rank) - climber.rank;
  return [
    { key: 'leader', label: 'Leder loppet', value: `${leader.totalPoints} p`, who: leader.displayName, emoji: '👑' },
    { key: 'bestResults', label: 'Bäst på resultat', value: `${best.matchPoints} rätt`, who: best.displayName, emoji: '🎯' },
    { key: 'climber', label: 'Dagens klättrare', value: climb > 0 ? `+${climb} placeringar` : 'står still', who: climber.displayName, emoji: '🚀' },
    { key: 'mostBonus', label: 'Mest bonuspoäng', value: `${bonus.bonusPoints} p`, who: bonus.displayName, emoji: '⭐' },
  ];
}
```

- [ ] **Step 9: Run all view tests** — `npx vitest run lib/view/` → 11 pass. **Step 10: Commit** `git add lib/view/barometer.ts lib/view/barometer.test.ts lib/view/standingsView.ts lib/view/standingsView.test.ts lib/view/matchView.ts lib/view/matchView.test.ts lib/view/stats.ts lib/view/stats.test.ts && git commit -m "feat: add view-model helpers"`.

---

## Task 1: Server data loaders + design system + core components

**Files:** Create `lib/view/serverData.ts`, `app/globals.css` (replace), `components/{Avatar,Card,Pill,Nav}.tsx`; modify `app/layout.tsx`.

- [ ] **Step 1: Create `lib/view/serverData.ts`** (server-only; degrades to empty on no DB)

```ts
import { loadFixtures } from '../fixtures/load';
import { getStandingsRepository, getUserRepository, getMatchRepository } from '../db/repository';
import { mergeStandings, type StandingView } from './standingsView';
import { toMatchViews, type MatchView } from './matchView';

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function loadStandingsView(): Promise<StandingView[]> {
  const [standings, users] = await Promise.all([
    safe(() => getStandingsRepository().getAll(), []),
    safe(() => getUserRepository().list(), []),
  ]);
  return mergeStandings(standings, users);
}

export async function loadMatchViews(): Promise<MatchView[]> {
  const dbMatches = await safe(() => getMatchRepository().all(), []);
  return toMatchViews(dbMatches, loadFixtures());
}
```

- [ ] **Step 2: Replace `app/globals.css`** with the retro base

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }

body {
  background-color: #fdeecf;
  background-image: radial-gradient(#1c1c22 1.1px, transparent 1.1px);
  background-size: 18px 18px;
  background-position: -9px -9px;
  color: #1c1c22;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

@layer components {
  .retro-card { @apply bg-paper border-[3px] border-ink rounded-2xl shadow-hard; }
  .retro-pill { @apply inline-block text-white text-[11px] font-extrabold tracking-wider uppercase px-3 py-1.5 rounded-full border-[2.5px] border-ink; }
  .retro-tab { @apply text-[13px] font-extrabold uppercase tracking-wide px-3.5 py-2 rounded-full border-[2.5px] border-ink bg-white; }
  .retro-tab-active { @apply bg-ink text-white; }
  .anton { font-family: 'Anton', Impact, sans-serif; }
}
```

- [ ] **Step 3: Create `components/Avatar.tsx`**

```tsx
export function Avatar({ name, color, avatarUrl, size = 40 }: { name: string; color: string; avatarUrl: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, borderWidth: 3, boxShadow: '3px 3px 0 #1c1c22' };
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="rounded-full border-ink object-cover" style={style} />;
  }
  return (
    <span
      className="rounded-full border-ink text-white font-extrabold flex items-center justify-center"
      style={{ ...style, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
```

- [ ] **Step 4: Create `components/Card.tsx`**

```tsx
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`retro-card p-4 ${className}`}>{children}</div>;
}

export function SectionHeader({ pill, pillColor, title }: { pill: string; pillColor: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <span className="retro-pill" style={{ background: pillColor, boxShadow: '2px 2px 0 #1c1c22' }}>{pill}</span>
      <h3 className="anton text-2xl m-0">{title}</h3>
    </div>
  );
}
```

- [ ] **Step 5: Create `components/Pill.tsx`**

```tsx
export function Pill({ children, color = '#1c1c22' }: { children: React.ReactNode; color?: string }) {
  return <span className="retro-pill" style={{ background: color, boxShadow: '2px 2px 0 #1c1c22' }}>{children}</span>;
}
```

- [ ] **Step 6: Create `components/Nav.tsx`** (client — highlights the active tab)

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Loppet' },
  { href: '/tabell', label: 'Tabell' },
  { href: '/matcher', label: 'Matcher' },
  { href: '/statistik', label: 'Statistik' },
  { href: '/tips', label: 'Mitt tips' },
];

export function Nav() {
  const path = usePathname();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <Link href="/" className="flex items-center gap-3 no-underline text-ink">
        <span className="w-11 h-11 rounded-full bg-white border-[3px] border-ink" style={{ boxShadow: '3px 3px 0 #1c1c22' }} />
        <span className="anton text-3xl leading-none">VM-TIPSET <span className="text-vmred">2026</span></span>
      </Link>
      <nav className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`retro-tab no-underline text-ink ${active ? 'retro-tab-active !text-white' : ''}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 7: Modify `app/layout.tsx`** — load the Anton font + wrap content with the Nav

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'VM-tipset 2026',
  description: 'Kompisgängets VM-tips 2026',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="max-w-[1080px] mx-auto px-4 py-5 pb-16">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify build** — `npm run build`. **Step 9: Commit** `git add lib/view/serverData.ts app/globals.css app/layout.tsx components/Avatar.tsx components/Card.tsx components/Pill.tsx components/Nav.tsx && git commit -m "feat: add retro design system and core components"`.

---

## Task 2: RaceBarometer + Leaderboard + MatchList + StatGrid

**Files:** Create `components/RaceBarometer.tsx`, `components/Leaderboard.tsx`, `components/MatchList.tsx`, `components/StatGrid.tsx`.

- [ ] **Step 1: Create `components/RaceBarometer.tsx`**

```tsx
import { Avatar } from './Avatar';
import { progressPercent } from '@/lib/view/barometer';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceBarometer({ standings }: { standings: StandingView[] }) {
  return (
    <div className="retro-card overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-ink"
           style={{ background: 'repeating-linear-gradient(45deg,#e23b3b 0 14px,#cf3030 14px 28px)' }}>
        <h2 className="anton text-white text-3xl m-0" style={{ textShadow: '3px 3px 0 #1c1c22' }}>🏇 LOPPET</h2>
        <span className="text-white text-xs font-extrabold uppercase tracking-wider bg-ink px-2.5 py-1.5 rounded-full">Mål: 168p</span>
      </div>
      <div className="relative px-4 pt-4 pb-2">
        {standings.length === 0 && <p className="text-center py-10 font-bold opacity-60">Inga tips ännu — loppet börjar när gänget laddat upp.</p>}
        {standings.map((s) => (
          <div key={s.userId} className="relative h-[52px] mr-[60px]">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded bg-[#efe4cc] border-y-2 border-[#d9cba7]" />
            <span className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-[11px] font-extrabold uppercase tracking-wide bg-cream border-2 border-ink rounded-full px-1.5 py-0.5">
              {s.displayName}
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5" style={{ left: `${progressPercent(s.totalPoints)}%` }}>
              {s.rank === 1 && <span className="text-base leading-none">👑</span>}
              <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={42} />
              <span className="text-[11px] font-extrabold bg-white border-2 border-ink rounded-full px-1.5" style={{ boxShadow: '1.5px 1.5px 0 #1c1c22' }}>{s.totalPoints}p</span>
            </div>
          </div>
        ))}
        <div className="absolute top-3.5 bottom-8 right-[54px] w-4 border-[2.5px] border-ink rounded"
             style={{ background: 'repeating-linear-gradient(0deg,#1c1c22 0 8px,#fff 8px 16px)' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/Leaderboard.tsx`**

```tsx
import { Avatar } from './Avatar';
import { Card, SectionHeader } from './Card';
import type { StandingView } from '@/lib/view/standingsView';
import { MAX_POINTS } from '@/lib/domain/rules';

const MOVE: Record<string, string> = { up: '▲ upp', down: '▼ ner', same: '— oförändrad', new: '★ ny' };
const MOVE_COLOR: Record<string, string> = { up: '#1b9e5a', down: '#e23b3b', same: '#8a7d5e', new: '#2b5fd0' };

export function Leaderboard({ standings, limit }: { standings: StandingView[]; limit?: number }) {
  const rows = limit ? standings.slice(0, limit) : standings;
  return (
    <Card>
      <SectionHeader pill="Tabell" pillColor="#1b9e5a" title="STÄLLNING" />
      {rows.length === 0 && <p className="font-bold opacity-60">Inga tips ännu.</p>}
      {rows.map((s) => (
        <div key={s.userId} className="grid grid-cols-[30px_38px_1fr_auto] items-center gap-2.5 py-2 border-b-2 border-dashed border-[#e4d6b4] last:border-0">
          <div className="anton text-xl text-center" style={{ color: s.rank === 1 ? '#f5b833' : s.rank === 2 ? '#9aa0ad' : s.rank === 3 ? '#c8772e' : '#1c1c22' }}>{s.rank}</div>
          <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={34} />
          <div>
            <div className="font-extrabold text-[15px]">{s.displayName}</div>
            <div className="text-[11px] font-semibold" style={{ color: MOVE_COLOR[s.movement] }}>{MOVE[s.movement]}</div>
          </div>
          <div className="anton text-2xl text-right">{s.totalPoints}<span className="block text-[11px] font-bold text-[#8a7d5e] -mt-1">av {MAX_POINTS}</span></div>
        </div>
      ))}
    </Card>
  );
}
```

- [ ] **Step 3: Create `components/MatchList.tsx`**

```tsx
import { Card, SectionHeader } from './Card';
import type { MatchView } from '@/lib/view/matchView';

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

export function MatchList({ matches, title = 'MATCHER' }: { matches: MatchView[]; title?: string }) {
  return (
    <Card>
      <SectionHeader pill="Matcher" pillColor="#2b5fd0" title={title} />
      {matches.length === 0 && <p className="font-bold opacity-60">Inga matcher inlästa ännu.</p>}
      {matches.map((m) => (
        <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 border-b-2 border-dashed border-[#e4d6b4] last:border-0">
          <div className="font-extrabold text-sm text-right">{m.homeLabel}</div>
          <div className="anton text-lg text-white px-2.5 py-0.5 rounded-lg text-center min-w-[64px]"
               style={{ background: m.status === 'finished' ? '#1c1c22' : m.status === 'live' ? '#e23b3b' : '#8a7d5e' }}>
            {m.status === 'finished' || m.status === 'live' ? `${m.homeScore}–${m.awayScore}` : fmtDate(m.kickoff)}
          </div>
          <div className="font-extrabold text-sm">{m.awayLabel}</div>
        </div>
      ))}
    </Card>
  );
}
```

- [ ] **Step 4: Create `components/StatGrid.tsx`**

```tsx
import { Card, SectionHeader } from './Card';
import type { Stat } from '@/lib/view/stats';

const BG = ['#fff4f4', '#eef3ff', '#eefaf2', '#fff8e8'];

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <Card>
      <SectionHeader pill="Statistik" pillColor="#e23b3b" title="KUL FAKTA" />
      {stats.length === 0 && <p className="font-bold opacity-60">Statistik dyker upp när matcherna rullar.</p>}
      <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
        {stats.map((s, i) => (
          <div key={s.key} className="border-[2.5px] border-ink rounded-xl p-3" style={{ background: BG[i % BG.length], boxShadow: '3px 3px 0 #1c1c22' }}>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#8a7d5e]">{s.label}</div>
            <div className="anton text-lg mt-1">{s.value}</div>
            <div className="font-extrabold text-xs mt-0.5">{s.who} {s.emoji}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Verify build** — `npm run build`. **Step 6: Commit** `git add components/RaceBarometer.tsx components/Leaderboard.tsx components/MatchList.tsx components/StatGrid.tsx && git commit -m "feat: add race barometer, leaderboard, match list, stat grid"`.

---

## Task 3: The four view pages

**Files:** Replace `app/page.tsx`; create `app/tabell/page.tsx`, `app/matcher/page.tsx`, `app/statistik/page.tsx`.

- [ ] **Step 1: Replace `app/page.tsx`** (Loppet — hero + top leaderboard)

```tsx
import { RaceBarometer } from '@/components/RaceBarometer';
import { Leaderboard } from '@/components/Leaderboard';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function LoppetPage() {
  const standings = await loadStandingsView();
  return (
    <div className="flex flex-col gap-4">
      <RaceBarometer standings={standings} />
      <Leaderboard standings={standings} limit={5} />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/tabell/page.tsx`**

```tsx
import { Leaderboard } from '@/components/Leaderboard';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function TabellPage() {
  const standings = await loadStandingsView();
  return <Leaderboard standings={standings} />;
}
```

- [ ] **Step 3: Create `app/matcher/page.tsx`**

```tsx
import { MatchList } from '@/components/MatchList';
import { loadMatchViews } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function MatcherPage() {
  const matches = await loadMatchViews();
  const groupMatches = matches.filter((m) => m.stage === 'group');
  return <MatchList matches={groupMatches} title="GRUPPSPEL" />;
}
```

- [ ] **Step 4: Create `app/statistik/page.tsx`**

```tsx
import { StatGrid } from '@/components/StatGrid';
import { computeStats } from '@/lib/view/stats';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const standings = await loadStandingsView();
  return <StatGrid stats={computeStats(standings)} />;
}
```

- [ ] **Step 5: Verify build + full suite** — `npm run build` (routes `/`, `/tabell`, `/matcher`, `/statistik`), `npm test`. **Step 6: Commit** `git add app/page.tsx app/tabell app/matcher app/statistik && git commit -m "feat: add Loppet, Tabell, Matcher, Statistik pages"`.

---

## Task 4: Restyle login + tips, and the admin dashboard

**Files:** Replace `app/login/page.tsx`, `app/tips/page.tsx`; create `app/admin/page.tsx`, `components/admin/{CreateUser,EnterResult,SyncResults,UnlockUser}.tsx`.

- [ ] **Step 1: Replace `app/login/page.tsx`** (retro card)

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
    setError(null); setLoading(true);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    setLoading(false);
    if (res.ok) { router.push('/'); router.refresh(); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? 'inloggning misslyckades');
  }

  return (
    <main className="max-w-[360px] mx-auto mt-[12vh]">
      <div className="retro-card p-6">
        <h1 className="anton text-3xl mb-4">VM-TIPSET <span className="text-vmred">2026</span></h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
          <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Användarnamn" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" type="password" placeholder="Lösenord" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <button type="submit" disabled={loading} className="retro-tab retro-tab-active !text-white cursor-pointer">{loading ? 'Loggar in…' : 'Logga in'}</button>
          {error && <p className="text-vmred font-bold text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Replace `app/tips/page.tsx`** (retro upload + confirm — same logic as Plan 3, restyled)

```tsx
'use client';
import { useState } from 'react';

interface Parsed { name: string | null; matchPicks: Record<string, string>; bonus: Record<string, string>; warnings: string[]; }

export default function TipsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string) {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(url, { method: 'POST', body: fd });
    setBusy(false);
    return { res, data: await res.json().catch(() => ({})) };
  }
  async function preview() { const r = await post('/api/predictions/preview'); if (r) { if (r.res.ok) setParsed(r.data.parsed); else setMsg(r.data.error ?? 'kunde inte läsa filen'); } }
  async function save() { const r = await post('/api/predictions'); if (r) setMsg(r.res.ok ? `Sparat! ${r.data.saved.matches} matcher, ${r.data.saved.bonus} bonus.` : (r.data.error ?? 'kunde inte spara')); }

  return (
    <div className="retro-card p-6 max-w-[640px] mx-auto">
      <h1 className="anton text-3xl mb-2">Ladda upp ditt tips</h1>
      <p className="mb-3"><a className="font-extrabold underline" href="/api/template">Ladda ner tipslappen (.xlsx)</a> — fyll i och ladda upp nedan.</p>
      <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setMsg(null); }} />
      <div className="mt-3 flex gap-2">
        <button className="retro-tab cursor-pointer" onClick={preview} disabled={!file || busy}>Visa tolkning</button>
        <button className="retro-tab retro-tab-active !text-white cursor-pointer" onClick={save} disabled={!file || busy}>Spara tips</button>
      </div>
      {msg && <p className="mt-3 font-bold">{msg}</p>}
      {parsed && (
        <div className="mt-4 border-t-2 border-dashed border-[#e4d6b4] pt-4">
          <h2 className="anton text-xl mb-2">Så här tolkade vi ditt tips</h2>
          <p>Namn: {parsed.name ?? '—'}</p>
          <p>Matchtips: {Object.keys(parsed.matchPicks).length} / 72 · Bonus: {Object.keys(parsed.bonus).length} / 18</p>
          {parsed.warnings.length > 0 && <ul className="text-vmred list-disc ml-5">{parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <p className="text-sm text-[#666] mt-2">Stämmer det? Klicka &quot;Spara tips&quot;.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/admin/CreateUser.tsx`**

```tsx
'use client';
import { useState } from 'react';

export function CreateUser() {
  const [f, setF] = useState({ username: '', displayName: '', password: '', color: '#2b5fd0', isAdmin: false });
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Skapade ${d.user.displayName}` : (d.error ?? 'fel'));
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Användarnamn" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Visningsnamn" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Lösenord" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <label className="flex items-center gap-2"><span>Färg</span><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.isAdmin} onChange={(e) => setF({ ...f, isAdmin: e.target.checked })} /> Admin</label>
      <button className="retro-tab retro-tab-active !text-white cursor-pointer">Skapa konto</button>
      {msg && <p className="font-bold">{msg}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Create `components/admin/EnterResult.tsx`**

```tsx
'use client';
import { useState } from 'react';

export function EnterResult() {
  const [f, setF] = useState({ matchId: '', homeScore: 0, awayScore: 0 });
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchId: f.matchId, homeScore: Number(f.homeScore), awayScore: Number(f.awayScore) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'Resultat sparat, ställning omräknad.' : (d.error ?? 'fel'));
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Match-id (t.ex. G001)" value={f.matchId} onChange={(e) => setF({ ...f, matchId: e.target.value })} />
      <div className="flex gap-2">
        <input type="number" className="border-[2.5px] border-ink rounded-lg px-3 py-2 w-20" value={f.homeScore} onChange={(e) => setF({ ...f, homeScore: Number(e.target.value) })} />
        <span className="self-center font-extrabold">–</span>
        <input type="number" className="border-[2.5px] border-ink rounded-lg px-3 py-2 w-20" value={f.awayScore} onChange={(e) => setF({ ...f, awayScore: Number(e.target.value) })} />
      </div>
      <button className="retro-tab retro-tab-active !text-white cursor-pointer">Spara resultat</button>
      {msg && <p className="font-bold">{msg}</p>}
    </form>
  );
}
```

- [ ] **Step 5: Create `components/admin/SyncResults.tsx`**

```tsx
'use client';
import { useState } from 'react';

interface Proposal { matchId: string; homeLabel: string; awayLabel: string; homeScore: number; awayScore: number; matchedBy: string; }

export function SyncResults() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [msg, setMsg] = useState('');
  async function sync() {
    setMsg('Hämtar…');
    const res = await fetch('/api/admin/results/sync', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setProposals(d.proposals.filter((p: Proposal) => p.matchId)); setMsg(`${d.proposals.length} förslag (${d.proposals.filter((p: Proposal) => !p.matchId).length} omappade).`); }
    else setMsg(d.error ?? 'kunde inte hämta');
  }
  async function apply() {
    const res = await fetch('/api/admin/results/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ results: proposals.map((p) => ({ matchId: p.matchId, homeScore: p.homeScore, awayScore: p.awayScore })) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Tillämpade ${d.applied} resultat, ställning omräknad.` : (d.error ?? 'fel'));
    setProposals([]);
  }
  return (
    <div className="flex flex-col gap-2">
      <button className="retro-tab cursor-pointer" onClick={sync}>Hämta dagens resultat (API)</button>
      {proposals.length > 0 && (
        <>
          <ul className="text-sm">{proposals.map((p) => <li key={p.matchId}>{p.homeLabel} {p.homeScore}–{p.awayScore} {p.awayLabel} <span className="text-[#8a7d5e]">({p.matchedBy})</span></li>)}</ul>
          <button className="retro-tab retro-tab-active !text-white cursor-pointer" onClick={apply}>Godkänn & spara</button>
        </>
      )}
      {msg && <p className="font-bold">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Create `components/admin/UnlockUser.tsx`**

```tsx
'use client';
import { useState } from 'react';

export function UnlockUser() {
  const [userId, setUserId] = useState('');
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, unlocked: true }) });
    setMsg(res.ok ? 'Upplåst.' : 'fel');
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2 flex-1" placeholder="user-id att låsa upp" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <button className="retro-tab cursor-pointer">Lås upp tips</button>
      {msg && <span className="self-center font-bold">{msg}</span>}
    </form>
  );
}
```

- [ ] **Step 7: Create `app/admin/page.tsx`** (admin-gated server component)

```tsx
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { Card, SectionHeader } from '@/components/Card';
import { CreateUser } from '@/components/admin/CreateUser';
import { EnterResult } from '@/components/admin/EnterResult';
import { SyncResults } from '@/components/admin/SyncResults';
import { UnlockUser } from '@/components/admin/UnlockUser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect('/');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><SectionHeader pill="Admin" pillColor="#2b5fd0" title="SKAPA KONTO" /><CreateUser /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#e23b3b" title="MATA IN RESULTAT" /><EnterResult /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#1b9e5a" title="HÄMTA FRÅN API" /><SyncResults /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#f5b833" title="LÅS UPP TIPS" /><UnlockUser /></Card>
    </div>
  );
}
```

- [ ] **Step 8: Verify build + full suite** — `npm run build` (`/admin`, restyled `/login`,`/tips`), `npm test`. **Step 9: Commit** `git add app/login app/tips app/admin components/admin && git commit -m "feat: restyle login/tips and add admin dashboard"`.

---

## Task 5: PWA (manifest, icon, service worker)

**Files:** Create `app/manifest.ts`, `public/icon.svg`, `public/sw.js`, `components/RegisterSW.tsx`; modify `app/layout.tsx` to register the SW.

- [ ] **Step 1: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#fdeecf"/>
  <rect x="40" y="40" width="432" height="432" rx="72" fill="#fff" stroke="#1c1c22" stroke-width="20"/>
  <text x="256" y="300" font-family="Impact, sans-serif" font-size="200" fill="#e23b3b" text-anchor="middle">VM</text>
</svg>
```

- [ ] **Step 2: Create `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VM-tipset 2026',
    short_name: 'VM-tipset',
    description: 'Kompisgängets VM-tips 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdeecf',
    theme_color: '#e23b3b',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
```

- [ ] **Step 3: Create `public/sw.js`** (minimal offline shell)

```js
const CACHE = 'vmt-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).pathname.startsWith('/api')) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match('/'))),
  );
});
```

- [ ] **Step 4: Create `components/RegisterSW.tsx`**

```tsx
'use client';
import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 5: Modify `app/layout.tsx`** — render `<RegisterSW />` once inside `<body>` (import it; place it just before `{children}` or after the container).

```tsx
// add import:
import { RegisterSW } from '@/components/RegisterSW';
// inside <body>, before the container div:
<RegisterSW />
```

- [ ] **Step 6: Verify build** — `npm run build` (manifest route present, no errors). **Step 7: Commit** `git add app/manifest.ts public/icon.svg public/sw.js components/RegisterSW.tsx app/layout.tsx && git commit -m "feat: add PWA manifest, icon and service worker"`.

---

## Task 6: Deploy + credentials checklist

**Files:** Create `DEPLOY.md`, `README.md`.

- [ ] **Step 1: Create `README.md`**

```markdown
# VM-tipset 2026

A friend-group World Cup 2026 prediction game. Everyone fills in an Excel tipslapp, uploads it, and a Retro Panini-styled site shows the leaderboard and the "Loppet" race barometer.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Vercel · Vitest
- **Scoring:** deterministic, pure TypeScript (max 168p, self-tested). No LLM in the scoring path.
- **Fixtures:** generated from the public-domain openfootball WC2026 dataset (`npm run build:fixtures`).

## Develop
```
npm install
npm run dev      # styled shell works without a DB (empty states)
npm test         # full unit suite
```

See `DEPLOY.md` for going live.
```

- [ ] **Step 2: Create `DEPLOY.md`** (the human checklist)

```markdown
# Deploy & credentials checklist

Everything below is the one-time setup that needs you (accounts + secrets). The app reads all of these from environment variables.

## 1. Supabase (database)
1. Create a free project at supabase.com.
2. In the SQL editor, run the migrations in order: `supabase/migrations/0001_users.sql`, `0002_tournament.sql`, `0003_predictions.sql`, `0004_standings.sql`.
3. From Project Settings → API, copy: Project URL, `anon` public key, `service_role` key.

## 2. Environment variables
Create `.env.local` (local) and set the same in Vercel (Project → Settings → Environment Variables). See `.env.example`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SESSION_SECRET` — generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `FOOTBALL_DATA_TOKEN` — free from football-data.org (only needed for the "hämta resultat" button)

## 3. Seed the data (with env set locally)
```
npm run build:fixtures      # already committed, re-run only to refresh the draw
npm run seed:tournament     # teams + matches + lock time into Supabase
ADMIN_USERNAME=carl ADMIN_PASSWORD=*** npm run seed:admin   # your admin account
```

## 4. Deploy to Vercel
1. Push this repo to GitHub.
2. Import it in Vercel, add the env vars from step 2, deploy.
3. Open the URL, log in as the admin, and from **/admin** create accounts for the gang.

## 5. During the tournament
- Players download the tipslapp from **/tips**, fill it in, upload before the first kickoff (tips lock at 2026-06-11 19:00 UTC).
- You enter results at **/admin** — either manually per match, or "Hämta dagens resultat" to pull proposals from the API and approve them. Standings recompute automatically.
- Replace `public/icon.svg` with branded PNG icons if you want full install polish.
```

- [ ] **Step 3: Final verification** — `npm run build` (whole app compiles), `npm test` (all unit tests pass). **Step 4: Commit** `git add README.md DEPLOY.md && git commit -m "docs: add README and deploy checklist"`.

---

## Self-Review (completed during planning)

- **Spec coverage:** §9 UI (Loppet race barometer, leaderboard, matches, statistik) → Tasks 1–3; admin (create accounts, results, sync, unlock) → Task 4; §10 PWA + deploy → Tasks 5–6; Retro Panini direction (cream/ink/primary colors, thick borders, hard shadows, Anton headings) → design system Task 1.
- **Placeholder scan:** none — full code throughout; icon is a real SVG (PNG upgrade noted as optional polish in DEPLOY.md).
- **Graceful degradation:** `serverData.ts` `safe()` wrapper means every page renders the styled empty shell without Supabase, so the app is demoable with `npm run dev` before any credentials exist.
- **Data shape from Plan 4 review:** standings get `displayName`/`color`/`avatarUrl` via `mergeStandings` (join users); matches get labels + kickoff via `toMatchViews` (merge fixtures) — both the gaps the Plan 4 review flagged.
- **Type consistency:** `StandingView`/`MatchView`/`Stat` produced by the tested helpers and consumed by the components; `progressPercent` shared by the barometer.

## Definition of done
- `npm test` green (all prior tests + the new view-helper tests).
- `npm run build` compiles the whole app (all pages, admin, manifest, SW).
- `npm run dev` shows the Retro Panini shell with graceful empty states (no DB needed).
- `DEPLOY.md` gives Carl the exact credentials/login steps to go live.
- **Project complete** — only the human deploy steps remain.
```
