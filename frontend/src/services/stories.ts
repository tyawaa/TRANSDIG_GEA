import {
  type AnswerResult,
  answerResultSchema,
  type ClosedCard,
  closedCardSchema,
  type Language,
  type OptionLabel,
  type PoiDetail,
  poiDetailSchema,
  poiListSchema,
  type PoiSummary,
  type PoiVerification,
  poiVerificationSchema,
  type Profile,
} from "../domain/contracts";
import {
  mockAnswerKeys,
  mockPoiDetails,
  mockPoiSummaries,
  mockPoiToken,
} from "../mocks/stories";
import { GeaApi, GeaServiceError } from "./api";

/**
 * Sumber data layar Stories. E4 memakai mock; E7 cukup menambah implementasi
 * berbasis GeaApi dengan method yang sama, tanpa mengubah layar.
 */
export interface StoriesSource {
  readonly kind: "mock" | "api";
  pois(): Promise<readonly PoiSummary[]>;
  poiDetail(
    idPoi: string,
    language: Language,
    profile: Profile,
  ): Promise<PoiDetail>;
  verifyPoiQr(
    idSesi: string,
    token: string,
    language: Language,
    profile: Profile,
  ): Promise<PoiVerification>;
  answerQuest(
    idSesi: string,
    idQuest: string,
    requestId: string,
    labelOpsi: OptionLabel,
  ): Promise<AnswerResult>;
  closeCard(idSesi: string, idPoi: string): Promise<ClosedCard>;
}

const VERIFICATION_MINUTES = 15;

function delay(): Promise<void> {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, 250);
  });
}

/** Meniru aturan backend: QR koleksi wajib sebelum quest, retry idempoten, quest selesai = 409. */
export class MockStoriesSource implements StoriesSource {
  readonly kind = "mock" as const;
  private readonly verifiedUntil = new Map<string, number>();
  private readonly attempts = new Map<string, number>();
  private readonly completed = new Set<string>();
  private readonly responses = new Map<string, AnswerResult>();

  async pois(): Promise<readonly PoiSummary[]> {
    await delay();
    return poiListSchema.parse(mockPoiSummaries);
  }

  async poiDetail(idPoi: string): Promise<PoiDetail> {
    await delay();
    return poiDetailSchema.parse(this.findPoi(idPoi));
  }

  async verifyPoiQr(idSesi: string, token: string): Promise<PoiVerification> {
    await delay();
    const index: number = mockPoiDetails.findIndex(
      (_poi: PoiDetail, i: number): boolean => mockPoiToken(i + 1) === token,
    );
    const poi: PoiDetail | undefined = mockPoiDetails[index];
    if (poi === undefined) {
      throw new GeaServiceError(403, "POI_QR_INVALID", "QR koleksi tidak valid.");
    }
    const expiresAt: number = Date.now() + VERIFICATION_MINUTES * 60_000;
    this.verifiedUntil.set(`${idSesi}:${poi.id_poi}`, expiresAt);
    return poiVerificationSchema.parse({
      idPoi: poi.id_poi,
      verified: true,
      expiresAt: new Date(expiresAt).toISOString(),
      poi,
    });
  }

  async answerQuest(
    idSesi: string,
    idQuest: string,
    requestId: string,
    labelOpsi: OptionLabel,
  ): Promise<AnswerResult> {
    await delay();
    const repeated: AnswerResult | undefined = this.responses.get(
      `${idSesi}:${requestId}`,
    );
    if (repeated !== undefined) return repeated;
    const poi: PoiDetail | undefined = mockPoiDetails.find(
      (item: PoiDetail): boolean => item.quest.idQuest === idQuest,
    );
    const key = mockAnswerKeys.get(idQuest);
    if (poi === undefined || key === undefined) {
      throw new GeaServiceError(404, "QUEST_NOT_FOUND", "Quest tidak ditemukan.");
    }
    const until: number | undefined = this.verifiedUntil.get(
      `${idSesi}:${poi.id_poi}`,
    );
    if (until === undefined || until < Date.now()) {
      throw new GeaServiceError(
        403,
        "CHECKPOINT_VERIFICATION_REQUIRED",
        "Scan QR koleksi sebelum menjawab.",
      );
    }
    const questKey: string = `${idSesi}:${idQuest}`;
    if (this.completed.has(questKey)) {
      throw new GeaServiceError(409, "QUEST_ALREADY_COMPLETED", "Quest sudah selesai.");
    }
    const attemptCount: number = (this.attempts.get(questKey) ?? 0) + 1;
    this.attempts.set(questKey, attemptCount);
    const correct: boolean = labelOpsi === key.kunci;
    if (correct) this.completed.add(questKey);
    const result: AnswerResult = answerResultSchema.parse({
      idQuest,
      idPoi: poi.id_poi,
      answerCorrect: correct,
      attemptCount,
      completed: correct,
      hint: correct ? null : key.hint,
    });
    this.responses.set(`${idSesi}:${requestId}`, result);
    return result;
  }

  async closeCard(_idSesi: string, idPoi: string): Promise<ClosedCard> {
    await delay();
    this.findPoi(idPoi);
    return closedCardSchema.parse({ idPoi, statusKartu: "ditutup" });
  }

  private findPoi(idPoi: string): PoiDetail {
    const poi: PoiDetail | undefined = mockPoiDetails.find(
      (item: PoiDetail): boolean => item.id_poi === idPoi,
    );
    if (poi === undefined) {
      throw new GeaServiceError(404, "POI_NOT_FOUND", "Koleksi tidak ditemukan.");
    }
    return poi;
  }
}

/** E7: sumber data asli. Semua aturan (QR koleksi, penilaian, hint) diputuskan backend. */
export class ApiStoriesSource implements StoriesSource {
  readonly kind = "api" as const;

  constructor(private readonly api: GeaApi) {}

  pois(): Promise<readonly PoiSummary[]> {
    return this.api.pois();
  }

  poiDetail(
    idPoi: string,
    language: Language,
    profile: Profile,
  ): Promise<PoiDetail> {
    return this.api.poiDetail(idPoi, language, profile);
  }

  verifyPoiQr(
    idSesi: string,
    token: string,
    language: Language,
    profile: Profile,
  ): Promise<PoiVerification> {
    return this.api.verifyPoiQr(idSesi, token, language, profile);
  }

  answerQuest(
    idSesi: string,
    idQuest: string,
    requestId: string,
    labelOpsi: OptionLabel,
  ): Promise<AnswerResult> {
    return this.api.answerQuest(idSesi, idQuest, requestId, labelOpsi);
  }

  closeCard(idSesi: string, idPoi: string): Promise<ClosedCard> {
    return this.api.closeCard(idSesi, idPoi);
  }
}

/** Aktifkan dengan EXPO_PUBLIC_STORIES_SOURCE=mock di .env (hanya untuk pengembangan). */
export const storiesMockEnabled: boolean =
  process.env.EXPO_PUBLIC_STORIES_SOURCE === "mock";
