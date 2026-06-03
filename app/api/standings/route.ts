export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getStandingsRepository } from '@/lib/db/repository';

export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const standings = await getStandingsRepository().getAll();
  standings.sort((a, b) => a.rank - b.rank);
  return NextResponse.json({ standings });
}
