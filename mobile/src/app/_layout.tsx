import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "../lib/auth";
import { LoadingScreen } from "../components/LoadingScreen";
import { useBootstrap } from "../hooks/useAppBootstrap";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const { ready, progress, label } = useBootstrap(user, loading);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // kalau loading muncul lagi (mis. setelah login), reset
  useEffect(() => {
    if (!ready) setFinished(false);
  }, [ready]);

  if (!ready || !finished) {
    return (
      <LoadingScreen
        progress={ready ? 1 : Math.min(progress, 0.95)}
        label={label}
        onFinish={ready ? () => setFinished(true) : undefined}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* sama seperti sebelumnya */}
    </Stack>
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
