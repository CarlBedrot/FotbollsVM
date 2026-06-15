export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { parseBuffer } from "@/lib/excel/parse";
import { loadFixtures } from "@/lib/fixtures/load";
import { requireSession, isResponse, badRequest } from "@/lib/api/http";

export async function POST(req: Request) {
  const guard = await requireSession();
  if (isResponse(guard)) return guard;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return badRequest("ingen fil");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseBuffer(buffer, loadFixtures());
  } catch {
    return badRequest(
      "Kunde inte läsa filen — är det en ifylld .xlsx-tipslapp?",
    );
  }
  return NextResponse.json({ parsed });
}
