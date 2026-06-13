import { NextResponse } from "next/server";
import { currentUser } from "../auth/currentUser";
import { requireAdmin } from "../auth/requireAdmin";
import type { SessionPayload } from "../auth/session";

/** One source of truth for the JSON error envelope ({ error }) and the status
 *  codes used across route handlers, so every endpoint answers consistently. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = (message = "unauthorized") =>
  jsonError(message, 401);
export const forbidden = (message = "forbidden") => jsonError(message, 403);
export const badRequest = (message = "invalid body") => jsonError(message, 400);

/** Parse a JSON request body. Returns the parsed value, or a 400 response the
 *  caller should return as-is — guard with `isResponse`. */
export async function readJson<T>(req: Request): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return badRequest();
  }
}

/** Narrows a `T | NextResponse` helper result to the short-circuit response. */
export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Require any authenticated session. Returns the session, or a 401 response
 *  the caller should return as-is — guard with `isResponse`. */
export async function requireSession(): Promise<SessionPayload | NextResponse> {
  return (await currentUser()) ?? unauthorized();
}

/** Require an admin session. Returns the session, or a 403 response the caller
 *  should return as-is — guard with `isResponse`. */
export async function requireAdminSession(): Promise<
  SessionPayload | NextResponse
> {
  return (await requireAdmin()) ?? forbidden();
}
