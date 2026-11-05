import { equal, throws } from "node:assert/strict";
import vertices from "../data/museum-polygon.json" with { type: "json" };
import { museumAreaFromEnvironment } from "../supabase/functions/gea-api/config.ts";
import { evaluateGeofence, type MuseumArea } from "../supabase/functions/gea-api/geofence.ts";
import { parsePolygon, pointInPolygon } from "../supabase/functions/gea-api/polygon.ts";

const reference = { latitude: -6.900660443043143, longitude: 107.62147535330041 };
const environment = {
  GEA_MUSEUM_LATITUDE: String(reference.latitude),
  GEA_MUSEUM_LONGITUDE: String(reference.longitude),
  GEA_MUSEUM_ZONE_ID: "20000000-0000-4000-8000-000000000001",
  GEA_MUSEUM_POLYGON_JSON: JSON.stringify(vertices),
};

Deno.test("poligon museum: ruang utama, tonjolan, cekungan, luar dan batas", (): void => {
  const polygon = parsePolygon(vertices);
  equal(polygon.length, 8);
  for (const ring of [polygon, [...polygon].reverse()]) {
    equal(pointInPolygon(reference, ring), true);
    equal(pointInPolygon({ latitude: -6.90055, longitude: 107.62147 }, ring), true);
    equal(pointInPolygon({ latitude: -6.90068, longitude: 107.6212 }, ring), true);
    equal(pointInPolygon({ latitude: -6.90056, longitude: 107.62137 }, ring), false);
    equal(pointInPolygon({ latitude: -6.90056, longitude: 107.62158 }, ring), false);
    equal(pointInPolygon({ latitude: -6.90085, longitude: 107.62147 }, ring), false);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      equal(pointInPolygon(a, ring), true);
      equal(
        pointInPolygon({
          latitude: (a.latitude + b.latitude) / 2,
          longitude: (a.longitude + b.longitude) / 2,
        }, ring),
        true,
      );
    }
  }
  equal(parsePolygon([...vertices, vertices[0]]).length, 8);
});

Deno.test("poligon invalid ditolak: silang, duplikat, kolinear, koordinat, terlalu luas", (): void => {
  const p = (latitude: number, longitude: number) => ({ latitude, longitude });
  for (
    const value of [
      [],
      [p(0, 0), p(0, 0.1)],
      [p(0, 0), p(0.1, 0.1), p(0, 0.1), p(0.1, 0)],
      [p(0, 0), p(0, 0.1), p(0, 0.2)],
      [...vertices, vertices[1]],
      [p(91, 0), p(0, 0.1), p(0.1, 0)],
      [p(0, 0), p(0, 2), p(0.1, 0)],
      [{ latitude: "0", longitude: 0 }, p(0, 0.1), p(0.1, 0)],
    ]
  ) throws(() => parsePolygon(value));
});

Deno.test("konfigurasi poligon, kualitas GPS dan kompatibilitas lingkaran", (): void => {
  const area = museumAreaFromEnvironment(environment)!;
  const location = { ...reference, accuracyMeters: 20 };
  equal(evaluateGeofence(location, area).status, "inside");
  equal(evaluateGeofence({ ...location, accuracyMeters: 20.001 }, area).status, "low_accuracy");
  equal(evaluateGeofence({ ...location, latitude: -6.90085 }, area).status, "outside");
  equal(evaluateGeofence(null, area).fallback, "entrance_qr");
  equal(evaluateGeofence(location, null).accessAllowed, false);
  equal(
    museumAreaFromEnvironment({ ...environment, GEA_MUSEUM_RADIUS_METERS: "1" })?.polygon?.length,
    8,
  );
  for (
    const patch of [
      { GEA_MUSEUM_POLYGON_JSON: "not json" },
      { GEA_MUSEUM_POLYGON_JSON: "[]" },
      { GEA_MUSEUM_ZONE_ID: "" },
      { GEA_MUSEUM_LATITUDE: "" },
      { GEA_MUSEUM_LONGITUDE: "NaN" },
    ]
  ) throws(() => museumAreaFromEnvironment({ ...environment, ...patch }));
  const circle: MuseumArea = museumAreaFromEnvironment({
    ...environment,
    GEA_MUSEUM_POLYGON_JSON: "",
    GEA_MUSEUM_RADIUS_METERS: "10",
  })!;
  equal(evaluateGeofence(location, circle).status, "inside");
  equal(evaluateGeofence({ ...location, latitude: -6.901 }, circle).status, "outside");
});
