import { useRouter } from "expo-router";
import { PinSetupScreen } from "../../components/AppLock";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";

// Onboarding langkah 3: buat PIN pertama (+ tawaran biometrik)
export default function CreatePinScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  return (
    <PinSetupScreen
      // PinSetupScreen: kirim ke server -> simpan lokal -> tawarkan biometrik -> onDone
      onSave={async (pin) => {
        await api("/me/pin", { method: "POST", body: { pin } });
      }}
      onDone={async () => {
        await refreshUser(); // hasPin = true, onboardingDone = true
        router.replace("/");
      }}
    />
  );
}
