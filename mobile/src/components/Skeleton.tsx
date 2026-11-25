import { useEffect, useRef } from "react";
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, space } from "../lib/theme";

/** Blok placeholder berdenyut. tone="light" untuk latar hero, "dark" untuk lembar konten. */
export function Skeleton({
  width,
  height,
  radius: r = 8,
  tone = "light",
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  tone?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor:
            tone === "light" ? "rgba(255,255,255,0.22)" : colors.line,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Kerangka isi dashboard (dompet, insight, transaksi) */
export function DashboardSkeleton() {
  return (
    <View style={{ gap: space.md }} accessible accessibilityLabel="Memuat data">
      <Skeleton tone="dark" width={90} height={20} />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {[0, 1].map((i) => (
          <Skeleton
            key={i}
            tone="dark"
            width={160}
            height={96}
            radius={radius.field}
          />
        ))}
      </View>

      <Skeleton tone="dark" width="100%" height={200} radius={radius.field} />

      <Skeleton tone="dark" width={150} height={20} />
      <View style={{ gap: space.md }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
            }}
          >
            <Skeleton tone="dark" width={40} height={40} radius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton tone="dark" width="60%" height={14} />
              <Skeleton tone="dark" width="40%" height={11} />
            </View>
            <Skeleton tone="dark" width={70} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}
