import { randomUUID } from "expo-crypto";
import { type ReactElement, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type AnswerResult,
  type OptionLabel,
  type Quest,
  type QuestOption,
} from "../domain/contracts";
import { GeaServiceError, readableError } from "../services/api";

type QuestCardProps = {
  readonly quest: Quest;
  readonly completed: boolean;
  readonly submit: (
    requestId: string,
    label: OptionLabel,
  ) => Promise<AnswerResult>;
  readonly onCompleted: () => void;
};

type Pending = { readonly label: OptionLabel; readonly requestId: string };

/** Pilgan A–D. Salah: hint + coba lagi. Benar: hasil (UI21). Penilaian di server. */
export function QuestCard(
  { quest, completed, submit, onCompleted }: QuestCardProps,
): ReactElement {
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Percobaan yang gagal karena jaringan dikirim ulang dengan requestId yang sama.
  const [pending, setPending] = useState<Pending | null>(null);

  async function send(): Promise<void> {
    if (selected === null) return;
    const attempt: Pending = pending !== null && pending.label === selected
      ? pending
      : { label: selected, requestId: randomUUID() };
    setPending(attempt);
    setBusy(true);
    setError(null);
    try {
      const answer: AnswerResult = await submit(attempt.requestId, attempt.label);
      setPending(null);
      setResult(answer);
      if (answer.completed) onCompleted();
      else setSelected(null);
    } catch (cause: unknown) {
      if (cause instanceof GeaServiceError) setPending(null);
      if (
        cause instanceof GeaServiceError &&
        cause.code === "QUEST_ALREADY_COMPLETED"
      ) {
        onCompleted();
      }
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (completed) {
    return (
      <View style={[styles.card, styles.success]}>
        <Text style={styles.eyebrow}>QUEST SELESAI</Text>
        <Text style={styles.title}>Jawabanmu benar!</Text>
        <Text style={styles.body}>
          {result !== null
            ? `Selesai dalam ${result.attemptCount} percobaan.`
            : "Quest koleksi ini sudah kamu selesaikan."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>QUEST</Text>
      <Text style={styles.instruction}>{quest.instruksi}</Text>
      <Text style={styles.title}>{quest.pertanyaan}</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {quest.options.map((option: QuestOption): ReactElement => {
          const active: boolean = selected === option.label_opsi;
          return (
            <Pressable
              key={option.label_opsi}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: busy }}
              disabled={busy}
              style={[styles.option, active && styles.optionActive]}
              onPress={(): void => setSelected(option.label_opsi)}
            >
              <Text style={[styles.letter, active && styles.letterActive]}>
                {option.label_opsi}
              </Text>
              <Text style={styles.optionText}>{option.teks_opsi}</Text>
            </Pressable>
          );
        })}
      </View>
      {result !== null && !result.answerCorrect && (
        <View accessibilityLiveRegion="polite" style={styles.hint}>
          <Text style={styles.hintTitle}>
            Belum tepat · percobaan ke-{result.attemptCount}
          </Text>
          {result.hint !== null && (
            <Text style={styles.hintBody}>Petunjuk: {result.hint}</Text>
          )}
        </View>
      )}
      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={selected === null || busy}
        style={[styles.submit, (selected === null || busy) && styles.disabled]}
        onPress={(): void => {
          void send();
        }}
      >
        {busy && <ActivityIndicator color="#FFFFFF" />}
        <Text style={styles.submitText}>
          {busy
            ? "Memeriksa..."
            : result !== null
            ? "Coba lagi"
            : "Kirim jawaban"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E0E4DA",
    padding: 20,
    gap: 12,
  },
  success: { backgroundColor: "#E9EFE3", borderColor: "#C4D2B8" },
  eyebrow: {
    color: "#147C70",
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  instruction: { color: "#63766E", fontSize: 13, lineHeight: 20 },
  title: { color: "#183B3A", fontSize: 18, fontWeight: "700", lineHeight: 25 },
  body: { color: "#526B60", fontSize: 14, lineHeight: 21 },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D6DDD3",
    borderRadius: 14,
    padding: 14,
  },
  optionActive: { borderColor: "#147C70", backgroundColor: "#EEF5F0" },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    lineHeight: 28,
    backgroundColor: "#F0F2EC",
    color: "#183B3A",
    fontWeight: "700",
    overflow: "hidden",
  },
  letterActive: { backgroundColor: "#147C70", color: "#FFFFFF" },
  optionText: { color: "#183B3A", fontSize: 15, flexShrink: 1 },
  hint: { backgroundColor: "#FBF1E1", borderRadius: 14, padding: 14, gap: 6 },
  hintTitle: { color: "#8A5A1C", fontWeight: "700", fontSize: 14 },
  hintBody: { color: "#7A5A2E", fontSize: 13, lineHeight: 20 },
  error: { color: "#973E31", fontSize: 13, lineHeight: 20 },
  submit: {
    backgroundColor: "#147C70",
    borderRadius: 15,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
