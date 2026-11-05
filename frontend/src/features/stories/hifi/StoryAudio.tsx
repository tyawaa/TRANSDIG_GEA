import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { type ReactElement, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { audioSource } from "../../../services/media";
import { StoryButton } from "./parts";

function clock(seconds: number): string {
  const safe: number = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * Narasi audio di panel Story Isi. SEMENTARA: hi-fi belum punya pemutar audio,
 * jadi memakai warna panel dan tombol Story yang sudah ada. Kontrol: putar, jeda, ulang.
 */
export function StoryAudio(
  { audioUrl, durationSeconds }: { readonly audioUrl: string; readonly durationSeconds: number },
): ReactElement {
  const player = useAudioPlayer(audioSource(audioUrl));
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((cause: unknown): void => {
      console.warn("gea_audio_mode_failed", {
        error: cause instanceof Error ? cause.message : String(cause),
      });
    });
  }, []);

  const duration: number = status.duration > 0 ? status.duration : durationSeconds;
  const progress: number = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const atEnd: boolean = status.currentTime >= duration - 0.25;

  async function run(action: "toggle" | "restart"): Promise<void> {
    setError(null);
    try {
      if (action === "toggle" && status.playing) {
        player.pause();
        return;
      }
      if (action === "restart" || atEnd) await player.seekTo(0);
      player.play();
    } catch (cause: unknown) {
      setError("Narasi belum bisa diputar. Coba lagi.");
      console.error("gea_audio_failed", {
        url: audioUrl,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return (
    <View style={styles.root}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(status.currentTime) }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.times}>
        <GeaText variant="caption12" color={colors.secondaryYellow[100]}>{clock(status.currentTime)}</GeaText>
        <GeaText variant="caption12" color={colors.secondaryYellow[100]}>{clock(duration)}</GeaText>
      </View>
      <View style={styles.controls}>
        <StoryButton
          label={!status.isLoaded ? "Memuat..." : status.playing ? "Jeda" : "Putar"}
          disabled={!status.isLoaded}
          onPress={(): void => void run("toggle")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ulang narasi dari awal"
          disabled={!status.isLoaded}
          hitSlop={10}
          onPress={(): void => void run("restart")}
        >
          <GeaText variant="body16" color={colors.secondaryYellow[100]} style={styles.link}>Ulang</GeaText>
        </Pressable>
      </View>
      {error !== null && (
        <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.primary[900], overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.secondaryYellow[100] },
  times: { flexDirection: "row", justifyContent: "space-between" },
  controls: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 4 },
  link: { textDecorationLine: "underline" },
});
