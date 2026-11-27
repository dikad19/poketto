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
import { useTranslation } from "react-i18next";
import { initI18n } from "../i18n";
import { KeyboardProvider } from "react-native-keyboard-controller";

SplashScreen.preventAutoHideAsync();

const AUTH_ROUTES = ["login", "register", "forgot-password"];

function RootNavigator() {
  const { t } = useTranslation();
  const { user, loading, locked, unlock, logout } = useAuth();
  const { ready, progress, label } = useBootstrap(user, loading);
  const [finished, setFinished] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!ready) setFinished(false);
  }, [ready]);

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
      else if (LOCK_SUPPORTED && !user.hasPin) required = "/onboarding/pin";
      else if (LOCK_SUPPORTED && !(await hasLocalPin()))
        required = "/onboarding/verify-pin";
      if (off) return;

      const onReset = path === "/onboarding/reset-pin";

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
  }, [user, segments, ready, finished, navState?.key]);

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
    Alert.alert(t("lock.forgotTitle"), t("lock.forgotMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("lock.logout"), style: "destructive", onPress: () => logout() },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* sama seperti sebelumnya */}
      </Stack>

      {user && locked && (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen onUnlock={unlock} onForgot={confirmForgot} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <KeyboardProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </KeyboardProvider>
  );
}
