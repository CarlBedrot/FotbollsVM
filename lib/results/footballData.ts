import type { Match } from '../domain/types';
import type { ResultProposal } from './types';

export interface ApiMatch {
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface MatchLabels {
  [matchId: string]: { home: string; away: string; kickoff: string };
}

/** Known name differences: football-data name (normalised) → our name (normalised). */
const ALIASES: Record<string, string> = {
  'korea republic': 'south korea',
  'united states': 'usa',
  'ivory coast': 'ivory coast',
  'cote divoire': 'ivory coast',
  'czechia': 'czech republic',
  'dr congo': 'dr congo',
  'cape verde islands': 'cape verde',
};

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const canon = (s: string) => ALIASES[norm(s)] ?? norm(s);
const day = (iso: string) => iso.slice(0, 10);

export function proposalsFromApi(
  apiMatches: ApiMatch[],
  ourMatches: Match[],
  labels: MatchLabels,
): ResultProposal[] {
  const proposals: ResultProposal[] = [];
  for (const am of apiMatches) {
    if (am.status !== 'FINISHED') continue;
    const hs = am.score.fullTime.home;
    const as = am.score.fullTime.away;
    if (hs === null || as === null) continue;

    const apiHome = canon(am.homeTeam.name);
    const apiAway = canon(am.awayTeam.name);
    const apiDay = day(am.utcDate);

    let matched: { match: Match; how: 'exact' | 'alias' } | null = null;
    for (const m of ourMatches) {
      const lab = labels[m.id];
      if (!lab || day(lab.kickoff) !== apiDay) continue;
      const ourHome = norm(lab.home);
      const ourAway = norm(lab.away);
      if (ourHome === apiHome && ourAway === apiAway) {
        matched = { match: m, how: norm(am.homeTeam.name) === ourHome && norm(am.awayTeam.name) === ourAway ? 'exact' : 'alias' };
        break;
      }
    }

    if (matched) {
      proposals.push({
        matchId: matched.match.id,
        homeLabel: am.homeTeam.name,
        awayLabel: am.awayTeam.name,
        homeScore: hs,
        awayScore: as,
        matchedBy: matched.how,
      });
    } else {
      proposals.push({
        matchId: '',
        homeLabel: am.homeTeam.name,
        awayLabel: am.awayTeam.name,
        homeScore: hs,
        awayScore: as,
        matchedBy: 'unmatched',
      });
    }
  }
  return proposals;
}
