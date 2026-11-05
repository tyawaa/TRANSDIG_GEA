import type { ReactElement } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { PoiSummary } from "../../domain/contracts";
import type { PoiProgress } from "./progress";
import { imageSource } from "../../services/media";
import { styles } from "../../theme/styles";

type PoiCardProps = {
  readonly poi: PoiSummary;
  readonly progress: PoiProgress;
  readonly onPress: () => void;
};
export function PoiCard({ poi, progress, onPress }: PoiCardProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Buka cerita koleksi"
      style={styles.poiCard}
      onPress={onPress}
    >
      <Image
        accessibilityLabel={poi.nama}
        source={imageSource(poi.photoUrl)}
        resizeMode="contain"
        style={styles.poiImage}
      />
      <View style={styles.poiBody}>
        <Text style={styles.noticeTitle}>{poi.nama}</Text>
        <Text style={styles.body}>
          {poi.estimasi_durasi} menit · Cerita dan narasi
        </Text>
        {(progress.closed || progress.completed) && (
          <Text style={local.status}>
            {progress.completed
              ? "✓ Quest selesai"
              : "Kartu ditutup · quest belum selesai"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const local = StyleSheet.create({
  status: { color: "#147C70", fontSize: 12, fontWeight: "700" },
});
