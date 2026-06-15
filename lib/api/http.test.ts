import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  forbidden,
  badRequest,
  readJson,
  isResponse,
} from "./http";

describe("jsonError", () => {
  it("wraps the message in an { error } envelope with the given status", async () => {
    const res = jsonError("nope", 409);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "nope" });
  });
});

describe("status helpers", () => {
  it("unauthorized defaults to 401", () => {
    expect(unauthorized().status).toBe(401);
  });
  it("forbidden defaults to 403", () => {
    expect(forbidden().status).toBe(403);
  });
  it("badRequest defaults to 400 with 'invalid body'", async () => {
    const res = badRequest();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid body" });
  });
});

describe("readJson", () => {
  it("returns the parsed body for valid JSON", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    const body = await readJson<{ a: number }>(req);
    expect(isResponse(body)).toBe(false);
    expect(body).toEqual({ a: 1 });
  });

  it("returns a 400 response for invalid JSON", async () => {
    const req = new Request("http://x", { method: "POST", body: "not json" });
    const body = await readJson(req);
    expect(isResponse(body)).toBe(true);
    expect((body as NextResponse).status).toBe(400);
  });
});

describe("isResponse", () => {
  it("distinguishes NextResponse from plain data", () => {
    expect(isResponse(forbidden())).toBe(true);
    expect(isResponse({ error: "x" })).toBe(false);
    expect(isResponse(null)).toBe(false);
  });
});
