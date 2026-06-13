export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { parseBuffer } from "@/lib/excel/parse";
import { loadFixtures } from "@/lib/fixtures/load";
import { getPredictionRepository } from "@/lib/db/repository";
import { isLocked } from "@/lib/tips/lock";
import {
  requireSession,
  isResponse,
  jsonError,
  badRequest,
} from "@/lib/api/http";

export async function GET() {
  const session = await requireSession();
  if (isResponse(session)) return session;
  const repo = getPredictionRepository();
  const [prediction, status] = await Promise.all([
    repo.get(session.userId),
    repo.getStatus(session.userId),
  ]);
  return NextResponse.json({ prediction, status });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const fixtures = loadFixtures();
  const repo = getPredictionRepository();
  const status = await repo.getStatus(session.userId);
  if (isLocked(fixtures.firstKickoff, new Date(), status)) {
    return jsonError("Tipsen är låsta (matcherna har börjat).", 403);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return badRequest("ingen fil");
  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseBuffer(buffer, fixtures);
  } catch {
    return badRequest(
      "Kunde inte läsa filen — är det en ifylld .xlsx-tipslapp?",
    );
  }

  await repo.save(
    {
      userId: session.userId,
      matchPicks: parsed.matchPicks,
      bonus: parsed.bonus,
    },
    new Date().toISOString(),
  );
  return NextResponse.json({
    ok: true,
    saved: {
      matches: Object.keys(parsed.matchPicks).length,
      bonus: Object.keys(parsed.bonus).length,
    },
    warnings: parsed.warnings,
  });
}
