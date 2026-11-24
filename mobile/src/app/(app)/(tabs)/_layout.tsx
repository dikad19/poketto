import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { hasRole } from "../../../lib/spaces";
import { useSpaces } from "../../../lib/SpaceContext";
import { colors } from "../../../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const icon =
  (name: string, outline: string) =>
  ({
    color,
    focused,
    size,
  }: {
    color: string;
    focused: boolean;
    size: number;
  }) => (
    <MaterialCommunityIcons
      name={(focused ? name : outline) as IconName}
      size={size}
      color={color}
    />
  );

export default function TabsLayout() {
  const { active } = useSpaces();
  // VIEWER tidak boleh mencatat transaksi, jadi tombol tambah disembunyikan
  const canAdd = !active || hasRole(active.role, "MEMBER");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: icon("view-dashboard", "view-dashboard-outline"),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transaksi",
          tabBarIcon: icon("swap-vertical-bold", "swap-vertical"),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: "Catat",
          href: canAdd ? undefined : null,
          tabBarIcon: () => (
            <MaterialCommunityIcons
              name="plus-circle"
              size={44}
              color={colors.primary}
            />
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/add");
          },
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Dompet",
          tabBarIcon: icon("wallet", "wallet-outline"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Akun",
          tabBarIcon: icon("account-circle", "account-circle-outline"),
        }}
      />
    </Tabs>
  );
}
