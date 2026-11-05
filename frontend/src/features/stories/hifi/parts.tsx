import { Image } from "expo-image";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { colors, componentColors, radius } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { mediaSource } from "../../../services/media";
import { backArrow } from "./backgrounds";

export const FRAME_W = 390;
export const FRAME_H = 844;

/** Frame Figma 390 × 844 yang diskalakan agar muat di layar. */
export function FrameStage(
  { background, children }: { readonly background: string; readonly children: ReactNode },
): ReactElement {
  const { width, height } = useWindowDimensions();
  const scale: number = Math.min(width / FRAME_W, height / FRAME_H);
  const rootRef = useRef<View>(null);

  // Web: browser bisa menggulir kontainer overflow hidden saat elemen difokus. Kunci di 0.
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

  return (
    <View ref={rootRef} style={[styles.root, { backgroundColor: background }]}>
      <View
        style={[
          styles.stage,
          { left: (width - FRAME_W) / 2, top: (height - FRAME_H) / 2, transform: [{ scale }] },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Tombol Story di Figma: hijau, Qanelas Medium, tanpa bayangan. */
export function StoryButton(
  { label, onPress, disabled = false, style }: {
    readonly label: string;
    readonly onPress: () => void;
    readonly disabled?: boolean;
    readonly style?: StyleProp<ViewStyle>;
  },
): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled
            ? colors.greys[200]
            : pressed
            ? colors.secondaryGreen[500]
            : colors.secondaryGreen[300],
        },
        style,
      ]}
    >
      <GeaText variant="label16" color={componentColors.bodyDark} style={styles.center}>
        {label}
      </GeaText>
    </Pressable>
  );
}

export function BackButton({ onPress }: { readonly onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      hitSlop={12}
      onPress={onPress}
      style={styles.back}
    >
      <Image accessible={false} source={backArrow} style={styles.backIcon} />
    </Pressable>
  );
}

/** Foto berbingkai hijau yang diputar, seperti "Frame 21" di Figma. */
export function PhotoFrame(
  { photoUrl, label, left, top, box, size, border, rotate }: {
    readonly photoUrl: string;
    readonly label: string;
    readonly left: number;
    readonly top: number;
    readonly box: number;
    readonly size: { readonly width: number; readonly height: number };
    readonly border: number;
    readonly rotate: number;
  },
): ReactElement {
  return (
    <View style={[styles.photoBox, { left, top, width: box, height: box }]}>
      <View
        style={[
          styles.photo,
          { width: size.width, height: size.height, borderWidth: border, transform: [{ rotate: `${rotate}deg` }] },
        ]}
      >
        <Image
          accessibilityLabel={label}
          source={mediaSource(photoUrl)}
          contentFit="cover"
          style={styles.fill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  stage: { position: "absolute", width: FRAME_W, height: FRAME_H },
  button: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 42,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  center: { textAlign: "center" },
  back: { position: "absolute", left: 15, top: 44, width: 28, height: 28 },
  backIcon: { width: 28, height: 28, transform: [{ scaleX: -1 }] },
  photoBox: { position: "absolute", alignItems: "center", justifyContent: "center" },
  photo: {
    overflow: "hidden",
    borderColor: colors.secondaryGreen[300],
    borderRadius: 2,
    backgroundColor: colors.primary[100],
  },
  fill: { width: "100%", height: "100%" },
});
