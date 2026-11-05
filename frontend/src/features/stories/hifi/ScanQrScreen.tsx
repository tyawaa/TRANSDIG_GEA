import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { type ReactElement, useRef } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { ScanBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";

export type ScanState = "scanning" | "detected" | "failed";

type Props = {
  readonly state: ScanState;
  readonly onToken: (token: string) => void;
  readonly onRetry: () => void;
  readonly onBack: () => void;
  /** Hanya pada mode data dummy, untuk uji tanpa QR fisik. */
  readonly onDummy: (() => void) | null;
};

/** Story - Scan QR (36:215 + 43:639) dan Scan QR Gagal (57:277). */
export function ScanQrScreen({ state, onToken, onRetry, onBack, onDummy }: Props): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef<boolean>(false);
  if (state === "scanning") handled.current = false;

  function onBarcode(result: BarcodeScanningResult): void {
    if (handled.current || state !== "scanning") return;
    handled.current = true;
    onToken(result.data);
  }

  return (
    <FrameStage background={colors.primary[300]}>
      <ScanBackground />
      <BackButton onPress={onBack} />
      <View style={styles.column}>
        <GeaText variant="heading28" color={colors.secondaryYellow[100]} style={styles.title}>
          Scan qr code untuk memulai petualanganmu
        </GeaText>
        <View style={styles.cameraBox}>
          <View style={styles.camera}>
            {permission?.granted === true
              ? (
                <CameraView
                  style={styles.fill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={state === "scanning" ? onBarcode : undefined}
                />
              )
              : (
                <View style={styles.permission}>
                  <GeaText variant="body16" color={colors.secondaryYellow[0]} style={styles.center}>
                    Izin kamera diperlukan untuk membaca QR koleksi.
                  </GeaText>
                  <StoryButton
                    label={permission?.canAskAgain === false ? "Buka pengaturan" : "Izinkan kamera"}
                    onPress={(): void => {
                      if (permission?.canAskAgain === false) void Linking.openSettings();
                      else void requestPermission();
                    }}
                  />
                </View>
              )}
          </View>
        </View>
        {state === "detected" && (
          <View accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: colors.tertiary[300] }]}>
            <GeaText variant="body16" color={componentColors.textWhite}>QR Terdeteksi</GeaText>
            <ActivityIndicator color={componentColors.textWhite} />
          </View>
        )}
        {state === "failed" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLiveRegion="assertive"
            onPress={onRetry}
            style={[styles.status, styles.failed]}
          >
            <GeaText variant="body16" color={componentColors.textWhite}>
              QR Gagal Terscan, Scan Ulang
            </GeaText>
          </Pressable>
        )}
        {onDummy !== null && state !== "detected" && (
          <Pressable accessibilityRole="button" onPress={onDummy} hitSlop={8}>
            <GeaText variant="body14" color={colors.secondaryYellow[100]} style={styles.link}>
              Pakai QR dummy (mode uji)
            </GeaText>
          </Pressable>
        )}
      </View>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  column: { position: "absolute", left: 19, top: 99, width: 352, alignItems: "center", gap: 24 },
  title: { alignSelf: "stretch", textAlign: "center" },
  cameraBox: { width: 332.299, height: 419.916, alignItems: "center", justifyContent: "center" },
  camera: {
    width: 314.463,
    height: 406.274,
    borderWidth: 15,
    borderColor: colors.secondaryGreen[300],
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: colors.black,
    transform: [{ rotate: "2.56deg" }],
  },
  fill: { flex: 1 },
  permission: { flex: 1, padding: 20, gap: 16, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: 42,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  failed: { width: 296, backgroundColor: componentColors.qrFailed },
  link: { textDecorationLine: "underline" },
});
