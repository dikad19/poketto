import type { ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "../lib/theme";

export const TOPBAR_H = 42; // tinggi baris avatar / ikon
export const TOPBAR_GAP = 20; // jarak ke MonthPicker (dulu marginBottom)

export function StickyTopBar({
  scrollY,
  children,
}: {
  scrollY: Animated.Value;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const top = insets.top + space.md; // sama dengan paddingTop di HeroHeader

  const bg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { height: top + TOPBAR_H + space.sm }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "#7A1D3A",
            opacity: bg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: "rgba(255,255,255,0.18)",
          },
        ]}
      />
      <View style={[styles.inner, { paddingTop: top }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  inner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: space.md,
  },
});
