# VM-tipset 2026 — Plan 1: Fundament & poängmotor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project and build a fully unit-tested, deterministic scoring engine whose self-test proves the maximum reachable score is exactly 168 points.

**Architecture:** A pure-TypeScript scoring core under `lib/` with no I/O — it takes teams, matches and predictions as plain data and returns points. Every WC-rule (1/X/2, group winners, most/fewest goals, finalists, bronze, champion) is its own small, separately-tested function. The Next.js app is scaffolded but only renders a placeholder page in this plan; UI comes in Plan 5.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS, Vitest. Node 20+.

This is **Plan 1 of 5**. Subsequent plans: (2) Auth & accounts, (3) Excel template + upload + parsing, (4) Results sync + standings, (5) UI & PWA. Each builds on this foundation.

---

## File structure created by this plan

| File | Responsibility |
|------|----------------|
| `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts` | Project + test config |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | Minimal runnable Next.js shell |
| `lib/domain/types.ts` | Domain types: Team, Match, Prediction, scores |
| `lib/domain/rules.ts` | Point values + group ids + MAX_POINTS |
| `lib/scoring/outcome.ts` | `matchOutcome` (1/X/2 from a finished match) |
| `lib/scoring/groupTable.ts` | Group standings, FIFA tiebreakers, group winners |
| `lib/scoring/goals.ts` | Most/fewest goals teams |
| `lib/scoring/knockout.ts` | Finalists, champion, bronze winner |
| `lib/scoring/score.ts` | `computeScores` orchestrator + `rankScores` |
| `lib/**/*.test.ts` | Colocated unit tests + the 168 self-test |

---

## Task 0: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vm-tipset",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/node": "22.10.7",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "autoprefixer": "10.4.20",
    "postcss": "8.5.1",
    "tailwindcss": "3.4.17",
    "typescript": "5.7.3",
    "vitest": "2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

- [ ] **Step 4: Create `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `tailwind.config.ts`** (Retro Panini palette, used from Plan 5)

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1c22',
        cream: '#fdeecf',
        paper: '#fffaf0',
        vmred: '#e23b3b',
        vmblue: '#2b5fd0',
        vmgreen: '#1b9e5a',
        gold: '#f5b833',
      },
      boxShadow: {
        hard: '6px 6px 0 #1c1c22',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 7: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #fdeecf;
  color: #1c1c22;
}
```

- [ ] **Step 8: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VM-tipset 2026',
  description: 'Kompisgängets VM-tips 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>VM-tipset 2026</h1>
      <p>Under uppbyggnad.</p>
    </main>
  );
}
```

- [ ] **Step 10: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: completes with `added N packages`, no errors.

- [ ] **Step 12: Verify the dev server boots**

Run: `npm run build`
Expected: `✓ Compiled successfully`. (Build is a non-interactive way to confirm the scaffold is valid.)

- [ ] **Step 13: Verify Vitest runs (no tests yet)**

Run: `npx vitest run`
Expected: `No test files found` (exit ok) — confirms the runner is wired.

- [ ] **Step 14: Commit**

```bash
git add package.json tsconfig.json next.config.mjs next-env.d.ts postcss.config.mjs tailwind.config.ts vitest.config.ts app/
git commit -m "chore: scaffold Next.js + Tailwind + Vitest project"
```

---

## Task 1: Domain types and rules

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/rules.ts`
- Test: `lib/domain/rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/domain/rules.test.ts
import { describe, it, expect } from 'vitest';
import { RULES, MAX_POINTS } from './rules';

describe('scoring rules', () => {
  it('sum to 168 over the WC2026 structure', () => {
    const total =
      72 * RULES.matchPoint +
      12 * RULES.groupWinnerPoint +
      1 * RULES.mostGoalsPoint +
      1 * RULES.fewestGoalsPoint +
      2 * RULES.finalistPoint +
      1 * RULES.bronzePoint +
      1 * RULES.championPoint;
    expect(total).toBe(168);
    expect(total).toBe(MAX_POINTS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/domain/rules.test.ts`
Expected: FAIL — cannot resolve `./rules`.

- [ ] **Step 3: Create `lib/domain/types.ts`**

```ts
export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final';

export type Pick = '1' | 'X' | '2';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Team {
  id: string;
  name: string;
  group: GroupId;
}

export interface Match {
  id: string;
  stage: Stage;
  group: GroupId | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

export type GroupWinnerKey = `group_winner_${GroupId}`;

export type BonusKey =
  | GroupWinnerKey
  | 'most_goals'
  | 'fewest_goals'
  | 'finalist_1'
  | 'finalist_2'
  | 'bronze'
  | 'champion';

export interface Prediction {
  userId: string;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
}

export interface ScoreBreakdown {
  matchPoints: number;
  groupWinnerPoints: number;
  mostGoalsPoints: number;
  fewestGoalsPoints: number;
  finalistPoints: number;
  bronzePoints: number;
  championPoints: number;
}

export interface UserScore {
  userId: string;
  matchPoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: ScoreBreakdown;
}

export interface RankedScore extends UserScore {
  rank: number;
}

export interface ScoringInput {
  teams: Team[];
  matches: Match[];
  predictions: Prediction[];
}
```

- [ ] **Step 4: Create `lib/domain/rules.ts`**

```ts
import type { GroupId } from './types';

export const RULES = {
  matchPoint: 1,
  groupWinnerPoint: 4,
  mostGoalsPoint: 4,
  fewestGoalsPoint: 4,
  finalistPoint: 8,
  bronzePoint: 8,
  championPoint: 16,
} as const;

export const GROUP_IDS: readonly GroupId[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

/** Maximum reachable total; asserted by the scoring self-test. */
export const MAX_POINTS = 168;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/domain/rules.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
git add lib/domain/
git commit -m "feat: add domain types and scoring rules"
```

---

## Task 2: Match outcome (1/X/2)

**Files:**
- Create: `lib/scoring/outcome.ts`
- Test: `lib/scoring/outcome.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/scoring/outcome.test.ts
import { describe, it, expect } from 'vitest';
import { matchOutcome } from './outcome';
import type { Match } from '../domain/types';

function m(partial: Partial<Match>): Match {
  return {
    id: 'm', stage: 'group', group: 'A',
    homeTeamId: 'h', awayTeamId: 'a',
    status: 'finished', homeScore: 0, awayScore: 0,
    ...partial,
  };
}

describe('matchOutcome', () => {
  it('returns 1 for a home win', () => {
    expect(matchOutcome(m({ homeScore: 2, awayScore: 1 }))).toBe('1');
  });
  it('returns 2 for an away win', () => {
    expect(matchOutcome(m({ homeScore: 0, awayScore: 3 }))).toBe('2');
  });
  it('returns X for a draw', () => {
    expect(matchOutcome(m({ homeScore: 1, awayScore: 1 }))).toBe('X');
  });
  it('returns null when not finished', () => {
    expect(matchOutcome(m({ status: 'scheduled', homeScore: null, awayScore: null }))).toBeNull();
  });
  it('returns null when a score is missing', () => {
    expect(matchOutcome(m({ status: 'finished', homeScore: null, awayScore: 1 }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/outcome.test.ts`
Expected: FAIL — cannot resolve `./outcome`.

- [ ] **Step 3: Create `lib/scoring/outcome.ts`**

```ts
import type { Match, Pick } from '../domain/types';

/** Returns '1' | 'X' | '2' for a finished match, or null if not decided yet. */
export function matchOutcome(match: Match): Pick | null {
  if (match.status !== 'finished') return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return '1';
  if (match.homeScore < match.awayScore) return '2';
  return 'X';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/outcome.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/outcome.ts lib/scoring/outcome.test.ts
git commit -m "feat: add matchOutcome"
```

---

## Task 3: Group table + FIFA tiebreakers + group winners

**Files:**
- Create: `lib/scoring/groupTable.ts`
- Test: `lib/scoring/groupTable.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/scoring/groupTable.test.ts
import { describe, it, expect } from 'vitest';
import { computeGroupTable, isGroupComplete, groupWinners } from './groupTable';
import type { GroupId, Match, Team } from '../domain/types';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
  { id: 't4', name: 'T4', group: 'A' },
];

function gm(id: string, home: string, away: string, hs: number, as: number): Match {
  return {
    id, stage: 'group', group: 'A',
    homeTeamId: home, awayTeamId: away,
    status: 'finished', homeScore: hs, awayScore: as,
  };
}

// Round robin: t1 wins all, t2 second, etc.
const matches: Match[] = [
  gm('m1', 't1', 't2', 2, 0),
  gm('m2', 't1', 't3', 2, 0),
  gm('m3', 't1', 't4', 2, 0),
  gm('m4', 't2', 't3', 1, 0),
  gm('m5', 't2', 't4', 1, 0),
  gm('m6', 't3', 't4', 1, 0),
];

describe('computeGroupTable', () => {
  it('orders by points then goal difference', () => {
    const table = computeGroupTable('A', teams, matches);
    expect(table.map((r) => r.teamId)).toEqual(['t1', 't2', 't3', 't4']);
    expect(table[0].points).toBe(9);
  });

  it('uses head-to-head when points, GD and GF are equal', () => {
    // Two teams level on pts/GD/GF; head-to-head decides.
    const hTeams: Team[] = [
      { id: 'a', name: 'A', group: 'B' },
      { id: 'b', name: 'B', group: 'B' },
    ];
    const hMatches: Match[] = [
      { id: 'h1', stage: 'group', group: 'B', homeTeamId: 'a', awayTeamId: 'b', status: 'finished', homeScore: 1, awayScore: 0 },
    ];
    const table = computeGroupTable('B', hTeams, hMatches);
    expect(table[0].teamId).toBe('a'); // a beat b head-to-head
  });
});

describe('isGroupComplete', () => {
  it('is true when all 6 matches are finished', () => {
    expect(isGroupComplete('A', teams, matches)).toBe(true);
  });
  it('is false when matches are missing', () => {
    expect(isGroupComplete('A', teams, matches.slice(0, 3))).toBe(false);
  });
});

describe('groupWinners', () => {
  it('returns the first-placed team only for complete groups', () => {
    const winners = groupWinners(['A'] as GroupId[], teams, matches);
    expect(winners.get('A')).toBe('t1');
  });
  it('omits incomplete groups', () => {
    const winners = groupWinners(['A'] as GroupId[], teams, matches.slice(0, 3));
    expect(winners.has('A')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/groupTable.test.ts`
Expected: FAIL — cannot resolve `./groupTable`.

- [ ] **Step 3: Create `lib/scoring/groupTable.ts`**

```ts
import type { GroupId, Match, Team } from '../domain/types';

export interface GroupRow {
  teamId: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

function blankRow(teamId: string): GroupRow {
  return { teamId, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
}

function finishedGroupMatches(group: GroupId, matches: Match[]): Match[] {
  return matches.filter(
    (m) =>
      m.stage === 'group' &&
      m.group === group &&
      m.status === 'finished' &&
      m.homeScore !== null &&
      m.awayScore !== null,
  );
}

function accumulate(rows: Map<string, GroupRow>, matches: Match[]): void {
  for (const m of matches) {
    const home = rows.get(m.homeTeamId!);
    const away = rows.get(m.awayTeamId!);
    if (!home || !away) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) home.points += 3;
    else if (hs < as) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  for (const row of rows.values()) row.goalDiff = row.goalsFor - row.goalsAgainst;
}

/** Head-to-head points among a tied subset of teams (matches between them only). */
function headToHeadPoints(tiedTeamIds: string[], matches: Match[]): Map<string, number> {
  const set = new Set(tiedTeamIds);
  const pts = new Map<string, number>(tiedTeamIds.map((id) => [id, 0]));
  for (const m of matches) {
    if (!set.has(m.homeTeamId!) || !set.has(m.awayTeamId!)) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    if (hs > as) pts.set(m.homeTeamId!, pts.get(m.homeTeamId!)! + 3);
    else if (hs < as) pts.set(m.awayTeamId!, pts.get(m.awayTeamId!)! + 3);
    else {
      pts.set(m.homeTeamId!, pts.get(m.homeTeamId!)! + 1);
      pts.set(m.awayTeamId!, pts.get(m.awayTeamId!)! + 1);
    }
  }
  return pts;
}

/**
 * Group table sorted by FIFA tiebreakers:
 * points → goal diff → goals for → head-to-head points → teamId (deterministic last resort).
 */
export function computeGroupTable(group: GroupId, teams: Team[], matches: Match[]): GroupRow[] {
  const groupTeams = teams.filter((t) => t.group === group);
  const rows = new Map<string, GroupRow>(groupTeams.map((t) => [t.id, blankRow(t.id)]));
  const played = finishedGroupMatches(group, matches);
  accumulate(rows, played);
  const all = [...rows.values()];

  return all.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const tied = all
      .filter((r) => r.points === a.points && r.goalDiff === a.goalDiff && r.goalsFor === a.goalsFor)
      .map((r) => r.teamId);
    if (tied.length > 1) {
      const h2h = headToHeadPoints(tied, played);
      const diff = (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0);
      if (diff !== 0) return diff;
    }
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  });
}

/** True when every round-robin match of the group is finished. */
export function isGroupComplete(group: GroupId, teams: Team[], matches: Match[]): boolean {
  const n = teams.filter((t) => t.group === group).length;
  const expected = (n * (n - 1)) / 2;
  return expected > 0 && finishedGroupMatches(group, matches).length >= expected;
}

/** Winner (1st place) of each complete group; incomplete groups are omitted. */
export function groupWinners(groups: readonly GroupId[], teams: Team[], matches: Match[]): Map<GroupId, string> {
  const winners = new Map<GroupId, string>();
  for (const g of groups) {
    if (!isGroupComplete(g, teams, matches)) continue;
    const table = computeGroupTable(g, teams, matches);
    if (table.length > 0) winners.set(g, table[0].teamId);
  }
  return winners;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/groupTable.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/groupTable.ts lib/scoring/groupTable.test.ts
git commit -m "feat: add group table, FIFA tiebreakers and group winners"
```

---

## Task 4: Most / fewest goals

**Files:**
- Create: `lib/scoring/goals.ts`
- Test: `lib/scoring/goals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/scoring/goals.test.ts
import { describe, it, expect } from 'vitest';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import type { Match, Team } from '../domain/types';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
];

function gm(id: string, home: string, away: string, hs: number, as: number): Match {
  return { id, stage: 'group', group: 'A', homeTeamId: home, awayTeamId: away, status: 'finished', homeScore: hs, awayScore: as };
}

const matches: Match[] = [
  gm('m1', 't1', 't2', 5, 0), // t1 scores 5
  gm('m2', 't2', 't3', 1, 0), // t2 scores 1, t3 scores 0
];

describe('mostGoalsTeams / fewestGoalsTeams', () => {
  it('finds the top scorer', () => {
    expect(mostGoalsTeams(teams, matches)).toEqual(['t1']);
  });
  it('finds the lowest scorer', () => {
    expect(fewestGoalsTeams(teams, matches)).toEqual(['t3']);
  });
  it('returns all teams on a tie', () => {
    const tied: Match[] = [gm('m1', 't1', 't2', 1, 1)]; // t3 has 0 (not in match)
    // t1=1, t2=1, t3=0 -> most: t1 & t2
    expect(mostGoalsTeams(teams, tied).sort()).toEqual(['t1', 't2']);
  });
  it('ignores non-group and unfinished matches', () => {
    const mixed: Match[] = [
      gm('m1', 't1', 't2', 9, 0),
      { id: 'ko', stage: 'final', group: null, homeTeamId: 't3', awayTeamId: 't1', status: 'finished', homeScore: 9, awayScore: 9 },
      { id: 'sched', stage: 'group', group: 'A', homeTeamId: 't3', awayTeamId: 't2', status: 'scheduled', homeScore: null, awayScore: null },
    ];
    expect(mostGoalsTeams(teams, mixed)).toEqual(['t1']); // knockout goals ignored
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/goals.test.ts`
Expected: FAIL — cannot resolve `./goals`.

- [ ] **Step 3: Create `lib/scoring/goals.ts`**

```ts
import type { Match, Team } from '../domain/types';

function totalGoalsByTeam(teams: Team[], matches: Match[]): Map<string, number> {
  const goals = new Map<string, number>(teams.map((t) => [t.id, 0]));
  for (const m of matches) {
    if (m.stage !== 'group' || m.status !== 'finished') continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    if (goals.has(m.homeTeamId!)) goals.set(m.homeTeamId!, goals.get(m.homeTeamId!)! + m.homeScore);
    if (goals.has(m.awayTeamId!)) goals.set(m.awayTeamId!, goals.get(m.awayTeamId!)! + m.awayScore);
  }
  return goals;
}

/** Team ids with the most total goals across the group stage (ties → all). */
export function mostGoalsTeams(teams: Team[], matches: Match[]): string[] {
  const goals = totalGoalsByTeam(teams, matches);
  const values = [...goals.values()];
  if (values.length === 0) return [];
  const max = Math.max(...values);
  return [...goals.entries()].filter(([, g]) => g === max).map(([id]) => id);
}

/** Team ids with the fewest total goals across the group stage (ties → all). */
export function fewestGoalsTeams(teams: Team[], matches: Match[]): string[] {
  const goals = totalGoalsByTeam(teams, matches);
  const values = [...goals.values()];
  if (values.length === 0) return [];
  const min = Math.min(...values);
  return [...goals.entries()].filter(([, g]) => g === min).map(([id]) => id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/goals.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/goals.ts lib/scoring/goals.test.ts
git commit -m "feat: add most/fewest goals teams"
```

---

## Task 5: Knockout derivations (finalists, champion, bronze)

**Files:**
- Create: `lib/scoring/knockout.ts`
- Test: `lib/scoring/knockout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/scoring/knockout.test.ts
import { describe, it, expect } from 'vitest';
import { finalists, champion, bronzeWinner } from './knockout';
import type { Match } from '../domain/types';

function ko(id: string, stage: Match['stage'], home: string | null, away: string | null, status: Match['status'], hs: number | null, as: number | null): Match {
  return { id, stage, group: null, homeTeamId: home, awayTeamId: away, status, homeScore: hs, awayScore: as };
}

describe('knockout derivations', () => {
  it('returns the two finalists once both teams are assigned', () => {
    const matches = [ko('f', 'final', 'X', 'Y', 'scheduled', null, null)];
    expect(finalists(matches).sort()).toEqual(['X', 'Y']);
  });
  it('returns no finalists before the final is set', () => {
    expect(finalists([ko('f', 'final', null, null, 'scheduled', null, null)])).toEqual([]);
    expect(finalists([])).toEqual([]);
  });
  it('returns champion only when the final is finished', () => {
    expect(champion([ko('f', 'final', 'X', 'Y', 'finished', 2, 1)])).toBe('X');
    expect(champion([ko('f', 'final', 'X', 'Y', 'scheduled', null, null)])).toBeNull();
    expect(champion([])).toBeNull();
  });
  it('returns bronze winner only when the bronze match is finished', () => {
    expect(bronzeWinner([ko('b', 'bronze', 'P', 'Q', 'finished', 0, 3)])).toBe('Q');
    expect(bronzeWinner([ko('b', 'bronze', 'P', 'Q', 'scheduled', null, null)])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/knockout.test.ts`
Expected: FAIL — cannot resolve `./knockout`.

- [ ] **Step 3: Create `lib/scoring/knockout.ts`**

```ts
import type { Match, Stage } from '../domain/types';
import { matchOutcome } from './outcome';

function stageMatch(stage: Stage, matches: Match[]): Match | undefined {
  return matches.find((m) => m.stage === stage);
}

function winnerOf(match: Match | undefined): string | null {
  if (!match) return null;
  const o = matchOutcome(match);
  if (o === '1') return match.homeTeamId;
  if (o === '2') return match.awayTeamId;
  return null; // draw or undecided: resolved via manual override upstream
}

/** The two teams playing the final, once both are assigned. */
export function finalists(matches: Match[]): string[] {
  const final = stageMatch('final', matches);
  if (!final || !final.homeTeamId || !final.awayTeamId) return [];
  return [final.homeTeamId, final.awayTeamId];
}

/** Winner of the final, once finished. */
export function champion(matches: Match[]): string | null {
  return winnerOf(stageMatch('final', matches));
}

/** Winner of the bronze match, once finished. */
export function bronzeWinner(matches: Match[]): string | null {
  return winnerOf(stageMatch('bronze', matches));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/knockout.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/knockout.ts lib/scoring/knockout.test.ts
git commit -m "feat: add knockout derivations"
```

---

## Task 6: Score orchestrator + ranking

**Files:**
- Create: `lib/scoring/score.ts`
- Test: `lib/scoring/score.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/scoring/score.test.ts
import { describe, it, expect } from 'vitest';
import { computeScores, rankScores } from './score';
import type { Match, Prediction, Team } from '../domain/types';

function gm(id: string, home: string, away: string, hs: number, as: number, group: 'A' = 'A'): Match {
  return { id, stage: 'group', group, homeTeamId: home, awayTeamId: away, status: 'finished', homeScore: hs, awayScore: as };
}

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
  { id: 't4', name: 'T4', group: 'A' },
];

describe('computeScores', () => {
  it('awards 1 point per correct 1/X/2', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0), gm('m2', 't3', 't4', 1, 1)];
    const pred: Prediction = { userId: 'u', matchPicks: { m1: '1', m2: 'X' }, bonus: {} };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.matchPoints).toBe(2);
    expect(s.totalPoints).toBe(2);
  });

  it('does not award group-stage bonuses before the group is complete', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0)]; // group A incomplete
    const pred: Prediction = { userId: 'u', matchPicks: {}, bonus: { group_winner_A: 't1', most_goals: 't1' } };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.bonusPoints).toBe(0);
  });

  it('counts a duplicated finalist pick only once', () => {
    const matches: Match[] = [
      { id: 'f', stage: 'final', group: null, homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
    ];
    const pred: Prediction = { userId: 'u', matchPicks: {}, bonus: { finalist_1: 't1', finalist_2: 't1' } };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.breakdown.finalistPoints).toBe(8); // not 16
  });
});

describe('rankScores', () => {
  it('ranks by total, then exact-result count, then submission time', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0), gm('m2', 't3', 't4', 1, 1)];
    const preds: Prediction[] = [
      { userId: 'late', matchPicks: { m1: '1', m2: 'X' }, bonus: {} },   // 2 pts
      { userId: 'early', matchPicks: { m1: '1', m2: 'X' }, bonus: {} },  // 2 pts
    ];
    const scores = computeScores({ teams, matches, predictions: preds });
    const ranked = rankScores(scores, { early: { submittedAt: 1 }, late: { submittedAt: 2 } });
    expect(ranked.find((r) => r.userId === 'early')!.rank).toBe(1);
    expect(ranked.find((r) => r.userId === 'late')!.rank).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/score.test.ts`
Expected: FAIL — cannot resolve `./score`.

- [ ] **Step 3: Create `lib/scoring/score.ts`**

```ts
import type {
  GroupId, Pick, Prediction, RankedScore, ScoreBreakdown, ScoringInput, UserScore,
} from '../domain/types';
import { RULES, GROUP_IDS } from '../domain/rules';
import { matchOutcome } from './outcome';
import { groupWinners, isGroupComplete } from './groupTable';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import { finalists, champion, bronzeWinner } from './knockout';

function emptyBreakdown(): ScoreBreakdown {
  return {
    matchPoints: 0,
    groupWinnerPoints: 0,
    mostGoalsPoints: 0,
    fewestGoalsPoints: 0,
    finalistPoints: 0,
    bronzePoints: 0,
    championPoints: 0,
  };
}

export function computeScores(input: ScoringInput): UserScore[] {
  const { teams, matches, predictions } = input;

  // Facts shared by all users (computed once).
  const outcomes = new Map<string, Pick | null>();
  for (const m of matches) outcomes.set(m.id, matchOutcome(m));

  const winners = groupWinners(GROUP_IDS, teams, matches);
  const allGroupsComplete = GROUP_IDS.every((g) => isGroupComplete(g, teams, matches));
  const mostSet = allGroupsComplete ? new Set(mostGoalsTeams(teams, matches)) : new Set<string>();
  const fewestSet = allGroupsComplete ? new Set(fewestGoalsTeams(teams, matches)) : new Set<string>();
  const finalTeams = new Set(finalists(matches));
  const champ = champion(matches);
  const bronze = bronzeWinner(matches);

  return predictions.map((p) => scoreUser(p, outcomes, winners, mostSet, fewestSet, finalTeams, champ, bronze));
}

function scoreUser(
  p: Prediction,
  outcomes: Map<string, Pick | null>,
  winners: Map<GroupId, string>,
  mostSet: Set<string>,
  fewestSet: Set<string>,
  finalTeams: Set<string>,
  champ: string | null,
  bronze: string | null,
): UserScore {
  const b = emptyBreakdown();

  for (const [matchId, pick] of Object.entries(p.matchPicks)) {
    if (outcomes.get(matchId) === pick) b.matchPoints += RULES.matchPoint;
  }

  for (const g of GROUP_IDS) {
    const predicted = p.bonus[`group_winner_${g}`];
    if (predicted && winners.get(g) === predicted) b.groupWinnerPoints += RULES.groupWinnerPoint;
  }

  if (p.bonus.most_goals && mostSet.has(p.bonus.most_goals)) b.mostGoalsPoints += RULES.mostGoalsPoint;
  if (p.bonus.fewest_goals && fewestSet.has(p.bonus.fewest_goals)) b.fewestGoalsPoints += RULES.fewestGoalsPoint;

  const finalistPicks = new Set(
    [p.bonus.finalist_1, p.bonus.finalist_2].filter((x): x is string => Boolean(x)),
  );
  for (const pick of finalistPicks) {
    if (finalTeams.has(pick)) b.finalistPoints += RULES.finalistPoint;
  }

  if (p.bonus.bronze && bronze === p.bonus.bronze) b.bronzePoints += RULES.bronzePoint;
  if (p.bonus.champion && champ === p.bonus.champion) b.championPoints += RULES.championPoint;

  const bonusPoints =
    b.groupWinnerPoints + b.mostGoalsPoints + b.fewestGoalsPoints +
    b.finalistPoints + b.bronzePoints + b.championPoints;

  return {
    userId: p.userId,
    matchPoints: b.matchPoints,
    bonusPoints,
    totalPoints: b.matchPoints + bonusPoints,
    breakdown: b,
  };
}

export interface TieData {
  submittedAt: number;
}

/** Rank by total → exact 1/X/2 count (matchPoints) → earliest submission → userId. */
export function rankScores(scores: UserScore[], tie: Record<string, TieData>): RankedScore[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    const sa = tie[a.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER;
    const sb = tie[b.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  const ranked: RankedScore[] = [];
  sorted.forEach((s, i) => {
    let rank = i + 1;
    if (i > 0) {
      const prev = sorted[i - 1];
      // Shared placing only when every meaningful key is equal (userId is just a
      // deterministic display order, not a real difference).
      const sameKey =
        prev.totalPoints === s.totalPoints &&
        prev.matchPoints === s.matchPoints &&
        (tie[prev.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER) ===
          (tie[s.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER);
      if (sameKey) rank = ranked[i - 1].rank;
    }
    ranked.push({ ...s, rank });
  });
  return ranked;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/score.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/score.ts lib/scoring/score.test.ts
git commit -m "feat: add score orchestrator and ranking"
```

---

## Task 7: The 168 self-test (capstone)

This builds a full, finished tournament and a perfectly-correct prediction, then asserts the engine awards exactly 168 points (72 match + 96 bonus). This is the safety check the whole engine exists to satisfy.

**Files:**
- Test: `lib/scoring/maxPoints.test.ts`

- [ ] **Step 1: Write the test**

```ts
// lib/scoring/maxPoints.test.ts
import { describe, it, expect } from 'vitest';
import { GROUP_IDS, MAX_POINTS } from '../domain/rules';
import type { BonusKey, Match, Pick, Prediction, Team } from '../domain/types';
import { matchOutcome } from './outcome';
import { groupWinners } from './groupTable';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import { finalists, champion, bronzeWinner } from './knockout';
import { computeScores } from './score';

/** 12 groups x 4 teams; in each group the lower local index beats higher 2-0. */
function buildFinishedTournament(): { teams: Team[]; matches: Match[] } {
  const teams: Team[] = [];
  for (let gi = 0; gi < GROUP_IDS.length; gi++) {
    for (let t = 0; t < 4; t++) {
      const idx = gi * 4 + t;
      teams.push({ id: String(idx), name: `Team ${idx}`, group: GROUP_IDS[gi] });
    }
  }

  const matches: Match[] = [];
  let mid = 0;
  for (let gi = 0; gi < GROUP_IDS.length; gi++) {
    const ids = [0, 1, 2, 3].map((t) => String(gi * 4 + t));
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        // lower local index (ids[a]) is home and wins 2-0
        matches.push({
          id: `g${mid++}`,
          stage: 'group',
          group: GROUP_IDS[gi],
          homeTeamId: ids[a],
          awayTeamId: ids[b],
          status: 'finished',
          homeScore: 2,
          awayScore: 0,
        });
      }
    }
  }

  matches.push({ id: 'final', stage: 'final', group: null, homeTeamId: '0', awayTeamId: '4', status: 'finished', homeScore: 1, awayScore: 0 });
  matches.push({ id: 'bronze', stage: 'bronze', group: null, homeTeamId: '8', awayTeamId: '12', status: 'finished', homeScore: 2, awayScore: 1 });

  return { teams, matches };
}

/** A prediction that matches reality exactly, derived from the engine's own facts. */
function perfectPrediction(teams: Team[], matches: Match[]): Prediction {
  const bonus: Partial<Record<BonusKey, string>> = {};
  const winners = groupWinners(GROUP_IDS, teams, matches);
  for (const g of GROUP_IDS) bonus[`group_winner_${g}`] = winners.get(g)!;
  bonus.most_goals = mostGoalsTeams(teams, matches)[0];
  bonus.fewest_goals = fewestGoalsTeams(teams, matches)[0];
  const fin = finalists(matches);
  bonus.finalist_1 = fin[0];
  bonus.finalist_2 = fin[1];
  bonus.champion = champion(matches)!;
  bonus.bronze = bronzeWinner(matches)!;

  const matchPicks: Record<string, Pick> = {};
  for (const m of matches) {
    if (m.stage === 'group') matchPicks[m.id] = matchOutcome(m)!;
  }

  return { userId: 'perfect', matchPicks, bonus };
}

describe('scoring self-test', () => {
  it('a perfect prediction scores exactly 168 (72 match + 96 bonus)', () => {
    const { teams, matches } = buildFinishedTournament();
    expect(matches.filter((m) => m.stage === 'group').length).toBe(72);

    const pred = perfectPrediction(teams, matches);
    const [score] = computeScores({ teams, matches, predictions: [pred] });

    expect(score.matchPoints).toBe(72);
    expect(score.bonusPoints).toBe(96);
    expect(score.totalPoints).toBe(168);
    expect(score.totalPoints).toBe(MAX_POINTS);
  });
});
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: ALL test files pass, including `maxPoints.test.ts` (`a perfect prediction scores exactly 168`).

- [ ] **Step 3: Commit**

```bash
git add lib/scoring/maxPoints.test.ts
git commit -m "test: add 168-point scoring self-test"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §3 point rules → Tasks 1–7; §3 group-winner FIFA tiebreaker → Task 3; §3 most/fewest-goals tie rule → Task 4; §3 finalist dedup → Task 6; §3 tabell-tiebreaker → `rankScores` Task 6; §7 deterministic engine + 168 self-test → Task 7. Auth (§2/§11), Excel (§6), results/API (§7), UI/PWA (§9/§10) are explicitly deferred to Plans 2–5.
- **Placeholder scan:** none — every step has full code and exact commands.
- **Type consistency:** all functions consume/produce the types from `lib/domain/types.ts`; `matchOutcome` returns `Pick | null` and is used consistently; `ScoreBreakdown` property names (`championPoints` etc.) match between `emptyBreakdown`, `scoreUser` and the tests.

---

## Definition of done

- `npm test` is green (7 test files).
- `npm run build` compiles.
- The 168 self-test passes — the scoring engine is proven correct against the spec's maximum.
- Ready for Plan 2 (Auth & accounts).
