import { Stack } from "expo-router";
import { SpaceProvider } from "../../lib/SpaceContext";

export default function AppLayout() {
  return (
    <SpaceProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="add" options={{ presentation: "modal" }} />
      </Stack>
    </SpaceProvider>
  );
}
