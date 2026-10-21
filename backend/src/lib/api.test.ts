import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));

import { ApiError, parseBody, parseQuery, requireSession, route } from "./api";

const post = (body: string) =>
  new Request("http://x/api", { method: "POST", body });

beforeEach(() => {
  getSession.mockReset();
});

describe("requireSession", () => {
  it("returns the session when present", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const s = await requireSession(new Request("http://x/api"));
    expect(s.user.id).toBe("u1");
  });

  it("throws 401 when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireSession(new Request("http://x/api"))).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });
});

describe("validation", () => {
  const schema = z.object({ amountCents: z.number().int() });

  it("parses a valid body", async () => {
    expect(await parseBody(post('{"amountCents":100}'), schema)).toEqual({
      amountCents: 100,
    });
  });

  it("rejects bad JSON and bad fields with 400", async () => {
    await expect(parseBody(post("nope"), schema)).rejects.toMatchObject({
      status: 400,
      code: "invalid_request",
    });
    await expect(parseBody(post('{"amountCents":1.5}'), schema)).rejects.toThrow(
      /amountCents/,
    );
  });

  it("parses query strings", () => {
    const q = parseQuery(new Request("http://x/api?month=2026-11"), z.object({ month: z.string() }));
    expect(q.month).toBe("2026-11");
  });
});

describe("route", () => {
  it("passes through the handler response", async () => {
    const res = await route(async () => Response.json({ ok: 1 }))(new Request("http://x"), {});
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("maps ApiError to the error shape", async () => {
    const res = await route(async () => {
      throw new ApiError(404, "not_found", "No such month.");
    })(new Request("http://x"), {});
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "No such month." } });
  });

  it("hides unexpected errors behind a 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await route(async () => {
      throw new Error("db password leaked");
    })(new Request("http://x"), {});
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
  });
});
