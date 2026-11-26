/**
 * Install:
 *   npx expo install expo-local-authentication expo-secure-store expo-crypto
 *
 * app.json:
 * {
 *   "expo": {
 *     "plugins": [
 *       ["expo-local-authentication", { "faceIDPermission": "Izinkan $(PRODUCT_NAME) memakai Face ID untuk membuka aplikasi." }]
 *     ]
 *   }
 * }
 * Catatan: Face ID TIDAK jalan di Expo Go (iOS). Pakai development build:
 *   npx expo run:ios  /  eas build --profile development
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";

/* ===================================================================
   1) PENYIMPANAN PIN LOKAL (SecureStore = Keychain iOS / Keystore Android)
   =================================================================== */
export const PIN_LENGTH = 6;
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;
const K = {
  hash: "pin_hash",
  salt: "pin_salt",
  fails: "pin_fails",
  lock: "pin_lock_until",
  bio: "bio_enabled",
};

/** PIN & biometrik hanya untuk app native. expo-secure-store tidak tersedia di web. */
export const LOCK_SUPPORTED = Platform.OS !== "web";

const toHex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const hashPin = (pin: string, salt: string) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );

export const isWeakPin = (p: string) =>
  /^(\d)\1{5}$/.test(p) || "0123456789".includes(p) || "9876543210".includes(p);

export async function hasLocalPin() {
  if (!LOCK_SUPPORTED) return false;
  try {
    return !!(await SecureStore.getItemAsync(K.hash));
  } catch {
    return false;
  }
}

export async function savePinLocally(pin: string) {
  if (!LOCK_SUPPORTED) return;
  const salt = toHex(Crypto.getRandomBytes(16));
  await SecureStore.setItemAsync(K.salt, salt);
  await SecureStore.setItemAsync(K.hash, await hashPin(pin, salt));
  await SecureStore.deleteItemAsync(K.fails);
  await SecureStore.deleteItemAsync(K.lock);
}

/** Panggil saat logout */
export async function clearLocalSecurity() {
  if (!LOCK_SUPPORTED) return;
  try {
    await Promise.all(
      Object.values(K).map((k) => SecureStore.deleteItemAsync(k)),
    );
  } catch {}
}

export async function verifyPin(
  pin: string,
): Promise<{ ok: boolean; lockedUntil?: number; remaining?: number }> {
  const lock = Number((await SecureStore.getItemAsync(K.lock)) ?? 0);
  if (lock > Date.now()) return { ok: false, lockedUntil: lock };

  const [salt, stored] = await Promise.all([
    SecureStore.getItemAsync(K.salt),
    SecureStore.getItemAsync(K.hash),
  ]);
  if (salt && stored && (await hashPin(pin, salt)) === stored) {
    await SecureStore.deleteItemAsync(K.fails);
    await SecureStore.deleteItemAsync(K.lock);
    return { ok: true };
  }

  const fails = Number((await SecureStore.getItemAsync(K.fails)) ?? 0) + 1;
  if (fails >= MAX_FAILS) {
    const until = Date.now() + LOCK_MS;
    await SecureStore.setItemAsync(K.lock, String(until));
    await SecureStore.deleteItemAsync(K.fails);
    return { ok: false, lockedUntil: until };
  }
  await SecureStore.setItemAsync(K.fails, String(fails));
  return { ok: false, remaining: MAX_FAILS - fails };
}

/* ===================================================================
   2) BIOMETRIK: cek kondisi dulu (hardware + sudah terdaftar)
   Android -> sidik jari (jika ada), iPhone -> Face ID (jika ada)
   =================================================================== */
const { AuthenticationType: AT } = LocalAuthentication;

export type BiometricInfo = {
  available: boolean;
  label: string;
  icon: "finger-print" | "scan";
};

export async function getBiometricInfo(): Promise<BiometricInfo> {
  const none: BiometricInfo = {
    available: false,
    label: "",
    icon: "finger-print",
  };
  if (!LOCK_SUPPORTED) return none;
  try {
    const [hasHw, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHw || !enrolled) return none; // tidak ada sensor / belum daftar sidik jari/wajah

    const face = types.includes(AT.FACIAL_RECOGNITION);
    const finger = types.includes(AT.FINGERPRINT);
    const ios = Platform.OS === "ios";

    // iOS: utamakan wajah. Android: utamakan sidik jari.
    if (ios && face) return { available: true, label: "Face ID", icon: "scan" };
    if (finger)
      return {
        available: true,
        label: ios ? "Touch ID" : "Sidik Jari",
        icon: "finger-print",
      };
    if (face)
      return { available: true, label: "Buka dengan Wajah", icon: "scan" };
    return none;
  } catch {
    return none;
  }
}

export async function authenticateBiometric(label: string) {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: `Buka dengan ${label}`,
      cancelLabel: "Pakai PIN",
      disableDeviceFallback: true, // fallback-nya PIN aplikasi, bukan PIN HP
    });
    return r.success;
  } catch {
    return false;
  }
}

export const isBiometricEnabled = async () => {
  if (!LOCK_SUPPORTED) return false;
  try {
    return (await SecureStore.getItemAsync(K.bio)) === "1";
  } catch {
    return false;
  }
};
export const setBiometricEnabled = async (on: boolean) => {
  if (!LOCK_SUPPORTED) return;
  if (on) await SecureStore.setItemAsync(K.bio, "1");
  else await SecureStore.deleteItemAsync(K.bio);
};

/* ===================================================================
   3) PIN PAD (6 digit)
   =================================================================== */
type PadProps = {
  title: string;
  subtitle?: string;
  error?: string;
  onComplete: (pin: string) => void;
  onBiometric?: () => void;
  biometricIcon?: "finger-print" | "scan";
};

export function PinPad({
  title,
  subtitle,
  error,
  onComplete,
  onBiometric,
  biometricIcon = "finger-print",
}: PadProps) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onComplete(pin);
      const t = setTimeout(() => setPin(""), 150);
      return () => clearTimeout(t);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (d: string) =>
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  const del = () => setPin((p) => p.slice(0, -1));

  const Key = ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable style={s.key} onPress={onPress} disabled={!onPress} hitSlop={6}>
      {children}
    </Pressable>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}

      <View style={s.dots}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />
        ))}
      </View>
      <Text style={s.error}>{error ?? " "}</Text>

      <View style={s.grid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onPress={() => press(d)}>
            <Text style={s.keyTxt}>{d}</Text>
          </Key>
        ))}
        <Key onPress={onBiometric}>
          {onBiometric && (
            <Ionicons name={biometricIcon} size={30} color="#2563eb" />
          )}
        </Key>
        <Key onPress={() => press("0")}>
          <Text style={s.keyTxt}>0</Text>
        </Key>
        <Key onPress={del}>
          <Ionicons name="backspace-outline" size={28} color="#111827" />
        </Key>
      </View>
    </View>
  );
}

/* ===================================================================
   4) SETUP PIN SAAT REGISTER (isi 2x -> konfirmasi -> tawarkan biometrik)
   onSave: kirim PIN ke server (atau sertakan di payload register)
   =================================================================== */
export function PinSetupScreen({
  onSave,
  onDone,
}: {
  onSave: (pin: string) => Promise<void>;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"enter" | "confirm" | "bio">("enter");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string>();
  const [bio, setBio] =
    useState<Awaited<ReturnType<typeof getBiometricInfo>>>();
  const busy = useRef(false);

  const handle = async (pin: string) => {
    if (busy.current) return;
    setError(undefined);

    if (step === "enter") {
      if (isWeakPin(pin))
        return setError("PIN terlalu mudah ditebak, coba kombinasi lain");
      setFirst(pin);
      return setStep("confirm");
    }

    // confirm
    if (pin !== first) {
      setFirst("");
      setStep("enter");
      return setError("PIN tidak sama, ulangi dari awal");
    }
    busy.current = true;
    try {
      await onSave(pin);
      await savePinLocally(pin);
      const info = await getBiometricInfo();
      if (info.available) {
        setBio(info);
        setStep("bio");
      } else onDone();
    } catch {
      setError("Gagal menyimpan PIN, coba lagi");
      setFirst("");
      setStep("enter");
    } finally {
      busy.current = false;
    }
  };

  if (step === "bio" && bio) {
    return (
      <View style={s.wrap}>
        <Ionicons name={bio.icon} size={72} color="#2563eb" />
        <Text style={[s.title, { marginTop: 16 }]}>Aktifkan {bio.label}?</Text>
        <Text style={s.sub}>
          Buka aplikasi lebih cepat. PIN tetap bisa dipakai kapan saja.
        </Text>
        <Pressable
          style={s.btn}
          onPress={async () => {
            if (await authenticateBiometric(bio.label))
              await setBiometricEnabled(true);
            onDone();
          }}
        >
          <Text style={s.btnTxt}>Aktifkan {bio.label}</Text>
        </Pressable>
        <Pressable onPress={onDone}>
          <Text style={s.link}>Nanti saja</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <PinPad
      title={step === "enter" ? "Buat PIN 6 digit" : "Konfirmasi PIN"}
      subtitle={
        step === "enter"
          ? "PIN dipakai untuk membuka aplikasi"
          : "Masukkan PIN yang sama sekali lagi"
      }
      error={error}
      onComplete={handle}
    />
  );
}

/* ===================================================================
   5) LOCK SCREEN + GATE (kunci otomatis saat app ke background)
   =================================================================== */
export function LockScreen({
  onUnlock,
  onForgot,
}: {
  onUnlock: () => void;
  onForgot?: () => void;
}) {
  const [error, setError] = useState<string>();
  const [bio, setBio] = useState<BiometricInfo>();

  const tryBio = useCallback(
    async (info: BiometricInfo) => {
      if (await authenticateBiometric(info.label)) onUnlock();
    },
    [onUnlock],
  );

  useEffect(() => {
    (async () => {
      // tampilkan tombol biometrik hanya jika: user mengaktifkan DAN perangkat masih mendukung
      if (!(await isBiometricEnabled())) return;
      const info = await getBiometricInfo();
      if (!info.available) return;
      setBio(info);
      tryBio(info); // langsung munculkan prompt
    })();
  }, [tryBio]);

  const handle = async (pin: string) => {
    const r = await verifyPin(pin);
    if (r.ok) return onUnlock();
    if (r.lockedUntil) {
      const t = new Date(r.lockedUntil).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return setError(`Terlalu banyak percobaan. Coba lagi pukul ${t}`);
    }
    setError(`PIN salah. Sisa percobaan: ${r.remaining}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <PinPad
        title="Masukkan PIN"
        error={error}
        onComplete={handle}
        onBiometric={bio ? () => tryBio(bio) : undefined}
        biometricIcon={bio?.icon}
      />
      {onForgot && (
        <Pressable
          onPress={onForgot}
          style={{ position: "absolute", bottom: 48, alignSelf: "center" }}
          hitSlop={12}
        >
          <Text style={{ color: "#2563eb", fontSize: 15, fontWeight: "600" }}>
            Lupa PIN?
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const LOCK_AFTER_MS = 30_000; // terkunci jika di background > 30 detik

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const bgAt = useRef<number | null>(null);

  useEffect(() => {
    hasLocalPin().then((has) => {
      setLocked(has);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (st) => {
      if (st === "background") bgAt.current = Date.now();
      if (
        st === "active" &&
        bgAt.current &&
        Date.now() - bgAt.current > LOCK_AFTER_MS
      ) {
        if (await hasLocalPin()) setLocked(true);
        bgAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) return null;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

/* ===================================================================
   6) AVATAR PICKER (dipakai di form register)
   Simpan `value` (key) ke server sebagai avatarKey.
   =================================================================== */
export const AVATARS = [
  { key: "fox", emoji: "🦊", bg: "#fed7aa" },
  { key: "cat", emoji: "🐱", bg: "#fde68a" },
  { key: "panda", emoji: "🐼", bg: "#e5e7eb" },
  { key: "owl", emoji: "🦉", bg: "#ddd6fe" },
  { key: "frog", emoji: "🐸", bg: "#bbf7d0" },
  { key: "bear", emoji: "🐻", bg: "#fecaca" },
  { key: "tiger", emoji: "🐯", bg: "#fed7aa" },
  { key: "koala", emoji: "🐨", bg: "#cbd5e1" },
  { key: "rabbit", emoji: "🐰", bg: "#fbcfe8" },
  { key: "lion", emoji: "🦁", bg: "#fef08a" },
  { key: "penguin", emoji: "🐧", bg: "#bae6fd" },
  { key: "unicorn", emoji: "🦄", bg: "#f5d0fe" },
] as const;

export function Avatar({
  avatarKey,
  size = 48,
}: {
  avatarKey?: string | null;
  size?: number;
}) {
  const a = AVATARS.find((x) => x.key === avatarKey) ?? AVATARS[0];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: a.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{a.emoji}</Text>
    </View>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={s.avatarGrid}>
      {AVATARS.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => onChange(a.key)}
          style={[s.avatarItem, value === a.key && s.avatarOn]}
        >
          <Avatar avatarKey={a.key} size={56} />
        </Pressable>
      ))}
    </View>
  );
}

/* ===================================================================
   STYLE
   =================================================================== */
const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 14, color: "#6b7280", marginTop: 6, textAlign: "center" },
  dots: { flexDirection: "row", gap: 14, marginTop: 28 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#9ca3af",
  },
  dotOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 12,
    minHeight: 18,
    textAlign: "center",
  },
  grid: { width: 300, flexDirection: "row", flexWrap: "wrap", marginTop: 16 },
  key: {
    width: 100,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  keyTxt: { fontSize: 28, fontWeight: "500", color: "#111827" },
  btn: {
    marginTop: 28,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnTxt: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { marginTop: 16, color: "#6b7280", fontSize: 15 },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  avatarItem: {
    padding: 4,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarOn: { borderColor: "#2563eb" },
});
