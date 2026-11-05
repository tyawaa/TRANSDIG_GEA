import { ValidationError } from "./errors.ts";
import { finiteNumber, object } from "./validation.ts";

export type Vertex = { readonly latitude: number; readonly longitude: number };
const EPSILON = 1e-12;

function turn(a: Vertex, b: Vertex, c: Vertex): number {
  return (b.longitude - a.longitude) * (c.latitude - a.latitude) -
    (b.latitude - a.latitude) * (c.longitude - a.longitude);
}

function onSegment(p: Vertex, a: Vertex, b: Vertex): boolean {
  return Math.abs(turn(a, b, p)) <= EPSILON &&
    p.longitude >= Math.min(a.longitude, b.longitude) - EPSILON &&
    p.longitude <= Math.max(a.longitude, b.longitude) + EPSILON &&
    p.latitude >= Math.min(a.latitude, b.latitude) - EPSILON &&
    p.latitude <= Math.max(a.latitude, b.latitude) + EPSILON;
}

function intersects(a: Vertex, b: Vertex, c: Vertex, d: Vertex): boolean {
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) ||
    onSegment(d, a, b) ||
    (turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0);
}

/** Local museum footprint; not a global/antimeridian geometry implementation. */
export function parsePolygon(value: unknown): readonly Vertex[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 65) {
    throw new ValidationError("Poligon membutuhkan 3-64 titik (penutup opsional).");
  }
  const points: Vertex[] = value.map((item: unknown): Vertex => {
    const input = object(item, "polygon vertex");
    const latitude = finiteNumber(input.latitude, "latitude");
    const longitude = finiteNumber(input.longitude, "longitude");
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new ValidationError("Koordinat poligon di luar rentang geografis.");
    }
    return { latitude, longitude };
  });
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first.latitude === last.latitude && first.longitude === last.longitude) points.pop();
  if (points.length < 3 || points.length > 64) {
    throw new ValidationError("Poligon membutuhkan 3-64 titik unik.");
  }
  const keys = new Set(points.map((p): string => `${p.latitude},${p.longitude}`));
  if (keys.size !== points.length) throw new ValidationError("Titik poligon berulang.");
  if (
    points.some((p): boolean =>
      Math.abs(p.latitude - first.latitude) > 1 || Math.abs(p.longitude - first.longitude) > 1
    )
  ) throw new ValidationError("Poligon harus berupa area lokal museum.");
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const previous = points[(i + points.length - 1) % points.length]!;
    if (onSegment(b, previous, a) || onSegment(previous, a, b)) {
      throw new ValidationError("Sisi poligon berbalik atau bertumpuk.");
    }
    twiceArea += turn(first, a, b);
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(a, b, points[j]!, points[(j + 1) % points.length]!)) {
        throw new ValidationError("Sisi poligon saling menyilang atau bersentuhan.");
      }
    }
  }
  if (Math.abs(twiceArea) <= EPSILON) throw new ValidationError("Luas poligon harus positif.");
  return points;
}

/** Boundary inclusive. Caller supplies a polygon validated by parsePolygon. */
export function pointInPolygon(point: Vertex, vertices: readonly Vertex[]): boolean {
  let inside = false;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    if (onSegment(point, a, b)) return true;
    if (
      (a.latitude > point.latitude) !== (b.latitude > point.latitude) &&
      point.longitude <
        a.longitude + (b.longitude - a.longitude) *
            (point.latitude - a.latitude) / (b.latitude - a.latitude)
    ) inside = !inside;
  }
  return inside;
}
