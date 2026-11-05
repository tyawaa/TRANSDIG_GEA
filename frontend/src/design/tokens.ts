// Token design system GEA. Sumber: Figma "UI/UX - GEA", halaman Design System (node 102:370).
// Nama dan nilai mengikuti variable Figma. Jangan menambah warna atau ukuran di luar file ini.

export const colors = {
  primary: {
    0: "#FFE4C2",
    100: "#F0CEA2",
    200: "#E2BA85",
    300: "#D3A66B",
    400: "#C49353",
    500: "#B5813D",
    600: "#A7712A",
    700: "#98611A",
    800: "#89530C",
    900: "#7A4500",
  },
  secondaryYellow: {
    0: "#FFFDF5",
    100: "#EEE4A8",
    200: "#DDCB64",
    300: "#CCB429",
  },
  secondaryGreen: {
    0: "#FFFDC2",
    100: "#F0EEA2",
    200: "#E2DE85",
    300: "#D3CF6B",
    400: "#C4C053",
    500: "#B5B13D",
    600: "#A7A22A",
    700: "#98941A",
    800: "#89850C",
    900: "#7A7600",
  },
  tertiary: {
    100: "#AD3B0E",
    200: "#8F2D06",
    300: "#702000",
  },
  greys: {
    0: "#C7C3BF",
    100: "#BDB7AF",
    200: "#A09991",
    300: "#6B6660",
  },
  // Variable Figma bernama "Blue", tetapi di halaman Design System barisnya berlabel "Success".
  success: {
    0: "#F6FFF5",
    100: "#BDF9B8",
    200: "#8DEB84",
    300: "#68D35E",
    400: "#4BAB42",
    500: "#337A2C",
  },
  warning: {
    0: "#FFFBF5",
    100: "#F9D797",
    200: "#EBB44C",
    300: "#FFCC00",
    400: "#D0921E",
    500: "#7A5000",
  },
  danger: {
    0: "#FFF5F6",
    100: "#F9B1B8",
    200: "#EB7883",
    300: "#D3505D",
    400: "#CD1515",
    500: "#8B0909",
  },
  info: {
    0: "#F5FAFF",
    100: "#B8DAF9",
    200: "#84B9EB",
    300: "#5E9AD3",
    400: "#4279AB",
    500: "#2C557A",
  },
  black: "#1F1A16",
  white: "#FFFCF5",
} as const;

// Nilai yang dipakai komponen di Figma tetapi tidak punya variable. Dicatat apa adanya.
export const componentColors = {
  buttonTextDark: "#1C1917",
  fieldPlaceholder: "#ACACAC",
  fieldLabel: "#000000",
  cardBody: "#000000",
  cardCaption: "#303030",
  // Onboarding: teks isi dan latar layar "Selamat Datang".
  bodyDark: "#1C1917",
  welcomeBackground: "#FFFADB",
  // Story: status QR gagal dan teks putih di atasnya.
  qrFailed: "#CA0000",
  textWhite: "#FFFFFF",
  toastDangerBackground: "#FFDBDE",
  toastSuccessBackground: "#E5FFE3",
  // Latar tombol outline saat ditekan (warna tombol dengan opasitas 25%).
  outlinePressedPrimary: "rgba(238, 228, 168, 0.25)",
  outlinePressedSecondary: "rgba(152, 97, 26, 0.25)",
  outlinePressedDanger: "rgba(205, 21, 21, 0.25)",
  outlinePressedWarning: "rgba(255, 204, 0, 0.25)",
} as const;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  36: 36,
  42: 42,
  48: 48,
  64: 64,
} as const;

export const radius = {
  // Tombol, field, kartu, toast.
  control: 8,
  // Chip dan handle modal.
  pill: 100,
} as const;

// Efek di Figma: Drop shadow (0, 4, blur 12, spread 0, #000 12%)
// dan Inner shadow (0, 4, blur 4, spread 0, #000 16%).
export const shadows = {
  drop: "0px 4px 12px 0px rgba(0, 0, 0, 0.12)",
  inner: "inset 0px 4px 4px 0px rgba(0, 0, 0, 0.16)",
  // Kartu "Card 1" memakai drop shadow blur 6 (bukan token Effects).
  card: "0px 4px 6px 0px rgba(0, 0, 0, 0.12)",
} as const;
