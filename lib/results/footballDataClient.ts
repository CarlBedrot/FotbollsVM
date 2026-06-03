import type { ApiMatch } from './footballData';

const BASE = 'https://api.football-data.org/v4';

/** Fetch World Cup matches from football-data.org. Requires FOOTBALL_DATA_TOKEN. */
export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  const res = await fetch(`${BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  const data = (await res.json()) as { matches: ApiMatch[] };
  return data.matches ?? [];
}
