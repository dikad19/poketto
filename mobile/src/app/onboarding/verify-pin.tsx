import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PinPad, savePinLocally } from "../../components/AppLock";
import { api } from "../../lib/api";
import { formErrorMessage } from "../../lib/validation";

// Login di HP baru / setelah logout: akun sudah punya PIN, tapi HP ini belum.
// PIN dicek ke server, lalu disimpan lokal supaya kunci aplikasi aktif di HP ini.
export default function VerifyPinScreen() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const busy = useRef(false);

  async function onComplete(pin: string) {
    if (busy.current) return;
    busy.current = true;
    setError(undefined);
    try {
      await api("/me/pin/verify", { method: "POST", body: { pin } });
      await savePinLocally(pin);
      router.replace("/");
    } catch (e) {
      setError(formErrorMessage(e)); // mis. "PIN salah. Sisa percobaan: 3"
    } finally {
      busy.current = false;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <PinPad
        title="Masukkan PIN kamu"
        subtitle="Akun ini sudah punya PIN. Masukkan untuk mengaktifkan kunci di HP ini."
        error={error}
        onComplete={onComplete}
      />
      <Pressable
        onPress={() => router.push("/onboarding/reset-pin")}
        style={{ position: "absolute", bottom: 48, alignSelf: "center" }}
        hitSlop={12}
      >
        <Text style={{ color: "#2563eb", fontSize: 15, fontWeight: "600" }}>Lupa PIN?</Text>
      </Pressable>
    </View>
  );
}
