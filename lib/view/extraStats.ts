import type { Pick, Prediction } from '../domain/types';
import { impliedProbabilities, favouriteOutcome, oddsFor, type OddsBook } from '../odds/load';

export interface PlayerRef {
  userId: string;
  name: string;
  color: string;
  avatarUrl: string | null;
}

interface UserInput {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

const OUTCOMES: Pick[] = ['1', 'X', '2'];

function playerRefs(users: UserInput[]): Map<string, PlayerRef> {
  return new Map(users.map((u) => [u.id, { userId: u.id, name: u.displayName, color: u.color, avatarUrl: u.avatarUrl }]));
}

/* ---------- 1. oddsavståndet ---------- */

export interface OddsDistanceRow {
  player: PlayerRef;
  /** How many of the player's picks had odds to compare against. */
  matchesWithOdds: number;
  /** Average shortfall vs the bookmakers' favourite, in percentage points. 0 = always on the favourite. */
  avgDistancePp: number;
}

/** Per player: how far the picks sit from the bookmakers' expected outcome. Sorted closest first. */
export function oddsDistance(predictions: Prediction[], users: UserInput[], book: OddsBook): OddsDistanceRow[] {
  const refs = playerRefs(users);
  const rows: OddsDistanceRow[] = [];
  for (const p of predictions) {
    const player = refs.get(p.userId);
    if (!player) continue;
    let sum = 0;
    let n = 0;
    for (const [matchId, pick] of Object.entries(p.matchPicks)) {
      const odds = oddsFor(book, matchId);
      if (!odds || !OUTCOMES.includes(pick)) continue;
      const prob = impliedProbabilities(odds);
      sum += prob[favouriteOutcome(odds)] - prob[pick];
      n++;
    }
    if (n === 0) continue;
    rows.push({ player, matchesWithOdds: n, avgDistancePp: Math.round((sum / n) * 1000) / 10 });
  }
  return rows.sort((a, b) => a.avgDistancePp - b.avgDistancePp);
}

/* ---------- 3. bästa oddsträffen ---------- */

interface MatchResultInput {
  id: string;
  homeLabel: string;
  awayLabel: string;
  status: string;
  outcome: Pick | null;
}

export interface OddsHit {
  player: PlayerRef;
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  pick: Pick;
  odds: number;
}

/** Each player's highest-odds correct pick among finished matches, best hit first. */
export function bestOddsHits(
  predictions: Prediction[],
  users: UserInput[],
  matches: MatchResultInput[],
  book: OddsBook,
): OddsHit[] {
  const refs = playerRefs(users);
  const finished = matches.filter((m) => m.status === 'finished' && m.outcome !== null);
  const rows: OddsHit[] = [];
  for (const p of predictions) {
    const player = refs.get(p.userId);
    if (!player) continue;
    let best: OddsHit | null = null;
    for (const m of finished) {
      const pick = p.matchPicks[m.id];
      if (!pick || pick !== m.outcome) continue;
      const odds = oddsFor(book, m.id);
      if (!odds) continue;
      const value = odds[pick];
      if (!best || value > best.odds) {
        best = { player, matchId: m.id, homeLabel: m.homeLabel, awayLabel: m.awayLabel, pick, odds: value };
      }
    }
    if (best) rows.push(best);
  }
  return rows.sort((a, b) => b.odds - a.odds);
}

/* ---------- 4. 1/X/2-fördelningen ---------- */

export interface PickSplitRow {
  player: PlayerRef;
  counts: Record<Pick, number>;
  total: number;
}

export interface PickSplit {
  rows: PickSplitRow[];
  total: { counts: Record<Pick, number>; total: number };
}

/** How many 1/X/2 each player picked (rows follow the order of `users`). */
export function pickDistribution(predictions: Prediction[], users: UserInput[]): PickSplit {
  const byUser = new Map(predictions.map((p) => [p.userId, p]));
  const total: Record<Pick, number> = { '1': 0, X: 0, '2': 0 };
  let grand = 0;
  const rows: PickSplitRow[] = [];
  for (const u of users) {
    const p = byUser.get(u.id);
    if (!p) continue;
    const counts: Record<Pick, number> = { '1': 0, X: 0, '2': 0 };
    let n = 0;
    for (const pick of Object.values(p.matchPicks)) {
      if (!OUTCOMES.includes(pick)) continue;
      counts[pick]++;
      total[pick]++;
      n++;
      grand++;
    }
    rows.push({ player: { userId: u.id, name: u.displayName, color: u.color, avatarUrl: u.avatarUrl }, counts, total: n });
  }
  return { rows, total: { counts: total, total: grand } };
}

/* ---------- 2. vinnartipsen ---------- */

export interface WinnerVotes {
  teamId: string;
  teamName: string;
  voters: PlayerRef[];
}

export interface WinnerBoard {
  champion: WinnerVotes[];
  /** finalist_1 + finalist_2 combined (one vote per player and team). */
  finalists: WinnerVotes[];
  bronze: WinnerVotes[];
}

interface TeamInput {
  id: string;
  name: string;
}

function tally(votes: Array<{ teamId: string; player: PlayerRef }>, teams: Map<string, string>): WinnerVotes[] {
  const byTeam = new Map<string, WinnerVotes>();
  for (const v of votes) {
    const teamName = teams.get(v.teamId);
    if (!teamName) continue;
    let entry = byTeam.get(v.teamId);
    if (!entry) {
      entry = { teamId: v.teamId, teamName, voters: [] };
      byTeam.set(v.teamId, entry);
    }
    if (!entry.voters.some((x) => x.userId === v.player.userId)) entry.voters.push(v.player);
  }
  return [...byTeam.values()].sort((a, b) => b.voters.length - a.voters.length || a.teamName.localeCompare(b.teamName));
}

/** Who believes in which teams: champion, finalists and bronze picks grouped by team. */
export function winnerBoard(predictions: Prediction[], users: UserInput[], teams: TeamInput[]): WinnerBoard {
  const refs = playerRefs(users);
  const names = new Map(teams.map((t) => [t.id, t.name]));
  const champion: Array<{ teamId: string; player: PlayerRef }> = [];
  const finalists: Array<{ teamId: string; player: PlayerRef }> = [];
  const bronze: Array<{ teamId: string; player: PlayerRef }> = [];
  for (const p of predictions) {
    const player = refs.get(p.userId);
    if (!player) continue;
    if (p.bonus.champion) champion.push({ teamId: p.bonus.champion, player });
    if (p.bonus.finalist_1) finalists.push({ teamId: p.bonus.finalist_1, player });
    if (p.bonus.finalist_2) finalists.push({ teamId: p.bonus.finalist_2, player });
    if (p.bonus.bronze) bronze.push({ teamId: p.bonus.bronze, player });
  }
  return {
    champion: tally(champion, names),
    finalists: tally(finalists, names),
    bronze: tally(bronze, names),
  };
}
