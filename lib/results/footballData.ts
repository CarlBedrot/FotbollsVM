import type { Match } from "../domain/types";
import type { ResultProposal } from "./types";

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
  "korea republic": "south korea",
  "united states": "usa",
  "cote divoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  czechia: "czech republic",
  "cape verde islands": "cape verde",
  turkiye: "turkey",
  "ir iran": "iran",
  "korea dpr": "north korea",
  "congo dr": "dr congo",
  "bosnia-herzegovina": "bosnia and herzegovina",
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
const canon = (s: string) => ALIASES[norm(s)] ?? norm(s);
const day = (iso: string) => iso.slice(0, 10);

/** Find the fixture match an api match refers to, by same day + team names. */
function findOurMatch(
  am: ApiMatch,
  ourMatches: Match[],
  labels: MatchLabels,
): { match: Match; how: "exact" | "alias" } | null {
  const apiHome = canon(am.homeTeam.name);
  const apiAway = canon(am.awayTeam.name);
  const apiDay = day(am.utcDate);

  for (const m of ourMatches) {
    const lab = labels[m.id];
    if (!lab || day(lab.kickoff) !== apiDay) continue;
    const ourHome = norm(lab.home);
    const ourAway = norm(lab.away);
    if (ourHome === apiHome && ourAway === apiAway) {
      return {
        match: m,
        how:
          norm(am.homeTeam.name) === ourHome &&
          norm(am.awayTeam.name) === ourAway
            ? "exact"
            : "alias",
      };
    }
  }
  return null;
}

export function proposalsFromApi(
  apiMatches: ApiMatch[],
  ourMatches: Match[],
  labels: MatchLabels,
): ResultProposal[] {
  const proposals: ResultProposal[] = [];
  for (const am of apiMatches) {
    if (am.status !== "FINISHED") continue;
    const hs = am.score.fullTime.home;
    const as = am.score.fullTime.away;
    if (hs === null || as === null) continue;

    const matched = findOurMatch(am, ourMatches, labels);
    proposals.push({
      matchId: matched ? matched.match.id : "",
      homeLabel: am.homeTeam.name,
      awayLabel: am.awayTeam.name,
      homeScore: hs,
      awayScore: as,
      matchedBy: matched ? matched.how : "unmatched",
    });
  }
  return proposals;
}

export interface TeamRef {
  id: string;
  name: string;
}

export interface PairingProposal {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
}

/** Resolve knockout placeholder slots ("2A", "W73") to real teams by pairing
 *  api matches against unresolved fixture slots on exact kickoff time — every
 *  knockout kickoff in the WC2026 schedule is a unique timestamp. The api
 *  lists real team names as soon as a round is seeded, so no group-table or
 *  third-place allocation logic is needed on our side. */
export function pairingsFromApi(
  apiMatches: ApiMatch[],
  ourMatches: Match[],
  labels: MatchLabels,
  teams: TeamRef[],
): PairingProposal[] {
  const teamByCanon = new Map(teams.map((t) => [canon(t.name), t]));
  const slotByTime = new Map<number, Match>();
  for (const m of ourMatches) {
    const lab = labels[m.id];
    if (!lab || m.stage === "group" || (m.homeTeamId && m.awayTeamId)) continue;
    slotByTime.set(Date.parse(lab.kickoff), m);
  }

  const pairings: PairingProposal[] = [];
  for (const am of apiMatches) {
    const slot = slotByTime.get(Date.parse(am.utcDate));
    if (!slot) continue;
    const home = teamByCanon.get(canon(am.homeTeam.name ?? ""));
    const away = teamByCanon.get(canon(am.awayTeam.name ?? ""));
    if (!home || !away) continue;
    pairings.push({
      matchId: slot.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeName: home.name,
      awayName: away.name,
    });
  }
  return pairings;
}

/** Drop proposals whose exact result is already stored, so re-applying the
 *  full api feed every few minutes stays cheap and `applied` means "new". */
export function filterNewResults(
  proposals: ResultProposal[],
  ourMatches: Match[],
): ResultProposal[] {
  const byId = new Map(ourMatches.map((m) => [m.id, m]));
  return proposals.filter((p) => {
    const m = byId.get(p.matchId);
    if (!m) return false;
    return (
      m.status !== "finished" ||
      m.homeScore !== p.homeScore ||
      m.awayScore !== p.awayScore
    );
  });
}

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED"]);

export interface LiveScoreUpdate {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

/** Current scores for in-play matches, matched like results. Skips matches
 *  already finished locally and live scores that have not changed. */
export function liveFromApi(
  apiMatches: ApiMatch[],
  ourMatches: Match[],
  labels: MatchLabels,
): LiveScoreUpdate[] {
  const updates: LiveScoreUpdate[] = [];
  for (const am of apiMatches) {
    if (!LIVE_STATUSES.has(am.status)) continue;
    const hs = am.score.fullTime.home ?? 0;
    const as = am.score.fullTime.away ?? 0;

    const matched = findOurMatch(am, ourMatches, labels);
    if (!matched || matched.match.status === "finished") continue;
    if (
      matched.match.status === "live" &&
      matched.match.homeScore === hs &&
      matched.match.awayScore === as
    ) {
      continue;
    }
    updates.push({ matchId: matched.match.id, homeScore: hs, awayScore: as });
  }
  return updates;
}
