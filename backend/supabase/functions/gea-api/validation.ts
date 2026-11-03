import { ValidationError } from "./errors.ts";

export type JsonObject = { readonly [key: string]: unknown };
export type Language = "id" | "en";
export type Profile = "umum" | "pelajar";

export function object(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(`${field} harus berupa objek JSON.`);
  }
  return value as JsonObject;
}

export function text(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new ValidationError(`${field} harus berupa teks 1-${maxLength} karakter.`);
  }
  return value;
}

export function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} harus berupa angka finite.`);
  }
  return value;
}

export function uuid(value: unknown, field: string): string {
  const result: string = text(value, field, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ValidationError(`${field} harus berupa UUID yang valid.`);
  }
  return result.toLowerCase();
}

export function language(value: unknown): Language {
  if (value !== "id" && value !== "en") {
    throw new ValidationError("language harus id atau en; tidak ada penggantian bahasa otomatis.");
  }
  return value;
}

export function profile(value: unknown): Profile {
  if (value !== "umum" && value !== "pelajar") {
    throw new ValidationError("profile harus umum atau pelajar.");
  }
  return value;
}

export function optionLabel(value: unknown): string {
  if (typeof value !== "string" || !/^[A-D]$/.test(value)) {
    throw new ValidationError("labelOpsi harus A, B, C, atau D.");
  }
  return value;
}

export function qrToken(value: unknown): string {
  const token: string = text(value, "token", 64);
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new ValidationError("token QR harus 64 karakter heksadesimal dari penerbit museum.");
  }
  return token;
}
