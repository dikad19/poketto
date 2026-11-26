import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { FormError, TextField } from "../../components/TextField";
import { PinSetupScreen } from "../../components/AppLock";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { formErrorMessage } from "../../lib/validation";

// Lupa / ganti PIN: konfirmasi password dulu, baru buat PIN baru.
export default function ResetPinScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<"password" | "pin">("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function checkPassword() {
    if (loading) return;
    if (!password) return setError("Masukkan password kamu");
    setLoading(true);
    setError(undefined);
    try {
      await api("/me/verify-password", { method: "POST", body: { password } });
      setStep("pin");
    } catch (e) {
      setError(formErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (step === "pin") {
    return (
      <PinSetupScreen
        onSave={async (pin) => {
          await api("/me/pin/reset", { method: "POST", body: { password, pin } });
        }}
        onDone={async () => {
          await refreshUser();
          router.replace("/");
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 16, color: "#2563eb" }}>‹ Kembali</Text>
        </Pressable>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>Atur ulang PIN</Text>
        <Text style={{ color: "#6b7280", fontSize: 14 }}>
          Masukkan password akun kamu untuk membuat PIN baru.
        </Text>

        <FormError message={error} />
        <TextField
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(undefined);
          }}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={checkPassword}
        />
        <Button title="Lanjut" onPress={checkPassword} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
