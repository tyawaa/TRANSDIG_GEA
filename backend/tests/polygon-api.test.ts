import { equal } from "node:assert/strict";
import vertices from "../data/museum-polygon.json" with { type: "json" };
import { handleRequest } from "../supabase/functions/gea-api/app.ts";
import { type BackendConfig, museumAreaFromEnvironment } from "../supabase/functions/gea-api/config.ts";

// Test-only IDs. No requests are sent to Supabase.
const zoneId = "20000000-0000-4000-8000-000000000001";
const config: BackendConfig = {
  supabaseUrl: "https://example.invalid",
  anonKey: "test",
  serviceRoleKey: "test",
  allowedOrigins: [],
  museumArea: museumAreaFromEnvironment({
    GEA_MUSEUM_LATITUDE: "-6.900660443043143",
    GEA_MUSEUM_LONGITUDE: "107.62147535330041",
    GEA_MUSEUM_ZONE_ID: zoneId,
    GEA_MUSEUM_POLYGON_JSON: JSON.stringify(vertices),
  }),
};

Deno.test("deployed API: health/auth, polygon gating, session verification, QR route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) {
      return Promise.resolve(Response.json({ id: "10000000-0000-4000-8000-000000000001" }));
    }
    if (url.endsWith("/rpc/buat_sesi_gps") || url.endsWith("/rpc/buat_sesi_qr")) {
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return Promise.resolve(Response.json({ id_sesi: "test-session" }));
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const post = (path: string, body: unknown) =>
    handleRequest(
      new Request(
        `https://example.invalid/functions/v1/gea-api${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer test" },
          body: JSON.stringify(body),
        },
      ),
      config,
    );
  const inside = {
    latitude: -6.900660443043143,
    longitude: 107.62147535330041,
    accuracyMeters: 20,
  };
  const session = {
    idSesi: "50000000-0000-4000-8000-000000000001",
    language: "id",
    profile: "umum",
  };
  try {
    equal(
      (await handleRequest(new Request("https://example.invalid/gea-api/health"), config)).status,
      200,
    );
    equal(
      (await handleRequest(new Request("https://example.invalid/gea-api/pois"), config)).status,
      401,
    );
    const evaluated = await post("/geofence/evaluate", { location: inside });
    equal(evaluated.status, 200);
    equal((await evaluated.json()).data.status, "inside");
    equal((await post("/sessions", { ...session, location: inside })).status, 201);
    equal(calls[0]!.body.p_id_zona, zoneId);
    for (
      const location of [
        { ...inside, latitude: -6.90085 },
        { ...inside, latitude: -6.90056, longitude: 107.62137 },
        { ...inside, accuracyMeters: 21 },
        null,
      ]
    ) equal((await post("/sessions", { ...session, location, accessAllowed: true })).status, 403);
    equal(calls.length, 1);
    equal(
      (await post("/geofence/evaluate", { location: { ...inside, accuracyMeters: -1 } })).status,
      400,
    );
    equal((await post("/sessions/qr", { ...session, token: "a".repeat(64) })).status, 201);
    equal(calls[1]!.url.endsWith("/rpc/buat_sesi_qr"), true);
    equal(typeof calls[1]!.body.p_token_hash, "string");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
