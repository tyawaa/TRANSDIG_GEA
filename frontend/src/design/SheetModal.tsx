import { Image } from "expo-image";
import { type ReactElement } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { colors, radius, spacing } from "./tokens";
import { GeaText } from "./typography";

type SheetContentProps = {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
};

/** Isi "Modal" di Figma (390 × 340): latar bergelombang, tengkorak, judul, teks, tombol primary. */
export function SheetContent(
  { title, description, actionLabel, onAction }: SheetContentProps,
): ReactElement {
  return (
    <View style={styles.sheet}>
      <Image
        accessible={false}
        source={require("../../assets/design/modal-background.svg")}
        contentFit="fill"
        style={styles.background}
      />
      <View style={styles.handle} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.statusIcon}>
            <Image
              accessible={false}
              source={require("../../assets/design/modal-skull.svg")}
              style={styles.skull}
            />
          </View>
          <GeaText variant="heading24" color={colors.primary[900]} style={styles.full}>
            {title}
          </GeaText>
          <GeaText variant="body16Tight" color={colors.greys[300]} style={styles.full}>
            {description}
          </GeaText>
        </View>
        <Button
          appearance="fill"
          tone="primary"
          label={actionLabel}
          onPress={onAction}
          style={styles.end}
        />
      </View>
    </View>
  );
}

type SheetModalProps = SheetContentProps & {
  readonly visible: boolean;
  readonly onClose: () => void;
};

/** Modal bawah layar. Figma tidak mendefinisikan latar gelap, jadi area di atasnya transparan. */
export function SheetModal({ visible, onClose, ...content }: SheetModalProps): ReactElement {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup"
          style={styles.dismiss}
          onPress={onClose}
        />
        <SheetContent {...content} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { width: "100%", height: 340, overflow: "hidden" },
  background: { position: "absolute", left: 1, top: 0, right: -1, height: 338 },
  handle: {
    position: "absolute",
    top: 22,
    alignSelf: "center",
    width: 47,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.greys[0],
  },
  content: {
    position: "absolute",
    left: 20,
    right: 17,
    bottom: 44,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 20,
  },
  header: { alignSelf: "stretch", gap: spacing[8] },
  statusIcon: { width: 94.352, height: 89.218, alignItems: "center", justifyContent: "center" },
  skull: { width: 76.502, height: 68.314, transform: [{ rotate: "-18.68deg" }] },
  full: { alignSelf: "stretch" },
  end: { alignSelf: "flex-end" },
});
