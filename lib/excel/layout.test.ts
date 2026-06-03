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
