import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { type ReactElement, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { audioSource } from "../services/media";

type AudioPlayerProps = {
  readonly audioUrl: string;
  readonly durationSeconds: number;
  readonly title: string;
};

function clock(seconds: number): string {
  const safe: number = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Narasi dengan kontrol putar, jeda, dan ulang (syarat E4 dan uji E8). */
export function AudioPlayer(
  { audioUrl, durationSeconds, title }: AudioPlayerProps,
): ReactElement {
  const player = useAudioPlayer(audioSource(audioUrl));
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(
      (cause: unknown): void => {
        console.warn("gea_audio_mode_failed", {
          error: cause instanceof Error ? cause.message : String(cause),
        });
      },
    );
  }, []);

  const duration: number = status.duration > 0
    ? status.duration
    : durationSeconds;
  const atEnd: boolean = status.currentTime >= duration - 0.25;
  const progress: number = duration > 0
    ? Math.min(1, status.currentTime / duration)
    : 0;

  async function togglePlay(): Promise<void> {
    setError(null);
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (atEnd) await player.seekTo(0);
      player.play();
    } catch (cause: unknown) {
      setError("Audio belum bisa diputar. Coba lagi.");
      console.error("gea_audio_failed", {
        url: audioUrl,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  async function restart(): Promise<void> {
    setError(null);
    try {
      await player.seekTo(0);
      player.play();
    } catch (cause: unknown) {
      setError("Audio belum bisa diulang. Coba lagi.");
      console.error("gea_audio_failed", {
        url: audioUrl,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>NARASI AUDIO</Text>
      <Text style={styles.title}>{title}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(status.currentTime),
        }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{clock(status.currentTime)}</Text>
        <Text style={styles.time}>{clock(duration)}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Jeda narasi" : "Putar narasi"}
          disabled={!status.isLoaded}
          style={[styles.play, !status.isLoaded && styles.disabled]}
          onPress={(): void => {
            void togglePlay();
          }}
        >
          <Text style={styles.playText}>
            {!status.isLoaded
              ? "Memuat..."
              : status.playing
              ? "❚❚  Jeda"
              : "▶  Putar"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ulang narasi dari awal"
          disabled={!status.isLoaded}
          style={[styles.restart, !status.isLoaded && styles.disabled]}
          onPress={(): void => {
            void restart();
          }}
        >
          <Text style={styles.restartText}>↺  Ulang</Text>
        </Pressable>
      </View>
      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#183B3A",
    borderRadius: 22,
    padding: 22,
    gap: 12,
  },
  label: {
    color: "#B8CEC1",
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  title: { color: "#F8F6ED", fontSize: 19, fontWeight: "700" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#335553",
    overflow: "hidden",
    marginTop: 8,
  },
  fill: { height: 6, backgroundColor: "#D9AE73" },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "#BDCEC3", fontSize: 12 },
  controls: { flexDirection: "row", gap: 12, marginTop: 4 },
  play: {
    flex: 2,
    backgroundColor: "#D9AE73",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  playText: { color: "#183B3A", fontWeight: "800", fontSize: 15 },
  restart: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#8CA99F",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  restartText: { color: "#F8F6ED", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
  error: { color: "#F4C7B8", fontSize: 13 },
});
