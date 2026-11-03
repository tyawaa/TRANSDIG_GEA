import { ApiError } from "./errors.ts";
import { SupabaseGateway } from "./supabase.ts";
import { type JsonObject, type Language, type Profile, text, uuid } from "./validation.ts";

function requireSingle(rows: readonly JsonObject[], code: string): JsonObject {
  const row: JsonObject | undefined = rows[0];
  if (row === undefined) {
    throw new ApiError(404, code, "Data atau varian bahasa/profil belum tersedia.");
  }
  if (rows.length !== 1) {
    throw new ApiError(503, "DATA_INCONSISTENT", "Ditemukan data tunggal yang ganda.");
  }
  return row;
}

export async function listPois(gateway: SupabaseGateway): Promise<readonly JsonObject[]> {
  const rows: readonly JsonObject[] = await gateway.query(
    "poi",
    new URLSearchParams({
      select: "id_poi,id_zona,nama,path_foto,prioritas,estimasi_durasi,denah_x,denah_y",
      is_published: "eq.true",
      order: "prioritas.asc,id_poi.asc",
      limit: "100",
    }),
  );
  return rows.map((row: JsonObject): JsonObject => ({
    ...row,
    photoUrl: gateway.mediaUrl(text(row.path_foto, "path_foto", 1024)),
  }));
}

export async function poiDetail(
  gateway: SupabaseGateway,
  poiId: string,
  language: Language,
  profile: Profile,
): Promise<JsonObject> {
  const [pois, contents, quests]: [
    readonly JsonObject[],
    readonly JsonObject[],
    readonly JsonObject[],
  ] = await Promise.all([
    gateway.query(
      "poi",
      new URLSearchParams({
        select: "id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi",
        id_poi: `eq.${poiId}`,
        is_published: "eq.true",
      }),
    ),
    gateway.query(
      "konten",
      new URLSearchParams({
        select: "teks_cerita,path_audio,durasi_audio",
        id_poi: `eq.${poiId}`,
        bahasa: `eq.${language}`,
        profil: `eq.${profile}`,
      }),
    ),
    gateway.query(
      "quest",
      new URLSearchParams({ select: "id_quest,tipe_quest", id_poi: `eq.${poiId}` }),
    ),
  ]);
  const poi: JsonObject = requireSingle(pois, "POI_NOT_FOUND");
  const content: JsonObject = requireSingle(contents, "CONTENT_VARIANT_NOT_AVAILABLE");
  const quest: JsonObject = requireSingle(quests, "QUEST_NOT_AVAILABLE");
  const questId: string = uuid(quest.id_quest, "id_quest");
  const [questions, options]: [readonly JsonObject[], readonly JsonObject[]] = await Promise.all([
    gateway.query(
      "quest_teks",
      new URLSearchParams({
        select: "instruksi,pertanyaan",
        id_quest: `eq.${questId}`,
        bahasa: `eq.${language}`,
        profil: `eq.${profile}`,
      }),
    ),
    gateway.query(
      "quest_opsi_text",
      new URLSearchParams({
        select: "label_opsi,teks_opsi",
        id_quest: `eq.${questId}`,
        bahasa: `eq.${language}`,
        order: "label_opsi.asc",
      }),
    ),
  ]);
  const question: JsonObject = requireSingle(questions, "QUEST_VARIANT_NOT_AVAILABLE");
  if (options.length !== 4) {
    throw new ApiError(
      503,
      "QUEST_OPTIONS_INCOMPLETE",
      "Quest harus memiliki tepat empat opsi terjemahan.",
    );
  }
  return {
    ...poi,
    language,
    profile,
    cards: [
      {
        type: "description",
        text: content.teks_cerita,
        photoUrl: gateway.mediaUrl(text(poi.path_foto, "path_foto", 1024)),
      },
      {
        type: "audio",
        audioUrl: gateway.mediaUrl(text(content.path_audio, "path_audio", 1024)),
        durationSeconds: content.durasi_audio,
      },
    ],
    quest: { idQuest: questId, type: quest.tipe_quest, ...question, options },
  };
}

export async function sha256(value: string): Promise<string> {
  const buffer: ArrayBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buffer)).map(
    (byte: number): string => byte.toString(16).padStart(2, "0"),
  ).join("");
}
