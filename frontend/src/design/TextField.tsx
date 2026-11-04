import { Image } from "expo-image";
import { type ReactElement, useState } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
} from "react-native";
import { colors, componentColors, radius, spacing } from "./tokens";
import { GeaText, textStyles, useFont } from "./typography";

type TextFieldProps =
  & Omit<TextInputProps, "style" | "placeholderTextColor">
  & {
    /** Label di atas field (varian "Label"). Kosongkan untuk varian "No Label". */
    readonly label?: string;
    /** Varian "Search Bar": ikon cari di kanan. */
    readonly search?: boolean;
  };

/** Field Figma: 44 px, border Primary/400, menjadi Primary/800 saat aktif (fokus). */
export function TextField(
  { label, search = false, onFocus, onBlur, ...input }: TextFieldProps,
): ReactElement {
  const [focused, setFocused] = useState<boolean>(false);
  const font: TextStyle = useFont(textStyles.body16.font);

  return (
    <View style={styles.wrapper}>
      {label !== undefined && (
        <GeaText variant="label16" color={componentColors.fieldLabel}>
          {label}
        </GeaText>
      )}
      <View
        style={[
          styles.field,
          { borderColor: focused ? colors.primary[800] : colors.primary[400] },
        ]}
      >
        <TextInput
          {...input}
          accessibilityLabel={input.accessibilityLabel ?? label}
          placeholderTextColor={componentColors.fieldPlaceholder}
          style={[styles.input, font]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {search && (
          <Image
            accessible={false}
            source={require("../../assets/design/search-normal.svg")}
            style={styles.icon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", gap: spacing[8] },
  field: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: spacing[16],
    paddingVertical: 10,
    backgroundColor: colors.secondaryYellow[0],
    borderWidth: 1,
    borderRadius: radius.control,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: textStyles.body16.fontSize,
    // Warna teks ketikan tidak didefinisikan di Figma; memakai token Black.
    color: colors.black,
  },
  icon: { width: 24, height: 24 },
});
