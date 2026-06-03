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
