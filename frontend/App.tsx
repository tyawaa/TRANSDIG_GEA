import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { type ReactElement, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QrScanner } from "./src/components/QrScanner";
import { GeaFontsProvider } from "./src/design/typography";
import type { PoiSummary, Visit } from "./src/domain/contracts";
import { LandingScreen } from "./src/features/landing/LandingScreen";
import { OnboardingScreen } from "./src/features/onboarding/OnboardingScreen";
import { useOnboarding } from "./src/features/onboarding/useOnboarding";
import { PoiListScreen } from "./src/features/stories/PoiListScreen";
import { usePois } from "./src/features/stories/usePois";
import { useVisitSession } from "./src/hooks/useVisitSession";
import { useAuthRefresh } from "./src/hooks/useAuthRefresh";
import { useOperation } from "./src/hooks/useOperation";
import { mockPoiSummaries, mockPoiToken } from "./src/mocks/stories";
import { StoryFlow } from "./src/features/stories/hifi/StoryFlow";
import { emptyProgress, type PoiProgress } from "./src/features/stories/progress";
import { GeaApi } from "./src/services/api";
import {
  ApiStoriesSource,
  MockStoriesSource,
  type StoriesSource,
  storiesMockEnabled,
} from "./src/services/stories";
import { publicConfig, supabase } from "./src/services/supabase";
import { styles } from "./src/theme/styles";

const api: GeaApi = new GeaApi(publicConfig.url, supabase);
// E7: layar Stories memakai backend asli; data dummy (E4) hanya jika mode mock aktif.
const storiesSource: StoriesSource = storiesMockEnabled
  ? new MockStoriesSource()
  : new ApiStoriesSource(api);

function dummyTokenFor(poiId: string): string | null {
  if (storiesSource.kind !== "mock") return null;
  const index: number = mockPoiSummaries.findIndex(
    (poi: PoiSummary): boolean => poi.id_poi === poiId,
  );
  return index < 0 ? null : mockPoiToken(index + 1);
}

function Home(): ReactElement {
  useAuthRefresh();
  const { busy, error, clearError, runOperation } = useOperation();
  const {
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
  } = useVisitSession(api, runOperation);
  const { pois, openStories, closeStories } = usePois(
    storiesSource,
    runOperation,
  );
  // Kunjungan uji tanpa backend, hanya pada mode data dummy.
  const [dummyVisit, setDummyVisit] = useState<Visit | null>(null);
  const activeVisit: Visit | null = visit ?? dummyVisit;
  const [detailPoiId, setDetailPoiId] = useState<string | null>(null);
  const [progress, setProgress] = useState<
    { readonly [poiId: string]: PoiProgress }
  >({});

  const onboarding = useOnboarding();
  const scroller = useRef<ScrollView>(null);
  const screenKey: string = pois === null
    ? "landing"
    : detailPoiId === null
    ? "list"
    : `detail:${detailPoiId}`;
  useEffect((): void => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [screenKey]);

  function updateProgress(poiId: string, patch: Partial<PoiProgress>): void {
    setProgress((current) => ({
      ...current,
      [poiId]: { ...(current[poiId] ?? emptyProgress), ...patch },
    }));
  }

  async function startDummyVisit(): Promise<void> {
    const created: Visit = {
      id_sesi: randomUUID(),
      bahasa: "id",
      profil: "umum",
      verification_method: "entrance_qr",
      status: "aktif",
    };
    setDummyVisit(created);
    setProgress({});
    await openStories(created);
  }

  if (onboarding.state === "loading") return <View style={styles.safe} />;
  if (onboarding.state === "show") {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen
          checkingLocation={busy === "location"}
          onCheckLocation={(): void => {
            void checkLocation();
          }}
          onDone={onboarding.complete}
        />
      </>
    );
  }

  // E5: alur Story hi-fi tampil layar penuh.
  if (pois !== null && detailPoiId !== null && activeVisit !== null) {
    const list: readonly PoiSummary[] = pois;
    return (
      <>
        <StatusBar style="dark" />
        <StoryFlow
          key={detailPoiId}
          source={storiesSource}
          visit={activeVisit}
          poiId={detailPoiId}
          progressOf={(poiId: string): PoiProgress => progress[poiId] ?? emptyProgress}
          onProgress={updateProgress}
          allCompleted={(justCompleted: string): boolean =>
            list.every((poi: PoiSummary): boolean =>
              poi.id_poi === justCompleted || progress[poi.id_poi]?.completed === true
            )}
          dummyTokenFor={dummyTokenFor}
          onExit={(): void => setDetailPoiId(null)}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView ref={scroller} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>GEA</Text>
            <Text style={styles.brandLabel}>museum companion</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {activeVisit === null ? "JELAJAH MUSEUM" : "KUNJUNGAN AKTIF"}
            </Text>
          </View>
        </View>
        {pois === null
          ? (
            <>
              <LandingScreen
                visit={activeVisit}
                busy={busy}
                notice={notice}
                decision={decision}
                error={error}
                connection={connection}
                onPrimary={(): void => {
                  void (activeVisit === null
                    ? checkLocation()
                    : openStories(activeVisit));
                }}
                onOpenScanner={(): void => {
                  clearError();
                  openScanner();
                }}
                onCheckConnection={(): void => {
                  void checkConnection();
                }}
              />
              {activeVisit === null && storiesSource.kind === "mock" && (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy !== null}
                  style={local.dummy}
                  onPress={(): void => {
                    void startDummyVisit();
                  }}
                >
                  <Text style={local.dummyText}>Coba Stories (data dummy)</Text>
                </Pressable>
              )}
            </>
          )
          : (
            <PoiListScreen
              pois={pois}
              progress={progress}
              onOpen={(poiId: string): void => setDetailPoiId(poiId)}
              onBack={(): void => {
                setDetailPoiId(null);
                closeStories();
              }}
            />
          )}
        <Text style={styles.footer}>GEA · Cerita yang menemani langkahmu.</Text>
      </ScrollView>
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={(): void => closeScanner()}
      >
        <SafeAreaView style={styles.safe}>
          <QrScanner
            onToken={(token: string): void => {
              void useEntranceQr(token);
            }}
            onClose={(): void => closeScanner()}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <GeaFontsProvider>
        <Home />
      </GeaFontsProvider>
    </SafeAreaProvider>
  );
}

const local = StyleSheet.create({
  dummy: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C9A26A",
    borderRadius: 14,
  },
  dummyText: { color: "#8A5A1C", fontWeight: "600", fontSize: 13 },
});
