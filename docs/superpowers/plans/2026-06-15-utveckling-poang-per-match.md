# Utveckling — Poäng per match — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En ny flik `/utveckling` som visar varje spelares kumulativa totalpoäng efter varje avslutad match som en handrullad SVG-linjegraf, med klickbara spelarchips som lyfter fram linjer.

**Architecture:** Ren testbar datalogik i `lib/view/` (replay av `computeScores` över växande mängd avslutade matcher → tidsserie per spelare; rena SVG-skalfunktioner). Tunna client-komponenter ritar SVG och hanterar highlight-state. Loader i `serverData.ts` följer samma `safe()`-mönster som övriga vyer.

**Tech Stack:** Next.js 15 (App Router, `force-dynamic`), React 19, TypeScript strict, handrullad SVG (inga nya deps), Vitest.

---

## Filstruktur

| Fil | Ansvar |
|-----|--------|
| `lib/view/pointsTimeline.ts` (ny) | Bygger tidsserie: kumulativ totalpoäng per spelare efter varje avslutad match. Ren funktion. |
| `lib/view/pointsTimeline.test.ts` (ny) | Tester för kumulativ korrekthet, bonus-kliv, tomt läge. |
| `lib/view/chartScale.ts` (ny) | Rena SVG-hjälpare: `linearScale`, `buildLinePath`. |
| `lib/view/chartScale.test.ts` (ny) | Tester för skala + path-strängar. |
| `lib/view/serverData.ts` (ändra) | Ny `loadPointsTimeline()`. |
| `components/PointsChart.tsx` (ny) | Handrullad SVG-graf med hover-tooltip. Client. |
| `components/PlayerLegend.tsx` (ny) | Spelarchips som togglar highlight + "Alla"-knapp. Client. |
| `components/UtvecklingView.tsx` (ny) | Client-wrapper som äger highlight-state och kopplar ihop graf + legend. |
| `app/utveckling/page.tsx` (ny) | Server-component, laddar data, tomtillstånd. |
| `components/Nav.tsx` (ändra) | Lägg till flik "Utveckling". |
| `app/globals.css` (ändra) | Stilar för graf/legend. |

**Notera:** Komponenttester saknar infra i repot (alla 97 test är `lib/*.test.ts`, ingen jsdom/RTL). Komponenter (Task 5–7) verifieras via `npm run build` + manuell körning, inte enhetstest. Logiken som testas ligger i Task 1–2.

---

### Task 1: Datalager — `pointsTimeline.ts`

**Files:**
- Create: `lib/view/pointsTimeline.ts`
- Test: `lib/view/pointsTimeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/view/pointsTimeline.test.ts
import { describe, it, expect } from 'vitest';
import { buildPointsTimeline, type MatchMeta } from './pointsTimeline';
import type { Match, Prediction, Team } from '../domain/types';

const team = (id: string, group: Team['group']): Team => ({ id, name: id, group });

const finished = (id: string, home: string, away: string, hs: number, as: number): Match => ({
  id, stage: 'group', group: 'A', homeTeamId: home, awayTeamId: away,
  status: 'finished', homeScore: hs, awayScore: as,
});

const meta = (...ids: string[]): MatchMeta => {
  const m: MatchMeta = {};
  ids.forEach((id, i) => { m[id] = { kickoff: `2026-06-1${i + 1}T19:00:00.000Z`, label: id }; });
  return m;
};

describe('buildPointsTimeline', () => {
  it('accumulates match points step by step in kickoff order', () => {
    const teams = [team('a1', 'A'), team('a2', 'A'), team('a3', 'A')];
    const matches = [finished('M2', 'a1', 'a3', 2, 0), finished('M1', 'a1', 'a2', 1, 0)];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1', M2: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1', 'M2'));

    expect(tl.steps.map((s) => s.matchId)).toEqual(['M1', 'M2']); // sorted by kickoff, not input order
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 1, 2] }]);
  });

  it('lights up a bonus as a step jump at the match that resolves it', () => {
    // 2-team group A → 1 match completes the group → group-winner bonus (4p) resolves.
    const teams = [team('a1', 'A'), team('a2', 'A')];
    const matches = [finished('M1', 'a1', 'a2', 3, 0)];
    const predictions: Prediction[] = [
      { userId: 'u1', matchPicks: { M1: '1' }, bonus: { group_winner_A: 'a1' } },
    ];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1'));

    // 1 match point + 4 group-winner points jump in together at step 1.
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 5] }]);
  });

  it('ignores unfinished matches and matches missing from meta', () => {
    const teams = [team('a1', 'A'), team('a2', 'A'), team('a3', 'A')];
    const matches: Match[] = [
      finished('M1', 'a1', 'a2', 1, 0),
      { id: 'M2', stage: 'group', group: 'A', homeTeamId: 'a1', awayTeamId: 'a3',
        status: 'scheduled', homeScore: null, awayScore: null },
    ];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1', M2: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1', 'M2'));

    expect(tl.steps).toHaveLength(1);
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 1] }]);
  });

  it('returns no steps and a lone zero point per user when nothing is finished', () => {
    const teams = [team('a1', 'A'), team('a2', 'A')];
    const matches: Match[] = [
      { id: 'M1', stage: 'group', group: 'A', homeTeamId: 'a1', awayTeamId: 'a2',
        status: 'scheduled', homeScore: null, awayScore: null },
    ];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1'));

    expect(tl.steps).toEqual([]);
    expect(tl.series).toEqual([{ userId: 'u1', points: [0] }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pointsTimeline`
Expected: FAIL — "Cannot find module './pointsTimeline'" (or `buildPointsTimeline is not a function`).

- [ ] **Step 3: Write the implementation**

```ts
// lib/view/pointsTimeline.ts
import type { Match, ScoringInput } from '../domain/types';
import { computeScores } from '../scoring/score';

/** Per-match presentation data, keyed by match id. Only finished matches with an
 *  entry here are plotted. */
export type MatchMeta = Record<string, { kickoff: string; label: string }>;

export interface TimelineStep {
  index: number;      // 1-based position on the X-axis
  matchId: string;
  label: string;      // e.g. "Mexico–South Africa"
  kickoff: string;    // ISO UTC
}

export interface PlayerSeries {
  userId: string;
  points: number[];   // points[0] = 0 (start), points[i] = cumulative total after step i
}

export interface PointsTimeline {
  steps: TimelineStep[];
  series: PlayerSeries[];
}

/**
 * Replays the scoring engine over a growing set of finished matches (in kickoff
 * order) to produce each player's cumulative TOTAL points after every completed
 * match. Bonuses (group winner, most/fewest goals, finalists, bronze, champion)
 * appear as step jumps at the match that resolves them, because they only score
 * once the relevant matches are part of the replayed subset.
 */
export function buildPointsTimeline(input: ScoringInput, meta: MatchMeta): PointsTimeline {
  const finished: Match[] = input.matches
    .filter((m) => m.status === 'finished' && meta[m.id])
    .sort((a, b) => meta[a.id].kickoff.localeCompare(meta[b.id].kickoff) || a.id.localeCompare(b.id));

  const series: PlayerSeries[] = input.predictions.map((p) => ({ userId: p.userId, points: [0] }));
  const byUser = new Map(series.map((s) => [s.userId, s]));
  const steps: TimelineStep[] = [];

  finished.forEach((m, i) => {
    const subset = finished.slice(0, i + 1);
    const scores = computeScores({ teams: input.teams, matches: subset, predictions: input.predictions });
    for (const sc of scores) byUser.get(sc.userId)?.points.push(sc.totalPoints);
    steps.push({ index: i + 1, matchId: m.id, label: meta[m.id].label, kickoff: meta[m.id].kickoff });
  });

  return { steps, series };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pointsTimeline`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/view/pointsTimeline.ts lib/view/pointsTimeline.test.ts
git commit -m "Utveckling: poäng-per-match-tidsserie (datalager)"
```

---

### Task 2: SVG-skalfunktioner — `chartScale.ts`

**Files:**
- Create: `lib/view/chartScale.ts`
- Test: `lib/view/chartScale.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/view/chartScale.test.ts
import { describe, it, expect } from 'vitest';
import { linearScale, buildLinePath } from './chartScale';

describe('linearScale', () => {
  it('maps the domain onto the range linearly', () => {
    const s = linearScale([0, 10], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(100);
  });

  it('inverts the range (SVG y grows downward)', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(10)).toBe(0);
  });

  it('does not divide by zero for a zero-width domain', () => {
    const s = linearScale([5, 5], [0, 100]);
    expect(s(5)).toBe(0);
  });
});

describe('buildLinePath', () => {
  it('returns an empty string for no points', () => {
    expect(buildLinePath([])).toBe('');
  });

  it('emits a single move for one point', () => {
    expect(buildLinePath([{ x: 0, y: 0 }])).toBe('M 0 0');
  });

  it('moves then lines through the rest, rounded to one decimal', () => {
    expect(buildLinePath([{ x: 0, y: 0 }, { x: 1.25, y: 2 }])).toBe('M 0 0 L 1.3 2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chartScale`
Expected: FAIL — "Cannot find module './chartScale'".

- [ ] **Step 3: Write the implementation**

```ts
// lib/view/chartScale.ts

/** A linear mapping from a numeric domain to an output range. Safe for a
 *  zero-width domain (returns range start instead of NaN). */
export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number {
  const span = domain[1] - domain[0];
  return (v: number) => (span === 0 ? range[0] : range[0] + ((v - domain[0]) / span) * (range[1] - range[0]));
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Builds an SVG path string ("M … L …") from screen-space points. */
export function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${r(p.x)} ${r(p.y)}`)
    .join(' ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- chartScale`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/view/chartScale.ts lib/view/chartScale.test.ts
git commit -m "Utveckling: rena SVG-skalfunktioner"
```

---

### Task 3: Loader — `loadPointsTimeline()`

**Files:**
- Modify: `lib/view/serverData.ts`

- [ ] **Step 1: Add the import for the timeline builder**

At the top of `lib/view/serverData.ts`, add alongside the existing view imports:

```ts
import { buildPointsTimeline, type MatchMeta, type PointsTimeline } from './pointsTimeline';
```

- [ ] **Step 2: Add the loader at the end of the file**

```ts
/** Cumulative total points per player after each finished match, for the graph. */
export async function loadPointsTimeline(): Promise<PointsTimeline> {
  const fixtures = loadFixtures();
  const [matches, predictions] = await Promise.all([
    safe(() => getMatchRepository().all(), []),
    safe(() => getPredictionRepository().all(), []),
  ]);
  const meta: MatchMeta = {};
  for (const m of fixtures.matches) {
    meta[m.id] = { kickoff: m.kickoff, label: `${m.homeLabel}–${m.awayLabel}` };
  }
  return buildPointsTimeline({ teams: fixtures.teams, matches, predictions }, meta);
}
```

(`loadFixtures`, `safe`, `getMatchRepository`, `getPredictionRepository` are already imported in this file.)

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds (compiles; no type errors in `serverData.ts`).

- [ ] **Step 4: Commit**

```bash
git add lib/view/serverData.ts
git commit -m "Utveckling: loadPointsTimeline-loader"
```

---

### Task 4: Graf-komponent — `PointsChart.tsx`

**Files:**
- Create: `components/PointsChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/PointsChart.tsx
'use client';
import { useState, type CSSProperties } from 'react';
import type { PlayerSeries, TimelineStep } from '@/lib/view/pointsTimeline';
import type { StandingView } from '@/lib/view/standingsView';
import { linearScale, buildLinePath } from '@/lib/view/chartScale';

const W = 820;
const H = 420;
const PAD = { l: 40, r: 96, t: 16, b: 34 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

interface Props {
  steps: TimelineStep[];
  series: PlayerSeries[];
  players: StandingView[];
  highlighted: Set<string>;
}

export function PointsChart({ steps, series, players, highlighted }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const K = steps.length;
  const colorByUser = new Map(players.map((p) => [p.userId, p.color]));
  const nameByUser = new Map(players.map((p) => [p.userId, p.displayName]));

  const maxRaw = Math.max(1, ...series.flatMap((s) => s.points));
  const maxY = Math.max(4, Math.ceil(maxRaw / 4) * 4);

  const x = linearScale([0, Math.max(1, K)], [PAD.l, PAD.l + innerW]);
  const y = linearScale([0, maxY], [PAD.t + innerH, PAD.t]);

  const yTicks = [0, 1, 2, 3, 4].map((i) => (maxY / 4) * i);
  const xEvery = K <= 14 ? 1 : Math.ceil(K / 12);

  // Players sorted by their final value, so highlighted/leading lines paint last (on top).
  const ordered = [...series].sort((a, b) => {
    const av = a.points[a.points.length - 1] ?? 0;
    const bv = b.points[b.points.length - 1] ?? 0;
    return av - bv;
  });

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.l) / innerW) * K);
    setHover(Math.max(0, Math.min(K, idx)));
  };

  const tooltipRows =
    hover === null
      ? []
      : ordered
          .map((s) => ({
            userId: s.userId,
            name: nameByUser.get(s.userId) ?? s.userId,
            color: colorByUser.get(s.userId) ?? '#888',
            value: s.points[hover] ?? 0,
          }))
          .sort((a, b) => b.value - a.value);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Poäng per match">
        {/* Y grid + labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={PAD.l + innerW} y2={y(t)} className="chart-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="chart-axis" textAnchor="end">{t}</text>
          </g>
        ))}
        {/* X labels */}
        {steps
          .filter((_, i) => i % xEvery === 0)
          .map((s) => (
            <text key={s.matchId} x={x(s.index)} y={PAD.t + innerH + 20} className="chart-axis" textAnchor="middle">
              {s.index}
            </text>
          ))}
        <text x={PAD.l + innerW / 2} y={H - 2} className="chart-axis-title" textAnchor="middle">Match</text>

        {/* Hover guide */}
        {hover !== null && hover > 0 && (
          <line x1={x(hover)} y1={PAD.t} x2={x(hover)} y2={PAD.t + innerH} className="chart-cursor" />
        )}

        {/* Lines */}
        {ordered.map((s) => {
          const color = colorByUser.get(s.userId) ?? '#888';
          const dim = highlighted.size > 0 && !highlighted.has(s.userId);
          const lead = highlighted.has(s.userId);
          const pts = s.points.map((v, i) => ({ x: x(i), y: y(v) }));
          const last = pts[pts.length - 1];
          const showName = highlighted.size === 0 || lead;
          return (
            <g key={s.userId} style={{ opacity: dim ? 0.16 : 1 } as CSSProperties}>
              <path d={buildLinePath(pts)} fill="none" stroke={color} strokeWidth={lead ? 3.2 : 1.8}
                strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && (
                <circle cx={x(hover)} cy={y(s.points[hover] ?? 0)} r={lead ? 4 : 3} fill={color} />
              )}
              {showName && last && (
                <text x={last.x + 6} y={last.y + 4} className="chart-endlabel" fill={color}>
                  {nameByUser.get(s.userId) ?? s.userId}
                </text>
              )}
            </g>
          );
        })}

        {/* Mouse capture */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {hover !== null && hover > 0 && tooltipRows.length > 0 && (
        <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` } as CSSProperties}>
          <div className="chart-tooltip-head">{steps[hover - 1]?.label}</div>
          {tooltipRows.map((r) => (
            <div key={r.userId} className="chart-tooltip-row">
              <span className="dot" style={{ background: r.color } as CSSProperties} />
              <span className="nm">{r.name}</span>
              <b>{r.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks via build**

Run: `npm run build`
Expected: build succeeds (the page isn't wired yet, but the module must compile). If you prefer, defer this check to Task 7 where the page imports it.

- [ ] **Step 3: Commit**

```bash
git add components/PointsChart.tsx
git commit -m "Utveckling: handrullad SVG-grafkomponent"
```

---

### Task 5: Legend-komponent — `PlayerLegend.tsx`

**Files:**
- Create: `components/PlayerLegend.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/PlayerLegend.tsx
'use client';
import { type CSSProperties } from 'react';
import type { StandingView } from '@/lib/view/standingsView';

interface Props {
  players: StandingView[];
  highlighted: Set<string>;
  onToggle: (userId: string) => void;
  onReset: () => void;
}

export function PlayerLegend({ players, highlighted, onToggle, onReset }: Props) {
  return (
    <div className="legend">
      <div className="legend-head">
        <span className="legend-title">Spelare</span>
        <button type="button" className={`legend-all${highlighted.size === 0 ? ' on' : ''}`} onClick={onReset}>
          Alla
        </button>
      </div>
      <div className="legend-grid">
        {players.map((p) => {
          const on = highlighted.has(p.userId);
          return (
            <button
              key={p.userId}
              type="button"
              className={`legend-chip${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(p.userId)}
            >
              <span className="dot" style={{ background: p.color } as CSSProperties} />
              <span className="nm">{p.displayName}</span>
              <span className="pts">{p.totalPoints} poäng</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PlayerLegend.tsx
git commit -m "Utveckling: spelar-legend med highlight-toggle"
```

---

### Task 6: Client-wrapper — `UtvecklingView.tsx`

**Files:**
- Create: `components/UtvecklingView.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/UtvecklingView.tsx
'use client';
import { useState } from 'react';
import type { PointsTimeline } from '@/lib/view/pointsTimeline';
import type { StandingView } from '@/lib/view/standingsView';
import { PointsChart } from './PointsChart';
import { PlayerLegend } from './PlayerLegend';

interface Props {
  timeline: PointsTimeline;
  players: StandingView[];
}

export function UtvecklingView({ timeline, players }: Props) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const toggle = (userId: string) =>
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <div className="stack">
      <PointsChart steps={timeline.steps} series={timeline.series} players={players} highlighted={highlighted} />
      <PlayerLegend
        players={players}
        highlighted={highlighted}
        onToggle={toggle}
        onReset={() => setHighlighted(new Set())}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/UtvecklingView.tsx
git commit -m "Utveckling: client-wrapper med highlight-state"
```

---

### Task 7: Sida — `app/utveckling/page.tsx`

**Files:**
- Create: `app/utveckling/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/utveckling/page.tsx
import { Card, SectionHeader } from '@/components/Card';
import { UtvecklingView } from '@/components/UtvecklingView';
import { loadPointsTimeline, loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function UtvecklingPage() {
  const [timeline, players] = await Promise.all([loadPointsTimeline(), loadStandingsView()]);

  return (
    <div className="stack">
      <Card>
        <SectionHeader
          title="Poäng per match"
          caption="Varje linje visar en spelares kumulativa poäng efter varje avslutad match."
        />
        {timeline.steps.length === 0 ? (
          <p className="empty">Inga avslutade matcher än — grafen vaknar när resultaten börjar trilla in.</p>
        ) : (
          <UtvecklingView timeline={timeline} players={players} />
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + the new route compiles**

Run: `npm run build`
Expected: build succeeds and the output route list includes `/utveckling`.

- [ ] **Step 3: Commit**

```bash
git add app/utveckling/page.tsx
git commit -m "Utveckling: /utveckling-sida med tomtillstånd"
```

---

### Task 8: Nav-flik

**Files:**
- Modify: `components/Nav.tsx:6-14` (the `TABS` array)

- [ ] **Step 1: Add the tab after Statistik**

In the `TABS` array, insert after the `/statistik` entry:

```ts
  { href: '/statistik', label: 'Statistik' },
  { href: '/utveckling', label: 'Utveckling' },
  { href: '/mitt-tips', label: 'Mitt tips' },
```

- [ ] **Step 2: Commit**

```bash
git add components/Nav.tsx
git commit -m "Utveckling: lägg till nav-flik"
```

---

### Task 9: Stilar — `globals.css`

**Files:**
- Modify: `app/globals.css` (append at end)

- [ ] **Step 1: Append the styles**

```css
/* ── Utveckling: poäng per match ───────────────────────────── */
.chart-wrap { position: relative; width: 100%; }
.chart-svg { width: 100%; height: auto; display: block; }
.chart-grid { stroke: var(--line, #2a2f3a); stroke-width: 1; }
.chart-axis { fill: var(--muted, #8a93a3); font-size: 11px; }
.chart-axis-title { fill: var(--muted, #8a93a3); font-size: 11px; letter-spacing: .04em; }
.chart-cursor { stroke: var(--muted, #8a93a3); stroke-dasharray: 3 3; stroke-width: 1; }
.chart-endlabel { font-size: 11px; font-weight: 700; }

.chart-tooltip {
  position: absolute; top: 8px; transform: translateX(-50%);
  background: var(--card-2, #1b2029); border: 1px solid var(--line, #2a2f3a);
  border-radius: 10px; padding: 8px 10px; pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,.35); min-width: 150px; z-index: 2;
}
.chart-tooltip-head { font-size: 11px; color: var(--muted, #8a93a3); margin-bottom: 6px; }
.chart-tooltip-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 1px 0; }
.chart-tooltip-row .nm { flex: 1; white-space: nowrap; }
.chart-tooltip-row .dot, .legend-chip .dot {
  width: 9px; height: 9px; border-radius: 50%; flex: none; display: inline-block;
}

.legend-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.legend-title { font-weight: 700; }
.legend-all {
  font-size: 12px; padding: 4px 12px; border-radius: 999px;
  border: 1px solid var(--line, #2a2f3a); background: transparent; color: var(--fg, #e7ebf2); cursor: pointer;
}
.legend-all.on { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); color: #fff; }
.legend-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 6px; }
.legend-chip {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer;
  border: 1px solid transparent; border-radius: 8px; background: var(--card-2, #1b2029);
  color: var(--fg, #e7ebf2); text-align: left; font-size: 13px;
}
.legend-chip .nm { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.legend-chip .pts { color: var(--muted, #8a93a3); font-size: 12px; }
.legend-chip.on { border-color: var(--accent, #3b82f6); background: var(--card, #232a35); }
```

**Note:** if `app/globals.css` uses different CSS-variabelnamn än fallbackarna ovan (kolla `:root`), byt ut fallback-värdena mot rätt variabler. Fallbackarna (efter komma) gör att stilen funkar även om en variabel saknas.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Utveckling: stilar för graf och legend"
```

---

### Task 10: Helverifiering

- [ ] **Step 1: Kör hela testsviten**

Run: `npm test`
Expected: alla test gröna (97 tidigare + 10 nya = 107).

- [ ] **Step 2: Produktionsbygge**

Run: `npm run build`
Expected: lyckas; route `/utveckling` listas.

- [ ] **Step 3: Manuell körning (Carl)**

Run: `npm run dev` → öppna `http://localhost:3000/utveckling`.
Verifiera: graf ritas med en linje per spelare; klick på chip lyfter fram linjen och tonar övriga; "Alla" återställer; hover visar vertikal guide + tooltip med matchens lag och allas poäng vid den matchen; tomtillstånd visas om inga matcher är avslutade.

- [ ] **Step 4: Push (endast efter Carls explicita OK)**

Carl pushar själv via token-i-URL. **Pusha inte automatiskt.**

---

## Self-review-anteckning

- **Spec-täckning:** datalager (Task 1), SVG-skalor (Task 2), loader (Task 3), graf m. hover + highlight + default-alla-färgade (Task 4), legend + "Alla" (Task 5), wrapper-state (Task 6), route + tomtillstånd (Task 7), nav (Task 8), stilar (Task 9), tester + bygge (Task 1–2, 10). Alla designbeslut täckta.
- **Typkonsistens:** `MatchMeta`, `TimelineStep`, `PlayerSeries`, `PointsTimeline` definieras i Task 1 och används oförändrat i Task 3–7. `StandingView` (befintlig) ger `color`/`displayName`/`totalPoints`. `buildLinePath`/`linearScale` (Task 2) används i Task 4.
- **Medvetet bortvalt:** komponent-enhetstester (saknar infra) — verifieras via build + manuell körning.
