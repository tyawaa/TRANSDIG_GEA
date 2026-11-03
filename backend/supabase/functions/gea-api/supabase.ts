import type { BackendConfig } from "./config.ts";
import { ApiError, UpstreamError } from "./errors.ts";
import { type JsonObject, object, uuid } from "./validation.ts";

const RETRY_DELAYS_MS: readonly number[] = [150, 400];

async function requestWithRetry(
  url: string,
  init: RequestInit,
  operation: string,
): Promise<Response> {
  for (let attempt: number = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response: Response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new UpstreamError(response.status, operation, await response.text());
      }
      return response;
    } catch (error: unknown) {
      const transient: boolean = error instanceof TypeError ||
        (error instanceof DOMException && error.name === "TimeoutError") ||
        (error instanceof UpstreamError && (error.status === 429 || error.status >= 500));
      const delay: number | undefined = RETRY_DELAYS_MS[attempt];
      if (!transient || delay === undefined) throw error;
      console.warn(
        JSON.stringify({
          event: "supabase_retry",
          operation,
          attempt: attempt + 1,
          status: error instanceof UpstreamError ? error.status : null,
          responseBody: error instanceof UpstreamError ? error.responseBody : null,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, delay);
      });
    }
  }
  throw new Error("Retry loop ended unexpectedly.");
}

/** Connector Supabase. Hanya connector ini yang memegang service-role key. */
export class SupabaseGateway {
  constructor(private readonly config: BackendConfig) {}

  async authenticate(authorization: string | null): Promise<string> {
    if (authorization === null || !/^Bearer \S+$/.test(authorization)) {
      throw new ApiError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Kirim bearer access token dari Supabase Auth.",
      );
    }
    try {
      const response: Response = await requestWithRetry(`${this.config.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: this.config.anonKey, authorization },
      }, "auth.getUser");
      const body: unknown = await response.json();
      return uuid(object(body, "Auth response").id, "Auth user.id");
    } catch (error: unknown) {
      if (error instanceof UpstreamError && (error.status === 401 || error.status === 403)) {
        throw new ApiError(
          401,
          "INVALID_ACCESS_TOKEN",
          "Token tidak valid atau kedaluwarsa; perbarui sesi Auth.",
        );
      }
      throw error;
    }
  }

  async rpc(name: string, params: JsonObject): Promise<unknown> {
    const response: Response = await requestWithRetry(
      `${this.config.supabaseUrl}/rest/v1/rpc/${name}`,
      { method: "POST", headers: this.headers(), body: JSON.stringify(params) },
      `rpc.${name}`,
    );
    return await response.json() as unknown;
  }

  async query(table: string, params: URLSearchParams): Promise<readonly JsonObject[]> {
    const response: Response = await requestWithRetry(
      `${this.config.supabaseUrl}/rest/v1/${table}?${params.toString()}`,
      { headers: this.headers() },
      `query.${table}:${params.toString()}`,
    );
    const body: unknown = await response.json();
    if (!Array.isArray(body)) {
      throw new UpstreamError(502, `query.${table}`, "Expected an array response.");
    }
    return body.map((row: unknown): JsonObject => object(row, table));
  }

  mediaUrl(path: string): string {
    if (
      path.startsWith("/") || path.split("/").some((part: string): boolean => part === "..") ||
      /^[a-z]+:/i.test(path)
    ) {
      throw new ApiError(
        503,
        "MEDIA_PATH_INVALID",
        "Media harus berupa object path relatif di gea-media.",
      );
    }
    return `${this.config.supabaseUrl}/storage/v1/object/public/gea-media/${
      path.split("/").map(encodeURIComponent).join("/")
    }`;
  }

  private headers(): { readonly [key: string]: string } {
    return {
      apikey: this.config.serviceRoleKey,
      authorization: `Bearer ${this.config.serviceRoleKey}`,
      "content-type": "application/json",
    };
  }
}
