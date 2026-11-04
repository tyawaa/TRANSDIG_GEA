import { ApiError, UpstreamError, ValidationError } from "./errors.ts";
import { type JsonObject, object } from "./validation.ts";

export async function jsonBody(request: Request): Promise<JsonObject> {
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

export function success(data: unknown, status: number, headers: Headers): Response {
  return Response.json({ data }, { status, headers });
}

export function errorResponse(error: unknown, requestId: string, headers: Headers): Response {
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
