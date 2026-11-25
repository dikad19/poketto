import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

export function LoadingScreen({
  progress,
  label,
  onFinish,
}: {
  progress: number;
  label: string;
  onFinish?: () => void;
}) {
  const bar = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;

  // fade-in halus sekali saat layar muncul
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(bar, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && progress >= 1 && onFinish) {
        setTimeout(onFinish, 200);
      }
    });
  }, [progress]);

  const width = bar.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={s.container}>
      <Animated.View
        style={[s.center, { opacity: fade, transform: [{ translateY: rise }] }]}
      >
        <View style={s.mark}>
          <Text style={s.markText}>P</Text>
        </View>
        <Text style={s.logo}>Poketto</Text>
        <Text style={s.tagline}>Catat, pantau, hemat.</Text>
      </Animated.View>

      <Animated.View style={[s.footer, { opacity: fade }]}>
        <View style={s.track}>
          <Animated.View style={[s.fill, { width }]} />
        </View>
        <Text style={s.label}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  markText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginTop: -2,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#111",
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(0,0,0,0.45)",
  },
  footer: {
    position: "absolute",
    bottom: 64,
    alignItems: "center",
  },
  track: {
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  label: {
    marginTop: 12,
    fontSize: 12,
    color: "rgba(0,0,0,0.4)",
    minHeight: 16,
  },
});
