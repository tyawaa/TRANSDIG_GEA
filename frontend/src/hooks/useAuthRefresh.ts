import { useEffect } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { supabase } from "../services/supabase";

export function useAuthRefresh(): void {
  useEffect((): (() => void) | undefined => {
    if (Platform.OS === "web") return undefined;
    function syncRefresh(state: AppStateStatus): void {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    }
    syncRefresh(AppState.currentState);
    const subscription = AppState.addEventListener("change", syncRefresh);
    return (): void => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
