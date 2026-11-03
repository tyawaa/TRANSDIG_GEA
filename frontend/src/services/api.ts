import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  type AccessDecision,
  accessDecisionSchema,
  type BackendHealth,
  type DeviceLocation,
  healthSchema,
  poiListSchema,
  type PoiSummary,
  type Visit,
  visitSchema,
} from "../domain/contracts";

type JsonObject = { readonly [key: string]: unknown };
const envelopeSchema = z.object({ data: z.unknown() });
const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
const retryDelays: readonly number[] = [300, 800];

export class GeaServiceError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

async function fetchWithRetry(request: Request): Promise<Response> {
  for (let attempt: number = 0; attempt <= retryDelays.length; attempt += 1) {
    const controller: AbortController = new AbortController();
    const timeout: ReturnType<typeof setTimeout> = setTimeout(
      (): void => controller.abort(),
      15000,
    );
    try {
      const response: Response = await fetch(request.clone(), {
        signal: controller.signal,
      });
      const delay: number | undefined = retryDelays[attempt];
      if (
        (response.status === 429 || response.status >= 500) &&
        delay !== undefined
      ) {
        const responseBody: string = await response.text();
        console.warn("gea_api_retry", {
          url: request.url,
          method: request.method,
          status: response.status,
          responseBody,
          attempt: attempt + 1,
        });
        await new Promise<void>((resolve: () => void): void => {
          setTimeout(resolve, delay);
        });
        continue;
      }
      return response;
    } catch (error: unknown) {
      const delay: number | undefined = retryDelays[attempt];
      const retryable: boolean = error instanceof TypeError ||
        (error instanceof Error && error.name === "AbortError");
      if (!retryable || delay === undefined) throw error;
      console.warn("gea_network_retry", {
        url: request.url,
        method: request.method,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, delay);
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new GeaServiceError(
    0,
    "NETWORK_ERROR",
    "Permintaan gagal setelah dicoba ulang.",
  );
}

async function responseData(request: Request): Promise<unknown> {
  const response: Response = await fetchWithRetry(request);
  const source: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error: unknown) {
    if (!(error instanceof SyntaxError)) throw error;
    console.error("gea_response_invalid", {
      url: request.url,
      status: response.status,
      responseBody: source,
    });
    throw new GeaServiceError(
      response.status,
      "INVALID_RESPONSE",
      "Layanan mengembalikan respons yang tidak sesuai.",
    );
  }
  if (!response.ok) {
    console.error("gea_request_failed", {
      url: request.url,
      method: request.method,
      status: response.status,
      responseBody: parsed,
    });
    const error = errorSchema.safeParse(parsed);
    throw new GeaServiceError(
      response.status,
      error.success ? error.data.error.code : "SERVICE_UNAVAILABLE",
      error.success
        ? error.data.error.message
        : "Layanan kunjungan belum tersedia.",
    );
  }
  return envelopeSchema.parse(parsed).data;
}

/** Connector HTTP; identitas pengunjung diambil dari sesi Supabase, bukan user ID dari UI. */
export class GeaApi {
  constructor(
    private readonly projectUrl: string,
    private readonly authClient: SupabaseClient,
  ) {}

  async health(): Promise<BackendHealth> {
    return healthSchema.parse(
      await responseData(new Request(`${this.baseUrl()}/health`)),
    );
  }

  async evaluateLocation(
    location: DeviceLocation | null,
  ): Promise<AccessDecision> {
    return accessDecisionSchema.parse(
      await this.post("/geofence/evaluate", { location }),
    );
  }

  async startGpsVisit(
    idSesi: string,
    location: DeviceLocation,
  ): Promise<Visit> {
    return visitSchema.parse(
      await this.post("/sessions", {
        idSesi,
        language: "id",
        profile: "umum",
        location,
      }),
    );
  }

  async startQrVisit(idSesi: string, token: string): Promise<Visit> {
    return visitSchema.parse(
      await this.post("/sessions/qr", {
        idSesi,
        language: "id",
        profile: "umum",
        token,
      }),
    );
  }

  async pois(): Promise<readonly PoiSummary[]> {
    const headers: Headers = await this.authorizedHeaders();
    return poiListSchema.parse(
      await responseData(new Request(`${this.baseUrl()}/pois`, { headers })),
    );
  }

  private async post(path: string, body: JsonObject): Promise<unknown> {
    const headers: Headers = await this.authorizedHeaders();
    return await responseData(
      new Request(`${this.baseUrl()}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  }

  private async authorizedHeaders(): Promise<Headers> {
    const stored = await this.authClient.auth.getSession();
    if (stored.error !== null) throw stored.error;
    let session: Session | null = stored.data.session;
    if (session === null) {
      const signedIn = await this.authClient.auth.signInAnonymously();
      if (signedIn.error !== null) {
        console.error("gea_auth_failed", {
          status: signedIn.error.status,
          code: signedIn.error.code,
          message: signedIn.error.message,
        });
        throw new GeaServiceError(
          signedIn.error.status ?? 401,
          signedIn.error.code ?? "AUTH_ERROR",
          signedIn.error.message,
        );
      }
      session = signedIn.data.session;
    }
    if (session === null) {
      throw new GeaServiceError(
        401,
        "AUTH_REQUIRED",
        "Sesi pengunjung belum terbentuk.",
      );
    }
    return new Headers({
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    });
  }

  private baseUrl(): string {
    return `${this.projectUrl.replace(/\/$/, "")}/functions/v1/gea-api`;
  }
}

export function readableError(error: unknown): string {
  if (error instanceof GeaServiceError) {
    if (error.status === 404 || error.code === "SERVICE_UNAVAILABLE") {
      return "Layanan kunjungan belum tersedia. Coba lagi setelah layanan diaktifkan.";
    }
    if (error.code === "anonymous_provider_disabled") {
      return "Layanan sesi pengunjung belum diaktifkan. Hubungi tim museum.";
    }
    if (error.code === "ENTRANCE_QR_INVALID") {
      return "QR ini bukan QR pintu masuk yang aktif. Minta QR terbaru dari petugas.";
    }
    if (error.code === "MUSEUM_AREA_NOT_CONFIGURED") {
      return "Pengecekan area museum belum tersedia. Gunakan QR pintu masuk.";
    }
    return error.message;
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error && error.name === "AbortError")
  ) return "Koneksi belum berhasil. Periksa jaringanmu, lalu coba lagi.";
  if (error instanceof z.ZodError) {
    return "Data layanan belum sesuai. Laporkan kepada tim museum.";
  }
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan yang perlu diperiksa tim museum.";
}
