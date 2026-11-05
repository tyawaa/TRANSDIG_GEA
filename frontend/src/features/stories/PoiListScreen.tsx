import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import type { PoiSummary } from "../../domain/contracts";
import { emptyProgress, type PoiProgress } from "./progress";
import { styles } from "../../theme/styles";
import { PoiCard } from "./PoiCard";

type PoiListScreenProps = {
  readonly pois: readonly PoiSummary[];
  readonly progress: { readonly [poiId: string]: PoiProgress };
  readonly onOpen: (poiId: string) => void;
  readonly onBack: () => void;
};
export function PoiListScreen(
  { pois, progress, onOpen, onBack }: PoiListScreenProps,
): ReactElement {
  return (
    <View style={styles.stories}>
      <Pressable
        accessibilityRole="button"
        onPress={(): void => onBack()}
      >
        <Text style={styles.back}>← Kembali</Text>
      </Pressable>
      <Text style={styles.eyebrow}>CERITA DI SEKITARMU</Text>
      <Text style={styles.title}>Kenali koleksi museum</Text>
      <Text style={styles.body}>
        {pois.length} koleksi tersedia untuk dijelajahi.
      </Text>
      {pois.length === 0 && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            Cerita sedang disiapkan
          </Text>
          <Text style={styles.noticeBody}>
            Belum ada koleksi yang diterbitkan. Konten akan muncul setelah
            disiapkan tim museum.
          </Text>
        </View>
      )}
      {pois.map((poi: PoiSummary): ReactElement => (
        <PoiCard
          key={poi.id_poi}
          poi={poi}
          progress={progress[poi.id_poi] ?? emptyProgress}
          onPress={(): void => onOpen(poi.id_poi)}
        />
      ))}
    </View>
  );
}
