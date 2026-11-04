import { randomUUID } from "expo-crypto";
import { useState } from "react";
import {
  type AccessDecision,
  type BackendHealth,
  type DecisionMessage,
  decisionMessage,
  type Visit,
} from "../domain/contracts";
import type { RunOperation } from "./useOperation";
import { GeaApi } from "../services/api";
import {
  type LocationReading,
  readVisitorLocation,
} from "../services/location";

type VisitSessionState = {
  readonly notice: DecisionMessage | null;
  readonly decision: AccessDecision | null;
  readonly visit: Visit | null;
  readonly scannerOpen: boolean;
  readonly connection: string;
  readonly openScanner: () => void;
  readonly closeScanner: () => void;
  readonly checkConnection: () => Promise<void>;
  readonly checkLocation: () => Promise<void>;
  readonly useEntranceQr: (token: string) => Promise<void>;
};

export function useVisitSession(
  api: GeaApi,
  runOperation: RunOperation,
): VisitSessionState {
  const [notice, setNotice] = useState<DecisionMessage | null>(null);
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [connection, setConnection] = useState<string>("Belum diperiksa");

  async function checkConnection(): Promise<void> {
    await runOperation("connection", async (): Promise<void> => {
      let health: BackendHealth;
      try {
        health = await api.health();
      } catch (cause: unknown) {
        setConnection("Layanan belum tersedia");
        throw cause;
      }
      setConnection("Layanan terhubung");
      if (!health.museumConfigured) {
        setNotice({
          title: "Layanan terhubung",
          description:
            "Batas area museum sedang disiapkan. QR pintu masuk tetap bisa digunakan jika sudah tersedia.",
        });
      }
    });
  }

  async function checkLocation(): Promise<void> {
    setNotice(null);
    setDecision(null);
    await runOperation("location", async (): Promise<void> => {
      const reading: LocationReading = await readVisitorLocation();
      if (reading.status !== "available") {
        const explanation: string = reading.status === "permission_denied"
          ? "Izin lokasi belum diberikan. Kamu tetap bisa menggunakan QR pintu masuk."
          : reading.status === "disabled"
          ? "Lokasi perangkat belum aktif. Aktifkan lokasi atau gunakan QR pintu masuk."
          : "GPS belum memberikan informasi akurasi. Gunakan QR pintu masuk untuk verifikasi.";
        setNotice({
          title: "Gunakan QR pintu masuk",
          description: explanation,
        });
        return;
      }
      const result: AccessDecision = await api.evaluateLocation(
        reading.location,
      );
      setDecision(result);
      setNotice(decisionMessage(result));
      if (result.status === "inside" && result.accessAllowed) {
        const created: Visit = await api.startGpsVisit(
          randomUUID(),
          reading.location,
        );
        setVisit(created);
      }
    });
  }

  async function useEntranceQr(token: string): Promise<void> {
    setScannerOpen(false);
    setDecision(null);
    await runOperation("qr", async (): Promise<void> => {
      const created: Visit = await api.startQrVisit(randomUUID(), token);
      setVisit(created);
      setNotice({
        title: "Selamat datang di museum",
        description:
          "QR pintu masuk berhasil diverifikasi. Kunjunganmu sudah aktif.",
      });
    });
  }

  function openScanner(): void {
    setScannerOpen(true);
  }
  function closeScanner(): void {
    setScannerOpen(false);
  }
  return {
    notice,
    decision,
    visit,
    scannerOpen,
    connection,
    openScanner,
    closeScanner,
    checkConnection,
    checkLocation,
    useEntranceQr,
  };
}
