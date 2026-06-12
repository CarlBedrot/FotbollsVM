import type { Pick } from '../domain/types';
import type { StandingView, Movement } from './standingsView';
import type { MatchView } from './matchView';
import type { StoredPrediction } from '../db/predictionRepository';

export interface PlayerCardMatch {
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
}

export interface PlayerCard {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  rank: number | null;
  movement: Movement | null;
  totalPoints: number;
  /** The next match still to be played, or null when the tournament is over. */
  nextMatch: PlayerCardMatch | null;
  /** This player's pick for `nextMatch` (group stage only), or null. Withheld while picks are still secret. */
  nextPick: Pick | null;
  /** Whether individual picks are revealed yet (after the lock). */
  revealed: boolean;
}

interface UserIdentity {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

/**
 * Builds the mini-profile card shown when a player's avatar is clicked.
 * Pure: identity/points come from standings (falling back to the user record
 * when a player has no standing yet), the next match is the earliest fixture
 * that has not finished, and the pick is read from the player's prediction.
 */
export function buildPlayerCard(args: {
  userId: string;
  standings: StandingView[];
  users: UserIdentity[];
  matches: MatchView[];
  predictions: StoredPrediction[];
  revealed: boolean;
}): PlayerCard | null {
  const { userId, standings, users, matches, predictions, revealed } = args;

  const standing = standings.find((s) => s.userId === userId) ?? null;
  const user = users.find((u) => u.id === userId) ?? null;
  if (!standing && !user) return null;

  // Earliest fixture not yet finished = the next (or currently live) match.
  // `matches` is already sorted chronologically by toMatchViews.
  const next = matches.find((m) => m.status !== 'finished') ?? null;

  const prediction = predictions.find((p) => p.userId === userId) ?? null;
  // Picks only cover the 72 group matches; a knockout fixture has no pick.
  const rawPick = next ? prediction?.matchPicks[next.id] ?? null : null;

  return {
    userId,
    displayName: standing?.displayName ?? user?.displayName ?? 'Okänd',
    color: standing?.color ?? user?.color ?? '#566087',
    avatarUrl: standing?.avatarUrl ?? user?.avatarUrl ?? null,
    rank: standing?.rank ?? null,
    movement: standing?.movement ?? null,
    totalPoints: standing?.totalPoints ?? 0,
    nextMatch: next ? { homeLabel: next.homeLabel, awayLabel: next.awayLabel, kickoff: next.kickoff } : null,
    nextPick: revealed ? rawPick : null,
    revealed,
  };
}
