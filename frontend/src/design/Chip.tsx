import { type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "./tokens";
import { GeaText } from "./typography";

// Lima chip di Figma (frame "Chips"), urut dari atas.
export type ChipTone = "green" | "tertiary" | "brown" | "danger" | "warning";

const tones: Record<ChipTone, { readonly background: string; readonly text: string }> = {
  green: { background: colors.secondaryGreen[900], text: colors.secondaryYellow[0] },
  tertiary: { background: colors.tertiary[200], text: colors.secondaryYellow[0] },
  brown: { background: colors.primary[700], text: colors.secondaryYellow[0] },
  danger: { background: colors.danger[400], text: colors.secondaryYellow[0] },
  warning: { background: colors.warning[300], text: colors.black },
};

export function Chip(
  { label, tone }: { readonly label: string; readonly tone: ChipTone },
): ReactElement {
  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].background }]}>
      <GeaText variant="chip10" color={tones[tone].text}>{label}</GeaText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
