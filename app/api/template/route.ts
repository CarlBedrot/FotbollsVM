export const runtime = 'nodejs';

import { templateBuffer } from '@/lib/excel/template';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';

export async function GET() {
  if (!(await currentUser())) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const buf = await templateBuffer(loadFixtures());
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="vm-tipset-2026.xlsx"',
    },
  });
}
