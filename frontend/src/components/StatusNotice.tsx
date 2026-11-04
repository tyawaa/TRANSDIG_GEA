import type { ReactElement } from "react";
import { Text, View } from "react-native";
import type { AccessDecision, DecisionMessage } from "../domain/contracts";
import { styles } from "../theme/styles";

type StatusNoticeProps = {
  readonly notice: DecisionMessage | null;
  readonly decision: AccessDecision | null;
  readonly error: string | null;
};
export function StatusNotice(
  { notice, decision, error }: StatusNoticeProps,
): ReactElement {
  return (
    <>
      {notice !== null && (
        <View accessibilityLiveRegion="polite" style={styles.notice}>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeBody}>{notice.description}</Text>
          {decision?.accuracyMeters !== null &&
            decision?.accuracyMeters !== undefined && (
            <Text style={styles.accuracy}>
              Akurasi GPS: {decision.accuracyMeters.toFixed(1)} m
            </Text>
          )}
        </View>
      )}
      {error !== null && (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </>
  );
}
