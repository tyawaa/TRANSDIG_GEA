import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative(),
});
export type DeviceLocation = z.infer<typeof locationSchema>;

export const accessDecisionSchema = z.object({
  status: z.enum([
    "inside",
    "outside",
    "low_accuracy",
    "location_unavailable",
    "not_configured",
  ]),
  accessAllowed: z.boolean(),
  distanceMeters: z.number().finite().nonnegative().nullable(),
  accuracyMeters: z.number().finite().nonnegative().nullable(),
  fallback: z.enum(["entrance_qr"]).nullable(),
  reasonCode: z.string(),
});
export type AccessDecision = z.infer<typeof accessDecisionSchema>;

export const healthSchema = z.object({
  service: z.literal("gea-api"),
  museumConfigured: z.boolean(),
});
export type BackendHealth = z.infer<typeof healthSchema>;

export const visitSchema = z.object({
  id_sesi: z.uuid(),
  bahasa: z.enum(["id", "en"]),
  profil: z.enum(["umum", "pelajar"]),
  verification_method: z.enum(["gps", "entrance_qr"]),
  status: z.literal("aktif"),
});
export type Visit = z.infer<typeof visitSchema>;

export const poiSchema = z.object({
  id_poi: z.uuid(),
  nama: z.string(),
  photoUrl: z.url(),
  estimasi_durasi: z.number().int().positive(),
});
export const poiListSchema = z.array(poiSchema);
export type PoiSummary = z.infer<typeof poiSchema>;

export type DecisionMessage = {
  readonly title: string;
  readonly description: string;
};

export function decisionMessage(decision: AccessDecision): DecisionMessage {
  switch (decision.status) {
    case "inside":
      return {
        title: "Kamu berada di area museum",
        description: "Lokasi berhasil diperiksa. Kunjunganmu bisa dimulai.",
      };
    case "outside":
      return {
        title: "Belum berada di area museum",
        description: "Datang ke area museum, lalu periksa lokasimu kembali.",
      };
    case "low_accuracy":
      return {
        title: "Lokasi belum cukup akurat",
        description:
          "GPS belum bisa memastikan posisimu. Gunakan QR di pintu masuk.",
      };
    case "location_unavailable":
      return {
        title: "Lokasi belum tersedia",
        description:
          "Aktifkan lokasi perangkat atau gunakan QR di pintu masuk.",
      };
    case "not_configured":
      return {
        title: "Pengecekan lokasi belum tersedia",
        description:
          "Batas area museum belum ditetapkan. Gunakan QR pintu masuk yang diterbitkan museum.",
      };
  }
}
