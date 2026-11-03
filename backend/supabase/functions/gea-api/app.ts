import type { BackendConfig } from "./config.ts";
import { ApiError, UpstreamError, ValidationError } from "./errors.ts";
import { type AccessDecision, evaluateGeofence, parseLocation } from "./geofence.ts";
import { listPois, poiDetail, sha256 } from "./stories.ts";
import { SupabaseGateway } from "./supabase.ts";
import {
  type JsonObject,
  type Language,
  language,
  object,
  optionLabel,
  type Profile,
  profile,
  qrToken,
  uuid,
} from "./validation.ts";

async function jsonBody(request: Request): Promise<JsonObject> {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json"
  ) {
    throw new ApiError(415, "JSON_REQUIRED", "Gunakan Content-Type application/json.");
  }
  const source: string = await request.text();
  if (new TextEncoder().encode(source).length > 16384) {
    throw new ApiError(413, "REQUEST_TOO_LARGE", "Body maksimal 16 KiB.");
  }
  try {
    return object(JSON.parse(source) as unknown, "body");
  } catch (error: unknown) {
    if (error instanceof SyntaxError) throw new ValidationError("Body bukan JSON yang valid.");
    throw error;
  }
}

function success(data: unknown, status: number, headers: Headers): Response {
  return Response.json({ data }, { status, headers });
}

function errorResponse(error: unknown, requestId: string, headers: Headers): Response {
  if (error instanceof ValidationError) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: error.message }, requestId },
      { status: 400, headers },
    );
  }
  if (error instanceof ApiError) {
    return Response.json({ error: { code: error.code, message: error.message }, requestId }, {
      status: error.status,
      headers,
    });
  }
  if (error instanceof UpstreamError && error.status >= 400 && error.status < 500) {
    let body: unknown;
    try {
      body = JSON.parse(error.responseBody) as unknown;
    } catch (parseError: unknown) {
      if (!(parseError instanceof SyntaxError)) throw parseError;
      body = null;
    }
    if (
      typeof body === "object" && body !== null && "code" in body && "message" in body &&
      typeof body.code === "string" && /^PT(400|403|404|409)$/.test(body.code) &&
      typeof body.message === "string"
    ) {
      return Response.json({ error: { code: body.message, message: body.message }, requestId }, {
        status: Number(body.code.slice(2)),
        headers,
      });
    }
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  return Response.json({
    error: {
      code: "BACKEND_ERROR",
      message: "Backend gagal memproses request; periksa log dengan requestId.",
    },
    requestId,
  }, { status: 503, headers });
}

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
  if (request.method === "GET" && path === "/pois") {
    return success(await listPois(gateway), 200, headers);
  }
  const detail: RegExpMatchArray | null = path.match(/^\/pois\/([^/]+)$/);
  if (request.method === "GET" && detail !== null) {
    return success(
      await poiDetail(
        gateway,
        uuid(detail[1], "idPoi"),
        language(url.searchParams.get("language")),
        profile(url.searchParams.get("profile")),
      ),
      200,
      headers,
    );
  }
  if (request.method === "POST" && path === "/sessions") {
    const body: JsonObject = await jsonBody(request);
    const decision: AccessDecision = evaluateGeofence(
      parseLocation(body.location),
      config.museumArea,
    );
    if (!decision.accessAllowed || config.museumArea === null) {
      throw new ApiError(
        decision.status === "not_configured" ? 503 : 403,
        decision.reasonCode,
        "Akses GPS belum diizinkan. Periksa evaluasi geofence; QR pintu masuk tersedia untuk kondisi yang sesuai.",
      );
    }
    return success(
      await gateway.rpc("buat_sesi_gps", {
        p_user_id: userId,
        p_id_sesi: uuid(body.idSesi, "idSesi"),
        p_id_zona: config.museumArea.zoneId,
        p_bahasa: language(body.language),
        p_profil: profile(body.profile),
      }),
      201,
      headers,
    );
  }
  if (request.method === "POST" && path === "/sessions/qr") {
    const body: JsonObject = await jsonBody(request);
    return success(
      await gateway.rpc("buat_sesi_qr", {
        p_user_id: userId,
        p_id_sesi: uuid(body.idSesi, "idSesi"),
        p_token_hash: await sha256(qrToken(body.token)),
        p_bahasa: language(body.language),
        p_profil: profile(body.profile),
      }),
      201,
      headers,
    );
  }
  const progress: RegExpMatchArray | null = path.match(/^\/sessions\/([^/]+)\/progress$/);
  if (request.method === "GET" && progress !== null) {
    return success(
      await gateway.rpc("progres_kunjungan", {
        p_user_id: userId,
        p_id_sesi: uuid(progress[1], "idSesi"),
      }),
      200,
      headers,
    );
  }
  const verification: RegExpMatchArray | null = path.match(/^\/sessions\/([^/]+)\/verify-qr$/);
  if (request.method === "POST" && verification !== null) {
    const body: JsonObject = await jsonBody(request);
    const selectedLanguage: Language = language(body.language);
    const selectedProfile: Profile = profile(body.profile);
    const result: JsonObject = object(
      await gateway.rpc("verifikasi_qr_poi", {
        p_user_id: userId,
        p_id_sesi: uuid(verification[1], "idSesi"),
        p_token_hash: await sha256(qrToken(body.token)),
      }),
      "verification",
    );
    return success(
      {
        ...result,
        poi: await poiDetail(
          gateway,
          uuid(result.idPoi, "idPoi"),
          selectedLanguage,
          selectedProfile,
        ),
      },
      200,
      headers,
    );
  }
  const answer: RegExpMatchArray | null = path.match(
    /^\/sessions\/([^/]+)\/quests\/([^/]+)\/answers$/,
  );
  if (request.method === "POST" && answer !== null) {
    const body: JsonObject = await jsonBody(request);
    return success(
      await gateway.rpc("jawab_quest", {
        p_user_id: userId,
        p_id_sesi: uuid(answer[1], "idSesi"),
        p_id_quest: uuid(answer[2], "idQuest"),
        p_label_opsi: optionLabel(body.labelOpsi),
        p_request_id: uuid(body.requestId, "requestId"),
      }),
      200,
      headers,
    );
  }
  const close: RegExpMatchArray | null = path.match(/^\/sessions\/([^/]+)\/pois\/([^/]+)\/close$/);
  if (request.method === "POST" && close !== null) {
    return success(
      await gateway.rpc("tutup_kartu", {
        p_user_id: userId,
        p_id_sesi: uuid(close[1], "idSesi"),
        p_id_poi: uuid(close[2], "idPoi"),
      }),
      200,
      headers,
    );
  }
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
