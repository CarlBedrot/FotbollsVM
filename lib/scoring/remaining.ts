import type { BonusKey } from "../domain/types";
import { RULES } from "../domain/rules";

/** The four knockout bonuses still open after the group stage. */
export type RemainingCategoryKey =
  "finalist_1" | "finalist_2" | "bronze" | "champion";

export interface RemainingPrediction {
  userId: string;
  bonus: Partial<Record<BonusKey, string>>;
}

/** True once a category's deciding match has been played (points then locked). */
export interface DecidedFlags {
  finalists: boolean;
  bronze: boolean;
  champion: boolean;
}

export interface RemainingCategory {
  key: RemainingCategoryKey;
  label: string;
  points: number;
  teamId: string | null;
  /** Pick exists and its team is not eliminated. */
  alive: boolean;
  /** The category's deciding match is already played. */
  decided: boolean;
  /** Contributes to `reachable`: has a pick, still alive, not yet decided. */
  counts: boolean;
}

export interface UserRemaining {
  userId: string;
  reachable: number;
  categories: RemainingCategory[];
}

const CATEGORIES: {
  key: RemainingCategoryKey;
  label: string;
  points: number;
  decidedKey: keyof DecidedFlags;
}[] = [
  {
    key: "finalist_1",
    label: "Finalist",
    points: RULES.finalistPoint,
    decidedKey: "finalists",
  },
  {
    key: "finalist_2",
    label: "Finalist",
    points: RULES.finalistPoint,
    decidedKey: "finalists",
  },
  {
    key: "bronze",
    label: "Brons",
    points: RULES.bronzePoint,
    decidedKey: "bronze",
  },
  {
    key: "champion",
    label: "VM-vinnare",
    points: RULES.championPoint,
    decidedKey: "champion",
  },
];

export interface RemainingInput {
  predictions: RemainingPrediction[];
  eliminatedTeamIds: Iterable<string>;
  decided: DecidedFlags;
}

/**
 * Points each player can still gain, optimistic ceiling: every still-alive pick
 * is assumed to go all the way. A pick contributes only when its team is alive
 * and the category is not yet decided (avoids double-counting locked points).
 */
export function computeRemaining(input: RemainingInput): UserRemaining[] {
  const eliminated = new Set(input.eliminatedTeamIds);
  return input.predictions.map((p) => {
    const categories: RemainingCategory[] = CATEGORIES.map((c) => {
      const teamId = p.bonus[c.key] ?? null;
      const decided = input.decided[c.decidedKey];
      const alive = teamId !== null && !eliminated.has(teamId);
      const counts = alive && !decided;
      return {
        key: c.key,
        label: c.label,
        points: c.points,
        teamId,
        alive,
        decided,
        counts,
      };
    });
    const reachable = categories.reduce(
      (sum, c) => sum + (c.counts ? c.points : 0),
      0,
    );
    return { userId: p.userId, reachable, categories };
  });
}
