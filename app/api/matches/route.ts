export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getMatchRepository } from '@/lib/db/repository';

export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const matches = await getMatchRepository().all();
  return NextResponse.json({ matches });
}
