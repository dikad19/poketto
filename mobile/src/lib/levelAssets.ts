import type { ImageSourcePropType } from "react-native";

// Warna tema tiap level (dipakai chip level, badge, dan ring cadangan)
export const LEVEL_COLORS: Record<number, string> = {
  1: "#9ca3af",
  2: "#22c55e",
  3: "#06b6d4",
  4: "#3b82f6",
  5: "#8b5cf6",
  6: "#ec4899",
  7: "#f97316",
  8: "#ef4444",
  9: "#f59e0b",
};

export const levelColor = (level: number) =>
  LEVEL_COLORS[Math.min(9, Math.max(1, level))];

// require() harus statis dan filenya harus ada. Kalau ada yang belum ada,
// Metro akan menyebut nama file itu di error.
export const BADGE_IMAGES: Record<number, ImageSourcePropType> = {
  1: require("../../assets/badges/level-1.png"),
  2: require("../../assets/badges/level-2.png"),
  3: require("../../assets/badges/level-3.png"),
  4: require("../../assets/badges/level-4.png"),
  5: require("../../assets/badges/level-5.png"),
  6: require("../../assets/badges/level-6.png"),
  7: require("../../assets/badges/level-7.png"),
  8: require("../../assets/badges/level-8.png"),
  9: require("../../assets/badges/level-9.png"),
};

export const BORDER_IMAGES: Record<number, ImageSourcePropType> = {
  1: require("../../assets/borders/level-1.png"),
  2: require("../../assets/borders/level-2.png"),
  3: require("../../assets/borders/level-3.png"),
  4: require("../../assets/borders/level-4.png"),
  5: require("../../assets/borders/level-5.png"),
  6: require("../../assets/borders/level-6.png"),
  7: require("../../assets/borders/level-7.png"),
  8: require("../../assets/borders/level-8.png"),
  9: require("../../assets/borders/level-9.png"),
};

export const BORDER_HOLE_DEFAULT = 0.7;
export const BORDER_HOLE: Partial<Record<number, number>> = {
  // 9: 0.62, // contoh: border level 9 punya ornamen tebal
};
