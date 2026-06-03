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

/** One blank row after the last match, then the section-header row. */
export function bonusFirstRow(matchCount: number): number {
  return MATCH_FIRST_ROW + matchCount + 1;
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
