import type { Pick } from '../domain/types';

export interface Voter {
  userId: string;
  name: string;
  color: string;
  avatarUrl: string | null;
}

export interface MatchOverview {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  /** Number of players who picked this match. */
  total: number;
  /** 1/X/2 counts, or null while predictions are still secret (pre-lock). */
  counts: Record<Pick, number> | null;
  /** Who picked each outcome, or null while still secret. */
  voters: Record<Pick, Voter[]> | null;
}

export interface DailyOverview {
  todayKey: string;
  revealed: boolean;
  matches: MatchOverview[];
}

interface MatchInput {
  id: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
}
interface PredictionInput {
  userId: string;
  matchPicks: Record<string, Pick>;
}
interface UserInput {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

// Intl.DateTimeFormat construction is the expensive part, so cache one per tz
// (the day filter calls dayKeyInTz once per group match — 72 times — per request).
const dayFormatters = new Map<string, Intl.DateTimeFormat>();
function dayFormatter(tz: string): Intl.DateTimeFormat {
  let f = dayFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormatters.set(tz, f);
  }
  return f;
}

/** Calendar day (YYYY-MM-DD) of an ISO instant in the given timezone. */
export function dayKeyInTz(iso: string, tz: string = 'Europe/Stockholm'): string {
  return dayFormatter(tz).format(new Date(iso));
}

const OUTCOMES: Pick[] = ['1', 'X', '2'];

/**
 * Overview of what everyone predicted for a single day's matches.
 * Only the matches kicking off on `todayKey` (in `tz`) are included, sorted by
 * kickoff. Counts/voters are withheld until `revealed` (i.e. after the lock).
 */
export function buildDailyOverview(args: {
  matches: MatchInput[];
  predictions: PredictionInput[];
  users: UserInput[];
  todayKey: string;
  revealed: boolean;
  tz?: string;
}): DailyOverview {
  const { matches, predictions, users, todayKey, revealed, tz } = args;
  const userById = new Map(users.map((u) => [u.id, u]));

  const todays = matches
    .filter((m) => dayKeyInTz(m.kickoff, tz) === todayKey)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const overview = todays.map((m): MatchOverview => {
    const counts: Record<Pick, number> = { '1': 0, X: 0, '2': 0 };
    const voters: Record<Pick, Voter[]> = { '1': [], X: [], '2': [] };
    let total = 0;
    for (const p of predictions) {
      const pick = p.matchPicks[m.id];
      if (!pick) continue;
      if (!OUTCOMES.includes(pick)) continue; // guard against malformed stored data
      const u = userById.get(p.userId);
      if (!u) continue; // unknown/removed user
      total++;
      counts[pick]++;
      voters[pick].push({ userId: u.id, name: u.displayName, color: u.color, avatarUrl: u.avatarUrl });
    }
    return {
      matchId: m.id,
      homeLabel: m.homeLabel,
      awayLabel: m.awayLabel,
      kickoff: m.kickoff,
      total,
      counts: revealed ? counts : null,
      voters: revealed ? voters : null,
    };
  });

  return { todayKey, revealed, matches: overview };
}

export { OUTCOMES };
