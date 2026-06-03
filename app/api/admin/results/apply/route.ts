export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadFixtures } from '@/lib/fixtures/load';
import { getMatchRepository, getStandingsRepository, getPredictionRepository } from '@/lib/db/repository';
import { recomputeStandings } from '@/lib/results/recompute';

interface ApplyItem { matchId: string; homeScore: number; awayScore: number; }

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { results?: ApplyItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const results = body.results ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'no results' }, { status: 400 });
  }

  const matchRepo = getMatchRepository();
  for (const r of results) {
    if (!r.matchId || typeof r.homeScore !== 'number' || typeof r.awayScore !== 'number') continue;
    await matchRepo.setResult(r.matchId, { homeScore: r.homeScore, awayScore: r.awayScore, source: 'api', updatedBy: admin.userId });
  }
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, applied: results.length, standings });
}
