import { useFonts } from "expo-font";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import {
  StyleSheet,
  Text as NativeText,
  type TextProps,
  type TextStyle,
} from "react-native";

// Font dari Figma: Ellak (heading), Qanelas (subheading, body, caption),
// Qanelas Soft Bold (label tombol).
export type FontName =
  | "Ellak-Regular"
  | "Qanelas-Regular"
  | "Qanelas-Medium"
  | "Qanelas-SemiBold"
  | "Qanelas-Bold"
  | "QanelasSoft-Bold";

/**
 * File font di assets/fonts. Font yang belum ada memakai pengganti di bawah,
 * atau font sistem dengan ketebalan yang sama.
 */
const fontFiles: Partial<Record<FontName, number>> = {
  "Ellak-Regular": require("../../assets/fonts/Ellak-Regular.ttf") as number,
  "Qanelas-Regular": require("../../assets/fonts/Qanelas-Regular.otf") as number,
  "Qanelas-Medium": require("../../assets/fonts/Qanelas-Medium.otf") as number,
  "Qanelas-SemiBold": require("../../assets/fonts/Qanelas-SemiBold.otf") as number,
  "Qanelas-Bold": require("../../assets/fonts/Qanelas-Bold.otf") as number,
  // "QanelasSoft-Bold": file belum ada.
};

// Sementara Qanelas Soft Bold belum ada, label tombol memakai Qanelas Bold.
const substitutes: Partial<Record<FontName, FontName>> = {
  "QanelasSoft-Bold": "Qanelas-Bold",
};

const fallbackWeight: Record<FontName, TextStyle["fontWeight"]> = {
  "Ellak-Regular": "400",
  "Qanelas-Regular": "400",
  "Qanelas-Medium": "500",
  "Qanelas-SemiBold": "600",
  "Qanelas-Bold": "700",
  "QanelasSoft-Bold": "700",
};

const FontsReady = createContext<boolean>(false);

/** Pasang sekali di akar aplikasi. Anak tetap dirender saat font dimuat. */
export function GeaFontsProvider(
  { children }: { readonly children: ReactNode },
): ReactElement {
  const [loaded, error] = useFonts(fontFiles);
  if (error !== null) {
    console.error("gea_font_load_failed", { error: error.message });
  }
  return (
    <FontsReady.Provider value={loaded && error === null}>
      {children}
    </FontsReady.Provider>
  );
}

export function useFont(name: FontName): TextStyle {
  const ready: boolean = useContext(FontsReady);
  if (!ready) return { fontWeight: fallbackWeight[name] };
  if (name in fontFiles) return { fontFamily: name };
  const substitute: FontName | undefined = substitutes[name];
  if (substitute !== undefined && substitute in fontFiles) {
    return { fontFamily: substitute };
  }
  return { fontWeight: fallbackWeight[name] };
}

// Gaya teks yang benar-benar dipakai komponen di Figma.
export const textStyles = {
  display42: { font: "Ellak-Regular", fontSize: 42, lineHeight: 42 },
  heading20: { font: "Ellak-Regular", fontSize: 20 },
  heading24: { font: "Ellak-Regular", fontSize: 24 },
  heading28: { font: "Ellak-Regular", fontSize: 28, lineHeight: 34 },
  label16: { font: "Qanelas-Medium", fontSize: 16 },
  body16: { font: "Qanelas-Regular", fontSize: 16 },
  body16Tight: { font: "Qanelas-Regular", fontSize: 16, lineHeight: 19 },
  bold16: { font: "Qanelas-Bold", fontSize: 16 },
  body14: { font: "Qanelas-Regular", fontSize: 14 },
  caption12: { font: "Qanelas-Regular", fontSize: 12 },
  chip10: { font: "Qanelas-Regular", fontSize: 10, lineHeight: 10 },
  button16: { font: "QanelasSoft-Bold", fontSize: 16 },
} as const satisfies Record<
  string,
  { font: FontName; fontSize: number; lineHeight?: number }
>;
export type TextVariant = keyof typeof textStyles;

type GeaTextProps = TextProps & {
  readonly variant: TextVariant;
  readonly color: string;
};

/** Teks dengan font dan ukuran dari design system. */
export function GeaText(
  { variant, color, style, ...rest }: GeaTextProps,
): ReactElement {
  const spec = textStyles[variant];
  const font: TextStyle = useFont(spec.font);
  return (
    <NativeText
      {...rest}
      style={[
        font,
        {
          fontSize: spec.fontSize,
          color,
        },
        "lineHeight" in spec ? { lineHeight: spec.lineHeight } : styles.none,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ none: {} });
