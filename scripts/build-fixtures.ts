import { writeFileSync, mkdirSync } from 'fs';

const SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const STAGE_BY_ROUND: Record<string, string> = {
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  'Quarter-final': 'qf',
  'Semi-final': 'sf',
  'Match for third place': 'bronze',
  Final: 'final',
};

export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toIsoUtc(date: string, time: string | undefined): string {
  const [Y, M, D] = date.split('-').map(Number);
  const m = /^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec((time ?? '').trim());
  if (!m) return new Date(Date.UTC(Y, M - 1, D, 0, 0)).toISOString();
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const off = Number(m[3]);
  // local = UTC + off  ⇒  UTC = local - off ; Date.UTC normalises day rollover
  return new Date(Date.UTC(Y, M - 1, D, hh - off, mm)).toISOString();
}

async function main() {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const data = (await res.json()) as { matches: any[] };

  const teamsMap = new Map<string, { id: string; name: string; group: string }>();
  const groupMatches: any[] = [];
  const koMatches: any[] = [];
  let gi = 0;
  let ki = 0;

  for (const m of data.matches) {
    const kickoff = toIsoUtc(m.date, m.time);
    const ground = m.ground ?? '';
    if (m.group) {
      const group = String(m.group).replace('Group ', '').trim();
      const h = slug(m.team1);
      const a = slug(m.team2);
      if (!teamsMap.has(h)) teamsMap.set(h, { id: h, name: m.team1, group });
      if (!teamsMap.has(a)) teamsMap.set(a, { id: a, name: m.team2, group });
      gi += 1;
      groupMatches.push({
        id: `G${String(gi).padStart(3, '0')}`,
        stage: 'group', group,
        homeTeamId: h, awayTeamId: a,
        homeLabel: m.team1, awayLabel: m.team2,
        kickoff, ground,
      });
    } else {
      // Use m.num when available; fall back to a sequential counter so IDs are always unique
      ki += 1;
      const koId = m.num != null ? `K${m.num}` : `K_${ki}`;
      koMatches.push({
        id: koId,
        stage: STAGE_BY_ROUND[m.round] ?? 'r32',
        group: null,
        homeTeamId: null, awayTeamId: null,
        homeLabel: m.team1, awayLabel: m.team2,
        kickoff, ground,
      });
    }
  }

  const teams = [...teamsMap.values()].sort(
    (x, y) => x.group.localeCompare(y.group) || x.name.localeCompare(y.name),
  );
  const matches = [...groupMatches, ...koMatches];
  const firstKickoff = groupMatches
    .map((m) => m.kickoff)
    .sort()[0];

  const fixtures = { season: '2026', firstKickoff, teams, matches };
  mkdirSync('data', { recursive: true });
  writeFileSync('data/fixtures.json', `${JSON.stringify(fixtures, null, 2)}\n`);
  console.log(
    `wrote data/fixtures.json: ${teams.length} teams, ${groupMatches.length} group + ${koMatches.length} knockout, lock=${firstKickoff}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
