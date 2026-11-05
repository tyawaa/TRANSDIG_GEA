import { randomUUID } from "expo-crypto";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SheetContent } from "../../../design/SheetModal";
import { Toast, type ToastTone } from "../../../design/Toast";
import { colors, componentColors, radius, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type {
  AnswerResult,
  OptionLabel,
  PoiDetail,
  PoiVerification,
  QuestOption,
  Visit,
} from "../../../domain/contracts";
import { GeaServiceError, readableError } from "../../../services/api";
import type { StoriesSource } from "../../../services/stories";
import { SceneLayer } from "../../onboarding/scene";
import { emptyProgress, type PoiProgress } from "../progress";
import { isiPanelLayer, StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, PhotoFrame, StoryButton } from "./parts";
import { ScanQrScreen, type ScanState } from "./ScanQrScreen";
import { StoryAudio } from "./StoryAudio";

type Step = "scan" | "loading" | "summary" | "story" | "narration" | "storyDone" | "sideQuest" | "quiz" | "questDone";

type ToastMessage = { readonly tone: ToastTone; readonly title: string; readonly description: string };

type Props = {
  readonly source: StoriesSource;
  readonly visit: Visit;
  readonly poiId: string;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly onProgress: (poiId: string, patch: Partial<PoiProgress>) => void;
  /** true bila semua POI di daftar sudah selesai (untuk splash "All done"). */
  readonly allCompleted: (justCompletedPoiId: string) => boolean;
  readonly dummyTokenFor: (poiId: string) => string | null;
  readonly onExit: () => void;
};

/**
 * Alur Story sesuai hi-fi: Scan QR → Summary → Story Isi → Story Selesai → Side Quest → kuis.
 * Kuis dan splash akhir masih SEMENTARA (frame Figma baru berisi latar).
 */
export function StoryFlow(props: Props): ReactElement {
  const { source, visit, progressOf, onProgress } = props;
  const [poiId, setPoiId] = useState<string>(props.poiId);
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const progress: PoiProgress = progressOf(poiId);
  const verified: boolean = progress.verifiedUntil !== null && progress.verifiedUntil > Date.now();
  const [step, setStep] = useState<Step>(
    progress.completed ? "loading" : verified ? "loading" : "scan",
  );
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Masuk tanpa scan (sudah selesai / masih terverifikasi): muat detail lalu ke langkah yang tepat.
  useEffect((): (() => void) | undefined => {
    if (step !== "loading") return undefined;
    let active = true;
    source.poiDetail(poiId, visit.bahasa, visit.profil).then(
      (detail: PoiDetail): void => {
        if (!active) return;
        setPoi(detail);
        setStep(progress.completed ? "questDone" : progress.closed ? "sideQuest" : "summary");
      },
      (cause: unknown): void => {
        if (active) setError(readableError(cause));
      },
    );
    return (): void => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, poiId]);

  useEffect((): (() => void) | undefined => {
    if (toast === null) return undefined;
    const timer = setTimeout((): void => setToast(null), 5000);
    return (): void => clearTimeout(timer);
  }, [toast]);

  async function verify(token: string): Promise<void> {
    if (!/^[0-9a-f]{64}$/.test(token)) {
      setScanState("failed");
      return;
    }
    setScanState("detected");
    try {
      const result: PoiVerification = await source.verifyPoiQr(visit.id_sesi, token, visit.bahasa, visit.profil);
      const until: number = Date.parse(result.expiresAt);
      onProgress(result.idPoi, { verifiedUntil: Number.isNaN(until) ? null : until });
      const state: PoiProgress = progressOf(result.idPoi);
      setPoiId(result.idPoi);
      setPoi(result.poi);
      setScanState("scanning");
      setStep(state.completed ? "questDone" : state.closed ? "sideQuest" : "summary");
    } catch (cause: unknown) {
      console.warn("gea_poi_qr_failed", { error: readableError(cause) });
      setScanState("failed");
    }
  }

  async function finishStory(): Promise<void> {
    setError(null);
    try {
      await source.closeCard(visit.id_sesi, poiId);
      onProgress(poiId, { closed: true });
      setStep("storyDone");
    } catch (cause: unknown) {
      setError(readableError(cause));
    }
  }

  if (step === "scan") {
    const dummy: string | null = props.dummyTokenFor(poiId);
    return (
      <ScanQrScreen
        state={scanState}
        onToken={(token: string): void => void verify(token)}
        onRetry={(): void => setScanState("scanning")}
        onBack={props.onExit}
        onDummy={dummy === null ? null : (): void => void verify(dummy)}
      />
    );
  }

  if (poi === null) {
    return (
      <FrameStage background={colors.primary[300]}>
        <StoryBackground />
        <BackButton onPress={props.onExit} />
        <View style={styles.centerBox}>
          {error === null
            ? <ActivityIndicator color={colors.primary[900]} />
            : <GeaText variant="body16" color={colors.black} style={styles.center}>{error}</GeaText>}
        </View>
      </FrameStage>
    );
  }

  const [description, audio] = poi.cards;

  return (
    <FrameStage background={colors.primary[300]}>
      <StoryBackground />

      {step === "summary" && (
        <>
          <BackButton onPress={props.onExit} />
          <View style={styles.summaryCard} />
          <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={28} top={157.16} box={333.654} size={{ width: 320, height: 320 }} border={15} rotate={-2.5} />
          <View style={styles.summaryContent}>
            <View style={styles.texts}>
              <GeaText variant="heading28" color={colors.primary[900]}>{poi.nama}</GeaText>
              <GeaText variant="body16Tight" color={componentColors.cardBody} numberOfLines={3}>{description.text}</GeaText>
            </View>
            <StoryButton label="Mulai Cerita" onPress={(): void => setStep("story")} />
          </View>
        </>
      )}

      {(step === "story" || step === "narration") && (
        <>
          <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={-21} top={60} box={301.076} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={-7.66} />
          <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={136} top={229} box={272.526} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={1.03} />
          <SceneLayer layer={isiPanelLayer} />
          <View style={styles.isiContent}>
            <View style={styles.texts}>
              <GeaText variant="heading28" color={colors.secondaryYellow[100]}>
                {step === "story" ? poi.nama : "Dengarkan Narasi"}
              </GeaText>
              {step === "story"
                ? (
                  <ScrollView style={styles.isiBody}>
                    <GeaText variant="body16Tight" color={colors.secondaryYellow[0]}>{description.text}</GeaText>
                  </ScrollView>
                )
                : <StoryAudio key={audio.audioUrl} audioUrl={audio.audioUrl} durationSeconds={audio.durationSeconds} />}
            </View>
            {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>}
            <View style={styles.isiNav}>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                style={styles.flex}
                onPress={(): void => setStep(step === "story" ? "summary" : "story")}
              >
                <GeaText variant="body16Tight" color={colors.secondaryYellow[100]} style={styles.link}>Kembali</GeaText>
              </Pressable>
              <StoryButton
                label="Lanjut"
                onPress={(): void => {
                  if (step === "story") setStep("narration");
                  else void finishStory();
                }}
              />
            </View>
          </View>
        </>
      )}

      {step === "storyDone" && (
        <View style={styles.sheet}>
          <SheetContent
            title="Cerita selesai!"
            description={`Kamu sudah mengenal ${poi.nama}. Sekarang selesaikan side quest di depan koleksinya.`}
            actionLabel="Lanjut ke Side Quest"
            onAction={(): void => setStep("sideQuest")}
          />
        </View>
      )}

      {step === "sideQuest" && (
        <>
          <BackButton onPress={props.onExit} />
          <View style={styles.sideCard}>
            <GeaText variant="heading28" color={colors.primary[900]} style={styles.full}>Side Quest</GeaText>
            <GeaText variant="body16Tight" color={componentColors.cardBody} style={styles.full}>{poi.quest.instruksi}</GeaText>
            <StoryButton
              label="Mulai Kuis"
              onPress={(): void => setStep(verified ? "quiz" : "scan")}
            />
          </View>
        </>
      )}

      {step === "quiz" && (
        <Quiz
          poi={poi}
          submit={(requestId: string, label: OptionLabel): Promise<AnswerResult> =>
            source.answerQuest(visit.id_sesi, poi.quest.idQuest, requestId, label)}
          onWrong={(answer: AnswerResult): void => {
            onProgress(poiId, { attempts: answer.attemptCount });
            setToast({
              tone: "danger",
              title: `Belum tepat (percobaan ke-${answer.attemptCount})`,
              description: answer.hint ?? "Coba amati koleksinya lagi.",
            });
          }}
          onCorrect={(answer: AnswerResult): void => {
            onProgress(poiId, { completed: true, attempts: answer.attemptCount });
            setToast({ tone: "success", title: "Jawabanmu benar!", description: "Side quest koleksi ini selesai." });
            setStep("questDone");
          }}
          onError={(cause: unknown): void => {
            if (cause instanceof GeaServiceError && cause.code === "CHECKPOINT_VERIFICATION_REQUIRED") {
              onProgress(poiId, { verifiedUntil: null });
              setStep("scan");
              return;
            }
            if (cause instanceof GeaServiceError && cause.code === "QUEST_ALREADY_COMPLETED") {
              onProgress(poiId, { completed: true });
              setStep("questDone");
              return;
            }
            setToast({ tone: "danger", title: "Jawaban belum terkirim", description: readableError(cause) });
          }}
          onBack={(): void => setStep("sideQuest")}
        />
      )}

      {step === "questDone" && (
        <View style={styles.sheet}>
          <SheetContent
            title={props.allCompleted(poiId) ? "Semua koleksi selesai!" : "Side quest selesai!"}
            description={props.allCompleted(poiId)
              ? "Kamu sudah menyelesaikan semua cerita dan side quest. Hebat!"
              : `Quest ${poi.nama} selesai${progressOf(poiId).attempts > 0 ? ` dalam ${progressOf(poiId).attempts} percobaan` : ""}. Lanjut ke koleksi berikutnya.`}
            actionLabel="Kembali ke daftar koleksi"
            onAction={props.onExit}
          />
        </View>
      )}

      {toast !== null && (
        <View style={styles.toast}>
          <Toast tone={toast.tone} title={toast.title} description={toast.description} onClose={(): void => setToast(null)} />
        </View>
      )}
    </FrameStage>
  );
}

/** SEMENTARA: frame "Story - Mini quiz" di Figma baru berisi latar. */
function Quiz(
  { poi, submit, onWrong, onCorrect, onError, onBack }: {
    readonly poi: PoiDetail;
    readonly submit: (requestId: string, label: OptionLabel) => Promise<AnswerResult>;
    readonly onWrong: (answer: AnswerResult) => void;
    readonly onCorrect: (answer: AnswerResult) => void;
    readonly onError: (cause: unknown) => void;
    readonly onBack: () => void;
  },
): ReactElement {
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  // Percobaan yang gagal karena jaringan dikirim ulang dengan requestId yang sama.
  const pending = useRef<{ label: OptionLabel; requestId: string } | null>(null);

  async function send(): Promise<void> {
    if (selected === null) return;
    const attempt = pending.current !== null && pending.current.label === selected
      ? pending.current
      : { label: selected, requestId: randomUUID() };
    pending.current = attempt;
    setBusy(true);
    try {
      const answer: AnswerResult = await submit(attempt.requestId, attempt.label);
      pending.current = null;
      if (answer.completed) onCorrect(answer);
      else {
        setSelected(null);
        onWrong(answer);
      }
    } catch (cause: unknown) {
      if (cause instanceof GeaServiceError) pending.current = null;
      onError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackButton onPress={onBack} />
      <View style={styles.quizCard}>
        <GeaText variant="label16" color={colors.primary[700]}>MINI QUIZ</GeaText>
        <GeaText variant="heading24" color={colors.primary[900]}>{poi.quest.pertanyaan}</GeaText>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {poi.quest.options.map((option: QuestOption): ReactElement => {
            const active: boolean = selected === option.label_opsi;
            return (
              <Pressable
                key={option.label_opsi}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: busy }}
                disabled={busy}
                onPress={(): void => setSelected(option.label_opsi)}
                style={[styles.option, { borderColor: active ? colors.primary[800] : colors.primary[400] }]}
              >
                <View style={[styles.letter, { backgroundColor: active ? colors.primary[800] : colors.primary[0] }]}>
                  <GeaText variant="bold16" color={active ? colors.secondaryYellow[0] : colors.primary[900]}>{option.label_opsi}</GeaText>
                </View>
                <GeaText variant="body16" color={colors.black} style={styles.flex}>{option.teks_opsi}</GeaText>
              </Pressable>
            );
          })}
        </View>
        <StoryButton label={busy ? "Memeriksa..." : "Kirim Jawaban"} disabled={selected === null || busy} onPress={(): void => void send()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centerBox: { position: "absolute", left: 24, right: 24, top: 380, alignItems: "center" },
  center: { textAlign: "center" },
  summaryCard: {
    position: "absolute",
    left: 16,
    top: 400,
    width: 361,
    height: 300,
    borderRadius: 4,
    backgroundColor: componentColors.welcomeBackground,
  },
  summaryContent: { position: "absolute", left: 28, top: 520, width: 338, gap: spacing[16], alignItems: "flex-end" },
  texts: { alignSelf: "stretch", gap: spacing[12] },
  isiContent: { position: "absolute", left: 16, width: 358, bottom: 66, gap: spacing[24] },
  isiBody: { maxHeight: 200 },
  isiNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flex: { flex: 1 },
  link: { textDecorationLine: "underline" },
  sheet: { position: "absolute", left: 0, bottom: 0, width: 390 },
  sideCard: {
    position: "absolute",
    left: 16,
    top: 484,
    width: 362,
    gap: spacing[12],
    alignItems: "flex-end",
    overflow: "hidden",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.primary[0],
  },
  full: { alignSelf: "stretch" },
  quizCard: {
    position: "absolute",
    left: 16,
    width: 362,
    bottom: 48,
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.primary[0],
  },
  options: { gap: spacing[8] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    borderWidth: 1,
    borderRadius: radius.control,
    backgroundColor: colors.secondaryYellow[0],
  },
  letter: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toast: { position: "absolute", left: 15, top: 47, width: 360 },
});
