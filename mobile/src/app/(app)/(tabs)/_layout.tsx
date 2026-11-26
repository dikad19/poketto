import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, Tabs } from "expo-router";
import { AvatarWithBorder } from "../../../components/AvatarWithBorder";
import { useAuth } from "../../../lib/auth";
import { useEffect, type ComponentProps } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BADGE_IMAGES, levelColor } from "../../../lib/levelAssets";
import { useProgress } from "../../../lib/progress";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hasRole } from "../../../lib/spaces";
import { useSpaces } from "../../../lib/SpaceContext";
import { colors } from "../../../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const BAR_HEIGHT = 50;
const EASE = Easing.inOut(Easing.quad);

// [ikon aktif, ikon non-aktif]
const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ["home", "home-outline"],
  transactions: ["swap-vertical-bold", "swap-vertical"],
  wallets: ["wallet", "wallet-outline"],
  account: ["account-circle", "account-circle-outline"],
};

function TabItem({
  label,
  icons,
  focused,
  onPress,
}: {
  label: string;
  icons: [IconName, IconName];
  focused: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: 220,
      easing: EASE,
    });
  }, [focused, progress]);

  const filledStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const outlineStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconBox} collapsable={false}>
        <MaterialCommunityIcons
          name={focused ? icons[0] : icons[1]}
          size={26}
          color={focused ? colors.primary : colors.placeholder}
          style={styles.iconGlyph}
        />
      </View>
    </Pressable>
  );
}

function AvatarTabItem({
  label,
  level,
  focused,
  onPress,
}: {
  label: string;
  level?: number;
  focused: boolean;
  onPress: () => void;
}) {
  const { user } = useAuth();
  const u = user as {
    avatarKey?: string | null;
    avatarUrl?: string | null;
    name?: string | null;
    username?: string;
  } | null;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View
        style={{
          padding: 2,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: focused ? colors.primary : "transparent",
          opacity: focused ? 1 : 0.8,
        }}
      >
        <AvatarWithBorder
          avatarKey={u?.avatarKey}
          avatarUrl={u?.avatarUrl}
          name={u?.name ?? u?.username}
          level={level ?? 1}
          size={28}
        />
      </View>
    </Pressable>
  );
}

function PlusItem({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Catat transaksi"
      >
        <MaterialCommunityIcons
          name="plus-circle"
          size={44}
          color={colors.primary}
        />
      </Pressable>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  // Tab dengan href: null (mis. tombol plus untuk VIEWER) tidak ditampilkan
  const routes = state.routes.filter(
    (r) => (descriptors[r.key].options as any).href !== null,
  );
  const activeKey = state.routes[state.index]?.key;

  const press = (route: (typeof routes)[number], focused: boolean) => {
    if (route.name === "plus") {
      router.push("/add");
      return;
    }
    if (focused) return;
    const nav: any = descriptors[route.key]?.navigation ?? navigation;
    nav?.navigate?.(route.name, route.params);
  };

  return (
    <View
      style={[
        styles.bar,
        { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.row}>
        {routes.map((route) => {
          if (route.name === "plus") {
            return (
              <PlusItem key={route.key} onPress={() => press(route, false)} />
            );
          }
          const { options } = descriptors[route.key];
          if (route.name === "account") {
            return (
              <AvatarTabItem
                key={route.key}
                label={(options.title as string) ?? route.name}
                level={progress.data?.level}
                focused={route.key === activeKey}
                onPress={() => press(route, route.key === activeKey)}
              />
            );
          }
          return (
            <TabItem
              key={route.key}
              label={(options.title as string) ?? route.name}
              icons={TAB_ICONS[route.name] ?? ["circle", "circle-outline"]}
              focused={route.key === activeKey}
              onPress={() => press(route, route.key === activeKey)}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { active } = useSpaces();
  // VIEWER tidak boleh mencatat transaksi, jadi tombol tambah disembunyikan
  const canAdd = !active || hasRole(active.role, "MEMBER");

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transaksi" }} />
      <Tabs.Screen
        name="plus"
        options={{ title: "Catat", href: canAdd ? undefined : null }}
      />
      <Tabs.Screen name="wallets" options={{ title: "Dompet" }} />
      <Tabs.Screen name="account" options={{ title: "Akun" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    // iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    // Android
    elevation: 8,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 26,
  },
  iconBox: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
