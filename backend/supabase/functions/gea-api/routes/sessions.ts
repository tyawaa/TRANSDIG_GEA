import type { BackendConfig } from "../config.ts";
import { ApiError } from "../errors.ts";
import { type AccessDecision, evaluateGeofence, parseLocation } from "../geofence.ts";
import { jsonBody, success } from "../http.ts";
import type { SupabaseGateway } from "../supabase.ts";
import { poiDetail, sha256 } from "../stories.ts";
import {
  type JsonObject,
  type Language,
  language,
  object,
  type Profile,
  profile,
  qrToken,
  uuid,
} from "../validation.ts";

export async function routeSessions(
  request: Request,
  path: string,
  config: BackendConfig,
  gateway: SupabaseGateway,
  userId: string,
  headers: Headers,
): Promise<Response | null> {
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
  return null;
}
