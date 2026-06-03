import type { Fixtures } from '../fixtures/types';

/** Minimal but structurally-real fixtures: 2 groups (A,B) × 4 teams, 12 group matches. */
export function makeTestFixtures(): Fixtures {
  const groups = ['A', 'B'] as const;
  const teams = groups.flatMap((g, gi) =>
    [0, 1, 2, 3].map((t) => ({ id: `${g.toLowerCase()}${t}`, name: `Team ${g}${t}`, group: g })),
  );
  const matches: Fixtures['matches'] = [];
  let n = 0;
  for (const g of groups) {
    const ids = [0, 1, 2, 3].map((t) => `${g.toLowerCase()}${t}`);
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        n += 1;
        matches.push({
          id: `G${String(n).padStart(3, '0')}`,
          stage: 'group', group: g,
          homeTeamId: ids[a], awayTeamId: ids[b],
          homeLabel: `Team ${g}${a}`, awayLabel: `Team ${g}${b}`,
          kickoff: '2026-06-11T18:00:00.000Z', ground: 'Test',
        });
      }
    }
  }
  return { season: '2026', firstKickoff: '2026-06-11T18:00:00.000Z', teams, matches };
}
