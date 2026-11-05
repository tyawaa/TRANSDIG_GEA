import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StatusNotice } from "../../components/StatusNotice";
import type {
  AccessDecision,
  DecisionMessage,
  Visit,
} from "../../domain/contracts";
import type { BusyOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/colors";
import { styles } from "../../theme/styles";
import type { LocationSettingsAction } from "../../hooks/useVisitSession";

type LandingScreenProps = {
  readonly visit: Visit | null;
  readonly busy: BusyOperation | null;
  readonly notice: DecisionMessage | null;
  readonly decision: AccessDecision | null;
  readonly error: string | null;
  readonly connection: string;
  readonly locationLabel: string;
  readonly locationSettingsAction: LocationSettingsAction | null;
  readonly onPrimary: () => void;
  readonly onOpenScanner: () => void;
  readonly onCheckConnection: () => void;
};
export function LandingScreen(
  {
    visit,
    busy,
    notice,
    decision,
    error,
    connection,
    locationLabel,
    locationSettingsAction,
    onPrimary,
    onOpenScanner,
    onCheckConnection,
  }: LandingScreenProps,
): ReactElement {
  return (
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
          Temukan cerita, dengarkan narasi, dan amati koleksi di sekitarmu.
        </Text>
      </View>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>MULAI DARI SINI</Text>
        <Text style={styles.title}>Sudah sampai di museum?</Text>
        <Text style={styles.body}>
          Izinkan lokasi saat aplikasi digunakan untuk memastikan kamu berada di
          area museum. Aktifkan GPS dan pilih lokasi akurat saat diminta.
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
      <StatusNotice notice={notice} decision={decision} error={error} />
      {visit === null && locationSettingsAction !== null && (
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          style={[styles.secondary, busy !== null && styles.disabled]}
          onPress={(): void => {
            void locationSettingsAction.onPress();
          }}
        >
          <Text style={styles.secondaryText}>{locationSettingsAction.label}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy !== null}
        style={[styles.primary, busy !== null && styles.disabled]}
        onPress={(): void => {
          onPrimary();
        }}
      >
        {busy !== null && <ActivityIndicator color={colors.white} />}
        <Text style={styles.primaryText}>
          {busy === "location"
            ? locationLabel
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
            onOpenScanner();
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
            onCheckConnection();
          }}
        >
          <Text style={styles.checkText}>
            {busy === "connection" ? "Memeriksa..." : "Cek layanan"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
