import { type ReactElement, type ReactNode, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  type ButtonTone,
  Chip,
  type ChipTone,
  colors,
  ContentCard,
  GeaFontsProvider,
  GeaText,
  PoiCard,
  SheetContent,
  SheetModal,
  shadows,
  spacing,
  TextField,
  Toast,
} from "./index";

// Halaman uji untuk mencocokkan komponen dengan Figma. Bukan layar aplikasi.
// Buka dengan EXPO_PUBLIC_SCREEN=design-system di .env.

const swatchRows: readonly { readonly label: string; readonly values: readonly string[] }[] = [
  { label: "Primary", values: Object.values(colors.primary) },
  { label: "Secondary", values: Object.values(colors.secondaryYellow) },
  { label: "Secondary", values: Object.values(colors.secondaryGreen) },
  { label: "Tertiary", values: Object.values(colors.tertiary) },
  { label: "Gray", values: Object.values(colors.greys) },
  { label: "Success", values: Object.values(colors.success) },
  { label: "Warning", values: Object.values(colors.warning) },
  { label: "Danger", values: Object.values(colors.danger) },
  { label: "Info", values: Object.values(colors.info) },
  { label: "Black / White", values: [colors.black, colors.white] },
];

const buttonTones: readonly ButtonTone[] = ["primary", "secondary", "danger", "warning"];
const chipTones: readonly ChipTone[] = ["green", "tertiary", "brown", "danger", "warning"];

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <View style={styles.section}>
      <GeaText variant="label16" color={colors.primary[500]}>{title}</GeaText>
      {children}
    </View>
  );
}

function Preview(): ReactElement {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const noop = (): void => undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <GeaText variant="heading28" color={colors.primary[900]}>Design System GEA</GeaText>

        <Section title="COLOR">
          {swatchRows.map((row, index) => (
            <View key={`${row.label}-${index}`} style={styles.swatchRow}>
              <GeaText variant="caption12" color={colors.black} style={styles.swatchLabel}>
                {row.label}
              </GeaText>
              <View style={styles.swatches}>
                {row.values.map((value) => (
                  <View key={value} style={[styles.swatch, { backgroundColor: value }]} />
                ))}
              </View>
            </View>
          ))}
        </Section>

        <Section title="SPACING">
          <View style={styles.spacingRow}>
            {Object.values(spacing).map((value) => (
              <View key={value} style={styles.spacingItem}>
                <View style={[styles.spacingMarker, { width: value }]} />
                <GeaText variant="caption12" color={colors.black}>{value}px</GeaText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="EFFECTS">
          <View style={styles.row}>
            <View style={[styles.effect, { boxShadow: shadows.drop }]}>
              <GeaText variant="caption12" color={colors.black}>Drop shadow</GeaText>
            </View>
            <View style={[styles.effect, { boxShadow: shadows.inner }]}>
              <GeaText variant="caption12" color={colors.black}>Inner shadow</GeaText>
            </View>
          </View>
        </Section>

        <Section title="TYPOGRAPHY">
          <GeaText variant="heading24" color={colors.primary[900]}>Ellak · heading</GeaText>
          <GeaText variant="body16" color={colors.black}>Qanelas Regular · body</GeaText>
          <GeaText variant="label16" color={colors.black}>Qanelas Medium · label</GeaText>
          <GeaText variant="bold16" color={colors.black}>Qanelas Bold · judul toast</GeaText>
          <GeaText variant="button16" color={colors.black}>Qanelas Soft Bold · tombol</GeaText>
        </Section>

        <Section title="BUTTON">
          {buttonTones.map((tone) => (
            <View key={tone} style={styles.buttonGroup}>
              <View style={styles.row}>
                <Button appearance="fill" tone={tone} label="Button CTA" onPress={noop} />
                <Button appearance="fill" tone={tone} label="Button CTA" onPress={noop} disabled />
              </View>
              <View style={styles.row}>
                <Button appearance="outline" tone={tone} label="Button CTA" onPress={noop} />
              </View>
            </View>
          ))}
          <GeaText variant="caption12" color={colors.greys[300]}>
            Tekan tombol untuk melihat state onPressed.
          </GeaText>
        </Section>

        <Section title="FIELD">
          <TextField label="Lorem Ipsum" placeholder="Lorem ipsum" />
          <TextField placeholder="Lorem ipsum" />
          <TextField search placeholder="Lorem ipsum" />
        </Section>

        <Section title="CHIPS">
          {chipTones.map((tone) => <Chip key={tone} tone={tone} label="Lorem Ipsum" />)}
        </Section>

        <Section title="CARDS">
          <PoiCard
            title="LOREM IPSUM"
            badge="WAJIB"
            description="Lorem ipsum dolor sit amet consecteture"
          />
          <ContentCard
            title="Lorem Ipsum"
            body="Lorem ipsum dolor sit amet consectetur Lorem ipsum dolor sit amet consectetur Lorem ipsum dolor sit amet consectetur"
            actionLabel="Button CTA"
            onAction={noop}
          />
        </Section>

        <Section title="TOAST">
          <Toast tone="danger" title="Lorem ipsum dolor sit amet" description="Lorem ipsum dolor sit amet" onClose={noop} />
          <Toast tone="success" title="Lorem ipsum dolor sit amet" description="Lorem ipsum dolor sit amet" onClose={noop} />
        </Section>

        <Section title="MODAL">
          <SheetContent
            title="Lorem ipsum dolor sit amet Consectetur"
            description="Lorem ipsum dolor sit amet consectetur Lorem ipsum dolor sit amet consectetur"
            actionLabel="Button CTA"
            onAction={noop}
          />
          <Button appearance="fill" tone="secondary" label="Buka modal" onPress={() => setModalOpen(true)} />
        </Section>
      </ScrollView>
      <SheetModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lorem ipsum dolor sit amet Consectetur"
        description="Lorem ipsum dolor sit amet consectetur Lorem ipsum dolor sit amet consectetur"
        actionLabel="Button CTA"
        onAction={() => setModalOpen(false)}
      />
    </SafeAreaView>
  );
}

export default function DesignSystemPreview(): ReactElement {
  return (
    <SafeAreaProvider>
      <GeaFontsProvider>
        <Preview />
      </GeaFontsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Warna latar halaman Design System di Figma.
  safe: { flex: 1, backgroundColor: colors.primary[200] },
  page: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    padding: spacing[16],
    paddingBottom: spacing[64],
    gap: spacing[32],
  },
  section: { gap: spacing[12] },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  swatchLabel: { width: 76 },
  swatches: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  swatch: { width: 28, height: 28 },
  spacingRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[12], alignItems: "flex-end" },
  spacingItem: { gap: 2 },
  spacingMarker: { height: 28, backgroundColor: "rgba(255, 0, 0, 0.25)" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[16] },
  effect: {
    width: 120,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  buttonGroup: { gap: spacing[16] },
});
