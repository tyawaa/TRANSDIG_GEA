import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { type ReactElement, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QrScanner } from "./src/components/QrScanner";
import {
  type AccessDecision,
  type BackendHealth,
  type DecisionMessage,
  decisionMessage,
  type PoiSummary,
  type Visit,
} from "./src/domain/contracts";
import { GeaApi, readableError } from "./src/services/api";
import {
  type LocationReading,
  readVisitorLocation,
} from "./src/services/location";
import { publicConfig, supabase } from "./src/services/supabase";

const api: GeaApi = new GeaApi(publicConfig.url, supabase);
type Screen = { readonly kind: "landing" } | {
  readonly kind: "stories";
  readonly pois: readonly PoiSummary[];
};
type BusyOperation = "location" | "qr" | "connection" | "stories";

function Home(): ReactElement {
  const [screen, setScreen] = useState<Screen>({ kind: "landing" });
  const [busy, setBusy] = useState<BusyOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<DecisionMessage | null>(null);
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [connection, setConnection] = useState<string>("Belum diperiksa");

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

  async function checkConnection(): Promise<void> {
    setBusy("connection");
    setError(null);
    try {
      const health: BackendHealth = await api.health();
      setConnection("Layanan terhubung");
      if (!health.museumConfigured) {
        setNotice({
          title: "Layanan terhubung",
          description:
            "Batas area museum sedang disiapkan. QR pintu masuk tetap bisa digunakan jika sudah tersedia.",
        });
      }
    } catch (cause: unknown) {
      setConnection("Layanan belum tersedia");
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function checkLocation(): Promise<void> {
    setBusy("location");
    setError(null);
    setNotice(null);
    setDecision(null);
    try {
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
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function useEntranceQr(token: string): Promise<void> {
    setScannerOpen(false);
    setBusy("qr");
    setError(null);
    setDecision(null);
    try {
      const created: Visit = await api.startQrVisit(randomUUID(), token);
      setVisit(created);
      setNotice({
        title: "Selamat datang di museum",
        description:
          "QR pintu masuk berhasil diverifikasi. Kunjunganmu sudah aktif.",
      });
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function openStories(): Promise<void> {
    if (visit === null) {
      throw new Error(
        "Kunjungan terverifikasi diperlukan sebelum membuka koleksi.",
      );
    }
    setBusy("stories");
    setError(null);
    try {
      const pois: readonly PoiSummary[] = await api.pois();
      setScreen({ kind: "stories", pois });
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>GEA</Text>
            <Text style={styles.brandLabel}>museum companion</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {visit === null ? "JELAJAH MUSEUM" : "KUNJUNGAN AKTIF"}
            </Text>
          </View>
        </View>
        {screen.kind === "landing"
          ? (
            <>
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroLabel}>LIHAT LEBIH DEKAT</Text>
                  <Text style={styles.heroMark}>01 / GEA</Text>
                </View>
                <View accessible={false} style={styles.museum}>
                  <View style={styles.museumRoof} />
                  <View style={styles.columns}>
                    {[0, 1, 2, 3].map((column: number): ReactElement => (
                      <View key={column} style={styles.column} />
                    ))}
                  </View>
                  <View style={styles.museumBase} />
                </View>
                <Text style={styles.heroTitle}>
                  Setiap koleksi{"\n"}punya cerita.
                </Text>
                <Text style={styles.heroDescription}>
                  Temukan cerita, dengarkan narasi, dan amati koleksi di
                  sekitarmu.
                </Text>
              </View>
              <View style={styles.intro}>
                <Text style={styles.eyebrow}>MULAI DARI SINI</Text>
                <Text style={styles.title}>Sudah sampai di museum?</Text>
                <Text style={styles.body}>
                  Periksa lokasi untuk memulai kunjungan. Kami hanya meminta
                  lokasi saat kamu menekan tombol di bawah.
                </Text>
              </View>
              <View style={styles.steps}>
                {["Periksa area", "Buka cerita", "Jelajahi koleksi"].map((
                  step: string,
                  index: number,
                ): ReactElement => (
                  <View key={step} style={styles.step}>
                    <Text style={styles.stepNumber}>0{index + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
              {notice !== null && (
                <View accessibilityLiveRegion="polite" style={styles.notice}>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Text style={styles.noticeBody}>{notice.description}</Text>
                  {decision?.accuracyMeters !== null &&
                    decision?.accuracyMeters !== undefined && (
                    <Text style={styles.accuracy}>
                      Akurasi GPS: {decision.accuracyMeters.toFixed(1)} m
                    </Text>
                  )}
                </View>
              )}
              {error !== null && (
                <View accessibilityRole="alert" style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={busy !== null}
                style={[styles.primary, busy !== null && styles.disabled]}
                onPress={(): void => {
                  void (visit === null ? checkLocation() : openStories());
                }}
              >
                {busy !== null && <ActivityIndicator color="#FFFFFF" />}
                <Text style={styles.primaryText}>
                  {busy === "location"
                    ? "Memeriksa lokasi..."
                    : busy === "qr"
                    ? "Memeriksa QR..."
                    : busy === "stories"
                    ? "Memuat koleksi..."
                    : visit === null
                    ? "Periksa lokasi saya"
                    : "Buka koleksi"}
                </Text>
                {busy === null && <Text style={styles.buttonArrow}>→</Text>}
              </Pressable>
              {visit === null && (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy !== null}
                  style={styles.secondary}
                  onPress={(): void => {
                    setError(null);
                    setScannerOpen(true);
                  }}
                >
                  <Text style={styles.secondaryText}>
                    Gunakan QR pintu masuk
                  </Text>
                </Pressable>
              )}
              <View style={styles.connectionRow}>
                <View style={styles.connectionInfo}>
                  <View style={styles.dot} />
                  <Text style={styles.connectionText}>{connection}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy !== null}
                  hitSlop={12}
                  onPress={(): void => {
                    void checkConnection();
                  }}
                >
                  <Text style={styles.checkText}>
                    {busy === "connection" ? "Memeriksa..." : "Cek layanan"}
                  </Text>
                </Pressable>
              </View>
            </>
          )
          : (
            <View style={styles.stories}>
              <Pressable
                accessibilityRole="button"
                onPress={(): void => setScreen({ kind: "landing" })}
              >
                <Text style={styles.back}>← Kembali</Text>
              </Pressable>
              <Text style={styles.eyebrow}>CERITA DI SEKITARMU</Text>
              <Text style={styles.title}>Kenali koleksi museum</Text>
              <Text style={styles.body}>
                {screen.pois.length} koleksi tersedia untuk dijelajahi.
              </Text>
              {screen.pois.length === 0 && (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>
                    Cerita sedang disiapkan
                  </Text>
                  <Text style={styles.noticeBody}>
                    Belum ada koleksi yang diterbitkan. Konten akan muncul
                    setelah disiapkan tim museum.
                  </Text>
                </View>
              )}
              {screen.pois.map((poi: PoiSummary): ReactElement => (
                <View key={poi.id_poi} style={styles.poiCard}>
                  <Image
                    accessibilityLabel={poi.nama}
                    source={{ uri: poi.photoUrl }}
                    style={styles.poiImage}
                  />
                  <View style={styles.poiBody}>
                    <Text style={styles.noticeTitle}>{poi.nama}</Text>
                    <Text style={styles.body}>
                      {poi.estimasi_durasi} menit · Cerita dan narasi
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        <Text style={styles.footer}>GEA · Cerita yang menemani langkahmu.</Text>
      </ScrollView>
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={(): void => setScannerOpen(false)}
      >
        <SafeAreaView style={styles.safe}>
          <QrScanner
            onToken={(token: string): void => {
              void useEntranceQr(token);
            }}
            onClose={(): void => setScannerOpen(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F5EF" },
  page: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 36,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  brand: { gap: 2 },
  brandName: {
    color: "#183B3A",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: 3,
  },
  brandLabel: { color: "#6B7E74", fontSize: 10, letterSpacing: 0.8 },
  tag: {
    borderWidth: 1,
    borderColor: "#D6DDD3",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 9,
    color: "#526B60",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  hero: {
    backgroundColor: "#183B3A",
    borderRadius: 26,
    padding: 24,
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: {
    color: "#B8CEC1",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.7,
  },
  heroMark: { color: "#8CA99F", fontSize: 9 },
  museum: {
    width: 160,
    alignSelf: "center",
    marginVertical: 23,
    alignItems: "center",
  },
  museumRoof: {
    width: 154,
    height: 42,
    borderTopLeftRadius: 85,
    borderTopRightRadius: 85,
    backgroundColor: "#D9AE73",
  },
  columns: { flexDirection: "row", gap: 18, paddingVertical: 8 },
  column: {
    height: 47,
    width: 14,
    borderRadius: 3,
    backgroundColor: "#C4D2B8",
  },
  museumBase: {
    width: 160,
    height: 9,
    borderRadius: 2,
    backgroundColor: "#D9AE73",
  },
  heroTitle: {
    color: "#F8F6ED",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  heroDescription: {
    color: "#BDCEC3",
    lineHeight: 21,
    fontSize: 13,
    marginTop: 12,
    maxWidth: 280,
  },
  intro: { gap: 10 },
  eyebrow: {
    color: "#147C70",
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  title: {
    color: "#183B3A",
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  body: { color: "#63766E", lineHeight: 23, fontSize: 14 },
  steps: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E0E4DA",
    paddingVertical: 17,
  },
  step: { flex: 1, gap: 6 },
  stepNumber: { fontSize: 11, color: "#147C70", fontWeight: "700" },
  stepText: { fontSize: 11, color: "#52675E" },
  notice: { backgroundColor: "#E9EFE3", padding: 18, borderRadius: 18, gap: 8 },
  noticeTitle: {
    color: "#183B3A",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  noticeBody: { color: "#526B60", fontSize: 13, lineHeight: 21 },
  accuracy: { color: "#526B60", fontSize: 12 },
  errorCard: { borderRadius: 16, backgroundColor: "#F9E8DF", padding: 17 },
  errorText: { color: "#973E31", fontSize: 13, lineHeight: 21 },
  primary: {
    backgroundColor: "#147C70",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  buttonArrow: { color: "#FFFFFF", fontSize: 22 },
  disabled: { opacity: 0.6 },
  secondary: { alignItems: "center", padding: 5 },
  secondaryText: { color: "#183B3A", fontWeight: "600", fontSize: 14 },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#8B9E8C" },
  connectionText: { color: "#6B7E74", fontSize: 11, flexShrink: 1 },
  checkText: { color: "#147C70", fontSize: 12, fontWeight: "700" },
  footer: { color: "#8A978B", fontSize: 10, textAlign: "center", marginTop: 8 },
  stories: { gap: 18 },
  back: { color: "#147C70", fontWeight: "600", paddingVertical: 10 },
  poiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E4DA",
  },
  poiImage: { width: "100%", height: 180, backgroundColor: "#E9EFE3" },
  poiBody: { padding: 18, gap: 8 },
});
