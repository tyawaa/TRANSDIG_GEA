import { type ReactElement, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioPlayer } from "../components/AudioPlayer";
import { QrScanner } from "../components/QrScanner";
import { QuestCard } from "../components/QuestCard";
import {
  type AnswerResult,
  type OptionLabel,
  type PoiDetail,
  type PoiVerification,
  type Visit,
} from "../domain/contracts";
import { GeaServiceError, readableError } from "../services/api";
import { imageSource } from "../services/media";
import { type StoriesSource } from "../services/stories";

/** Status satu POI pada sesi ini; disimpan di App agar tetap ada saat kembali ke daftar. */
export type PoiProgress = {
  readonly closed: boolean;
  readonly verifiedUntil: number | null;
  readonly completed: boolean;
};
export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
};

type Props = {
  readonly source: StoriesSource;
  readonly visit: Visit;
  readonly poiId: string;
  readonly progress: PoiProgress;
  readonly onProgress: (patch: Partial<PoiProgress>) => void;
  readonly onBack: () => void;
  /** Hanya diisi pada mode data dummy, untuk mencoba tanpa QR fisik. */
  readonly dummyToken: string | null;
};

type Mode = "baca" | "dengar";

export function PoiDetailScreen(
  { source, visit, poiId, progress, onProgress, onBack, dummyToken }: Props,
): ReactElement {
  const [detail, setDetail] = useState<PoiDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("baca");
  const [busy, setBusy] = useState<"close" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  useEffect((): (() => void) => {
    let active = true;
    setDetail(null);
    setLoadError(null);
    source.poiDetail(poiId, visit.bahasa, visit.profil).then(
      (loaded: PoiDetail): void => {
        if (active) setDetail(loaded);
      },
      (cause: unknown): void => {
        if (active) setLoadError(readableError(cause));
      },
    );
    return (): void => {
      active = false;
    };
  }, [source, poiId, visit.bahasa, visit.profil]);

  // Kunci quest lagi saat masa verifikasi 15 menit habis.
  useEffect((): (() => void) | undefined => {
    if (progress.verifiedUntil === null) return undefined;
    const timer = setTimeout(
      (): void => setNow(Date.now()),
      Math.max(0, progress.verifiedUntil - Date.now()) + 50,
    );
    return (): void => clearTimeout(timer);
  }, [progress.verifiedUntil]);

  const verified: boolean = progress.verifiedUntil !== null &&
    progress.verifiedUntil > now;

  async function closeCard(): Promise<void> {
    setBusy("close");
    setError(null);
    try {
      await source.closeCard(visit.id_sesi, poiId);
      onProgress({ closed: true });
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function verify(token: string): Promise<void> {
    setScannerOpen(false);
    setBusy("verify");
    setError(null);
    try {
      const result: PoiVerification = await source.verifyPoiQr(
        visit.id_sesi,
        token,
        visit.bahasa,
        visit.profil,
      );
      if (result.idPoi !== poiId) {
        setError(
          `QR ini milik koleksi lain (${result.poi.nama}). Scan QR di dekat koleksi ini.`,
        );
        return;
      }
      const until: number = Date.parse(result.expiresAt);
      setNow(Date.now());
      onProgress({ verifiedUntil: Number.isNaN(until) ? null : until });
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function submit(
    requestId: string,
    label: OptionLabel,
  ): Promise<AnswerResult> {
    if (detail === null) throw new Error("Detail koleksi belum dimuat.");
    try {
      return await source.answerQuest(
        visit.id_sesi,
        detail.quest.idQuest,
        requestId,
        label,
      );
    } catch (cause: unknown) {
      if (
        cause instanceof GeaServiceError &&
        cause.code === "CHECKPOINT_VERIFICATION_REQUIRED"
      ) {
        onProgress({ verifiedUntil: null });
      }
      throw cause;
    }
  }

  if (detail === null) {
    return (
      <View style={styles.container}>
        <Back onPress={onBack} />
        {loadError === null
          ? <ActivityIndicator color="#147C70" />
          : (
            <View accessibilityRole="alert" style={styles.errorCard}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          )}
      </View>
    );
  }

  const [description, audio] = detail.cards;

  return (
    <View style={styles.container}>
      <Back onPress={onBack} />
      <Text style={styles.eyebrow}>CERITA KOLEKSI</Text>
      <Text style={styles.title}>{detail.nama}</Text>

      {!progress.closed
        ? (
          <>
            <View accessibilityRole="tablist" style={styles.toggle}>
              {(["baca", "dengar"] as const).map((item: Mode): ReactElement => (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === item }}
                  style={[styles.toggleItem, mode === item && styles.toggleOn]}
                  onPress={(): void => setMode(item)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      mode === item && styles.toggleTextOn,
                    ]}
                  >
                    {item === "baca" ? "Baca" : "Dengar"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Kedua kartu tetap terpasang agar audio tidak berhenti saat mode berganti. */}
            <View style={mode === "baca" ? styles.card : styles.hidden}>
              <Image
                accessibilityLabel={detail.nama}
                source={imageSource(description.photoUrl)}
                resizeMode="contain"
                style={styles.photo}
              />
              <Text style={styles.story}>{description.text}</Text>
            </View>
            <View style={mode === "dengar" ? undefined : styles.hidden}>
              <AudioPlayer
                audioUrl={audio.audioUrl}
                durationSeconds={audio.durationSeconds}
                title={detail.nama}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              style={[styles.primary, busy !== null && styles.disabled]}
              onPress={(): void => {
                void closeCard();
              }}
            >
              {busy === "close" && <ActivityIndicator color="#FFFFFF" />}
              <Text style={styles.primaryText}>
                Tutup kartu & lanjut ke quest
              </Text>
            </Pressable>
          </>
        )
        : (
          <Text style={styles.note}>
            Kartu cerita sudah ditutup untuk kunjungan ini.
          </Text>
        )}

      {progress.closed && !progress.completed && !verified && (
        <View style={styles.locked}>
          <Text style={styles.eyebrow}>QUEST TERKUNCI</Text>
          <Text style={styles.lockedTitle}>Scan QR di dekat koleksi</Text>
          <Text style={styles.body}>
            Quest terbuka setelah kamu berada di depan koleksi aslinya.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            style={[styles.primary, busy !== null && styles.disabled]}
            onPress={(): void => {
              setError(null);
              setScannerOpen(true);
            }}
          >
            {busy === "verify" && <ActivityIndicator color="#FFFFFF" />}
            <Text style={styles.primaryText}>Scan QR koleksi</Text>
          </Pressable>
          {dummyToken !== null && (
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              style={styles.secondary}
              onPress={(): void => {
                void verify(dummyToken);
              }}
            >
              <Text style={styles.secondaryText}>Pakai QR dummy (mode uji)</Text>
            </Pressable>
          )}
        </View>
      )}

      {progress.closed && (verified || progress.completed) && (
        <QuestCard
          quest={detail.quest}
          completed={progress.completed}
          submit={submit}
          onCompleted={(): void => onProgress({ completed: true })}
        />
      )}

      {progress.completed && (
        <Pressable
          accessibilityRole="button"
          style={styles.secondary}
          onPress={onBack}
        >
          <Text style={styles.secondaryText}>Kembali ke daftar koleksi</Text>
        </Pressable>
      )}

      {error !== null && (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={(): void => setScannerOpen(false)}
      >
        <SafeAreaView style={styles.safe}>
          <QrScanner
            eyebrow="VERIFIKASI KOLEKSI"
            title="Scan QR koleksi"
            description="Gunakan QR yang terpasang di dekat koleksi ini untuk membuka quest."
            onToken={(token: string): void => {
              void verify(token);
            }}
            onClose={(): void => setScannerOpen(false)}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Back({ onPress }: { readonly onPress: () => void }): ReactElement {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.back}>← Daftar koleksi</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F5EF" },
  container: { gap: 16 },
  back: { color: "#147C70", fontWeight: "600", paddingVertical: 10 },
  eyebrow: {
    color: "#147C70",
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  title: {
    color: "#183B3A",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#E9EFE3",
    borderRadius: 14,
    padding: 4,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  toggleOn: { backgroundColor: "#FFFFFF" },
  toggleText: { color: "#52675E", fontWeight: "600" },
  toggleTextOn: { color: "#183B3A", fontWeight: "800" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E0E4DA",
    overflow: "hidden",
  },
  hidden: { display: "none" },
  photo: { width: "100%", height: 200, backgroundColor: "#E9EFE3" },
  story: { color: "#3E544B", fontSize: 15, lineHeight: 24, padding: 20 },
  note: { color: "#63766E", fontSize: 13 },
  locked: {
    backgroundColor: "#E9EFE3",
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  lockedTitle: { color: "#183B3A", fontSize: 18, fontWeight: "700" },
  body: { color: "#526B60", fontSize: 14, lineHeight: 21 },
  primary: {
    backgroundColor: "#147C70",
    paddingVertical: 16,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  secondary: { alignItems: "center", padding: 8 },
  secondaryText: { color: "#183B3A", fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.6 },
  errorCard: { borderRadius: 16, backgroundColor: "#F9E8DF", padding: 17 },
  errorText: { color: "#973E31", fontSize: 13, lineHeight: 21 },
});
