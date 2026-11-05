import { Image } from "expo-image";
import { type ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { colors, componentColors, radius, shadows, spacing } from "./tokens";
import { GeaText } from "./typography";

type PoiCardProps = {
  readonly title: string;
  readonly description: string;
  /** Chip hijau di samping judul, contoh "WAJIB". */
  readonly badge?: string;
  /** Ikon 32 px di kiri. Default: ikon lokasi. */
  readonly icon?: number;
  /** Kotak di kanan kartu. */
  readonly onPressAction?: (() => void) | undefined;
  readonly actionLabel?: string;
  /** Figma belum punya tampilan tercentang; sementara tanda ✓ hijau di dalam kotak. */
  readonly checked?: boolean;
};

/** "Card 1" di Figma: ikon, judul Ellak, chip, deskripsi, dan kotak aksi. */
export function PoiCard(
  {
    title,
    description,
    badge,
    icon,
    onPressAction,
    actionLabel,
    checked = false,
  }: PoiCardProps,
): ReactElement {
  return (
    <View style={styles.poiCard}>
      <View style={styles.poiHeader}>
        <Image
          accessible={false}
          source={icon ?? require("../../assets/design/location.svg")}
          style={styles.location}
        />
        <View style={styles.poiContent}>
          <View style={styles.titleRow}>
            <GeaText variant="heading20" color={colors.secondaryGreen[900]}>
              {title}
            </GeaText>
            {badge !== undefined && <Chip label={badge} tone="green" />}
          </View>
          <GeaText variant="caption12" color={componentColors.cardCaption}>
            {description}
          </GeaText>
        </View>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={actionLabel ?? title}
        accessibilityState={{ checked }}
        disabled={onPressAction === undefined}
        hitSlop={10}
        onPress={onPressAction}
        style={styles.action}
      >
        {checked && (
          <GeaText variant="bold16" color={colors.secondaryGreen[900]} style={styles.check}>
            ✓
          </GeaText>
        )}
      </Pressable>
    </View>
  );
}

type ContentCardProps = {
  readonly title: string;
  readonly body: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

/** "Card 2" di Figma: judul Ellak 28, isi, dan tombol secondary di kanan bawah. */
export function ContentCard(
  { title, body, actionLabel, onAction }: ContentCardProps,
): ReactElement {
  return (
    <View style={styles.contentCard}>
      <GeaText variant="heading28" color={colors.tertiary[200]} style={styles.full}>
        {title}
      </GeaText>
      <GeaText variant="body16Tight" color={componentColors.cardBody} style={styles.full}>
        {body}
      </GeaText>
      {actionLabel !== undefined && onAction !== undefined && (
        <Button
          appearance="fill"
          tone="secondary"
          label={actionLabel}
          onPress={onAction}
          style={styles.end}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  poiCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    padding: spacing[12],
    backgroundColor: colors.primary[0],
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: radius.control,
    boxShadow: shadows.card,
  },
  poiHeader: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[8] },
  location: { width: 32, height: 32 },
  poiContent: { flex: 1, gap: spacing[4] },
  titleRow: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: spacing[8] },
  action: {
    width: 24,
    height: 24,
    backgroundColor: colors.secondaryYellow[0],
    borderWidth: 2,
    borderColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
  },
  check: { lineHeight: 18 },
  contentCard: {
    width: "100%",
    alignItems: "flex-end",
    gap: spacing[12],
    overflow: "hidden",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    backgroundColor: colors.primary[0],
    borderRadius: radius.control,
  },
  full: { alignSelf: "stretch" },
  end: { alignSelf: "flex-end" },
});
