# VM-tipset 2026 — Plan 4: Resultat & standings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the tournament from `data/fixtures.json`, let the admin record match results (manually and via approved football-data.org proposals), and recompute the leaderboard standings (with movement vs the previous run) deterministically after every change.

**Architecture:** The `matches` table is the single source of truth for results. The standings computation is a pure function that wraps the Plan 1 scoring engine (`computeScores` + `rankScores`) — it takes teams, matches and the stored predictions and returns ranked standings with `prevRank`. Results can be set manually or proposed from the football-data.org API; proposals are pure data derived from the API response mapped onto our matches (by date + team name, with an alias table), and the admin approves them. Everything is unit-tested with in-memory repos and synthetic API JSON; the live fetch and the Supabase repos are thin glue verified once the token + DB exist.

**Tech Stack:** Next.js route handlers, `tsx` (seed script), Vitest. Live results: football-data.org (free token).

This is **Plan 4 of 5**. It depends on the scoring engine (Plan 1), auth (Plan 2), and fixtures + prediction storage (Plan 3). `StoredPrediction` is structurally identical to the engine's `Prediction`, so stored predictions feed the engine directly.

---

## What needs the human (deferred, NOT blocking this plan)
- `FOOTBALL_DATA_TOKEN` (free from football-data.org) — only for the live sync fetch.
- A connected Supabase project — to run `npm run seed:tournament` (seeds teams/matches/settings) and to persist results/standings.

Knockout matches are identified by `stage` (`final`/`bronze`/etc.), never by their generated id, so the `K_<n>` id detail from Plan 3 does not matter here.

---

## File structure created by this plan

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0004_standings.sql` | `standings` table |
| `lib/results/types.ts` | `Standing`, `ResultProposal` |
| `lib/results/buildStandings.ts` | pure: scoring engine → ranked standings + prevRank |
| `lib/results/footballData.ts` | pure: API response → result proposals (+ alias map) |
| `lib/results/footballDataClient.ts` | live fetch wrapper (reads token) |
| `lib/db/matchRepository.ts` (+ in-memory, + supabase) | read matches, set result |
| `lib/db/standingsRepository.ts` (+ in-memory, + supabase) | save/get standings |
| `lib/db/settingsRepository.ts` (+ supabase) | read lockAt |
| `lib/results/recompute.ts` | orchestrator: load → buildStandings → persist |
| `scripts/seed-tournament.ts` | seed teams/matches/settings from fixtures.json |
| `app/api/standings/route.ts` | GET leaderboard |
| `app/api/matches/route.ts` | GET match list (with results) |
| `app/api/admin/results/route.ts` | POST manual result |
| `app/api/admin/results/sync/route.ts` | POST fetch proposals |
| `app/api/admin/results/apply/route.ts` | POST apply approved proposals |
| `app/api/admin/unlock/route.ts` | POST unlock a user's tips |

---

## Task 0: Standings migration + result types

**Files:** Create `supabase/migrations/0004_standings.sql`, `lib/results/types.ts`.

- [ ] **Step 1: Create `supabase/migrations/0004_standings.sql`**

```sql
create table if not exists public.standings (
  user_id uuid primary key references public.users(id) on delete cascade,
  rank int not null,
  prev_rank int,
  total_points int not null,
  match_points int not null,
  bonus_points int not null,
  breakdown jsonb not null,
  computed_at timestamptz not null default now()
);
```

- [ ] **Step 2: Create `lib/results/types.ts`**

```ts
import type { ScoreBreakdown } from '../domain/types';

export interface Standing {
  userId: string;
  rank: number;
  prevRank: number | null;
  totalPoints: number;
  matchPoints: number;
  bonusPoints: number;
  breakdown: ScoreBreakdown;
}

export interface ResultProposal {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  homeScore: number;
  awayScore: number;
  matchedBy: 'exact' | 'alias' | 'unmatched';
}
```

- [ ] **Step 3: Commit** `git add supabase/migrations/0004_standings.sql lib/results/types.ts && git commit -m "feat: add standings schema and result types"`.

---

## Task 1: buildStandings (pure)

**Files:** Create `lib/results/buildStandings.ts`, `lib/results/buildStandings.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/results/buildStandings.test.ts
import { describe, it, expect } from 'vitest';
import type { Match, Prediction, Team } from '../domain/types';
import { buildStandings } from './buildStandings';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
];
const matches: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
];
const predictions: Prediction[] = [
  { userId: 'a', matchPicks: { m1: '1' }, bonus: {} }, // correct → 1p
  { userId: 'b', matchPicks: { m1: '2' }, bonus: {} }, // wrong → 0p
];

describe('buildStandings', () => {
  it('ranks users and carries breakdown + totals', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      {},
    );
    const a = standings.find((s) => s.userId === 'a')!;
    const b = standings.find((s) => s.userId === 'b')!;
    expect(a.rank).toBe(1);
    expect(a.totalPoints).toBe(1);
    expect(a.matchPoints).toBe(1);
    expect(b.rank).toBe(2);
    expect(b.totalPoints).toBe(0);
    expect(a.breakdown.matchPoints).toBe(1);
  });

  it('fills prevRank from the previous run, null when new', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      { a: 2, b: 1 }, // previously b was 1st, a was 2nd
    );
    expect(standings.find((s) => s.userId === 'a')!.prevRank).toBe(2);
    expect(standings.find((s) => s.userId === 'b')!.prevRank).toBe(1);
  });

  it('prevRank is null for a user not in the previous run', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      { a: 1 },
    );
    expect(standings.find((s) => s.userId === 'b')!.prevRank).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run lib/results/buildStandings.test.ts`).

- [ ] **Step 3: Create `lib/results/buildStandings.ts`**

```ts
import type { ScoringInput, TieData } from '../domain/types';
import { computeScores, rankScores } from '../scoring/score';
import type { Standing } from './types';

export function buildStandings(
  input: ScoringInput,
  tie: Record<string, TieData>,
  prevRankByUser: Record<string, number>,
): Standing[] {
  const ranked = rankScores(computeScores(input), tie);
  return ranked.map((r) => ({
    userId: r.userId,
    rank: r.rank,
    prevRank: r.userId in prevRankByUser ? prevRankByUser[r.userId] : null,
    totalPoints: r.totalPoints,
    matchPoints: r.matchPoints,
    bonusPoints: r.bonusPoints,
    breakdown: r.breakdown,
  }));
}
```

- [ ] **Step 4: Run → pass** (3 tests). **Step 5: Commit** `git add lib/results/buildStandings.ts lib/results/buildStandings.test.ts && git commit -m "feat: add buildStandings"`.

---

## Task 2: football-data.org proposal mapping (pure)

**Files:** Create `lib/results/footballData.ts`, `lib/results/footballData.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/results/footballData.test.ts
import { describe, it, expect } from 'vitest';
import type { Match } from '../domain/types';
import { proposalsFromApi, type ApiMatch } from './footballData';

const ourMatches: Match[] = [
  { id: 'G001', stage: 'group', group: 'A', homeTeamId: 'mexico', awayTeamId: 'south-korea', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 'G002', stage: 'group', group: 'B', homeTeamId: 'usa', awayTeamId: 'paraguay', status: 'scheduled', homeScore: null, awayScore: null },
];
const labels: Record<string, { home: string; away: string; kickoff: string }> = {
  G001: { home: 'Mexico', away: 'South Korea', kickoff: '2026-06-11T19:00:00.000Z' },
  G002: { home: 'USA', away: 'Paraguay', kickoff: '2026-06-13T19:00:00.000Z' },
};

function api(date: string, home: string, away: string, hs: number | null, as: number | null, status = 'FINISHED'): ApiMatch {
  return { utcDate: date, status, homeTeam: { name: home }, awayTeam: { name: away }, score: { fullTime: { home: hs, away: as } } };
}

describe('proposalsFromApi', () => {
  it('matches finished api matches to our matches by date + team names', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'South Korea', 2, 1)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ matchId: 'G001', homeScore: 2, awayScore: 1, matchedBy: 'exact' });
  });

  it('uses the alias table for differing names (Korea Republic → South Korea)', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'Korea Republic', 0, 0)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals[0]).toMatchObject({ matchId: 'G001', matchedBy: 'alias' });
  });

  it('ignores non-finished api matches', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'South Korea', null, null, 'SCHEDULED')];
    expect(proposalsFromApi(apiMatches, ourMatches, labels)).toHaveLength(0);
  });

  it('flags an api match it cannot map to any of our matches', () => {
    const apiMatches = [api('2099-01-01T00:00:00Z', 'Narnia', 'Atlantis', 1, 0)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].matchedBy).toBe('unmatched');
    expect(proposals[0].matchId).toBe('');
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run lib/results/footballData.test.ts`).

- [ ] **Step 3: Create `lib/results/footballData.ts`**

```ts
import type { Match } from '../domain/types';
import type { ResultProposal } from './types';

export interface ApiMatch {
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface MatchLabels {
  [matchId: string]: { home: string; away: string; kickoff: string };
}

/** Known name differences: football-data name (normalised) → our name (normalised). */
const ALIASES: Record<string, string> = {
  'korea republic': 'south korea',
  'united states': 'usa',
  'ivory coast': 'ivory coast',
  'cote divoire': 'ivory coast',
  'czechia': 'czech republic',
  'dr congo': 'dr congo',
  'cape verde islands': 'cape verde',
};

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const canon = (s: string) => ALIASES[norm(s)] ?? norm(s);
const day = (iso: string) => iso.slice(0, 10);

export function proposalsFromApi(
  apiMatches: ApiMatch[],
  ourMatches: Match[],
  labels: MatchLabels,
): ResultProposal[] {
  const proposals: ResultProposal[] = [];
  for (const am of apiMatches) {
    if (am.status !== 'FINISHED') continue;
    const hs = am.score.fullTime.home;
    const as = am.score.fullTime.away;
    if (hs === null || as === null) continue;

    const apiHome = canon(am.homeTeam.name);
    const apiAway = canon(am.awayTeam.name);
    const apiDay = day(am.utcDate);

    let matched: { match: Match; how: 'exact' | 'alias' } | null = null;
    for (const m of ourMatches) {
      const lab = labels[m.id];
      if (!lab || day(lab.kickoff) !== apiDay) continue;
      const ourHome = norm(lab.home);
      const ourAway = norm(lab.away);
      if (ourHome === apiHome && ourAway === apiAway) {
        matched = { match: m, how: norm(am.homeTeam.name) === ourHome && norm(am.awayTeam.name) === ourAway ? 'exact' : 'alias' };
        break;
      }
    }

    if (matched) {
      proposals.push({
        matchId: matched.match.id,
        homeLabel: am.homeTeam.name,
        awayLabel: am.awayTeam.name,
        homeScore: hs,
        awayScore: as,
        matchedBy: matched.how,
      });
    } else {
      proposals.push({
        matchId: '',
        homeLabel: am.homeTeam.name,
        awayLabel: am.awayTeam.name,
        homeScore: hs,
        awayScore: as,
        matchedBy: 'unmatched',
      });
    }
  }
  return proposals;
}
```

- [ ] **Step 4: Run → pass** (4 tests). **Step 5: Commit** `git add lib/results/footballData.ts lib/results/footballData.test.ts && git commit -m "feat: add football-data result proposal mapping"`.

---

## Task 3: Repositories + seed script

**Files:** Create `lib/db/matchRepository.ts` (+in-memory+supabase), `lib/db/standingsRepository.ts` (+in-memory+supabase), `lib/db/settingsRepository.ts` (+supabase), `scripts/seed-tournament.ts`; extend `lib/db/repository.ts`. Tests: `lib/db/inMemoryMatchRepository.test.ts`, `lib/db/inMemoryStandingsRepository.test.ts`.

- [ ] **Step 1: Create `lib/db/matchRepository.ts`**

```ts
import type { Match } from '../domain/types';

export interface MatchResultInput {
  homeScore: number;
  awayScore: number;
  source: 'manual' | 'api';
  updatedBy: string | null;
}

export interface MatchRepository {
  all(): Promise<Match[]>;
  setResult(matchId: string, result: MatchResultInput): Promise<void>;
}
```

- [ ] **Step 2: Create `lib/db/inMemoryMatchRepository.ts`**

```ts
import type { Match } from '../domain/types';
import type { MatchRepository, MatchResultInput } from './matchRepository';

export class InMemoryMatchRepository implements MatchRepository {
  constructor(private matches: Match[]) {}

  async all(): Promise<Match[]> {
    return this.matches.map((m) => ({ ...m }));
  }

  async setResult(matchId: string, result: MatchResultInput): Promise<void> {
    const m = this.matches.find((x) => x.id === matchId);
    if (!m) throw new Error(`unknown match: ${matchId}`);
    m.homeScore = result.homeScore;
    m.awayScore = result.awayScore;
    m.status = 'finished';
  }
}
```

- [ ] **Step 3: Create `lib/db/standingsRepository.ts`**

```ts
import type { Standing } from '../results/types';

export interface StandingsRepository {
  getAll(): Promise<Standing[]>;
  replaceAll(standings: Standing[]): Promise<void>;
}
```

- [ ] **Step 4: Create `lib/db/inMemoryStandingsRepository.ts`**

```ts
import type { Standing } from '../results/types';
import type { StandingsRepository } from './standingsRepository';

export class InMemoryStandingsRepository implements StandingsRepository {
  private standings: Standing[] = [];
  async getAll(): Promise<Standing[]> {
    return this.standings.map((s) => ({ ...s }));
  }
  async replaceAll(standings: Standing[]): Promise<void> {
    this.standings = standings.map((s) => ({ ...s }));
  }
}
```

- [ ] **Step 5: Create `lib/db/settingsRepository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SettingsRepository {
  getLockAt(): Promise<string | null>;
}

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SupabaseClient) {}
  async getLockAt(): Promise<string | null> {
    const { data, error } = await this.db.from('settings').select('lock_at').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.lock_at as string | null) ?? null;
  }
}
```

- [ ] **Step 6: Create `lib/db/supabaseMatchRepository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, Match, MatchStatus, Stage } from '../domain/types';
import type { MatchRepository, MatchResultInput } from './matchRepository';

interface MatchRow {
  id: string;
  stage: string;
  group: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export function mapMatchRow(r: MatchRow): Match {
  return {
    id: r.id,
    stage: r.stage as Stage,
    group: (r.group as GroupId | null) ?? null,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    status: r.status as MatchStatus,
    homeScore: r.home_score,
    awayScore: r.away_score,
  };
}

export class SupabaseMatchRepository implements MatchRepository {
  constructor(private readonly db: SupabaseClient) {}

  async all(): Promise<Match[]> {
    const { data, error } = await this.db
      .from('matches')
      .select('id,stage,group,home_team_id,away_team_id,status,home_score,away_score');
    if (error) throw new Error(error.message);
    return (data as MatchRow[]).map(mapMatchRow);
  }

  async setResult(matchId: string, result: MatchResultInput): Promise<void> {
    const { error } = await this.db
      .from('matches')
      .update({
        home_score: result.homeScore,
        away_score: result.awayScore,
        status: 'finished',
        result_source: result.source,
        updated_by: result.updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 7: Create `lib/db/supabaseStandingsRepository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreBreakdown } from '../domain/types';
import type { Standing } from '../results/types';
import type { StandingsRepository } from './standingsRepository';

interface StandingRow {
  user_id: string;
  rank: number;
  prev_rank: number | null;
  total_points: number;
  match_points: number;
  bonus_points: number;
  breakdown: ScoreBreakdown;
}

export class SupabaseStandingsRepository implements StandingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<Standing[]> {
    const { data, error } = await this.db.from('standings').select('*');
    if (error) throw new Error(error.message);
    return (data as StandingRow[]).map((r) => ({
      userId: r.user_id,
      rank: r.rank,
      prevRank: r.prev_rank,
      totalPoints: r.total_points,
      matchPoints: r.match_points,
      bonusPoints: r.bonus_points,
      breakdown: r.breakdown,
    }));
  }

  async replaceAll(standings: Standing[]): Promise<void> {
    const rows = standings.map((s) => ({
      user_id: s.userId,
      rank: s.rank,
      prev_rank: s.prevRank,
      total_points: s.totalPoints,
      match_points: s.matchPoints,
      bonus_points: s.bonusPoints,
      breakdown: s.breakdown,
      computed_at: new Date().toISOString(),
    }));
    const { error } = await this.db.from('standings').upsert(rows, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 8: Extend `lib/db/repository.ts`** — add factories (keep existing exports + imports):

```ts
import { SupabaseMatchRepository } from './supabaseMatchRepository';
import { SupabaseStandingsRepository } from './supabaseStandingsRepository';
import { SupabaseSettingsRepository } from './settingsRepository';
import type { MatchRepository } from './matchRepository';
import type { StandingsRepository } from './standingsRepository';
import type { SettingsRepository } from './settingsRepository';

export function getMatchRepository(): MatchRepository {
  return new SupabaseMatchRepository(getSupabaseAdmin());
}
export function getStandingsRepository(): StandingsRepository {
  return new SupabaseStandingsRepository(getSupabaseAdmin());
}
export function getSettingsRepository(): SettingsRepository {
  return new SupabaseSettingsRepository(getSupabaseAdmin());
}
```

- [ ] **Step 9: Create `scripts/seed-tournament.ts`**

```ts
import { getSupabaseAdmin } from '../lib/supabase';
import { loadFixtures } from '../lib/fixtures/load';

async function main() {
  const db = getSupabaseAdmin();
  const f = loadFixtures();

  const teamRows = f.teams.map((t) => ({ id: t.id, name: t.name, group: t.group }));
  const { error: te } = await db.from('teams').upsert(teamRows, { onConflict: 'id' });
  if (te) throw new Error(`teams: ${te.message}`);

  const matchRows = f.matches.map((m) => ({
    id: m.id,
    stage: m.stage,
    group: m.group,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    home_label: m.homeLabel,
    away_label: m.awayLabel,
    kickoff: m.kickoff,
    ground: m.ground,
    status: 'scheduled',
  }));
  const { error: me } = await db.from('matches').upsert(matchRows, { onConflict: 'id' });
  if (me) throw new Error(`matches: ${me.message}`);

  const { error: se } = await db
    .from('settings')
    .upsert({ id: 1, season: f.season, lock_at: f.firstKickoff }, { onConflict: 'id' });
  if (se) throw new Error(`settings: ${se.message}`);

  console.log(`seeded ${teamRows.length} teams, ${matchRows.length} matches, lock_at=${f.firstKickoff}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Add to `package.json` scripts: `"seed:tournament": "tsx scripts/seed-tournament.ts"`.

- [ ] **Step 10: Create `lib/db/inMemoryMatchRepository.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Match } from '../domain/types';
import { InMemoryMatchRepository } from './inMemoryMatchRepository';

const base: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 'a', awayTeamId: 'b', status: 'scheduled', homeScore: null, awayScore: null },
];

describe('InMemoryMatchRepository', () => {
  it('returns copies (does not leak internal refs)', async () => {
    const repo = new InMemoryMatchRepository(base);
    const got = await repo.all();
    got[0].homeScore = 9;
    expect((await repo.all())[0].homeScore).toBeNull();
  });
  it('setResult marks the match finished with the score', async () => {
    const repo = new InMemoryMatchRepository([{ ...base[0] }]);
    await repo.setResult('m1', { homeScore: 2, awayScore: 1, source: 'manual', updatedBy: 'admin' });
    const m = (await repo.all())[0];
    expect(m.status).toBe('finished');
    expect(m.homeScore).toBe(2);
    expect(m.awayScore).toBe(1);
  });
  it('throws on unknown match', async () => {
    const repo = new InMemoryMatchRepository([{ ...base[0] }]);
    await expect(repo.setResult('nope', { homeScore: 0, awayScore: 0, source: 'manual', updatedBy: null })).rejects.toThrow();
  });
});
```

- [ ] **Step 11: Create `lib/db/inMemoryStandingsRepository.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { InMemoryStandingsRepository } from './inMemoryStandingsRepository';
import type { Standing } from '../results/types';

const s: Standing = {
  userId: 'u1', rank: 1, prevRank: null, totalPoints: 5, matchPoints: 5, bonusPoints: 0,
  breakdown: { matchPoints: 5, groupWinnerPoints: 0, mostGoalsPoints: 0, fewestGoalsPoints: 0, finalistPoints: 0, bronzePoints: 0, championPoints: 0 },
};

describe('InMemoryStandingsRepository', () => {
  it('replaceAll then getAll round-trips', async () => {
    const repo = new InMemoryStandingsRepository();
    await repo.replaceAll([s]);
    expect(await repo.getAll()).toEqual([s]);
  });
  it('replaceAll overwrites previous', async () => {
    const repo = new InMemoryStandingsRepository();
    await repo.replaceAll([s]);
    await repo.replaceAll([]);
    expect(await repo.getAll()).toEqual([]);
  });
});
```

- [ ] **Step 12: Run → pass** (`npx vitest run lib/db/inMemoryMatchRepository.test.ts lib/db/inMemoryStandingsRepository.test.ts`) — 5 pass. `npm run build` to typecheck the supabase repos + seed. **Step 13: Commit** `git add lib/db/matchRepository.ts lib/db/inMemoryMatchRepository.ts lib/db/inMemoryMatchRepository.test.ts lib/db/standingsRepository.ts lib/db/inMemoryStandingsRepository.ts lib/db/inMemoryStandingsRepository.test.ts lib/db/settingsRepository.ts lib/db/supabaseMatchRepository.ts lib/db/supabaseStandingsRepository.ts lib/db/repository.ts scripts/seed-tournament.ts package.json && git commit -m "feat: add match/standings/settings repositories and tournament seed"`.

---

## Task 4: Recompute orchestrator + live football-data client

**Files:** Create `lib/results/recompute.ts`, `lib/results/recompute.test.ts`, `lib/results/footballDataClient.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/results/recompute.test.ts
import { describe, it, expect } from 'vitest';
import type { Match, Team } from '../domain/types';
import { recomputeStandings } from './recompute';
import { InMemoryMatchRepository } from '../db/inMemoryMatchRepository';
import { InMemoryStandingsRepository } from '../db/inMemoryStandingsRepository';
import { InMemoryPredictionRepository } from '../db/inMemoryPredictionRepository';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
];
const matches: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
];

describe('recomputeStandings', () => {
  it('computes, persists, and reuses the prior standings as prevRank', async () => {
    const matchRepo = new InMemoryMatchRepository(matches);
    const standingsRepo = new InMemoryStandingsRepository();
    const predRepo = new InMemoryPredictionRepository();
    await predRepo.save({ userId: 'a', matchPicks: { m1: '1' }, bonus: {} }, '2026-06-01T00:00:00Z'); // 1p
    await predRepo.save({ userId: 'b', matchPicks: { m1: '2' }, bonus: {} }, '2026-06-02T00:00:00Z'); // 0p

    const first = await recomputeStandings({ teams, matchRepo, standingsRepo, predRepo });
    expect(first.find((s) => s.userId === 'a')!.rank).toBe(1);
    expect(first.find((s) => s.userId === 'a')!.prevRank).toBeNull();

    // run again — prevRank should now be filled from the persisted run
    const second = await recomputeStandings({ teams, matchRepo, standingsRepo, predRepo });
    expect(second.find((s) => s.userId === 'a')!.prevRank).toBe(1);
    expect((await standingsRepo.getAll()).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run lib/results/recompute.test.ts`).

- [ ] **Step 3: Create `lib/results/recompute.ts`**

```ts
import type { Team, TieData } from '../domain/types';
import type { MatchRepository } from '../db/matchRepository';
import type { StandingsRepository } from '../db/standingsRepository';
import type { PredictionRepository } from '../db/predictionRepository';
import { buildStandings } from './buildStandings';
import type { Standing } from './types';

export interface RecomputeDeps {
  teams: Team[];
  matchRepo: MatchRepository;
  standingsRepo: StandingsRepository;
  predRepo: PredictionRepository;
}

export async function recomputeStandings(deps: RecomputeDeps): Promise<Standing[]> {
  const { teams, matchRepo, standingsRepo, predRepo } = deps;
  const [matches, predictions, prev] = await Promise.all([
    matchRepo.all(),
    predRepo.all(),
    standingsRepo.getAll(),
  ]);

  const prevRankByUser: Record<string, number> = {};
  for (const s of prev) prevRankByUser[s.userId] = s.rank;

  const tie: Record<string, TieData> = {};
  await Promise.all(
    predictions.map(async (p) => {
      const status = await predRepo.getStatus(p.userId);
      tie[p.userId] = { submittedAt: status?.submittedAt ? new Date(status.submittedAt).getTime() : Number.MAX_SAFE_INTEGER };
    }),
  );

  const standings = buildStandings({ teams, matches, predictions }, tie, prevRankByUser);
  await standingsRepo.replaceAll(standings);
  return standings;
}
```

- [ ] **Step 4: Run → pass** (1 test). 

- [ ] **Step 5: Create `lib/results/footballDataClient.ts`** (live fetch; thin, no unit test)

```ts
import type { ApiMatch } from './footballData';

const BASE = 'https://api.football-data.org/v4';

/** Fetch World Cup matches from football-data.org. Requires FOOTBALL_DATA_TOKEN. */
export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  const res = await fetch(`${BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  const data = (await res.json()) as { matches: ApiMatch[] };
  return data.matches ?? [];
}
```

- [ ] **Step 6: Commit** `git add lib/results/recompute.ts lib/results/recompute.test.ts lib/results/footballDataClient.ts && git commit -m "feat: add recompute orchestrator and football-data client"`.

---

## Task 5: API routes

Thin handlers; logic already tested. Verified by `npm run build`. Admin routes require an admin session.

**Files:** Create `app/api/standings/route.ts`, `app/api/matches/route.ts`, `app/api/admin/results/route.ts`, `app/api/admin/results/sync/route.ts`, `app/api/admin/results/apply/route.ts`, `app/api/admin/unlock/route.ts`. Add `lib/auth/requireAdmin.ts`.

- [ ] **Step 1: Create `lib/auth/requireAdmin.ts`**

```ts
import { currentUser } from './currentUser';
import type { SessionPayload } from './session';

export async function requireAdmin(): Promise<SessionPayload | null> {
  const user = await currentUser();
  return user?.isAdmin ? user : null;
}
```

- [ ] **Step 2: Create `app/api/standings/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getStandingsRepository } from '@/lib/db/repository';

export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const standings = await getStandingsRepository().getAll();
  standings.sort((a, b) => a.rank - b.rank);
  return NextResponse.json({ standings });
}
```

- [ ] **Step 3: Create `app/api/matches/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getMatchRepository } from '@/lib/db/repository';

export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const matches = await getMatchRepository().all();
  return NextResponse.json({ matches });
}
```

- [ ] **Step 4: Create `app/api/admin/results/route.ts`** (manual result → recompute)

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures } from '@/lib/fixtures/load';
import { getMatchRepository, getStandingsRepository, getPredictionRepository } from '@/lib/db/repository';
import { recomputeStandings } from '@/lib/results/recompute';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { matchId?: string; homeScore?: number; awayScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { matchId, homeScore, awayScore } = body;
  if (!matchId || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'matchId, homeScore, awayScore required' }, { status: 400 });
  }

  const matchRepo = getMatchRepository();
  await matchRepo.setResult(matchId, { homeScore, awayScore, source: 'manual', updatedBy: admin.userId });
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, standings });
}
```

- [ ] **Step 5: Create `app/api/admin/results/sync/route.ts`** (fetch proposals, no write)

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures, groupMatches } from '@/lib/fixtures/load';
import { getMatchRepository } from '@/lib/db/repository';
import { fetchWorldCupMatches } from '@/lib/results/footballDataClient';
import { proposalsFromApi, type MatchLabels } from '@/lib/results/footballData';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const fixtures = loadFixtures();
  const labels: MatchLabels = {};
  for (const m of fixtures.matches) labels[m.id] = { home: m.homeLabel, away: m.awayLabel, kickoff: m.kickoff };

  let apiMatches;
  try {
    apiMatches = await fetchWorldCupMatches();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  const ourMatches = await getMatchRepository().all();
  const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
  return NextResponse.json({ proposals });
}
```

- [ ] **Step 6: Create `app/api/admin/results/apply/route.ts`** (apply approved proposals → recompute)

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures } from '@/lib/fixtures/load';
import { getMatchRepository, getStandingsRepository, getPredictionRepository } from '@/lib/db/repository';
import { recomputeStandings } from '@/lib/results/recompute';

interface ApplyItem { matchId: string; homeScore: number; awayScore: number; }

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { results?: ApplyItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const results = body.results ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'no results' }, { status: 400 });
  }

  const matchRepo = getMatchRepository();
  for (const r of results) {
    if (!r.matchId || typeof r.homeScore !== 'number' || typeof r.awayScore !== 'number') continue;
    await matchRepo.setResult(r.matchId, { homeScore: r.homeScore, awayScore: r.awayScore, source: 'api', updatedBy: admin.userId });
  }
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, applied: results.length, standings });
}
```

- [ ] **Step 7: Create `app/api/admin/unlock/route.ts`** (admin unlocks one user's tips)

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getPredictionRepository } from '@/lib/db/repository';

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  let body: { userId?: string; unlocked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  await getPredictionRepository().setUnlock(body.userId, body.unlocked ?? true);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Verify build + full suite** — `npm run build` (all new routes present), then `npm test` (all unit tests pass). **Step 9: Commit** `git add app/api/standings app/api/matches app/api/admin/results app/api/admin/unlock lib/auth/requireAdmin.ts && git commit -m "feat: add results, standings, matches and admin routes"`.

---

## Self-Review (completed during planning)

- **Spec coverage:** §7 results model (manual source of truth + API proposals + admin approval + manual override via `result_source`), deterministic recompute after each change → Tasks 1–5; §8 advancement derived from results → handled by the Plan 1 engine consumed in `buildStandings` (group winners, finalists, bronze, champion all derived from `matches`); datamodell `standings` → Task 0.
- **Placeholder scan:** none — full code throughout.
- **Type consistency:** `StoredPrediction` ≡ `Prediction` (verified in Plan 3 review) so `predRepo.all()` feeds `ScoringInput.predictions` directly; `buildStandings` returns `Standing[]` consumed by the standings repo and routes; `Match`/`Team` come from the domain types used everywhere.
- **Knockout id independence:** results-matching is by date+team names, and special matches (final/bronze) are identified by `stage` in the engine — the `K_<n>` id detail from Plan 3 is irrelevant here.
- **Decoupling:** `buildStandings`, `proposalsFromApi`, `recomputeStandings` are unit-tested with in-memory repos + synthetic data; only the Supabase repos, the live football-data client, and `seed-tournament.ts` await real credentials.

## Definition of done
- `npm test` green (scoring + auth + fixtures + excel + tips + buildStandings + proposals + recompute + repos).
- `npm run build` compiles (standings/matches/admin routes).
- Manual + API-assisted results both recompute standings deterministically; standings carry `prevRank` for the ▲▼ UI.
- Ready for Plan 5 (UI & PWA), which renders standings + matches + the race barometer and the admin screens.
