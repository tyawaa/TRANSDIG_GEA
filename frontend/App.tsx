import { StatusBar } from "expo-status-bar";
import type { ReactElement } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QrScanner } from "./src/components/QrScanner";
import { LandingScreen } from "./src/features/landing/LandingScreen";
import { PoiListScreen } from "./src/features/stories/PoiListScreen";
import { usePois } from "./src/features/stories/usePois";
import { useVisitSession } from "./src/hooks/useVisitSession";
import { useAuthRefresh } from "./src/hooks/useAuthRefresh";
import { useOperation } from "./src/hooks/useOperation";
import { GeaApi } from "./src/services/api";
import { publicConfig, supabase } from "./src/services/supabase";
import { styles } from "./src/theme/styles";

const api: GeaApi = new GeaApi(publicConfig.url, supabase);

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
  const { pois, openStories, closeStories } = usePois(api, runOperation);
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
        {pois === null
          ? (
            <LandingScreen
              visit={visit}
              busy={busy}
              notice={notice}
              decision={decision}
              error={error}
              connection={connection}
              onPrimary={(): void => {
                void (visit === null ? checkLocation() : openStories(visit));
              }}
              onOpenScanner={(): void => {
                clearError();
                openScanner();
              }}
              onCheckConnection={(): void => {
                void checkConnection();
              }}
            />
          )
          : <PoiListScreen pois={pois} onBack={closeStories} />}
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
      <Home />
    </SafeAreaProvider>
  );
}
