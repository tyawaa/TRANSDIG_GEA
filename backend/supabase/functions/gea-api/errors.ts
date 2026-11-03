export class ValidationError extends Error {
  override readonly name: string = "ValidationError";
}

export class ApiError extends Error {
  override readonly name: string = "ApiError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class UpstreamError extends Error {
  override readonly name: string = "UpstreamError";
  constructor(
    readonly status: number,
    readonly operation: string,
    readonly responseBody: string,
  ) {
    super(`Supabase request failed: ${operation}, HTTP ${status}, response: ${responseBody}`);
  }
}
