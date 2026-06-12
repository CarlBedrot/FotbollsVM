export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getPredictionRepository, getUserRepository } from '@/lib/db/repository';
import { loadStandingsView, loadMatchViews } from '@/lib/view/serverData';
import { buildPlayerCard } from '@/lib/view/playerCard';
import { loadFixtures } from '@/lib/fixtures/load';
import { isLocked } from '@/lib/tips/lock';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const [standings, matches, users, predictions] = await Promise.all([
    loadStandingsView(),
    loadMatchViews(),
    getUserRepository().list(),
    getPredictionRepository().all(),
  ]);

  const revealed = isLocked(loadFixtures().firstKickoff, new Date(), null);
  const card = buildPlayerCard({ userId: id, standings, users, matches, predictions, revealed });
  if (!card) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ card });
}
