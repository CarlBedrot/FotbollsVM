import fixturesJson from '../../data/fixtures.json';
import type { GroupId } from '../domain/types';
import type { Fixtures, FixtureMatch, FixtureTeam } from './types';

export function loadFixtures(): Fixtures {
  return fixturesJson as Fixtures;
}

export function groupMatches(f: Fixtures): FixtureMatch[] {
  return f.matches.filter((m) => m.stage === 'group');
}

export function teamsById(f: Fixtures): Map<string, FixtureTeam> {
  return new Map(f.teams.map((t) => [t.id, t]));
}

/** Normalised team-name → id map for tolerant parsing (case/diacritic-insensitive). */
export function teamIdByName(f: Fixtures): Map<string, string> {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return new Map(f.teams.map((t) => [norm(t.name), t.id]));
}

export function teamsInGroup(f: Fixtures, group: GroupId): FixtureTeam[] {
  return f.teams.filter((t) => t.group === group);
}
