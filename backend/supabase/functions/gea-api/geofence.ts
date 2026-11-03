import { ValidationError } from "./errors.ts";
import { finiteNumber, type JsonObject, object } from "./validation.ts";

export type Coordinate = { readonly latitude: number; readonly longitude: number };
export type Location = Coordinate & { readonly accuracyMeters: number };
export type MuseumArea = Coordinate & { readonly radiusMeters: number; readonly zoneId: string };
export type AccessStatus =
  | "inside"
  | "outside"
  | "low_accuracy"
  | "location_unavailable"
  | "not_configured";
export type AccessDecision = {
  readonly status: AccessStatus;
  readonly accessAllowed: boolean;
  readonly distanceMeters: number | null;
  readonly accuracyMeters: number | null;
  readonly fallback: "entrance_qr" | null;
  readonly reasonCode: string;
};

const EARTH_RADIUS_METERS: number = 6371008.8;
export const MAX_ACCURACY_METERS: number = 20;

export function validateCoordinate(coordinate: Coordinate): Coordinate {
  const latitude: number = finiteNumber(coordinate.latitude, "latitude");
  const longitude: number = finiteNumber(coordinate.longitude, "longitude");
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ValidationError("latitude harus -90..90 dan longitude harus -180..180.");
  }
  return { latitude, longitude };
}

export function parseLocation(value: unknown): Location | null {
  if (value === null) return null;
  const input: JsonObject = object(value, "location");
  const coordinate: Coordinate = validateCoordinate({
    latitude: finiteNumber(input.latitude, "latitude"),
    longitude: finiteNumber(input.longitude, "longitude"),
  });
  const accuracyMeters: number = finiteNumber(input.accuracyMeters, "accuracyMeters");
  if (accuracyMeters < 0) throw new ValidationError("accuracyMeters tidak boleh negatif.");
  return { ...coordinate, accuracyMeters };
}

export function haversineMeters(origin: Coordinate, destination: Coordinate): number {
  const start: Coordinate = validateCoordinate(origin);
  const end: Coordinate = validateCoordinate(destination);
  const radians: number = Math.PI / 180;
  const latitudeDelta: number = (end.latitude - start.latitude) * radians;
  const longitudeDelta: number = (end.longitude - start.longitude) * radians;
  const haversine: number = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(start.latitude * radians) * Math.cos(end.latitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

export function evaluateGeofence(
  location: Location | null,
  area: MuseumArea | null,
): AccessDecision {
  const validated: Location | null = parseLocation(location);
  if (area === null) {
    return {
      status: "not_configured",
      accessAllowed: false,
      distanceMeters: null,
      accuracyMeters: validated?.accuracyMeters ?? null,
      fallback: "entrance_qr",
      reasonCode: "MUSEUM_AREA_NOT_CONFIGURED",
    };
  }
  validateCoordinate(area);
  if (!Number.isFinite(area.radiusMeters) || area.radiusMeters <= 0) {
    throw new ValidationError("radiusMeters museum harus positif dan finite.");
  }
  if (validated === null) {
    return {
      status: "location_unavailable",
      accessAllowed: false,
      distanceMeters: null,
      accuracyMeters: null,
      fallback: "entrance_qr",
      reasonCode: "LOCATION_UNAVAILABLE",
    };
  }
  const distanceMeters: number = haversineMeters(area, validated);
  if (validated.accuracyMeters > MAX_ACCURACY_METERS) {
    return {
      status: "low_accuracy",
      accessAllowed: false,
      distanceMeters,
      accuracyMeters: validated.accuracyMeters,
      fallback: "entrance_qr",
      reasonCode: "GPS_ACCURACY_EXCEEDS_20_METERS",
    };
  }
  const inside: boolean = distanceMeters <= area.radiusMeters;
  return {
    status: inside ? "inside" : "outside",
    accessAllowed: inside,
    distanceMeters,
    accuracyMeters: validated.accuracyMeters,
    fallback: null,
    reasonCode: inside ? "WITHIN_MUSEUM_AREA" : "OUTSIDE_MUSEUM_AREA",
  };
}
