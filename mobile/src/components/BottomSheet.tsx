import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "../lib/theme";

const SCREEN_H = Dimensions.get("window").height;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.9;

/**
 * Sheet dari bawah: bisa ditarik ke bawah untuk menutup.
 * Kontrol lewat `visible`; `onClose` dipanggil saat backdrop ditekan, tombol tutup ditekan, atau sheet ditarik.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_H],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Satu jalur animasi: masuk saat visible, keluar saat tidak visible
  useEffect(() => {
    if (visible && mounted) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!visible && mounted) {
      Animated.timing(translateY, {
        toValue: SCREEN_H,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, translateY]);

  const snapBack = () =>
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: snapBack,
    }),
  ).current;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Tutup"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: space.lg + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle + judul bisa ditarik */}
          <View {...pan.panHandlers}>
            <View style={styles.dragArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(26,8,14,0.55)" },
  sheet: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  dragArea: {
    alignItems: "center",
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { fontSize: 16, fontWeight: "500", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
});
