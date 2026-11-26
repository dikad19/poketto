import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "../lib/auth";
import { LoadingScreen } from "../components/LoadingScreen";
import { LOCK_SUPPORTED, LockScreen, hasLocalPin } from "../components/AppLock";
import { useBootstrap } from "../hooks/useAppBootstrap";

SplashScreen.preventAutoHideAsync();

// Halaman yang boleh dibuka tanpa login. Sesuaikan dengan route kamu.
const AUTH_ROUTES = ["login", "register", "forgot-password"];

function RootNavigator() {
  const { user, loading, locked, unlock, logout } = useAuth();
  const { ready, progress, label } = useBootstrap(user, loading);
  const [finished, setFinished] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // kalau loading muncul lagi (mis. setelah login), reset
  useEffect(() => {
    if (!ready) setFinished(false);
  }, [ready]);

  /* ---------------------------------------------------------------
     GUARD: tentukan user harus ada di halaman mana
       belum login            -> /login
       belum pilih avatar     -> /onboarding/avatar
       belum buat PIN         -> /onboarding/pin
       PIN ada di server tapi
       belum ada di HP ini    -> /onboarding/verify-pin
       semua beres            -> keluar dari login/onboarding
     --------------------------------------------------------------- */
  useEffect(() => {
    if (!ready || !finished || !navState?.key) return;
    let off = false;

    (async () => {
      const parts = segments.filter((s) => !s.startsWith("(")); // abaikan group (auth), (tabs)
      const first = parts[0] ?? "";
      const path = "/" + parts.join("/");

      if (!user) {
        if (!AUTH_ROUTES.includes(first)) router.replace("/login");
        return;
      }

      let required: string | null = null;
      if (!user.avatarKey) required = "/onboarding/avatar";
      // PIN & kunci hanya untuk app native; di web dilewati
      else if (LOCK_SUPPORTED && !user.hasPin) required = "/onboarding/pin";
      else if (LOCK_SUPPORTED && !(await hasLocalPin()))
        required = "/onboarding/verify-pin";
      if (off) return;

      const onReset = path === "/onboarding/reset-pin"; // boleh diakses (lupa/ganti PIN)

      if (required) {
        const allowed =
          path === required ||
          (onReset && required === "/onboarding/verify-pin");
        if (!allowed) router.replace(required as any);
      } else if (
        (first === "onboarding" && !onReset) ||
        AUTH_ROUTES.includes(first)
      ) {
        router.replace("/");
      }
    })();

    return () => {
      off = true;
    };
  }, [user, segments, ready, finished, navState?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !finished) {
    return (
      <LoadingScreen
        progress={ready ? 1 : Math.min(progress, 0.95)}
        label={label}
        onFinish={ready ? () => setFinished(true) : undefined}
      />
    );
  }

  const confirmForgot = () =>
    Alert.alert(
      "Lupa PIN?",
      "Kamu akan keluar dari akun. Setelah masuk lagi, kamu bisa membuat PIN baru dengan konfirmasi password.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Keluar", style: "destructive", onPress: () => logout() },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* sama seperti sebelumnya */}
      </Stack>

      {/* Layar kunci menimpa app tanpa meng-unmount navigasi, jadi posisi halaman tidak hilang */}
      {user && locked && (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen onUnlock={unlock} onForgot={confirmForgot} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
