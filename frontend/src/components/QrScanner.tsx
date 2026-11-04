import {
  type BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { type ReactElement, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { readableError } from "../services/api";

type ScannerProps = {
  readonly onToken: (token: string) => void;
  readonly onClose: () => void;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly description?: string;
};

export function QrScanner({
  onToken,
  onClose,
  eyebrow = "MULAI KUNJUNGAN",
  title = "Scan QR pintu masuk",
  description =
    "Gunakan kode yang tersedia di pintu masuk museum. Kode akan diperiksa sebelum kunjungan dibuka.",
}: ScannerProps): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const scanned = useRef<boolean>(false);

  async function allowCamera(): Promise<void> {
    setError(null);
    try {
      await requestPermission();
    } catch (cause: unknown) {
      setError(readableError(cause));
    }
  }

  async function openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (cause: unknown) {
      setError(readableError(cause));
    }
  }

  function handleBarcode(result: BarcodeScanningResult): void {
    if (scanned.current) return;
    if (!/^[0-9a-f]{64}$/.test(result.data)) {
      setError(
        "QR ini bukan kode GEA. Arahkan kamera ke QR resmi dari museum.",
      );
      return;
    }
    scanned.current = true;
    onToken(result.data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {permission === null
        ? <ActivityIndicator color="#147C70" />
        : permission.granted
        ? (
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcode}
            />
            <View pointerEvents="none" style={styles.guide} />
          </View>
        )
        : (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionText}>
              Izin kamera diperlukan untuk membaca QR. Tidak ada foto atau
              rekaman yang diambil.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={(): void => {
                void (permission.canAskAgain ? allowCamera() : openSettings());
              }}
            >
              <Text style={styles.buttonText}>
                {permission.canAskAgain
                  ? "Izinkan kamera"
                  : "Buka pengaturan kamera"}
              </Text>
            </Pressable>
          </View>
        )}
      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={styles.close}
      >
        <Text style={styles.closeText}>Kembali</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5EF",
    padding: 24,
    justifyContent: "center",
    gap: 18,
  },
  eyebrow: {
    color: "#147C70",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  title: { fontSize: 30, fontWeight: "700", color: "#183B3A" },
  description: { color: "#566C68", lineHeight: 23, fontSize: 15 },
  cameraFrame: {
    height: 340,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#183B3A",
  },
  camera: { flex: 1 },
  guide: {
    position: "absolute",
    width: 200,
    height: 200,
    alignSelf: "center",
    top: 70,
    borderWidth: 2,
    borderColor: "#F7F5EF",
    borderRadius: 24,
  },
  permissionCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 20,
  },
  permissionText: { color: "#566C68", lineHeight: 23 },
  button: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#147C70",
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
  error: { color: "#A83D34", lineHeight: 22 },
  close: { padding: 18, alignItems: "center" },
  closeText: { fontWeight: "600", color: "#183B3A" },
});
