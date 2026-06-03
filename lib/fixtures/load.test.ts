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
