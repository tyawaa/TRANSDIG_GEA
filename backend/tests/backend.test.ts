import { deepStrictEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { prepareInitialSeed } from "../scripts/prepare-seed.ts";
import { handleRequest } from "../supabase/functions/gea-api/app.ts";
import {
  type BackendConfig,
  museumAreaFromEnvironment,
} from "../supabase/functions/gea-api/config.ts";
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  evaluateGeofence,
  haversineMeters,
  type Location,
  type MuseumArea,
  parseLocation,
} from "../supabase/functions/gea-api/geofence.ts";
import { type JsonObject, object } from "../supabase/functions/gea-api/validation.ts";

const AREA: MuseumArea = {
  latitude: 0,
  longitude: 0,
  radiusMeters: 100,
  zoneId: "20000000-0000-4000-8000-000000000001",
};
const CENTER: Location = { latitude: 0, longitude: 0, accuracyMeters: 20 };

Deno.test("geofence simulasi: pusat, batas inklusif, luar, dan kualitas GPS", (): void => {
  equal(haversineMeters(AREA, AREA), 0);
  equal(evaluateGeofence(CENTER, AREA).status, "inside");
  const boundary: Location = { latitude: 0, longitude: 0.001, accuracyMeters: 0 };
  const radius: number = haversineMeters(AREA, boundary);
  equal(evaluateGeofence(boundary, { ...AREA, radiusMeters: radius }).accessAllowed, true);
  equal(evaluateGeofence(boundary, { ...AREA, radiusMeters: radius - 0.01 }).status, "outside");
  const poor: Location = { ...boundary, accuracyMeters: 20.001 };
  equal(evaluateGeofence(poor, AREA).status, "low_accuracy");
  equal(evaluateGeofence(poor, AREA).fallback, "entrance_qr");
  equal(evaluateGeofence(poor, AREA).accessAllowed, false);
  equal(evaluateGeofence(null, AREA).status, "location_unavailable");
  equal(evaluateGeofence(CENTER, null).status, "not_configured");
  equal(evaluateGeofence(CENTER, null).accessAllowed, false);
});

Deno.test("input GPS tidak valid berbeda dari lokasi tidak tersedia", (): void => {
  for (
    const value of [
      undefined,
      {},
      { ...CENTER, latitude: 91 },
      { ...CENTER, longitude: -181 },
      { ...CENTER, accuracyMeters: -1 },
      { ...CENTER, accuracyMeters: NaN },
      { ...CENTER, latitude: Infinity },
      { ...CENTER, accuracyMeters: "20" },
    ]
  ) {
    throws((): Location | null => parseLocation(value), ValidationError);
  }
  equal(parseLocation(null), null);
  equal(museumAreaFromEnvironment({}), null);
  equal(museumAreaFromEnvironment({ GEA_MUSEUM_LATITUDE: "0" }), null);
  throws((): MuseumArea | null =>
    museumAreaFromEnvironment({
      GEA_MUSEUM_LATITUDE: "91",
      GEA_MUSEUM_LONGITUDE: "0",
      GEA_MUSEUM_RADIUS_METERS: "100",
      GEA_MUSEUM_ZONE_ID: AREA.zoneId,
    })
  );
});

Deno.test("HTTP: health, CORS, dan token wajib tanpa akses layanan eksternal", async (): Promise<void> => {
  const config: BackendConfig = {
    supabaseUrl: "https://example.invalid",
    anonKey: "test",
    serviceRoleKey: "test",
    museumArea: null,
    allowedOrigins: ["http://localhost:8081"],
  };
  const health: Response = await handleRequest(
    new Request("http://localhost/gea-api/health"),
    config,
  );
  equal(health.status, 200);
  equal(object(object(await health.json(), "health").data, "data").museumConfigured, false);
  const unauthorized: Response = await handleRequest(
    new Request("http://localhost/gea-api/pois"),
    config,
  );
  equal(unauthorized.status, 401);
  const forbidden: Response = await handleRequest(
    new Request("http://localhost/gea-api/health", {
      headers: { origin: "https://untrusted.invalid" },
    }),
    config,
  );
  equal(forbidden.status, 403);
  const preflight: Response = await handleRequest(
    new Request("http://localhost/gea-api/pois", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:8081" },
    }),
    config,
  );
  equal(preflight.status, 204);
  equal(preflight.headers.get("access-control-allow-origin"), "http://localhost:8081");
});

async function resultObject(database: PGlite, sql: string, params: string[]): Promise<JsonObject> {
  const result = await database.query(sql, params);
  return object(object(result.rows[0], "SQL row").result, "SQL result");
}

Deno.test("integrasi SQL: migrasi, enam POI, hak akses, QR, jawaban, idempotensi, progres", async (test: Deno.TestContext): Promise<void> => {
  const database: PGlite = new PGlite();
  try {
    await database.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,
        file_size_limit bigint,allowed_mime_types text[]);
      grant usage on schema public to service_role;
    `);
    const migrations: string[] = [];
    for await (const entry of Deno.readDir(new URL("../supabase/migrations/", import.meta.url))) {
      if (entry.name.endsWith(".sql")) migrations.push(entry.name);
    }
    for (const migration of migrations.sort()) {
      await database.exec(
        await Deno.readTextFile(new URL(`../supabase/migrations/${migration}`, import.meta.url)),
      );
    }
    await database.exec(
      await Deno.readTextFile(new URL("./fixtures/stories.sql", import.meta.url)),
    );
    const userId: string = "10000000-0000-4000-8000-000000000001";
    const otherUserId: string = "10000000-0000-4000-8000-000000000002";
    const visitId: string = "50000000-0000-4000-8000-000000000001";
    const questId: string = "40000000-0000-4000-8000-000000000001";
    const requestId: string = "60000000-0000-4000-8000-000000000001";
    await test.step("generator seed menolak draft dan SQL hasilnya bisa dimigrasikan", async (): Promise<void> => {
      const template: unknown = JSON.parse(
        await Deno.readTextFile(new URL("../data/poi-template.json", import.meta.url)),
      );
      throws((): string => prepareInitialSeed(template), /belum disetujui/);
      const generated: string = prepareInitialSeed({
        approved: true,
        language: "id",
        profile: "umum",
        zones: [{
          idZona: "21000000-0000-4000-8000-000000000001",
          name: "SIMULASI",
          latitude: 0,
          longitude: 0,
          radiusMeters: 10,
        }],
        pois: Array.from({ length: 6 }, (_value: unknown, index: number): JsonObject => ({
          idPoi: `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          idQuest: `41000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          idZona: "21000000-0000-4000-8000-000000000001",
          name: "SIMULASI 'seed'",
          photoPath: "images/simulation.jpg",
          audioPath: "audio/simulation.mp3",
          audioDurationSeconds: 45,
          denahX: 1,
          denahY: 1,
          priority: index,
          estimatedMinutes: 5,
          description: "Hanya simulasi.",
          question: {
            instruction: "Amati simulasi.",
            prompt: "Pilih A.",
            hint: "Simulasi.",
            options: ["A", "B", "C", "D"].map((label: string): JsonObject => ({
              label,
              text: `Pilihan ${label}`,
              correct: label === "A",
            })),
          },
        })),
      });
      await database.exec("begin");
      try {
        await database.exec(generated);
        const result = await database.query(
          "select count(*)::int as count from public.poi where is_published",
        );
        equal(object(result.rows[0], "count").count, 12);
      } finally {
        await database.exec("rollback");
      }
    });
    await test.step("enam paket Stories lengkap dan media bucket", async (): Promise<void> => {
      const result = await database.query(
        "select count(*)::int as count from public.poi where is_published",
      );
      equal(object(result.rows[0], "count").count, 6);
      await rejects(database.exec("update public.konten set durasi_audio=10"), /check constraint/);
      await rejects(
        database.exec("update public.quest_opsi set is_correct=true where label_opsi='B'"),
        /unique constraint/,
      );
      await rejects(
        database.exec(
          `insert into public.poi(id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi,is_published)
        values ('30000000-0000-4000-8000-000000000099','20000000-0000-4000-8000-000000000001','Tidak lengkap','x.jpg',0,0,1,5,true)`,
        ),
        /POI_STORIES_INCOMPLETE/,
      );
    });
    await test.step("client tidak dapat membaca kunci atau memanggil RPC internal", async (): Promise<void> => {
      await database.exec("set role authenticated");
      await rejects(database.exec("select * from public.quest_opsi"), /permission denied/);
      await rejects(
        database.query("select public.progres_kunjungan($1,$2)", [userId, visitId]),
        /permission denied/,
      );
      await database.exec("reset role; set role service_role");
    });
    await test.step("QR pintu masuk valid membuka sesi, QR invalid ditolak", async (): Promise<void> => {
      await rejects(
        database.query("select public.buat_sesi_qr($1,$2,$3,'id','umum')", [
          userId,
          visitId,
          "invalid",
        ]),
        /ENTRANCE_QR_INVALID/,
      );
      const visit: JsonObject = await resultObject(
        database,
        "select public.buat_sesi_qr($1,$2,$3,'id','umum') as result",
        [userId, visitId, "a".repeat(64)],
      );
      equal(visit.id_sesi, visitId);
      equal(visit.verification_method, "entrance_qr");
      equal("user_id" in visit, false);
      const repeated: JsonObject = await resultObject(
        database,
        "select public.buat_sesi_qr($1,$2,$3,'id','umum') as result",
        [userId, visitId, "a".repeat(64)],
      );
      deepStrictEqual(repeated, visit);
    });
    await test.step("kepemilikan sesi dan verifikasi checkpoint diwajibkan", async (): Promise<void> => {
      await rejects(
        database.query("select public.progres_kunjungan($1,$2)", [otherUserId, visitId]),
        /SESSION_NOT_FOUND/,
      );
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userId,
          visitId,
          questId,
          requestId,
        ]),
        /CHECKPOINT_VERIFICATION_REQUIRED/,
      );
      const receipt: JsonObject = await resultObject(
        database,
        "select public.verifikasi_qr_poi($1,$2,$3) as result",
        [userId, visitId, "1".repeat(64)],
      );
      equal(receipt.verified, true);
      await rejects(
        database.query("select public.verifikasi_qr_poi($1,$2,$3)", [
          userId,
          visitId,
          "a".repeat(64),
        ]),
        /POI_QR_INVALID/,
      );
    });
    await test.step("jawaban salah disimpan, request ulang tidak menggandakan hitungan", async (): Promise<void> => {
      const wrong: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userId, visitId, questId, requestId],
      );
      equal(wrong.answerCorrect, false);
      equal(wrong.attemptCount, 1);
      equal(wrong.hint, "Petunjuk simulasi.");
      const repeated: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userId, visitId, questId, requestId],
      );
      deepStrictEqual(repeated, wrong);
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'A',$4)", [
          userId,
          visitId,
          questId,
          requestId,
        ]),
        /IDEMPOTENCY_CONFLICT/,
      );
    });
    await test.step("jawaban benar menyelesaikan quest; percobaan berikutnya ditolak", async (): Promise<void> => {
      const correct: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'A',$4) as result",
        [userId, visitId, questId, crypto.randomUUID()],
      );
      equal(correct.completed, true);
      equal(correct.attemptCount, 2);
      equal(correct.hint, null);
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userId,
          visitId,
          questId,
          crypto.randomUUID(),
        ]),
        /QUEST_ALREADY_COMPLETED/,
      );
      const result: JsonObject = await resultObject(
        database,
        "select public.progres_kunjungan($1,$2) as result",
        [userId, visitId],
      );
      ok(Array.isArray(result.quests));
      equal(result.quests.length, 1);
      equal(object(result.quests[0], "progress").answer_correct, true);
    });
    await test.step("QR kedaluwarsa dan bukti checkpoint kedaluwarsa ditolak", async (): Promise<void> => {
      await database.exec("update private.qr_tokens set expires_at=now()-interval '1 second'");
      await rejects(
        database.query("select public.verifikasi_qr_poi($1,$2,$3)", [
          userId,
          visitId,
          "1".repeat(64),
        ]),
        /POI_QR_INVALID/,
      );
      await database.exec(
        "update private.poi_verification set expires_at=now()-interval '1 second'",
      );
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'A',$4)", [
          userId,
          visitId,
          questId,
          crypto.randomUUID(),
        ]),
        /CHECKPOINT_VERIFICATION_REQUIRED/,
      );
    });
  } finally {
    await database.close();
  }
});
