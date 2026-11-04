import type { BackendConfig } from "./config.ts";
import { ApiError } from "./errors.ts";
import { evaluateGeofence, parseLocation } from "./geofence.ts";
import { errorResponse, jsonBody, success } from "./http.ts";
import { routePois } from "./routes/pois.ts";
import { routeQuests } from "./routes/quests.ts";
import { routeSessions } from "./routes/sessions.ts";
import { SupabaseGateway } from "./supabase.ts";
import type { JsonObject } from "./validation.ts";

async function route(request: Request, config: BackendConfig, headers: Headers): Promise<Response> {
  const url: URL = new URL(request.url);
  const path: string = url.pathname.replace(/^\/functions\/v1\/gea-api(?=\/|$)/, "").replace(
    /^\/gea-api(?=\/|$)/,
    "",
  );
  if (request.method === "GET" && path === "/health") {
    return success(
      { service: "gea-api", museumConfigured: config.museumArea !== null },
      200,
      headers,
    );
  }
  const gateway: SupabaseGateway = new SupabaseGateway(config);
  const userId: string = await gateway.authenticate(request.headers.get("authorization"));
  if (request.method === "POST" && path === "/geofence/evaluate") {
    const body: JsonObject = await jsonBody(request);
    return success(evaluateGeofence(parseLocation(body.location), config.museumArea), 200, headers);
  }
  const pois: Response | null = await routePois(request, path, url, gateway, headers);
  if (pois !== null) return pois;
  const sessions: Response | null = await routeSessions(
    request,
    path,
    config,
    gateway,
    userId,
    headers,
  );
  if (sessions !== null) return sessions;
  const quests: Response | null = await routeQuests(request, path, gateway, userId, headers);
  if (quests !== null) return quests;
  throw new ApiError(404, "ROUTE_NOT_FOUND", "Endpoint atau HTTP method tidak tersedia.");
}

export async function handleRequest(request: Request, config: BackendConfig): Promise<Response> {
  const requestId: string = crypto.randomUUID();
  const headers: Headers = new Headers({
    "cache-control": "no-store",
    "x-request-id": requestId,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin",
  });
  const origin: string | null = request.headers.get("origin");
  try {
    if (origin !== null) {
      if (!config.allowedOrigins.includes(origin)) {
        throw new ApiError(
          403,
          "ORIGIN_NOT_ALLOWED",
          "Origin belum diizinkan di GEA_ALLOWED_ORIGINS.",
        );
      }
      headers.set("access-control-allow-origin", origin);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    return await route(request, config, headers);
  } catch (error: unknown) {
    return errorResponse(error, requestId, headers);
  }
}
