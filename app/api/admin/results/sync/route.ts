export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures } from '@/lib/fixtures/load';
import { getMatchRepository } from '@/lib/db/repository';
import { fetchWorldCupMatches } from '@/lib/results/footballDataClient';
import { proposalsFromApi, type MatchLabels } from '@/lib/results/footballData';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const fixtures = loadFixtures();
  const labels: MatchLabels = {};
  for (const m of fixtures.matches) labels[m.id] = { home: m.homeLabel, away: m.awayLabel, kickoff: m.kickoff };

  let apiMatches;
  try {
    apiMatches = await fetchWorldCupMatches();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  const ourMatches = await getMatchRepository().all();
  const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
  return NextResponse.json({ proposals });
}
