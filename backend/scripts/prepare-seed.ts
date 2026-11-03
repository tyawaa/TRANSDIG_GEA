import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { validateCoordinate } from "../supabase/functions/gea-api/geofence.ts";
import {
  finiteNumber,
  type JsonObject,
  language,
  object,
  optionLabel,
  profile,
  text,
  uuid,
} from "../supabase/functions/gea-api/validation.ts";

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} harus berupa array.`);
  return value;
}

function integer(value: unknown, field: string, minimum: number, maximum: number): number {
  const result: number = finiteNumber(value, field);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new ValidationError(`${field} harus bilangan bulat ${minimum}..${maximum}.`);
  }
  return result;
}

function quote(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}

function path(value: unknown, field: string): string {
  const result: string = text(value, field, 1024);
  if (!/^(images|audio)\/[a-zA-Z0-9_./-]+$/.test(result) || result.split("/").includes("..")) {
    throw new ValidationError(
      `${field} harus object path di images/ atau audio/, tanpa traversal.`,
    );
  }
  return result;
}

function zoneSql(value: unknown): string {
  const zone: JsonObject = object(value, "zone");
  const coordinate = validateCoordinate({
    latitude: finiteNumber(zone.latitude, "zone.latitude"),
    longitude: finiteNumber(zone.longitude, "zone.longitude"),
  });
  const radius: number = finiteNumber(zone.radiusMeters, "zone.radiusMeters");
  if (radius <= 0) throw new ValidationError("zone.radiusMeters harus positif.");
  return `insert into public.zona(id_zona,nama,latitude,longitude,radius) values (${
    quote(uuid(zone.idZona, "zone.idZona"))
  },${
    quote(text(zone.name, "zone.name", 200))
  },${coordinate.latitude},${coordinate.longitude},${radius});`;
}

function poiSql(value: unknown, selectedLanguage: string, selectedProfile: string): string {
  const poi: JsonObject = object(value, "poi");
  const idPoi: string = uuid(poi.idPoi, "poi.idPoi");
  const idQuest: string = uuid(poi.idQuest, "poi.idQuest");
  const description: string = text(poi.description, "poi.description", 10000);
  if (description.trim().split(/\s+/).length > 100) {
    throw new ValidationError(`Deskripsi ${idPoi} melebihi 100 kata.`);
  }
  const question: JsonObject = object(poi.question, "poi.question");
  const options: readonly JsonObject[] = array(question.options, "question.options").map(
    (value: unknown): JsonObject => object(value, "option"),
  );
  const labels: readonly string[] = options.map((option: JsonObject): string =>
    optionLabel(option.label)
  );
  if (
    options.length !== 4 || new Set(labels).size !== 4 || options.filter(
        (option: JsonObject): boolean => option.correct === true,
      ).length !== 1 ||
    options.some((option: JsonObject): boolean => typeof option.correct !== "boolean")
  ) {
    throw new ValidationError(
      `Quest ${idQuest} harus punya opsi A-D dan tepat satu kunci boolean.`,
    );
  }
  const photoPath: string = path(poi.photoPath, "photoPath");
  const audioPath: string = path(poi.audioPath, "audioPath");
  if (!photoPath.startsWith("images/") || !audioPath.startsWith("audio/")) {
    throw new ValidationError("Foto harus di images/ dan narasi harus di audio/.");
  }
  const statements: readonly string[] = [
    `insert into public.poi(id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi) values (${
      quote(idPoi)
    },${quote(uuid(poi.idZona, "idZona"))},${quote(text(poi.name, "name", 200))},${
      quote(photoPath)
    },${integer(poi.denahX, "denahX", 0, 100000)},${integer(poi.denahY, "denahY", 0, 100000)},${
      integer(poi.priority, "priority", 0, 1000)
    },${integer(poi.estimatedMinutes, "estimatedMinutes", 1, 1440)});`,
    `insert into public.konten(id_poi,bahasa,profil,teks_cerita,path_audio,durasi_audio) values (${
      quote(idPoi)
    },${quote(selectedLanguage)},${quote(selectedProfile)},${quote(description)},${
      quote(audioPath)
    },${integer(poi.audioDurationSeconds, "audioDurationSeconds", 30, 90)});`,
    `insert into public.quest(id_quest,id_poi,tipe_quest) values (${quote(idQuest)},${
      quote(idPoi)
    },'pilgan');`,
    `insert into public.quest_teks(id_quest,bahasa,profil,instruksi,pertanyaan,hint) values (${
      quote(idQuest)
    },${quote(selectedLanguage)},${quote(selectedProfile)},${
      quote(text(question.instruction, "instruction", 2000))
    },${quote(text(question.prompt, "prompt", 2000))},${
      quote(text(question.hint, "hint", 2000))
    });`,
    ...options.flatMap((option: JsonObject): readonly string[] => [
      `insert into public.quest_opsi(id_quest,label_opsi,is_correct) values (${quote(idQuest)},${
        quote(optionLabel(option.label))
      },${option.correct});`,
      `insert into public.quest_opsi_text(id_quest,label_opsi,bahasa,teks_opsi) values (${
        quote(idQuest)
      },${quote(optionLabel(option.label))},${quote(selectedLanguage)},${
        quote(text(option.text, "option.text", 2000))
      });`,
    ]),
    `update public.poi set is_published=true where id_poi=${quote(idPoi)};`,
  ];
  return statements.join("\n");
}

/** Menghasilkan seed awal, satu varian bahasa/profil. Tidak menulis database atau media. */
export function prepareInitialSeed(value: unknown): string {
  const dataset: JsonObject = object(value, "dataset");
  if (dataset.approved !== true) {
    throw new ValidationError("Konten belum disetujui PM: approved harus true.");
  }
  const selectedLanguage: string = language(dataset.language);
  const selectedProfile: string = profile(dataset.profile);
  const zones: readonly unknown[] = array(dataset.zones, "zones");
  const pois: readonly unknown[] = array(dataset.pois, "pois");
  if (zones.length === 0 || pois.length !== 6) {
    throw new ValidationError("Seed sprint harus memiliki minimal satu zona dan tepat enam POI.");
  }
  return [
    "-- Seed awal enam POI yang telah disetujui. Media wajib diunggah terpisah.",
    ...zones.map(zoneSql),
    ...pois.map((poi: unknown): string => poiSql(poi, selectedLanguage, selectedProfile)),
  ].join("\n\n") + "\n";
}

if (import.meta.main) {
  const [input, output]: string[] = Deno.args;
  if (input === undefined || output === undefined || Deno.args.length !== 2) {
    throw new ValidationError(
      "Jalankan: npm run seed:prepare -- input.json supabase/migrations/TIMESTAMP_approved_pois.sql",
    );
  }
  const parsed: unknown = JSON.parse(await Deno.readTextFile(input));
  const sql: string = prepareInitialSeed(parsed);
  await Deno.writeTextFile(output, sql, { createNew: true });
  console.log(JSON.stringify({ event: "seed_prepared", output, poiCount: 6 }));
}
