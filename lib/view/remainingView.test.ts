import { describe, it, expect } from 'vitest';
import type { Match } from '../domain/types';
import type { StandingView } from './standingsView';
import { computeRemaining } from '../scoring/remaining';
import { buildRemainingRows, decidedFromMatches } from './remainingView';

function match(id: string, stage: Match['stage'], status: Match['status']): Match {
  return { id, stage, group: null, homeTeamId: null, awayTeamId: null, status, homeScore: null, awayScore: null };
}

function standing(userId: string, name: string, total: number): StandingView {
  return {
    userId, displayName: name, color: '#fff', avatarUrl: null,
    rank: 0, prevRank: null, totalPoints: total, matchPoints: total, bonusPoints: 0, movement: 'same',
  };
}

describe('decidedFromMatches', () => {
  it('flags each category from its deciding matches', () => {
    expect(decidedFromMatches([])).toEqual({ champion: false, bronze: false, finalists: false });
    const matches = [
      match('sf1', 'sf', 'finished'),
      match('sf2', 'sf', 'finished'),
      match('bronze', 'bronze', 'scheduled'),
      match('final', 'final', 'finished'),
    ];
    expect(decidedFromMatches(matches)).toEqual({ champion: true, bronze: false, finalists: true });
  });

  it('needs both semifinals played before finalists are decided', () => {
    expect(decidedFromMatches([match('sf1', 'sf', 'finished')]).finalists).toBe(false);
  });
});

describe('buildRemainingRows', () => {
  const teamName = (id: string) => ({ BRA: 'Brasilien', ARG: 'Argentina' }[id] ?? id);

  it('sorts by best possible finish and resolves team names', () => {
    const standings = [standing('a', 'Adam', 50), standing('b', 'Bea', 60)];
    const remaining = computeRemaining({
      predictions: [
        { userId: 'a', bonus: { champion: 'BRA' } }, // 50 + 16 = 66
        { userId: 'b', bonus: { bronze: 'ARG' } }, // 60 + 8 = 68
      ],
      eliminatedTeamIds: [],
      decided: { finalists: false, bronze: false, champion: false },
    });
    const rows = buildRemainingRows(standings, remaining, teamName);
    expect(rows.map((r) => r.userId)).toEqual(['b', 'a']);
    expect(rows[1]).toMatchObject({ currentTotal: 50, reachable: 16, possibleTotal: 66 });
    const champ = rows[1].categories.find((c) => c.key === 'champion')!;
    expect(champ.teamName).toBe('Brasilien');
  });

  it('players without a prediction get zero reachable', () => {
    const rows = buildRemainingRows([standing('a', 'Adam', 40)], [], teamName);
    expect(rows[0]).toMatchObject({ reachable: 0, possibleTotal: 40, categories: [] });
  });
});
