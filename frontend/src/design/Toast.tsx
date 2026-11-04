import { Image } from "expo-image";
import { type ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, spacing } from "./tokens";
import { GeaText } from "./typography";

export type ToastTone = "danger" | "success";

const tones = {
  danger: {
    background: componentColors.toastDangerBackground,
    accent: colors.danger[400],
    icon: require("../../assets/design/toast-danger-icon.svg") as number,
    close: require("../../assets/design/toast-danger-close.svg") as number,
    // Kotak ikon dan rotasi persis seperti "Toast 1".
    iconFrame: { left: 0, top: 0, width: 42.406, height: 40.098 },
    iconSize: { width: 34.384, height: 30.703 },
    rotate: "-18.68deg",
  },
  success: {
    background: componentColors.toastSuccessBackground,
    accent: colors.success[500],
    icon: require("../../assets/design/toast-success-icon.svg") as number,
    close: require("../../assets/design/toast-success-close.svg") as number,
    // "Toast 2".
    iconFrame: { left: -5, top: -5.69, width: 47.21, height: 50.906 },
    iconSize: { width: 34, height: 40.922 },
    rotate: "-22.82deg",
  },
} as const;

type ToastProps = {
  readonly tone: ToastTone;
  readonly title: string;
  readonly description: string;
  readonly onClose: () => void;
};

export function Toast({ tone, title, description, onClose }: ToastProps): ReactElement {
  const spec = tones[tone];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: spec.background, borderColor: spec.accent }]}
    >
      <View style={styles.iconBox}>
        <View style={[styles.iconFrame, spec.iconFrame]}>
          <Image
            accessible={false}
            source={spec.icon}
            style={[spec.iconSize, { transform: [{ rotate: spec.rotate }] }]}
          />
        </View>
      </View>
      <View style={styles.content}>
        <GeaText variant="bold16" color={spec.accent}>{title}</GeaText>
        <GeaText variant="body14" color={colors.greys[300]}>{description}</GeaText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tutup notifikasi"
        hitSlop={8}
        onPress={onClose}
        style={styles.close}
      >
        <Image accessible={false} source={spec.close} style={styles.closeRing} />
        <GeaText variant="body16" color={spec.accent} style={styles.closeX}>X</GeaText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    overflow: "hidden",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderWidth: 2,
    borderRadius: radius.control,
  },
  iconBox: { width: 42.697, height: 40 },
  iconFrame: { position: "absolute", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, gap: spacing[4] },
  close: { width: 32, height: 31 },
  closeRing: { position: "absolute", left: 0, top: 0, width: 32, height: 31 },
  closeX: { position: "absolute", left: 12, top: 6.5 },
});
