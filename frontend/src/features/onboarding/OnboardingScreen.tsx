import { useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { type ReactElement, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button } from "../../design/Button";
import { PoiCard } from "../../design/Cards";
import { colors, componentColors, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { onboardingAssets as img, SceneIllustrations, SceneLayer } from "./scene";

// Ukuran frame Figma.
const FRAME_W = 390;
const FRAME_H = 844;
// Posisi gulir tiap langkah. Langkah 2–4 adalah jendela pada satu kanvas tinggi:
// top jendela di kanvas = posisi + CANVAS_SHIFT (1021, 1846, 2636 seperti di Figma).
const STEP_SCROLL: readonly number[] = [0, 844, 1669, 2459];
const CANVAS_SHIFT = 177;
const CANVAS_H = 3480;

type Step = 0 | 1 | 2 | 3;

type Props = {
  /** Menjalankan pengecekan lokasi aplikasi (useVisitSession.checkLocation). */
  readonly onCheckLocation: () => void;
  /** true selama pengecekan lokasi berjalan. */
  readonly checkingLocation: boolean;
  readonly onDone: () => void;
};

export function OnboardingScreen(
  { onCheckLocation, checkingLocation, onDone }: Props,
): ReactElement {
  const { width, height } = useWindowDimensions();
  const scale: number = Math.min(width / FRAME_W, height / FRAME_H);
  const [step, setStep] = useState<Step>(0);
  const scroll = useRef(new Animated.Value(0)).current;
  const [moving, setMoving] = useState<boolean>(false);

  // Web: browser menggulir kontainer ber-overflow hidden agar tombol yang difokus terlihat,
  // sehingga adegan bergeser. Kunci posisi gulirnya di 0 (tidak terjadi di HP).
  const rootRef = useRef<View>(null);
  useEffect((): (() => void) | undefined => {
    if (Platform.OS !== "web") return undefined;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (node === null) return undefined;
    const reset = (): void => {
      if (node.scrollTop !== 0 || node.scrollLeft !== 0) node.scrollTo(0, 0);
    };
    node.addEventListener("scroll", reset);
    return (): void => node.removeEventListener("scroll", reset);
  }, []);

  const [location, requestLocation] = Location.useForegroundPermissions();
  const [camera, requestCamera] = useCameraPermissions();
  // Mikrofon dan notifikasi belum punya fitur di aplikasi; pilihan hanya dicatat.
  const [microphone, setMicrophone] = useState<boolean>(false);
  const [notification, setNotification] = useState<boolean>(false);

  function goTo(next: Step): void {
    setMoving(true);
    Animated.timing(scroll, {
      toValue: STEP_SCROLL[next] ?? 0,
      duration: 700,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start((): void => setMoving(false));
    setStep(next);
  }

  async function askPermission(kind: "location" | "camera"): Promise<void> {
    try {
      if (kind === "location") await requestLocation();
      else await requestCamera();
    } catch (cause: unknown) {
      console.warn("gea_permission_failed", {
        kind,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  async function finishPermissions(): Promise<void> {
    // Lokasi dan kamera wajib: tanyakan sekali lagi bila belum pernah ditanya.
    if (location?.granted !== true && location?.canAskAgain !== false) {
      await askPermission("location");
    }
    if (camera?.granted !== true && camera?.canAskAgain !== false) {
      await askPermission("camera");
    }
    goTo(3);
    onCheckLocation();
  }

  const welcomeY = Animated.multiply(scroll, -1);
  const canvasY = Animated.multiply(Animated.add(scroll, CANVAS_SHIFT), -1);
  const shape4Opacity = scroll.interpolate({
    inputRange: [STEP_SCROLL[2] ?? 0, STEP_SCROLL[3] ?? 0],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View ref={rootRef} style={[styles.root, { backgroundColor: step === 0 ? componentColors.welcomeBackground : colors.primary[300] }]}>
      <View
        style={[
          styles.stage,
          {
            left: (width - FRAME_W) / 2,
            top: (height - FRAME_H) / 2,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Langkah 2–4: kanvas panjang yang digulir. */}
        <Animated.View style={[styles.canvas, { transform: [{ translateY: canvasY }] }]}>
          <SceneIllustrations />
          <PathTexts onNext={(): void => goTo(2)} disabled={moving || step !== 1} />
          <Animated.View style={[styles.full, { opacity: Animated.subtract(1, shape4Opacity) }]} pointerEvents="none">
            <SceneLayer layer={{ src: img.shapeStep3, left: -109, top: 2501, width: 607.035, height: 449.5 }} />
          </Animated.View>
          <Animated.View style={[styles.full, { opacity: shape4Opacity }]} pointerEvents="none">
            <SceneLayer layer={{ src: img.shapeStep4, left: -117, top: 2501.57, width: 623, height: 521.43 }} />
          </Animated.View>
          {/* Konten izin tidak ada di frame Onboarding #4, jadi memudar saat bergeser. */}
          <Animated.View pointerEvents="box-none" style={[styles.full, { opacity: Animated.subtract(1, shape4Opacity) }]}>
          <PermissionStep
            top={1846}
            location={location?.granted === true}
            camera={camera?.granted === true}
            microphone={microphone}
            notification={notification}
            onLocation={(): void => void askPermission("location")}
            onCamera={(): void => void askPermission("camera")}
            onMicrophone={(): void => setMicrophone((value: boolean): boolean => !value)}
            onNotification={(): void => setNotification((value: boolean): boolean => !value)}
            onNext={(): void => void finishPermissions()}
            disabled={moving || step !== 2}
          />
          </Animated.View>
          <LocationStep
            top={2636}
            checking={checkingLocation || step !== 3}
            onNext={onDone}
          />
        </Animated.View>

        {/* Langkah 1: Selamat datang (Onboarding #1). */}
        <Animated.View style={[styles.welcome, { transform: [{ translateY: welcomeY }] }]}>
          <Image
            accessible={false}
            source={img.welcomeBackground}
            contentFit="fill"
            style={styles.welcomeBackground}
          />
          <SceneLayer layer={{ src: img.welcomeBone, left: 278, top: 216, width: 77.572, height: 75.212, inner: { width: 30.357, height: 77.745 }, rotate: 132.98 }} />
          <View style={styles.welcomeText}>
            <GeaText variant="display42" color={colors.tertiary[300]} style={styles.welcomeTitle}>
              Selamat Datang di GEA!
            </GeaText>
            <GeaText variant="body16" color={componentColors.bodyDark} style={styles.center}>
              Teman jalan-jalanmu keliling Museum Geologi Bandung.
            </GeaText>
          </View>
          <NextButton
            top={734}
            left={86.5}
            label="Jelajah lebih jauh!"
            arrow
            disabled={moving || step !== 0}
            onPress={(): void => goTo(1)}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function NextButton(
  { top, left = 89, label, arrow, disabled, onPress }: {
    readonly top: number;
    readonly left?: number;
    readonly label: string;
    readonly arrow: boolean;
    readonly disabled: boolean;
    readonly onPress: () => void;
  },
): ReactElement {
  return (
    <View style={[styles.buttonGroup, { top, left }]}>
      <Button
        appearance="fill"
        tone="primary"
        label={label}
        onPress={onPress}
        disabled={disabled}
        style={styles.button}
      />
      {arrow && (
        <Image accessible={false} source={img.arrowDown} style={styles.arrow} />
      )}
    </View>
  );
}

/** Onboarding #2: teks di sepanjang jalur fosil. */
function PathTexts(
  { onNext, disabled }: { readonly onNext: () => void; readonly disabled: boolean },
): ReactElement {
  return (
    <>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 151, top: 1095, width: 196, textAlign: "right" }]}>
        JELAJAHI
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 31, top: 1278, width: 196 }]}>
        Jejak
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 193, top: 1464, width: 154, textAlign: "right" }]}>
        WAKTU
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 55, top: 1611, width: 154 }]}>
        BUMI
      </GeaText>
      <GeaText variant="body16" color={componentColors.bodyDark} style={[styles.abs, styles.center, { left: 34, top: 1671, width: 323 }]}>
        Ikuti rute sesuai waktumu, buka cerita tiap ruangan, dan selesaikan misi untuk mengumpulkan lencana.
      </GeaText>
      <NextButton top={1755} label="Lanjut" arrow disabled={disabled} onPress={onNext} />
    </>
  );
}

type PermissionProps = {
  readonly top: number;
  readonly location: boolean;
  readonly camera: boolean;
  readonly microphone: boolean;
  readonly notification: boolean;
  readonly onLocation: () => void;
  readonly onCamera: () => void;
  readonly onMicrophone: () => void;
  readonly onNotification: () => void;
  readonly onNext: () => void;
  readonly disabled: boolean;
};

/** Onboarding #3: izin. */
function PermissionStep(props: PermissionProps): ReactElement {
  const { top, disabled } = props;
  return (
    <>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, styles.upper, { left: 39, top: top + 89, width: 321 }]}>
        IZINKAN GEA membantu perjalanAN mu!
      </GeaText>
      <View style={[styles.cards, { top: top + 238 }]}>
        <PoiCard
          title="LOKASI"
          badge="WAJIB"
          icon={img.permLocation}
          description="Mendeteksi saat kamu tiba di museum dan mendekati ruangan"
          checked={props.location}
          actionLabel="Izinkan lokasi"
          onPressAction={disabled ? undefined : props.onLocation}
        />
        <PoiCard
          title="KAMERA"
          badge="WAJIB"
          icon={img.permCamera}
          description="Scan QR ruangan dan misi scan item koleksi"
          checked={props.camera}
          actionLabel="Izinkan kamera"
          onPressAction={disabled ? undefined : props.onCamera}
        />
        <PoiCard
          title="mikrofon"
          icon={img.permMicrophone}
          description="Perintah suara saat kamu tidak ingin menyentuh layar"
          checked={props.microphone}
          actionLabel="Izinkan mikrofon"
          onPressAction={disabled ? undefined : props.onMicrophone}
        />
        <PoiCard
          title="notifikasi"
          icon={img.permNotification}
          description="Memberi tahu saat kamu mendekati koleksi atau rute berubah"
          checked={props.notification}
          actionLabel="Izinkan notifikasi"
          onPressAction={disabled ? undefined : props.onNotification}
        />
      </View>
      <NextButton top={top + 728} label="Lanjut" arrow disabled={disabled} onPress={props.onNext} />
    </>
  );
}

/** Onboarding #4: sedang mengecek lokasi. Lingkaran berdenyut selama pengecekan. */
function LocationStep(
  { top, checking, onNext }: {
    readonly top: number;
    readonly checking: boolean;
    readonly onNext: () => void;
  },
): ReactElement {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect((): (() => void) => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    if (checking) loop.start();
    else pulse.setValue(0);
    return (): void => loop.stop();
  }, [checking, pulse]);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <>
      <GeaText variant="display42" color={colors.secondaryGreen[100]} style={[styles.abs, styles.upper, styles.center, { left: 34, top: top + 90, width: 321 }]}>
        sedang mengecek lokasi mu
      </GeaText>
      <Image accessible={false} source={img.map} contentFit="fill" style={[styles.abs, { left: 51.23, top: top + 293.25, width: 288.6, height: 288.5 }]} />
      <Animated.View pointerEvents="none" style={[styles.abs, { left: 105, top: top + 365, width: 182, height: 182, transform: [{ scale: ringScale }] }]}>
        <Image accessible={false} source={img.ring1118} style={styles.fill} />
      </Animated.View>
      <Image accessible={false} source={img.ring1117} style={[styles.abs, { left: 145, top: top + 396, width: 100, height: 100 }]} />
      <Image accessible={false} source={img.ring1116} style={[styles.abs, { left: 162, top: top + 413, width: 66, height: 66 }]} />
      <Image accessible={false} source={img.pin} style={[styles.abs, { left: 171.5, top: top + 414.5, width: 48, height: 48 }]} />
      <GeaText
        variant="body16"
        color={componentColors.bodyDark}
        accessibilityLiveRegion="polite"
        style={[styles.abs, styles.center, { left: 34, top: top + 644, width: 323 }]}
      >
        Tunggu terlebih dahulu ya...
      </GeaText>
      <NextButton top={top + 728} label="Lanjut" arrow={false} disabled={checking} onPress={onNext} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  stage: { position: "absolute", width: FRAME_W, height: FRAME_H },
  canvas: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FRAME_W,
    height: CANVAS_H,
    backgroundColor: colors.primary[300],
  },
  full: { position: "absolute", left: 0, top: 0, width: FRAME_W, height: CANVAS_H },
  welcome: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FRAME_W,
    height: FRAME_H,
    backgroundColor: componentColors.welcomeBackground,
  },
  welcomeBackground: { position: "absolute", left: 0, top: -230, width: FRAME_W, height: 1143 },
  welcomeText: {
    position: "absolute",
    left: 0,
    top: 17,
    width: FRAME_W,
    height: 267,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[48],
    gap: spacing[16],
    alignItems: "center",
  },
  welcomeTitle: { width: 352, textAlign: "center" },
  center: { textAlign: "center" },
  upper: { textTransform: "uppercase" },
  abs: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
  buttonGroup: {
    position: "absolute",
    width: 212,
    alignItems: "center",
    gap: 11,
  },
  button: { alignSelf: "stretch", paddingHorizontal: 42 },
  arrow: { width: 24, height: 24 },
  cards: { position: "absolute", left: 39, width: 312, gap: spacing[16] },
});
