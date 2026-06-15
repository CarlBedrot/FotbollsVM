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
