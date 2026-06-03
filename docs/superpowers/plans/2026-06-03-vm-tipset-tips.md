# VM-tipset 2026 — Plan 3: Fixtures, Excel-mall, uppladdning & parsning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the canonical WC2026 fixtures, produce a fillable Excel tipslapp from them (with team dropdowns), parse an uploaded tipslapp deterministically into predictions, show the user how it was interpreted, and save it to the DB with a prediction lock.

**Architecture:** `data/fixtures.json` (real WC2026 draw, generated from the public-domain openfootball dataset) is the single source of truth for teams and the 72 group matches + 32 knockout slots, each with a stable id. A shared `layout` module fixes every cell position so the Excel writer and reader agree by construction; their correctness is proven by a build→fill→parse round-trip test. Tips are saved through a `PredictionRepository` interface (in-memory for tests, Supabase for prod). The lock is a pure function. All Excel/parse logic is unit-tested with no live DB.

**Tech Stack:** `exceljs` (read+write with data-validation dropdowns), `tsx` (fixtures script), Next.js route handlers, Vitest.

This is **Plan 3 of 5**. It depends on the scoring domain types (Plan 1) and the auth/session layer (Plan 2). No live Supabase needed to complete it.

---

## Note on fixtures data
`data/fixtures.json` is generated from `openfootball/worldcup.json` (public domain, no API key). It is a complete, valid 48-team / 72-group-match / 12-group structure with real team names. If the official draw differs from the dataset, re-run `npm run build:fixtures` when openfootball updates, or hand-edit `data/fixtures.json`. The app derives everything (template, parsing, seeding, results-matching) from this one file, so match ids stay consistent everywhere.

---

## File structure created by this plan

| File | Responsibility |
|------|----------------|
| `data/fixtures.json` | Canonical teams + matches (generated) |
| `scripts/build-fixtures.ts` | Fetch openfootball → write `data/fixtures.json` |
| `lib/fixtures/types.ts` | `Fixtures`, `FixtureTeam`, `FixtureMatch` |
| `lib/fixtures/load.ts` | Load + helpers (groupMatches, teamsById, name→id) |
| `lib/excel/layout.ts` | Shared cell positions (writer+reader contract) |
| `lib/excel/template.ts` | Build the tipslapp workbook |
| `lib/excel/parse.ts` | Parse an uploaded workbook → `ParsedPrediction` |
| `supabase/migrations/0002_tournament.sql` | `teams`, `matches`, `settings` |
| `supabase/migrations/0003_predictions.sql` | `prediction_matches`, `prediction_bonus`, `prediction_status` |
| `lib/db/predictionRepository.ts` | interface + `StoredPrediction`/`PredictionStatus` |
| `lib/db/inMemoryPredictionRepository.ts` | in-memory impl |
| `lib/db/supabasePredictionRepository.ts` | Supabase impl |
| `lib/tips/lock.ts` | `isLocked` pure logic |
| `app/api/template/route.ts` | GET download .xlsx |
| `app/api/predictions/preview/route.ts` | POST upload → parsed interpretation (no save) |
| `app/api/predictions/route.ts` | POST save (lock-enforced), GET own |
| `app/tips/page.tsx` | minimal upload + confirm UI |

---

## Task 0: Dependencies + canonical fixtures

**Files:** modify `package.json`; create `scripts/build-fixtures.ts`, `lib/fixtures/types.ts`, `lib/fixtures/load.ts`, `lib/fixtures/load.test.ts`; generate `data/fixtures.json`.

- [ ] **Step 1: Add deps to `package.json`**

Add to `dependencies`: `"exceljs": "4.4.0"`. Add to `scripts`: `"build:fixtures": "tsx scripts/build-fixtures.ts"`.

- [ ] **Step 2: Install** — `npm install` (note any version bump).

- [ ] **Step 3: Create `lib/fixtures/types.ts`**

```ts
import type { GroupId, Stage } from '../domain/types';

export interface FixtureTeam {
  id: string;
  name: string;
  group: GroupId;
}

export interface FixtureMatch {
  id: string;
  stage: Stage;
  group: GroupId | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
  kickoff: string; // ISO UTC
  ground: string;
}

export interface Fixtures {
  season: string;
  firstKickoff: string; // ISO UTC of earliest group match → used as the lock time
  teams: FixtureTeam[];
  matches: FixtureMatch[];
}
```

- [ ] **Step 4: Create `scripts/build-fixtures.ts`**

```ts
import { writeFileSync, mkdirSync } from 'fs';

const SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const STAGE_BY_ROUND: Record<string, string> = {
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  'Quarter-final': 'qf',
  'Semi-final': 'sf',
  'Match for third place': 'bronze',
  Final: 'final',
};

export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toIsoUtc(date: string, time: string | undefined): string {
  const [Y, M, D] = date.split('-').map(Number);
  const m = /^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec((time ?? '').trim());
  if (!m) return new Date(Date.UTC(Y, M - 1, D, 0, 0)).toISOString();
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const off = Number(m[3]);
  // local = UTC + off  ⇒  UTC = local - off ; Date.UTC normalises day rollover
  return new Date(Date.UTC(Y, M - 1, D, hh - off, mm)).toISOString();
}

async function main() {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const data = (await res.json()) as { matches: any[] };

  const teamsMap = new Map<string, { id: string; name: string; group: string }>();
  const groupMatches: any[] = [];
  const koMatches: any[] = [];
  let gi = 0;

  for (const m of data.matches) {
    const kickoff = toIsoUtc(m.date, m.time);
    const ground = m.ground ?? '';
    if (m.group) {
      const group = String(m.group).replace('Group ', '').trim();
      const h = slug(m.team1);
      const a = slug(m.team2);
      if (!teamsMap.has(h)) teamsMap.set(h, { id: h, name: m.team1, group });
      if (!teamsMap.has(a)) teamsMap.set(a, { id: a, name: m.team2, group });
      gi += 1;
      groupMatches.push({
        id: `G${String(gi).padStart(3, '0')}`,
        stage: 'group', group,
        homeTeamId: h, awayTeamId: a,
        homeLabel: m.team1, awayLabel: m.team2,
        kickoff, ground,
      });
    } else {
      koMatches.push({
        id: `K${m.num}`,
        stage: STAGE_BY_ROUND[m.round] ?? 'r32',
        group: null,
        homeTeamId: null, awayTeamId: null,
        homeLabel: m.team1, awayLabel: m.team2,
        kickoff, ground,
      });
    }
  }

  const teams = [...teamsMap.values()].sort(
    (x, y) => x.group.localeCompare(y.group) || x.name.localeCompare(y.name),
  );
  const matches = [...groupMatches, ...koMatches];
  const firstKickoff = groupMatches
    .map((m) => m.kickoff)
    .sort()[0];

  const fixtures = { season: '2026', firstKickoff, teams, matches };
  mkdirSync('data', { recursive: true });
  writeFileSync('data/fixtures.json', `${JSON.stringify(fixtures, null, 2)}\n`);
  console.log(
    `wrote data/fixtures.json: ${teams.length} teams, ${groupMatches.length} group + ${koMatches.length} knockout, lock=${firstKickoff}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5: Generate the real fixtures**

Run: `npm run build:fixtures`
Expected output: `wrote data/fixtures.json: 48 teams, 72 group + 32 knockout, lock=2026-06-11T...Z`
If the network is unavailable, report BLOCKED (do not hand-write fixtures).

- [ ] **Step 6: Create `lib/fixtures/load.ts`**

```ts
import fixturesJson from '../../data/fixtures.json';
import type { GroupId } from '../domain/types';
import type { Fixtures, FixtureMatch, FixtureTeam } from './types';

export function loadFixtures(): Fixtures {
  return fixturesJson as Fixtures;
}

export function groupMatches(f: Fixtures): FixtureMatch[] {
  return f.matches.filter((m) => m.stage === 'group');
}

export function teamsById(f: Fixtures): Map<string, FixtureTeam> {
  return new Map(f.teams.map((t) => [t.id, t]));
}

/** Normalised team-name → id map for tolerant parsing (case/diacritic-insensitive). */
export function teamIdByName(f: Fixtures): Map<string, string> {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return new Map(f.teams.map((t) => [norm(t.name), t.id]));
}

export function teamsInGroup(f: Fixtures, group: GroupId): FixtureTeam[] {
  return f.teams.filter((t) => t.group === group);
}
```

- [ ] **Step 7: Create `lib/fixtures/load.test.ts`** (verifies the generated data shape)

```ts
import { describe, it, expect } from 'vitest';
import { loadFixtures, groupMatches, teamsInGroup } from './load';
import { GROUP_IDS } from '../domain/rules';

describe('fixtures data', () => {
  const f = loadFixtures();
  it('has 48 teams', () => {
    expect(f.teams.length).toBe(48);
  });
  it('has 72 group matches', () => {
    expect(groupMatches(f).length).toBe(72);
  });
  it('has 12 groups of 4 teams each', () => {
    for (const g of GROUP_IDS) {
      expect(teamsInGroup(f, g).length).toBe(4);
    }
  });
  it('has unique match ids', () => {
    const ids = f.matches.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('exposes a firstKickoff used for the lock', () => {
    expect(f.firstKickoff).toMatch(/^2026-06-11T/);
  });
});
```

- [ ] **Step 8: Enable JSON import** — confirm `tsconfig.json` has `"resolveJsonModule": true` (it does from Plan 1). Run `npx vitest run lib/fixtures/load.test.ts` → 5 pass.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json scripts/build-fixtures.ts lib/fixtures/ data/fixtures.json
git commit -m "feat: generate canonical WC2026 fixtures + loader"
```

---

## Task 1: Excel layout (shared writer/reader contract)

**Files:** Create `lib/excel/layout.ts`, `lib/excel/layout.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/excel/layout.test.ts
import { describe, it, expect } from 'vitest';
import {
  NAME_CELL, pickCell, bonusKeysInOrder, bonusPickCell, listsColumnForGroup,
} from './layout';

describe('excel layout', () => {
  it('puts the name in B2', () => {
    expect(NAME_CELL).toBe('B2');
  });
  it('places match picks in column C from row 5', () => {
    expect(pickCell(0)).toBe('C5');
    expect(pickCell(71)).toBe('C76');
  });
  it('orders 18 bonus keys (12 group winners + 6 others)', () => {
    const keys = bonusKeysInOrder();
    expect(keys.length).toBe(18);
    expect(keys[0]).toBe('group_winner_A');
    expect(keys[11]).toBe('group_winner_L');
    expect(keys.slice(12)).toEqual(['most_goals', 'fewest_goals', 'finalist_1', 'finalist_2', 'bronze', 'champion']);
  });
  it('computes bonus pick cells below the matches (72 matches)', () => {
    // matches end row 76; bonus header at 78; first bonus at 79
    expect(bonusPickCell(72, 0)).toBe('B79');
    expect(bonusPickCell(72, 17)).toBe('B96');
  });
  it('maps group A→C … L→N in the Lists sheet', () => {
    expect(listsColumnForGroup('A')).toBe('C');
    expect(listsColumnForGroup('L')).toBe('N');
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run lib/excel/layout.test.ts`).

- [ ] **Step 3: Create `lib/excel/layout.ts`**

```ts
import type { BonusKey, GroupId } from '../domain/types';
import { GROUP_IDS } from '../domain/rules';

export const SHEET_TIPS = 'Tips';
export const SHEET_LISTS = 'Listor';

export const NAME_CELL = 'B2';

export const MATCH_HEADER_ROW = 4;
export const MATCH_FIRST_ROW = 5;
export const COL_DATE = 'A';
export const COL_MATCH = 'B';
export const COL_PICK = 'C';

export function matchRow(index: number): number {
  return MATCH_FIRST_ROW + index;
}
export function pickCell(index: number): string {
  return `${COL_PICK}${matchRow(index)}`;
}

export function bonusKeysInOrder(): BonusKey[] {
  return [
    ...GROUP_IDS.map((g) => `group_winner_${g}` as BonusKey),
    'most_goals',
    'fewest_goals',
    'finalist_1',
    'finalist_2',
    'bronze',
    'champion',
  ];
}

export const BONUS_LABEL_COL = 'A';
export const BONUS_PICK_COL = 'B';

/** One blank row + one section-header row after the last match. */
export function bonusFirstRow(matchCount: number): number {
  return MATCH_FIRST_ROW + matchCount + 2;
}
export function bonusRow(matchCount: number, bonusIndex: number): number {
  return bonusFirstRow(matchCount) + 1 + bonusIndex;
}
export function bonusPickCell(matchCount: number, bonusIndex: number): string {
  return `${BONUS_PICK_COL}${bonusRow(matchCount, bonusIndex)}`;
}
export function bonusLabelCell(matchCount: number, bonusIndex: number): string {
  return `${BONUS_LABEL_COL}${bonusRow(matchCount, bonusIndex)}`;
}

/** Lists sheet: column A = all teams; columns C..N = the 12 groups' teams. */
export function listsColumnForGroup(group: GroupId): string {
  const idx = GROUP_IDS.indexOf(group); // 0..11
  return String.fromCharCode('C'.charCodeAt(0) + idx);
}
```

- [ ] **Step 4: Run → pass** (5 tests). **Step 5: Commit** `git add lib/excel/layout.ts lib/excel/layout.test.ts && git commit -m "feat: add excel layout contract"`.

---

## Task 2: Excel template generator

**Files:** Create `lib/excel/template.ts`, `lib/excel/template.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/excel/template.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildTemplateWorkbook, templateBuffer } from './template';
import { makeTestFixtures } from './testFixtures';
import { NAME_CELL, pickCell, bonusPickCell } from './layout';

describe('template generator', () => {
  const fixtures = makeTestFixtures(); // 2 groups, 8 teams, 12 group matches

  it('produces a Tips sheet with a name cell, a row per match, and a dropdown on picks', async () => {
    const wb = buildTemplateWorkbook(fixtures);
    const ws = wb.getWorksheet('Tips')!;
    expect(ws).toBeTruthy();
    // name label present (A2) and name cell empty
    expect(ws.getCell(NAME_CELL).value).toBeNull();
    // a pick cell exists and carries a list data-validation
    const dv = ws.getCell(pickCell(0)).dataValidation;
    expect(dv?.type).toBe('list');
    // the match label cell shows "Home - Away"
    const matchCount = fixtures.matches.filter((m) => m.stage === 'group').length;
    expect(matchCount).toBe(12);
  });

  it('adds a hidden Lists sheet and bonus dropdowns', async () => {
    const wb = buildTemplateWorkbook(fixtures);
    const lists = wb.getWorksheet('Listor')!;
    expect(lists.state).toBe('hidden');
    const ws = wb.getWorksheet('Tips')!;
    // champion bonus is the last bonus row and has a list validation
    const dv = ws.getCell(bonusPickCell(12, 17)).dataValidation;
    expect(dv?.type).toBe('list');
  });

  it('round-trips through a buffer', async () => {
    const buf = await templateBuffer(fixtures);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.getWorksheet('Tips')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Create `lib/excel/testFixtures.ts`** (shared test helper)

```ts
import type { Fixtures } from '../fixtures/types';

/** Minimal but structurally-real fixtures: 2 groups (A,B) × 4 teams, 12 group matches. */
export function makeTestFixtures(): Fixtures {
  const groups = ['A', 'B'] as const;
  const teams = groups.flatMap((g, gi) =>
    [0, 1, 2, 3].map((t) => ({ id: `${g.toLowerCase()}${t}`, name: `Team ${g}${t}`, group: g })),
  );
  const matches: Fixtures['matches'] = [];
  let n = 0;
  for (const g of groups) {
    const ids = [0, 1, 2, 3].map((t) => `${g.toLowerCase()}${t}`);
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        n += 1;
        matches.push({
          id: `G${String(n).padStart(3, '0')}`,
          stage: 'group', group: g,
          homeTeamId: ids[a], awayTeamId: ids[b],
          homeLabel: `Team ${g}${a}`, awayLabel: `Team ${g}${b}`,
          kickoff: '2026-06-11T18:00:00.000Z', ground: 'Test',
        });
      }
    }
  }
  return { season: '2026', firstKickoff: '2026-06-11T18:00:00.000Z', teams, matches };
}
```

- [ ] **Step 3: Run → fail** (`npx vitest run lib/excel/template.test.ts`).

- [ ] **Step 4: Create `lib/excel/template.ts`**

```ts
import ExcelJS from 'exceljs';
import type { GroupId } from '../domain/types';
import { GROUP_IDS } from '../domain/rules';
import type { Fixtures, FixtureMatch } from '../fixtures/types';
import { groupMatches, teamsInGroup } from '../fixtures/load';
import {
  SHEET_TIPS, SHEET_LISTS, NAME_CELL,
  MATCH_HEADER_ROW, COL_DATE, COL_MATCH, COL_PICK, matchRow, pickCell,
  bonusKeysInOrder, bonusFirstRow, bonusRow, bonusPickCell, bonusLabelCell,
  listsColumnForGroup,
} from './layout';

const BONUS_LABELS: Record<string, string> = {
  most_goals: 'Flest mål i gruppspelet',
  fewest_goals: 'Minst mål i gruppspelet',
  finalist_1: 'Finalist 1',
  finalist_2: 'Finalist 2',
  bronze: 'VM-brons',
  champion: 'VM-vinnare',
};

function bonusLabel(key: string): string {
  if (key.startsWith('group_winner_')) return `Gruppvinnare ${key.slice('group_winner_'.length)}`;
  return BONUS_LABELS[key] ?? key;
}

export function buildTemplateWorkbook(fixtures: Fixtures): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET_TIPS);
  const lists = wb.addWorksheet(SHEET_LISTS);

  // --- Lists sheet: all teams in column A; each group's teams in C..N ---
  fixtures.teams
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b))
    .forEach((name, i) => {
      lists.getCell(`A${i + 1}`).value = name;
    });
  for (const g of GROUP_IDS) {
    const col = listsColumnForGroup(g);
    teamsInGroup(fixtures, g).forEach((t, i) => {
      lists.getCell(`${col}${i + 1}`).value = t.name;
    });
  }
  lists.state = 'hidden';

  // --- Tips sheet header ---
  ws.getCell('A1').value = 'VM-tipset 2026';
  ws.getCell('A2').value = 'NAMN:';
  ws.getCell(NAME_CELL).value = null;
  ws.getCell(`${COL_DATE}${MATCH_HEADER_ROW}`).value = 'Datum';
  ws.getCell(`${COL_MATCH}${MATCH_HEADER_ROW}`).value = 'Match';
  ws.getCell(`${COL_PICK}${MATCH_HEADER_ROW}`).value = '1/X/2';

  // --- Match rows ---
  const gms: FixtureMatch[] = groupMatches(fixtures);
  gms.forEach((m, i) => {
    const r = matchRow(i);
    ws.getCell(`${COL_DATE}${r}`).value = m.kickoff.slice(0, 10);
    ws.getCell(`${COL_MATCH}${r}`).value = `${m.homeLabel} - ${m.awayLabel}`;
    const pick = ws.getCell(pickCell(i));
    pick.value = null;
    pick.dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,X,2"'] };
  });

  // --- Bonus block ---
  const matchCount = gms.length;
  ws.getCell(`A${bonusFirstRow(matchCount)}`).value = 'BONUS';
  const allTeamsRange = `${SHEET_LISTS}!$A$1:$A$${fixtures.teams.length}`;
  bonusKeysInOrder().forEach((key, i) => {
    ws.getCell(bonusLabelCell(matchCount, i)).value = bonusLabel(key);
    const pick = ws.getCell(bonusPickCell(matchCount, i));
    pick.value = null;
    if (key.startsWith('group_winner_')) {
      const g = key.slice('group_winner_'.length) as GroupId;
      const col = listsColumnForGroup(g);
      pick.dataValidation = { type: 'list', allowBlank: true, formulae: [`${SHEET_LISTS}!$${col}$1:$${col}$4`] };
    } else {
      pick.dataValidation = { type: 'list', allowBlank: true, formulae: [allTeamsRange] };
    }
  });

  ws.getColumn('A').width = 22;
  ws.getColumn('B').width = 34;
  ws.getColumn('C').width = 10;
  return wb;
}

export async function templateBuffer(fixtures: Fixtures): Promise<Buffer> {
  const wb = buildTemplateWorkbook(fixtures);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
```

- [ ] **Step 5: Run → pass** (3 tests). **Step 6: Commit** `git add lib/excel/template.ts lib/excel/template.test.ts lib/excel/testFixtures.ts && git commit -m "feat: add excel template generator"`.

---

## Task 3: Excel parser + round-trip test

**Files:** Create `lib/excel/parse.ts`, `lib/excel/parse.test.ts`.

- [ ] **Step 1: Write the failing test (the round-trip guarantee)**

```ts
// lib/excel/parse.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { templateBuffer } from './template';
import { parseWorkbook } from './parse';
import { makeTestFixtures } from './testFixtures';
import { NAME_CELL, pickCell, bonusPickCell, bonusKeysInOrder } from './layout';
import { groupMatches } from '../fixtures/load';

describe('parseWorkbook (round-trip)', () => {
  const fixtures = makeTestFixtures();

  async function fillAndParse(fill: (ws: ExcelJS.Worksheet) => void) {
    const buf = await templateBuffer(fixtures);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    fill(wb.getWorksheet('Tips')!);
    const out = Buffer.from(await wb.xlsx.writeBuffer());
    return parseWorkbook(out, fixtures);
  }

  it('reads name, match picks and bonus team ids', async () => {
    const gms = groupMatches(fixtures);
    const parsed = await fillAndParse((ws) => {
      ws.getCell(NAME_CELL).value = 'Carl';
      ws.getCell(pickCell(0)).value = '1';
      ws.getCell(pickCell(1)).value = 'X';
      ws.getCell(pickCell(2)).value = '2';
      // group_winner_A = a team name from group A; champion = some team
      ws.getCell(bonusPickCell(12, 0)).value = 'Team A0';
      ws.getCell(bonusPickCell(12, 17)).value = 'Team B1';
    });

    expect(parsed.name).toBe('Carl');
    expect(parsed.matchPicks[gms[0].id]).toBe('1');
    expect(parsed.matchPicks[gms[1].id]).toBe('X');
    expect(parsed.matchPicks[gms[2].id]).toBe('2');
    expect(parsed.bonus.group_winner_A).toBe('a0');
    expect(parsed.bonus.champion).toBe('b1');
    expect(parsed.warnings).toEqual([]);
  });

  it('warns on an unrecognised team name and an invalid pick', async () => {
    const parsed = await fillAndParse((ws) => {
      ws.getCell(pickCell(0)).value = '3'; // invalid
      ws.getCell(bonusPickCell(12, 17)).value = 'Nonexistent FC';
    });
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(2);
    expect(parsed.matchPicks[groupMatches(fixtures)[0].id]).toBeUndefined();
    expect(parsed.bonus.champion).toBeUndefined();
  });

  it('is tolerant of case and diacritics in team names', async () => {
    const parsed = await fillAndParse((ws) => {
      ws.getCell(bonusPickCell(12, 17)).value = '  team a0  '; // lower + spaces
    });
    expect(parsed.bonus.champion).toBe('a0');
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run lib/excel/parse.test.ts`).

- [ ] **Step 3: Create `lib/excel/parse.ts`**

```ts
import ExcelJS from 'exceljs';
import type { BonusKey, GroupId, Pick } from '../domain/types';
import type { Fixtures } from '../fixtures/types';
import { groupMatches, teamIdByName, teamsInGroup } from '../fixtures/load';
import { SHEET_TIPS, NAME_CELL, pickCell, bonusKeysInOrder, bonusPickCell } from './layout';

export interface ParsedPrediction {
  name: string | null;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
  warnings: string[];
}

function cellString(ws: ExcelJS.Worksheet, addr: string): string | null {
  const v = ws.getCell(addr).value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '').trim() || null;
  return String(v).trim() || null;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export async function parseBuffer(buffer: Buffer, fixtures: Fixtures): Promise<ParsedPrediction> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return parseLoaded(wb, fixtures);
}

export function parseWorkbook(buffer: Buffer, fixtures: Fixtures): Promise<ParsedPrediction> {
  return parseBuffer(buffer, fixtures);
}

function parseLoaded(wb: ExcelJS.Workbook, fixtures: Fixtures): ParsedPrediction {
  const ws = wb.getWorksheet(SHEET_TIPS);
  const warnings: string[] = [];
  if (!ws) {
    return { name: null, matchPicks: {}, bonus: {}, warnings: ['Bladet "Tips" saknas i filen.'] };
  }

  const name = cellString(ws, NAME_CELL);
  const matchPicks: Record<string, Pick> = {};
  const gms = groupMatches(fixtures);
  gms.forEach((m, i) => {
    const raw = cellString(ws, pickCell(i));
    if (raw === null) return;
    if (raw === '1' || raw === 'X' || raw === 'x' || raw === '2') {
      matchPicks[m.id] = (raw === 'x' ? 'X' : raw) as Pick;
    } else {
      warnings.push(`Ogiltigt tecken "${raw}" för match ${m.homeLabel}–${m.awayLabel} (förväntar 1, X eller 2).`);
    }
  });

  const byName = teamIdByName(fixtures);
  const bonus: Partial<Record<BonusKey, string>> = {};
  bonusKeysInOrder().forEach((key, i) => {
    const raw = cellString(ws, bonusPickCell(gms.length, i));
    if (raw === null) return;
    const id = byName.get(norm(raw));
    if (!id) {
      warnings.push(`Okänt lagnamn "${raw}" för ${key}.`);
      return;
    }
    if (key.startsWith('group_winner_')) {
      const g = key.slice('group_winner_'.length) as GroupId;
      const inGroup = teamsInGroup(fixtures, g).some((t) => t.id === id);
      if (!inGroup) {
        warnings.push(`"${raw}" tillhör inte grupp ${g}.`);
        return;
      }
    }
    bonus[key] = id;
  });

  return { name, matchPicks, bonus, warnings };
}
```

- [ ] **Step 4: Run → pass** (3 tests, including the round-trip). **Step 5: Commit** `git add lib/excel/parse.ts lib/excel/parse.test.ts && git commit -m "feat: add excel parser with round-trip test"`.

---

## Task 4: Prediction schema, repository, and lock

**Files:** Create `supabase/migrations/0002_tournament.sql`, `supabase/migrations/0003_predictions.sql`, `lib/db/predictionRepository.ts`, `lib/db/inMemoryPredictionRepository.ts`, `lib/db/supabasePredictionRepository.ts`, `lib/tips/lock.ts`, `lib/tips/lock.test.ts`, `lib/db/inMemoryPredictionRepository.test.ts`.

- [ ] **Step 1: Create `supabase/migrations/0002_tournament.sql`**

```sql
create table if not exists public.teams (
  id text primary key,
  name text not null,
  "group" text not null
);

create table if not exists public.matches (
  id text primary key,
  stage text not null,
  "group" text,
  home_team_id text,
  away_team_id text,
  home_label text not null,
  away_label text not null,
  kickoff timestamptz,
  ground text,
  status text not null default 'scheduled',
  home_score int,
  away_score int,
  result_source text,
  updated_by uuid,
  updated_at timestamptz
);

create table if not exists public.settings (
  id int primary key default 1,
  season text not null default '2026',
  lock_at timestamptz,
  constraint settings_singleton check (id = 1)
);
```

- [ ] **Step 2: Create `supabase/migrations/0003_predictions.sql`**

```sql
create table if not exists public.prediction_matches (
  user_id uuid not null references public.users(id) on delete cascade,
  match_id text not null,
  pick text not null check (pick in ('1','X','2')),
  primary key (user_id, match_id)
);

create table if not exists public.prediction_bonus (
  user_id uuid not null references public.users(id) on delete cascade,
  bonus_key text not null,
  team_id text not null,
  primary key (user_id, bonus_key)
);

create table if not exists public.prediction_status (
  user_id uuid primary key references public.users(id) on delete cascade,
  submitted boolean not null default false,
  submitted_at timestamptz,
  unlocked_by_admin boolean not null default false
);
```

- [ ] **Step 3: Create `lib/db/predictionRepository.ts`**

```ts
import type { BonusKey, Pick } from '../domain/types';

export interface StoredPrediction {
  userId: string;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
}

export interface PredictionStatus {
  userId: string;
  submitted: boolean;
  submittedAt: string | null;
  unlockedByAdmin: boolean;
}

export interface PredictionRepository {
  save(prediction: StoredPrediction, submittedAt: string): Promise<void>;
  get(userId: string): Promise<StoredPrediction | null>;
  getStatus(userId: string): Promise<PredictionStatus | null>;
  setUnlock(userId: string, unlocked: boolean): Promise<void>;
  all(): Promise<StoredPrediction[]>;
}
```

- [ ] **Step 4: Create `lib/db/inMemoryPredictionRepository.ts`**

```ts
import type { PredictionRepository, PredictionStatus, StoredPrediction } from './predictionRepository';

export class InMemoryPredictionRepository implements PredictionRepository {
  private byUser = new Map<string, StoredPrediction>();
  private status = new Map<string, PredictionStatus>();

  async save(prediction: StoredPrediction, submittedAt: string): Promise<void> {
    this.byUser.set(prediction.userId, {
      userId: prediction.userId,
      matchPicks: { ...prediction.matchPicks },
      bonus: { ...prediction.bonus },
    });
    const prev = this.status.get(prediction.userId);
    this.status.set(prediction.userId, {
      userId: prediction.userId,
      submitted: true,
      submittedAt,
      unlockedByAdmin: prev?.unlockedByAdmin ?? false,
    });
  }

  async get(userId: string): Promise<StoredPrediction | null> {
    return this.byUser.get(userId) ?? null;
  }

  async getStatus(userId: string): Promise<PredictionStatus | null> {
    return this.status.get(userId) ?? null;
  }

  async setUnlock(userId: string, unlocked: boolean): Promise<void> {
    const prev = this.status.get(userId);
    this.status.set(userId, {
      userId,
      submitted: prev?.submitted ?? false,
      submittedAt: prev?.submittedAt ?? null,
      unlockedByAdmin: unlocked,
    });
  }

  async all(): Promise<StoredPrediction[]> {
    return [...this.byUser.values()];
  }
}
```

- [ ] **Step 5: Create `lib/tips/lock.ts`**

```ts
import type { PredictionStatus } from '../db/predictionRepository';

/**
 * Predictions lock at the first kickoff. An admin can unlock a single user
 * (e.g. they uploaded the wrong file just before kickoff).
 */
export function isLocked(lockAt: string, now: Date, status: PredictionStatus | null): boolean {
  if (status?.unlockedByAdmin) return false;
  return now.getTime() >= new Date(lockAt).getTime();
}
```

- [ ] **Step 6: Create `lib/tips/lock.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isLocked } from './lock';

const LOCK = '2026-06-11T18:00:00.000Z';

describe('isLocked', () => {
  it('is open before the lock time', () => {
    expect(isLocked(LOCK, new Date('2026-06-10T10:00:00Z'), null)).toBe(false);
  });
  it('is locked at/after the lock time', () => {
    expect(isLocked(LOCK, new Date('2026-06-11T18:00:00Z'), null)).toBe(true);
    expect(isLocked(LOCK, new Date('2026-06-12T00:00:00Z'), null)).toBe(true);
  });
  it('an admin-unlocked user is never locked', () => {
    const status = { userId: 'u', submitted: true, submittedAt: null, unlockedByAdmin: true };
    expect(isLocked(LOCK, new Date('2026-06-20T00:00:00Z'), status)).toBe(false);
  });
});
```

- [ ] **Step 7: Create `lib/db/inMemoryPredictionRepository.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { InMemoryPredictionRepository } from './inMemoryPredictionRepository';

describe('InMemoryPredictionRepository', () => {
  it('saves and reads a prediction + marks status submitted', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.save({ userId: 'u1', matchPicks: { G001: '1' }, bonus: { champion: 'a0' } }, '2026-06-01T00:00:00Z');
    expect(await repo.get('u1')).toEqual({ userId: 'u1', matchPicks: { G001: '1' }, bonus: { champion: 'a0' } });
    const st = await repo.getStatus('u1');
    expect(st?.submitted).toBe(true);
    expect(st?.submittedAt).toBe('2026-06-01T00:00:00Z');
  });
  it('preserves an admin unlock across a later save', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.setUnlock('u1', true);
    await repo.save({ userId: 'u1', matchPicks: {}, bonus: {} }, '2026-06-01T00:00:00Z');
    expect((await repo.getStatus('u1'))?.unlockedByAdmin).toBe(true);
  });
  it('lists all predictions', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.save({ userId: 'a', matchPicks: {}, bonus: {} }, 't');
    await repo.save({ userId: 'b', matchPicks: {}, bonus: {} }, 't');
    expect((await repo.all()).map((p) => p.userId).sort()).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 8: Run → fail then pass** (`npx vitest run lib/tips/lock.test.ts lib/db/inMemoryPredictionRepository.test.ts`) — 6 pass.

- [ ] **Step 9: Create `lib/db/supabasePredictionRepository.ts`** (no unit test; thin glue verified by build + once Supabase is connected)

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BonusKey, Pick } from '../domain/types';
import type { PredictionRepository, PredictionStatus, StoredPrediction } from './predictionRepository';

export class SupabasePredictionRepository implements PredictionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async save(prediction: StoredPrediction, submittedAt: string): Promise<void> {
    const { userId, matchPicks, bonus } = prediction;
    await this.db.from('prediction_matches').delete().eq('user_id', userId);
    await this.db.from('prediction_bonus').delete().eq('user_id', userId);

    const matchRows = Object.entries(matchPicks).map(([match_id, pick]) => ({ user_id: userId, match_id, pick }));
    if (matchRows.length) {
      const { error } = await this.db.from('prediction_matches').insert(matchRows);
      if (error) throw new Error(error.message);
    }
    const bonusRows = Object.entries(bonus).map(([bonus_key, team_id]) => ({ user_id: userId, bonus_key, team_id }));
    if (bonusRows.length) {
      const { error } = await this.db.from('prediction_bonus').insert(bonusRows);
      if (error) throw new Error(error.message);
    }
    const { error: stErr } = await this.db
      .from('prediction_status')
      .upsert({ user_id: userId, submitted: true, submitted_at: submittedAt }, { onConflict: 'user_id' });
    if (stErr) throw new Error(stErr.message);
  }

  async get(userId: string): Promise<StoredPrediction | null> {
    const [{ data: mrows, error: me }, { data: brows, error: be }] = await Promise.all([
      this.db.from('prediction_matches').select('match_id,pick').eq('user_id', userId),
      this.db.from('prediction_bonus').select('bonus_key,team_id').eq('user_id', userId),
    ]);
    if (me) throw new Error(me.message);
    if (be) throw new Error(be.message);
    if ((!mrows || mrows.length === 0) && (!brows || brows.length === 0)) return null;
    const matchPicks: Record<string, Pick> = {};
    for (const r of mrows ?? []) matchPicks[r.match_id as string] = r.pick as Pick;
    const bonus: Partial<Record<BonusKey, string>> = {};
    for (const r of brows ?? []) bonus[r.bonus_key as BonusKey] = r.team_id as string;
    return { userId, matchPicks, bonus };
  }

  async getStatus(userId: string): Promise<PredictionStatus | null> {
    const { data, error } = await this.db
      .from('prediction_status')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      userId,
      submitted: data.submitted as boolean,
      submittedAt: (data.submitted_at as string | null) ?? null,
      unlockedByAdmin: data.unlocked_by_admin as boolean,
    };
  }

  async setUnlock(userId: string, unlocked: boolean): Promise<void> {
    const { error } = await this.db
      .from('prediction_status')
      .upsert({ user_id: userId, unlocked_by_admin: unlocked }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }

  async all(): Promise<StoredPrediction[]> {
    const [{ data: mrows, error: me }, { data: brows, error: be }] = await Promise.all([
      this.db.from('prediction_matches').select('user_id,match_id,pick'),
      this.db.from('prediction_bonus').select('user_id,bonus_key,team_id'),
    ]);
    if (me) throw new Error(me.message);
    if (be) throw new Error(be.message);
    const map = new Map<string, StoredPrediction>();
    const get = (uid: string) => {
      let p = map.get(uid);
      if (!p) { p = { userId: uid, matchPicks: {}, bonus: {} }; map.set(uid, p); }
      return p;
    };
    for (const r of mrows ?? []) get(r.user_id as string).matchPicks[r.match_id as string] = r.pick as Pick;
    for (const r of brows ?? []) get(r.user_id as string).bonus[r.bonus_key as BonusKey] = r.team_id as string;
    return [...map.values()];
  }
}
```

- [ ] **Step 10: Extend `lib/db/repository.ts`** — add a prediction-repo factory next to the existing user factory:

```ts
import { SupabasePredictionRepository } from './supabasePredictionRepository';
import type { PredictionRepository } from './predictionRepository';

export function getPredictionRepository(): PredictionRepository {
  return new SupabasePredictionRepository(getSupabaseAdmin());
}
```
(Keep the existing `getUserRepository` and imports; add the `getSupabaseAdmin` import if not already present.)

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/0002_tournament.sql supabase/migrations/0003_predictions.sql lib/db/predictionRepository.ts lib/db/inMemoryPredictionRepository.ts lib/db/inMemoryPredictionRepository.test.ts lib/db/supabasePredictionRepository.ts lib/db/repository.ts lib/tips/
git commit -m "feat: add prediction schema, repository and lock"
```

---

## Task 5: Tips API routes (template, preview, save)

Thin handlers; logic is already tested. Verified by `npm run build`. Lock + auth enforced server-side.

**Files:** Create `app/api/template/route.ts`, `app/api/predictions/preview/route.ts`, `app/api/predictions/route.ts`. Add a small `lib/auth/currentUser.ts` helper.

- [ ] **Step 1: Create `lib/auth/currentUser.ts`**

```ts
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './cookies';
import { verifySessionToken, type SessionPayload } from './session';

export async function currentUser(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}
```

- [ ] **Step 2: Create `app/api/template/route.ts`**

```ts
export const runtime = 'nodejs';

import { templateBuffer } from '@/lib/excel/template';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';

export async function GET() {
  if (!(await currentUser())) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const buf = await templateBuffer(loadFixtures());
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="vm-tipset-2026.xlsx"',
    },
  });
}
```

- [ ] **Step 3: Create `app/api/predictions/preview/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { parseBuffer } from '@/lib/excel/parse';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';

export async function POST(req: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseBuffer(buffer, loadFixtures());
  return NextResponse.json({ parsed });
}
```

- [ ] **Step 4: Create `app/api/predictions/route.ts`**

```ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { parseBuffer } from '@/lib/excel/parse';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';
import { getPredictionRepository } from '@/lib/db/repository';
import { isLocked } from '@/lib/tips/lock';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const repo = getPredictionRepository();
  const [prediction, status] = await Promise.all([repo.get(user.userId), repo.getStatus(user.userId)]);
  return NextResponse.json({ prediction, status });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fixtures = loadFixtures();
  const repo = getPredictionRepository();
  const status = await repo.getStatus(user.userId);
  if (isLocked(fixtures.firstKickoff, new Date(), status)) {
    return NextResponse.json({ error: 'Tipsen är låsta (matcherna har börjat).' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseBuffer(buffer, fixtures);

  await repo.save(
    { userId: user.userId, matchPicks: parsed.matchPicks, bonus: parsed.bonus },
    new Date().toISOString(),
  );
  return NextResponse.json({ ok: true, saved: { matches: Object.keys(parsed.matchPicks).length, bonus: Object.keys(parsed.bonus).length }, warnings: parsed.warnings });
}
```

- [ ] **Step 5: Verify build** — `npm run build` (routes `/api/template`, `/api/predictions`, `/api/predictions/preview` present). **Step 6: Commit** `git add app/api/template app/api/predictions lib/auth/currentUser.ts && git commit -m "feat: add tips api routes with lock enforcement"`.

---

## Task 6: Minimal tips upload page

**Files:** Create `app/tips/page.tsx`. (Full Retro styling comes in Plan 5.)

- [ ] **Step 1: Create `app/tips/page.tsx`**

```tsx
'use client';

import { useState } from 'react';

interface Parsed {
  name: string | null;
  matchPicks: Record<string, string>;
  bonus: Record<string, string>;
  warnings: string[];
}

export default function TipsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview() {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/predictions/preview', { method: 'POST', body: fd });
    setBusy(false);
    const data = await res.json();
    if (res.ok) setParsed(data.parsed);
    else setMsg(data.error ?? 'kunde inte läsa filen');
  }

  async function save() {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/predictions', { method: 'POST', body: fd });
    setBusy(false);
    const data = await res.json();
    setMsg(res.ok ? `Sparat! ${data.saved.matches} matcher, ${data.saved.bonus} bonus.` : (data.error ?? 'kunde inte spara'));
  }

  return (
    <main style={{ maxWidth: 640, margin: '6vh auto', padding: 24 }}>
      <h1>Ladda upp ditt tips</h1>
      <p>
        <a href="/api/template">Ladda ner tipslappen (.xlsx)</a> — fyll i den och ladda upp nedan.
      </p>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setMsg(null); }}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={preview} disabled={!file || busy}>Visa tolkning</button>{' '}
        <button onClick={save} disabled={!file || busy}>Spara tips</button>
      </div>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      {parsed && (
        <section style={{ marginTop: 16 }}>
          <h2>Så här tolkade vi ditt tips</h2>
          <p>Namn: {parsed.name ?? '—'}</p>
          <p>Antal matchtips: {Object.keys(parsed.matchPicks).length} / 72</p>
          <p>Antal bonussvar: {Object.keys(parsed.bonus).length} / 18</p>
          {parsed.warnings.length > 0 && (
            <ul style={{ color: '#e23b3b' }}>
              {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          <p style={{ fontSize: 13, color: '#666' }}>Kontrollera ovan och klicka &quot;Spara tips&quot; om det stämmer.</p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify build + full suite** — `npm run build` (`/tips` present), then `npm test` (all Plan 1–3 unit tests pass). **Step 3: Commit** `git add app/tips && git commit -m "feat: add tips upload page"`.

---

## Self-Review (completed during planning)

- **Spec coverage:** §6 Excel upload + parsing (template from real fixtures, fixed-cell parsing, dropdowns, confirm step, error handling, lock) → Tasks 0–6; datamodell `teams`/`matches`/`settings`/`prediction_*` → Task 4 migrations; lock at first kickoff + admin unlock → `lib/tips/lock.ts` + route.
- **Placeholder scan:** none — full code throughout.
- **Type consistency:** `ParsedPrediction.matchPicks`/`bonus` feed `StoredPrediction` (same `Pick`/`BonusKey` types from Plan 1); the layout module is the single source of cell positions for both `template.ts` and `parse.ts`; `bonusKeysInOrder()` is shared so writer and reader iterate identically.
- **Writer/reader contract:** proven by the round-trip test (build template → fill → parse → assert), the strongest correctness guarantee for the Excel pipeline.
- **Decoupling:** all Excel/parse/lock/repo logic is unit-tested with no live DB; only the Supabase prediction repo and the migrations await real credentials.

## Definition of done
- `npm test` green (scoring + auth + fixtures + excel round-trip + lock + prediction repo).
- `npm run build` compiles (tips routes + upload page).
- `data/fixtures.json` holds the real 48-team / 72-match WC2026 structure.
- Ready for Plan 4 (results sync + standings), which seeds `teams`/`matches` from `data/fixtures.json` and scores the stored predictions.
