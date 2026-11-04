import type { ReactElement } from "react";
import { Image, Text, View } from "react-native";
import type { PoiSummary } from "../../domain/contracts";
import { styles } from "../../theme/styles";

type PoiCardProps = { readonly poi: PoiSummary };
export function PoiCard({ poi }: PoiCardProps): ReactElement {
  return (
    <View style={styles.poiCard}>
      <Image
        accessibilityLabel={poi.nama}
        source={{ uri: poi.photoUrl }}
        style={styles.poiImage}
      />
      <View style={styles.poiBody}>
        <Text style={styles.noticeTitle}>{poi.nama}</Text>
        <Text style={styles.body}>
          {poi.estimasi_durasi} menit · Cerita dan narasi
        </Text>
      </View>
    </View>
  );
}
