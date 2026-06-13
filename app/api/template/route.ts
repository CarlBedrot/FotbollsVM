export const runtime = "nodejs";

import { templateBuffer } from "@/lib/excel/template";
import { loadFixtures } from "@/lib/fixtures/load";
import { requireSession, isResponse } from "@/lib/api/http";

export async function GET() {
  const guard = await requireSession();
  if (isResponse(guard)) return guard;
  const buf = await templateBuffer(loadFixtures());
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="vm-tipset-2026.xlsx"',
    },
  });
}
