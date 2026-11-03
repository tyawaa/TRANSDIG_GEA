import {
  evaluateGeofence,
  type Location,
  type MuseumArea,
} from "../supabase/functions/gea-api/geofence.ts";

const simulationArea: MuseumArea = {
  latitude: 0,
  longitude: 0,
  radiusMeters: 100,
  zoneId: "20000000-0000-4000-8000-000000000001",
};
const scenarios: readonly { readonly name: string; readonly location: Location | null }[] = [
  {
    name: "SIMULASI: tepat pusat, akurasi 20m",
    location: { latitude: 0, longitude: 0, accuracyMeters: 20 },
  },
  { name: "SIMULASI: di luar area", location: { latitude: 0, longitude: 0.01, accuracyMeters: 5 } },
  { name: "SIMULASI: GPS lemah", location: { latitude: 0, longitude: 0.01, accuracyMeters: 30 } },
  { name: "SIMULASI: GPS tidak tersedia", location: null },
];
for (const scenario of scenarios) {
  console.log(
    JSON.stringify(
      { scenario: scenario.name, decision: evaluateGeofence(scenario.location, simulationArea) },
      null,
      2,
    ),
  );
}
console.log(
  JSON.stringify(
    {
      scenario: "Produksi belum dikonfigurasi",
      decision: evaluateGeofence({ latitude: 0, longitude: 0, accuracyMeters: 5 }, null),
    },
    null,
    2,
  ),
);
