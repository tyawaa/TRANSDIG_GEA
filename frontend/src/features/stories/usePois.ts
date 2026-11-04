import { useState } from "react";
import type { PoiSummary, Visit } from "../../domain/contracts";
import type { RunOperation } from "../../hooks/useOperation";
import { GeaApi } from "../../services/api";

type PoisState = {
  readonly pois: readonly PoiSummary[] | null;
  readonly openStories: (visit: Visit | null) => Promise<void>;
  readonly closeStories: () => void;
};

export function usePois(api: GeaApi, runOperation: RunOperation): PoisState {
  const [pois, setPois] = useState<readonly PoiSummary[] | null>(null);
  async function openStories(visit: Visit | null): Promise<void> {
    if (visit === null) {
      throw new Error(
        "Kunjungan terverifikasi diperlukan sebelum membuka koleksi.",
      );
    }
    await runOperation("stories", async (): Promise<void> => {
      setPois(await api.pois());
    });
  }
  function closeStories(): void {
    setPois(null);
  }
  return { pois, openStories, closeStories };
}
