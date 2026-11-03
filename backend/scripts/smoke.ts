import { strictEqual } from "node:assert";
import { type JsonObject, object, text } from "../supabase/functions/gea-api/validation.ts";

async function expectResponse(
  url: string,
  init: RequestInit,
  expectedStatus: number,
): Promise<JsonObject> {
  const response: Response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const body: unknown = await response.json();
  strictEqual(
    response.status,
    expectedStatus,
    `HTTP ${response.status}, expected ${expectedStatus}, URL ${url}, body ${JSON.stringify(body)}`,
  );
  return object(body, "response");
}

/** Smoke cloud sungguhan; membuat satu identitas anonim tanpa menambahkan konten museum. */
async function smoke(): Promise<void> {
  const projectUrl: string = text(Deno.env.get("GEA_PROJECT_URL"), "GEA_PROJECT_URL", 500).replace(
    /\/$/,
    "",
  );
  const key: string = text(Deno.env.get("GEA_PUBLISHABLE_KEY"), "GEA_PUBLISHABLE_KEY", 2000);
  const base: string = `${projectUrl}/functions/v1/gea-api`;
  await expectResponse(`${base}/health`, {}, 200);
  await expectResponse(`${base}/pois`, {}, 401);
  const signup: JsonObject = await expectResponse(`${projectUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: "{}",
  }, 200);
  const token: string = text(signup.access_token, "Auth access_token", 10000);
  const headers: { readonly [key: string]: string } = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const pois: JsonObject = await expectResponse(`${base}/pois`, { headers }, 200);
  const decision: JsonObject = await expectResponse(`${base}/geofence/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ location: null }),
  }, 200);
  strictEqual(object(decision.data, "decision").accessAllowed, false);
  await expectResponse(`${base}/geofence/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ location: { latitude: 91, longitude: 0, accuracyMeters: 5 } }),
  }, 400);
  await expectResponse(`${projectUrl}/rest/v1/quest_opsi?select=*`, {
    headers: { apikey: key, authorization: `Bearer ${token}` },
  }, 403);
  console.log(
    JSON.stringify({
      event: "cloud_smoke_passed",
      poiCount: Array.isArray(pois.data) ? pois.data.length : null,
      geofenceStatus: object(decision.data, "decision").status,
    }),
  );
}

if (import.meta.main) await smoke();
