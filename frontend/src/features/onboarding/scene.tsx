import { Image } from "expo-image";
import type { ReactElement } from "react";
import { View } from "react-native";

// Ilustrasi onboarding dari Figma (Hifi - Sprint 1, Onboarding #2–#4).
// Semua koordinat dalam piksel frame 390 px, sama dengan Figma.

export type Layer = {
  readonly src: number;
  readonly left: number;
  readonly top: number;
  /** Kotak luar (setelah rotasi). */
  readonly width: number;
  readonly height: number;
  /** Ukuran gambar sebelum rotasi; kosong = sama dengan kotak luar. */
  readonly inner?: { readonly width: number; readonly height: number };
  readonly rotate?: number;
  readonly flipY?: boolean;
};

const a = {
  v1557: require("../../../assets/onboarding/v1557.svg") as number,
  v1558: require("../../../assets/onboarding/v1558.svg") as number,
  v1559: require("../../../assets/onboarding/v1559.svg") as number,
  v1560: require("../../../assets/onboarding/v1560.svg") as number,
  v1561: require("../../../assets/onboarding/v1561.svg") as number,
  v1562: require("../../../assets/onboarding/v1562.svg") as number,
  v1563: require("../../../assets/onboarding/v1563.svg") as number,
  v1564: require("../../../assets/onboarding/v1564.svg") as number,
  v1565: require("../../../assets/onboarding/v1565.svg") as number,
  v1566: require("../../../assets/onboarding/v1566.svg") as number,
  v1567: require("../../../assets/onboarding/v1567.svg") as number,
  v1568: require("../../../assets/onboarding/v1568.svg") as number,
  v1569: require("../../../assets/onboarding/v1569.svg") as number,
  v1570: require("../../../assets/onboarding/v1570.svg") as number,
  v1571: require("../../../assets/onboarding/v1571.svg") as number,
  v1572: require("../../../assets/onboarding/v1572.svg") as number,
  v1574: require("../../../assets/onboarding/v1574.svg") as number,
  v1575: require("../../../assets/onboarding/v1575.svg") as number,
  v1583: require("../../../assets/onboarding/v1583.svg") as number,
  v1584: require("../../../assets/onboarding/v1584.svg") as number,
  v1585: require("../../../assets/onboarding/v1585.svg") as number,
  v1588: require("../../../assets/onboarding/v1588.svg") as number,
  v1589: require("../../../assets/onboarding/v1589.svg") as number,
  v1590: require("../../../assets/onboarding/v1590.svg") as number,
  group477: require("../../../assets/onboarding/group477.svg") as number,
  group479: require("../../../assets/onboarding/group479.svg") as number,
  group480: require("../../../assets/onboarding/group480.svg") as number,
  group487: require("../../../assets/onboarding/group487.svg") as number,
  arrowDown: require("../../../assets/onboarding/arrow-down.svg") as number,
};

/** Urutan sama dengan layer Figma (yang di bawah lebih dulu). */
const sceneLayers: readonly Layer[] = [
  { src: a.v1584, left: -110.19, top: 1570.06, width: 665.115, height: 401.65, inner: { width: 640.787, height: 355.675 }, rotate: 4.2, flipY: true },
  { src: a.v1583, left: -103.04, top: 846, width: 607.035, height: 449.5 },
  { src: a.v1585, left: -147, top: 103, width: 673.909, height: 420.785, inner: { width: 648.236, height: 374.314 }, rotate: -4.2 },
  { src: a.v1567, left: 281, top: 757, width: 13, height: 16 },
  { src: a.v1565, left: 44.14, top: 760.01, width: 75.96, height: 82.147, inner: { width: 30.079, height: 82.117 }, rotate: 40.18 },
  { src: a.v1557, left: 296, top: 547, width: 42.579, height: 24.632 },
  { src: a.v1589, left: 22, top: 387, width: 29, height: 16.776, rotate: 180, flipY: true },
  { src: a.v1568, left: 58, top: 645, width: 30.719, height: 21.323 },
  { src: a.v1558, left: 70, top: 573, width: 19.277, height: 22.454 },
  { src: a.v1558, left: 229, top: 468, width: 19.277, height: 22.454 },
  { src: a.v1558, left: 348, top: 464, width: 19.277, height: 22.454 },
  { src: a.v1566, left: -15, top: 642, width: 23.967, height: 25.27, inner: { width: 13, height: 22 }, rotate: -39.12 },
  { src: a.v1559, left: 32, top: 734, width: 15.211, height: 15.116 },
  { src: a.v1570, left: 47, top: 708, width: 7.044, height: 7 },
  { src: a.v1570, left: 164, top: 815, width: 7.044, height: 7 },
  { src: a.v1570, left: 368, top: 718, width: 7.044, height: 7 },
  { src: a.v1569, left: 358, top: 667, width: 10, height: 9.938 },
  { src: a.v1560, left: 357, top: 773, width: 10.595, height: 12.017 },
  { src: a.v1561, left: 250, top: 683, width: 165.82, height: 237.265, inner: { width: 116.385, height: 215.226 }, rotate: 14.26 },
  { src: a.v1575, left: 64, top: 852, width: 237.265, height: 165.82, inner: { width: 116.385, height: 215.226 }, rotate: -75.74 },
  { src: a.v1562, left: 0, top: 737, width: 47.053, height: 99.115, inner: { width: 37.398, height: 95.776 }, rotate: -5.91 },
  { src: a.v1574, left: 49, top: 475, width: 102.772, height: 71.924, inner: { width: 37.398, height: 95.776 }, rotate: 66.94 },
  { src: a.v1588, left: -29, top: 262, width: 77.117, height: 102.267, inner: { width: 37.398, height: 95.776 }, rotate: 152.74 },
  { src: a.v1563, left: 326.88, top: 599.18, width: 78.561, height: 64.271, inner: { width: 37.398, height: 69.141 }, rotate: 63.56 },
  { src: a.v1564, left: 197, top: 832, width: 7.464, height: 6.563 },
  { src: a.v1564, left: 222, top: 547, width: 7.464, height: 6.563 },
  { src: a.group477, left: 56.76, top: 569.13, width: 276.304, height: 239.153, inner: { width: 249.945, height: 206.265 }, rotate: -8.03 },
  { src: a.group479, left: 291, top: 836, width: 105.185, height: 104.591, inner: { width: 81.441, height: 80.39 }, rotate: 21.43 },
  { src: a.group480, left: -34, top: 486, width: 98.379, height: 97.749, inner: { width: 77.864, height: 76.86 }, rotate: -18.68 },
  { src: a.arrowDown, left: 180, top: 990, width: 24, height: 24 },
  // Jalur fosil (geometri Onboarding #2).
  { src: a.group487, left: 6, top: 1128, width: 380.935, height: 490.31 },
  { src: a.v1561, left: -64, top: 1284, width: 165.82, height: 237.265, inner: { width: 116.385, height: 215.226 }, rotate: 14.26 },
  { src: a.v1557, left: 360, top: 1616, width: 42.579, height: 24.632 },
  { src: a.v1590, left: 291, top: 1424, width: 77.572, height: 75.212, inner: { width: 30.357, height: 77.745 }, rotate: 132.98 },
  { src: a.v1571, left: 63, top: 1079, width: 100.512, height: 52.184, inner: { width: 37.398, height: 95.776 }, rotate: 80.83 },
  { src: a.v1560, left: 361, top: 1586, width: 10.595, height: 12.017 },
  { src: a.v1572, left: 32, top: 1755, width: 15.211, height: 15.116 },
];

export function SceneLayer({ layer }: { readonly layer: Layer }): ReactElement {
  const inner = layer.inner ?? { width: layer.width, height: layer.height };
  const transform = [
    ...(layer.rotate === undefined ? [] : [{ rotate: `${layer.rotate}deg` }]),
    ...(layer.flipY === true ? [{ scaleY: -1 }] : []),
  ];
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: layer.left,
        top: layer.top,
        width: layer.width,
        height: layer.height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        accessible={false}
        source={layer.src}
        contentFit="fill"
        style={{ width: inner.width, height: inner.height, transform }}
      />
    </View>
  );
}

export function SceneIllustrations(): ReactElement {
  return (
    <>
      {sceneLayers.map((layer: Layer, index: number): ReactElement => (
        <SceneLayer key={index} layer={layer} />
      ))}
    </>
  );
}

export const onboardingAssets = {
  arrowDown: a.arrowDown,
  welcomeBackground: require("../../../assets/onboarding/welcome-bg.svg") as number,
  welcomeBone: require("../../../assets/onboarding/welcome-bone.svg") as number,
  shapeStep3: require("../../../assets/onboarding/v1586-step3.svg") as number,
  shapeStep4: require("../../../assets/onboarding/v1586-step4.svg") as number,
  permLocation: require("../../../assets/onboarding/perm-location.svg") as number,
  permCamera: require("../../../assets/onboarding/perm-camera.svg") as number,
  permMicrophone: require("../../../assets/onboarding/perm-microphone.svg") as number,
  permNotification: require("../../../assets/onboarding/perm-notification.svg") as number,
  map: require("../../../assets/onboarding/map.svg") as number,
  ring1118: require("../../../assets/onboarding/ring-1118.svg") as number,
  ring1117: require("../../../assets/onboarding/ring-1117.svg") as number,
  ring1116: require("../../../assets/onboarding/ring-1116.svg") as number,
  pin: require("../../../assets/onboarding/pin.svg") as number,
};
