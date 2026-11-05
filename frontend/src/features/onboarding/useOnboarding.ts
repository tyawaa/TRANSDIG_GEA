import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "gea.onboarding.done.v1";
// Untuk uji: EXPO_PUBLIC_ONBOARDING=always menampilkan onboarding setiap aplikasi dibuka.
const alwaysShow: boolean = process.env.EXPO_PUBLIC_ONBOARDING === "always";

export type OnboardingState = "loading" | "show" | "done";

/** Onboarding hanya tampil saat pertama kali aplikasi dibuka di perangkat ini. */
export function useOnboarding(): {
  readonly state: OnboardingState;
  readonly complete: () => void;
} {
  const [state, setState] = useState<OnboardingState>("loading");

  useEffect((): void => {
    if (alwaysShow) {
      setState("show");
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then(
      (value: string | null): void => setState(value === "1" ? "done" : "show"),
      (cause: unknown): void => {
        console.warn("gea_onboarding_read_failed", {
          error: cause instanceof Error ? cause.message : String(cause),
        });
        setState("show");
      },
    );
  }, []);

  function complete(): void {
    setState("done");
    AsyncStorage.setItem(STORAGE_KEY, "1").catch((cause: unknown): void => {
      console.warn("gea_onboarding_save_failed", {
        error: cause instanceof Error ? cause.message : String(cause),
      });
    });
  }

  return { state, complete };
}
