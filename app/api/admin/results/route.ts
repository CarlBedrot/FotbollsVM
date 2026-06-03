export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures } from '@/lib/fixtures/load';
import { getMatchRepository, getStandingsRepository, getPredictionRepository } from '@/lib/db/repository';
import { recomputeStandings } from '@/lib/results/recompute';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { matchId?: string; homeScore?: number; awayScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { matchId, homeScore, awayScore } = body;
  if (!matchId || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'matchId, homeScore, awayScore required' }, { status: 400 });
  }

  const matchRepo = getMatchRepository();
  await matchRepo.setResult(matchId, { homeScore, awayScore, source: 'manual', updatedBy: admin.userId });
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, standings });
}
