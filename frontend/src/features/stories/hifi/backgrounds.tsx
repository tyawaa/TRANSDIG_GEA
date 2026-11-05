import type { ReactElement } from "react";
import { type Layer, SceneLayer } from "../../onboarding/scene";

// Latar layar Story dari Figma "Hifi - Sprint 1". Koordinat dalam frame 390 × 844.

const s = {
  v1557: require("../../../../assets/story/s1557.svg") as number,
  v1558: require("../../../../assets/story/s1558.svg") as number,
  v1559: require("../../../../assets/story/s1559.svg") as number,
  v1561: require("../../../../assets/story/s1561.svg") as number,
  v1562: require("../../../../assets/story/s1562.svg") as number,
  v1564: require("../../../../assets/story/s1564.svg") as number,
  v1565: require("../../../../assets/story/s1565.svg") as number,
  v1566: require("../../../../assets/story/s1566.svg") as number,
  v1567: require("../../../../assets/story/s1567.svg") as number,
  v1568: require("../../../../assets/story/s1568.svg") as number,
  v1570: require("../../../../assets/story/s1570.svg") as number,
  v1574: require("../../../../assets/story/s1574.svg") as number,
  v1575: require("../../../../assets/story/s1575.svg") as number,
};

/** Latar Story Summary / Isi / Selesai / Side Quest (frame 44:686). */
const storyLayers: readonly Layer[] = [
  { src: s.v1567, left: 345.93, top: 456.93, width: 19.774, height: 24.337 },
  { src: s.v1565, left: -14.34, top: 461.51, width: 115.538, height: 124.949, inner: { width: 45.751, height: 124.903 }, rotate: 40.18 },
  { src: s.v1557, left: 368.75, top: 137.51, width: 64.764, height: 37.466 },
  { src: s.v1568, left: 6.74, top: 286.58, width: 46.726, height: 32.434 },
  { src: s.v1558, left: 21.95, top: 177.06, width: 29.322, height: 34.153 },
  { src: s.v1566, left: -83, top: 640.98, width: 36.454, height: 38.437, inner: { width: 19.774, height: 33.463 }, rotate: -39.12 },
  { src: s.v1559, left: -32.81, top: 421.95, width: 23.136, height: 22.992 },
  { src: s.v1570, left: -9.99, top: 382.4, width: 10.714, height: 10.647 },
  { src: s.v1570, left: 167.97, top: 545.15, width: 10.714, height: 10.647 },
  { src: s.v1561, left: 168, top: 185, width: 252.219, height: 360.89, inner: { width: 177.026, height: 327.368 }, rotate: 14.26 },
  { src: s.v1575, left: 15.87, top: 601.43, width: 360.89, height: 252.219, inner: { width: 177.026, height: 327.368 }, rotate: -75.74 },
  { src: s.v1562, left: -81.48, top: 426.51, width: 71.57, height: 150.758, inner: { width: 56.884, height: 145.679 }, rotate: -5.91 },
  { src: s.v1574, left: -6.95, top: 28, width: 156.32, height: 109.399, inner: { width: 56.884, height: 145.679 }, rotate: 66.94 },
  { src: s.v1564, left: 218.17, top: 571.01, width: 11.353, height: 9.982 },
  { src: s.v1564, left: 256.19, top: 137.51, width: 11.353, height: 9.982 },
];

const q = {
  v1557: require("../../../../assets/story/q1557.svg") as number,
  v1558: require("../../../../assets/story/q1558.svg") as number,
  v1559: require("../../../../assets/story/q1559.svg") as number,
  v1560: require("../../../../assets/story/q1560.svg") as number,
  v1561: require("../../../../assets/story/q1561.svg") as number,
  v1562: require("../../../../assets/story/q1562.svg") as number,
  v1563: require("../../../../assets/story/q1563.svg") as number,
  v1564: require("../../../../assets/story/q1564.svg") as number,
  v1565: require("../../../../assets/story/q1565.svg") as number,
  v1566: require("../../../../assets/story/q1566.svg") as number,
  v1567: require("../../../../assets/story/q1567.svg") as number,
  v1568: require("../../../../assets/story/q1568.svg") as number,
  v1569: require("../../../../assets/story/q1569.svg") as number,
  v1570: require("../../../../assets/story/q1570.svg") as number,
  v1574: require("../../../../assets/story/q1574.svg") as number,
  v1575: require("../../../../assets/story/q1575.svg") as number,
  v1583: require("../../../../assets/story/q1583.svg") as number,
  v1584: require("../../../../assets/story/q1584.svg") as number,
  v1585: require("../../../../assets/story/q1585.svg") as number,
};

/** Latar Story - Scan QR (frame 36:215). */
const scanLayers: readonly Layer[] = [
  { src: q.v1583, left: -117, top: 786, width: 620.557, height: 397.5 },
  { src: q.v1584, left: -131.96, top: 234.69, width: 662.423, height: 293.663, inner: { width: 646.068, height: 247.01 }, rotate: -4.2 },
  { src: q.v1567, left: 281, top: 697, width: 13, height: 16 },
  { src: q.v1565, left: 44.14, top: 700.01, width: 75.96, height: 82.147, inner: { width: 30.079, height: 82.117 }, rotate: 40.18 },
  { src: q.v1557, left: 296, top: 487, width: 42.579, height: 24.632 },
  { src: q.v1568, left: 58, top: 585, width: 30.719, height: 21.323 },
  { src: q.v1558, left: 68, top: 513, width: 19.277, height: 22.454 },
  { src: q.v1566, left: -15, top: 582, width: 23.967, height: 25.27, inner: { width: 13, height: 22 }, rotate: -39.12 },
  { src: q.v1559, left: 32, top: 674, width: 15.211, height: 15.116 },
  { src: q.v1570, left: 47, top: 648, width: 7.044, height: 7 },
  { src: q.v1570, left: 164, top: 755, width: 7.044, height: 7 },
  { src: q.v1570, left: 368, top: 658, width: 7.044, height: 7 },
  { src: q.v1569, left: 358, top: 607, width: 10, height: 9.938 },
  { src: q.v1560, left: 357, top: 713, width: 10.595, height: 12.017 },
  { src: q.v1561, left: 250, top: 623, width: 165.82, height: 237.265, inner: { width: 116.385, height: 215.226 }, rotate: 14.26 },
  { src: q.v1575, left: 64, top: 792, width: 237.265, height: 165.82, inner: { width: 116.385, height: 215.226 }, rotate: -75.74 },
  { src: q.v1562, left: 0, top: 677, width: 47.053, height: 99.115, inner: { width: 37.398, height: 95.776 }, rotate: -5.91 },
  { src: q.v1574, left: 49, top: 415, width: 102.772, height: 71.924, inner: { width: 37.398, height: 95.776 }, rotate: 66.94 },
  { src: q.v1563, left: 326.88, top: 539.18, width: 78.561, height: 64.271, inner: { width: 37.398, height: 69.141 }, rotate: 63.56 },
  { src: q.v1564, left: 197, top: 772, width: 7.464, height: 6.563 },
  { src: q.v1585, left: -154, top: -142, width: 673.909, height: 420.785, inner: { width: 648.236, height: 374.314 }, rotate: -4.2 },
  { src: q.v1564, left: 222, top: 487, width: 7.464, height: 6.563 },
];

/** Panel cokelat bawah di Story Isi (frame 44:748). */
export const isiPanelLayer: Layer = {
  src: require("../../../../assets/story/isi-panel.svg") as number,
  left: -262.11,
  top: 439.85,
  width: 932.738,
  height: 544.339,
  inner: { width: 900.022, height: 479.711 },
  rotate: -4.2,
};

export const backArrow: number = require("../../../../assets/story/arrow-back.svg") as number;

export function StoryBackground(): ReactElement {
  return (
    <>
      {storyLayers.map((layer: Layer, i: number): ReactElement => <SceneLayer key={i} layer={layer} />)}
    </>
  );
}

export function ScanBackground(): ReactElement {
  return (
    <>
      {scanLayers.map((layer: Layer, i: number): ReactElement => <SceneLayer key={i} layer={layer} />)}
    </>
  );
}
