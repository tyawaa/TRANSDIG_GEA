import { type ReactElement } from "react";
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "./tokens";
import { GeaText } from "./typography";

// Nama tone mengikuti frame Figma: "Button primary" (hijau), "Button secondary" (cokelat),
// "Button Danger", "Button Warning".
export type ButtonTone = "primary" | "secondary" | "danger" | "warning";

type Look = { readonly background?: string; readonly border?: string; readonly text: string };

type ToneSpec = {
  readonly fill: Look;
  readonly fillPressed: Look;
  readonly outline: Look;
  readonly outlinePressed: Look;
};

const disabledLook: Look = {
  background: colors.greys[200],
  text: componentColors.buttonTextDark,
};

const tones: Record<ButtonTone, ToneSpec> = {
  primary: {
    fill: { background: colors.secondaryGreen[300], text: componentColors.buttonTextDark },
    fillPressed: { background: colors.secondaryGreen[500], text: componentColors.buttonTextDark },
    outline: { border: colors.secondaryGreen[200], text: colors.secondaryGreen[200] },
    outlinePressed: {
      background: componentColors.outlinePressedPrimary,
      border: colors.secondaryGreen[200],
      text: colors.secondaryGreen[200],
    },
  },
  secondary: {
    fill: { background: colors.primary[800], text: colors.secondaryYellow[0] },
    fillPressed: { background: colors.primary[900], text: colors.secondaryYellow[0] },
    outline: { border: colors.primary[800], text: colors.primary[800] },
    outlinePressed: {
      background: componentColors.outlinePressedSecondary,
      border: colors.primary[800],
      text: colors.primary[800],
    },
  },
  danger: {
    fill: { background: colors.danger[400], text: colors.secondaryYellow[0] },
    fillPressed: { background: colors.danger[500], text: colors.secondaryYellow[0] },
    outline: { border: colors.danger[400], text: colors.danger[400] },
    outlinePressed: {
      background: componentColors.outlinePressedDanger,
      border: colors.danger[400],
      text: colors.danger[400],
    },
  },
  warning: {
    fill: { background: colors.warning[300], text: colors.black },
    fillPressed: { background: colors.warning[400], text: colors.black },
    outline: { border: colors.warning[300], text: colors.warning[300] },
    outlinePressed: {
      background: componentColors.outlinePressedWarning,
      border: colors.warning[300],
      text: colors.warning[300],
    },
  },
};

type CommonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly tone: ButtonTone;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
};

// Figma hanya punya varian disabled untuk tombol fill.
export type ButtonProps =
  & CommonProps
  & (
    | { readonly appearance: "fill"; readonly disabled?: boolean }
    | { readonly appearance: "outline"; readonly disabled?: never }
  );

export function Button(props: ButtonProps): ReactElement {
  const { label, onPress, tone, accessibilityLabel, style, appearance } = props;
  const disabled: boolean = appearance === "fill" && props.disabled === true;
  const spec: ToneSpec = tones[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const look: Look = disabled
          ? disabledLook
          : appearance === "fill"
          ? pressed ? spec.fillPressed : spec.fill
          : pressed
          ? spec.outlinePressed
          : spec.outline;
        return [
          styles.base,
          look.background !== undefined && { backgroundColor: look.background },
          look.border !== undefined && { borderWidth: 2, borderColor: look.border },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const look: Look = disabled
          ? disabledLook
          : appearance === "fill"
          ? pressed ? spec.fillPressed : spec.fill
          : pressed
          ? spec.outlinePressed
          : spec.outline;
        return (
          <GeaText variant="button16" color={look.text} style={styles.label}>
            {label}
          </GeaText>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.control,
    boxShadow: shadows.drop,
  },
  label: { textAlign: "center" },
});
