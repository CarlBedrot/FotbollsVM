import type { Pick } from '../domain/types';
import type { Fixtures } from '../fixtures/types';
import type { StoredPrediction } from '../db/predictionRepository';
import type { MatchView } from './matchView';
import { buildMyTips, type MyTips } from './myTips';

export interface PlayerTips {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  tips: MyTips;
}

export interface AllTips {
  meId: string;
  revealed: boolean;
  /** Players who have submitted tips: me first, then the rest by name. Only me when not revealed. */
  players: PlayerTips[];
  /** Actual outcome per finished match, used to colour picks right/wrong. */
  outcomes: Record<string, Pick>;
}

interface UserIdentity {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

/**
 * Everyone's full tip sheets for the carousel + head-to-head compare.
 * Reuses buildMyTips per player. Until the lock (`revealed === false`) only the
 * current user's sheet is included — others' picks must stay secret, so they are
 * never sent to the client.
 */
export function buildAllTips(args: {
  meId: string;
  users: UserIdentity[];
  predictions: StoredPrediction[];
  matches: MatchView[];
  fixtures: Fixtures;
  revealed: boolean;
}): AllTips {
  const { meId, users, predictions, matches, fixtures, revealed } = args;
  const userById = new Map(users.map((u) => [u.id, u]));

  const toPlayer = (pred: StoredPrediction): PlayerTips | null => {
    const u = userById.get(pred.userId);
    const tips = buildMyTips(pred, fixtures);
    if (!u || !tips) return null;
    return { userId: u.id, displayName: u.displayName, color: u.color, avatarUrl: u.avatarUrl, tips };
  };

  const visible = revealed ? predictions : predictions.filter((p) => p.userId === meId);
  const built = visible.map(toPlayer).filter((p): p is PlayerTips => p !== null);

  // Me first, then the rest alphabetically.
  built.sort((a, b) => {
    if (a.userId === meId) return -1;
    if (b.userId === meId) return 1;
    return a.displayName.localeCompare(b.displayName, 'sv');
  });

  const outcomes: Record<string, Pick> = {};
  for (const m of matches) {
    if (m.status === 'finished' && m.outcome) outcomes[m.id] = m.outcome;
  }

  return { meId, revealed, players: built, outcomes };
}
