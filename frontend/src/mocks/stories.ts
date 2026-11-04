// DATA DUMMY untuk E4. Bukan konten museum: teks, foto, audio, dan kunci jawaban
// akan diganti data asli dari B1/B3 saat integrasi API (E7).
// Bentuk setiap objek mengikuti respons API backend (lihat backend/README.md).
import {
  type OptionLabel,
  type PoiDetail,
  type PoiSummary,
} from "../domain/contracts";
import { mockMediaUrl } from "../services/media";

export const MOCK_ZONE_ID = "20000000-0000-4000-8000-000000000001";

type MockPoi = {
  readonly nama: string;
  readonly cerita: string;
  readonly instruksi: string;
  readonly pertanyaan: string;
  readonly opsi: readonly [string, string, string, string];
  readonly kunci: OptionLabel;
  readonly hint: string;
};

const items: readonly MockPoi[] = [
  {
    nama: "Fosil Trilobita (dummy)",
    cerita:
      "Teks dummy. Trilobita adalah hewan laut purba bercangkang keras dengan tubuh tiga bagian. Fosilnya sering dipakai untuk memperkirakan umur batuan.",
    instruksi: "Amati bentuk cangkang fosil di dalam vitrin.",
    pertanyaan: "Trilobita hidup di lingkungan apa?",
    opsi: ["Gurun", "Laut", "Hutan hujan", "Gua"],
    kunci: "B",
    hint: "Perhatikan kata 'hewan laut purba' di cerita.",
  },
  {
    nama: "Batu Meteorit (dummy)",
    cerita:
      "Teks dummy. Meteorit adalah batuan dari luar angkasa yang jatuh ke Bumi. Banyak meteorit mengandung besi sehingga terasa sangat berat.",
    instruksi: "Lihat permukaan meteorit yang gelap dan mengilap.",
    pertanyaan: "Dari mana meteorit berasal?",
    opsi: ["Dasar laut", "Gunung api", "Luar angkasa", "Sungai"],
    kunci: "C",
    hint: "Meteorit jatuh dari langit.",
  },
  {
    nama: "Replika Gajah Purba (dummy)",
    cerita:
      "Teks dummy. Gajah purba pernah hidup di Pulau Jawa. Tulang-tulangnya ditemukan di lapisan tanah yang terbentuk ratusan ribu tahun lalu.",
    instruksi: "Bandingkan ukuran gading dengan tinggi badanmu.",
    pertanyaan: "Bagian tubuh apa yang paling menonjol pada replika ini?",
    opsi: ["Gading", "Sayap", "Sirip", "Cangkang"],
    kunci: "A",
    hint: "Gajah memakai bagian ini untuk menggali dan membela diri.",
  },
  {
    nama: "Kristal Kuarsa (dummy)",
    cerita:
      "Teks dummy. Kuarsa adalah mineral yang sangat umum di kerak Bumi. Kristalnya berbentuk prisma bersisi enam dan bisa bening seperti kaca.",
    instruksi: "Hitung sisi pada salah satu kristal kuarsa.",
    pertanyaan: "Berapa sisi yang dimiliki prisma kristal kuarsa?",
    opsi: ["Tiga", "Empat", "Lima", "Enam"],
    kunci: "D",
    hint: "Jumlahnya sama dengan sisi pada sarang lebah.",
  },
  {
    nama: "Batuan Vulkanik (dummy)",
    cerita:
      "Teks dummy. Batuan vulkanik terbentuk dari lava yang mendingin. Lubang kecil di permukaannya berasal dari gas yang terperangkap.",
    instruksi: "Cari lubang-lubang kecil di permukaan batu.",
    pertanyaan: "Batuan vulkanik terbentuk dari apa?",
    opsi: ["Lava yang mendingin", "Pasir pantai", "Kayu yang membatu", "Es"],
    kunci: "A",
    hint: "Lihat kembali kalimat pertama cerita.",
  },
  {
    nama: "Peta Gunung Api (dummy)",
    cerita:
      "Teks dummy. Indonesia berada di Cincin Api Pasifik sehingga memiliki banyak gunung api aktif. Peta ini menunjukkan sebarannya.",
    instruksi: "Temukan pulau tempat museum ini berada di peta.",
    pertanyaan: "Mengapa Indonesia punya banyak gunung api?",
    opsi: [
      "Dekat kutub",
      "Berada di Cincin Api Pasifik",
      "Banyak sungai",
      "Iklim tropis",
    ],
    kunci: "B",
    hint: "Ada nama 'cincin' di cerita.",
  },
];

function id(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export const mockPoiId = (n: number): string => id("30000000", n);
export const mockQuestId = (n: number): string => id("40000000", n);

/** Token QR koleksi dummy (64 hex), sama polanya dengan fixture backend. */
export const mockPoiToken = (n: number): string => String(n).repeat(64);

export const mockPoiSummaries: readonly PoiSummary[] = items.map(
  (item: MockPoi, index: number): PoiSummary => ({
    id_poi: mockPoiId(index + 1),
    nama: item.nama,
    photoUrl: mockMediaUrl("/photo.png"),
    estimasi_durasi: 5,
  }),
);

export const mockPoiDetails: readonly PoiDetail[] = items.map(
  (item: MockPoi, index: number): PoiDetail => ({
    id_poi: mockPoiId(index + 1),
    id_zona: MOCK_ZONE_ID,
    nama: item.nama,
    path_foto: "mock/photo.png",
    denah_x: index + 1,
    denah_y: index + 1,
    prioritas: index + 1,
    estimasi_durasi: 5,
    language: "id",
    profile: "umum",
    cards: [
      {
        type: "description",
        text: item.cerita,
        photoUrl: mockMediaUrl("/photo.png"),
      },
      {
        type: "audio",
        audioUrl: mockMediaUrl("/narasi.wav"),
        durationSeconds: 30,
      },
    ],
    quest: {
      idQuest: mockQuestId(index + 1),
      type: "pilgan",
      instruksi: item.instruksi,
      pertanyaan: item.pertanyaan,
      options: (["A", "B", "C", "D"] as const).map((
        label: OptionLabel,
        optionIndex: number,
      ) => ({ label_opsi: label, teks_opsi: item.opsi[optionIndex] ?? "" })),
    },
  }),
);

/** Hanya dipakai sumber data mock untuk menilai jawaban, meniru server. Tidak dikirim ke layar. */
export const mockAnswerKeys: ReadonlyMap<
  string,
  { readonly kunci: OptionLabel; readonly hint: string }
> = new Map(
  items.map((item: MockPoi, index: number) => [
    mockQuestId(index + 1),
    { kunci: item.kunci, hint: item.hint },
  ]),
);
