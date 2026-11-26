import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { FormError } from "../../components/TextField";
import { AVATAR_KEYS } from "../../lib/avatars";
import { useAuth } from "../../lib/auth";
import { api, ApiError } from "../../lib/api";
import { formErrorMessage } from "../../lib/validation";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function AvatarScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [avatarKey, setAvatarKey] = useState<string>(
    user?.avatarKey ?? AVATAR_KEYS[0],
  );
  const [username, setUsername] = useState(user?.username ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onNext() {
    if (saving) return;
    if (!USERNAME_RE.test(username)) {
      setError("Username 3-20 karakter: huruf kecil, angka, atau _");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await api("/me/profile", {
        method: "PATCH",
        body: { avatarKey, ...(username !== user?.username && { username }) },
      });
      await refreshUser();
      router.replace("/onboarding/pin");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "Username sudah dipakai, coba yang lain"
          : formErrorMessage(e),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 24 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: "#111827",
            lineHeight: 38,
          }}
        >
          Pilih avatar{"\n"}kamu
        </Text>

        <View style={{ alignItems: "center", marginTop: 24 }}>
          <Avatar avatarKey={avatarKey} name={username} size={200} />
        </View>

        {/* Username + tombol edit */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 32,
          }}
        >
          <Text style={{ color: "#6b7280", fontSize: 15 }}>Username</Text>
          {editing ? (
            <TextInput
              value={username}
              onChangeText={(v) => {
                setUsername(
                  v
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 20),
                );
                setError(undefined);
              }}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={() => setEditing(false)}
              onBlur={() => setEditing(false)}
              style={{
                minWidth: 140,
                textAlign: "right",
                fontWeight: "700",
                fontSize: 16,
                color: "#111827",
                borderBottomWidth: 1,
                borderColor: "#2563eb",
                paddingVertical: 2,
              }}
            />
          ) : (
            <Pressable
              onPress={() => setEditing(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              hitSlop={10}
            >
              <Text
                style={{ fontWeight: "700", fontSize: 16, color: "#111827" }}
              >
                {username}
              </Text>
              <Ionicons name="pencil" size={18} color="#111827" />
            </Pressable>
          )}
        </View>

        <Text
          style={{
            color: "#6b7280",
            fontSize: 15,
            marginTop: 28,
            marginBottom: 12,
          }}
        >
          Avatar
        </Text>
        <FlatList
          data={AVATAR_KEYS}
          keyExtractor={(k) => k}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const selected = item === avatarKey;
            return (
              <Pressable onPress={() => setAvatarKey(item)}>
                <View
                  style={{
                    padding: 3,
                    borderRadius: 40,
                    borderWidth: 3,
                    borderColor: selected ? "#2563eb" : "transparent",
                  }}
                >
                  <Avatar avatarKey={item} size={64} />
                  {selected && (
                    <View
                      style={{
                        position: "absolute",
                        inset: 3,
                        borderRadius: 32,
                        backgroundColor: "rgba(0,0,0,0.35)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="checkmark" size={28} color="#fff" />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={{ flex: 1 }} />
        <FormError message={error} />
        <Button title="Lanjut" onPress={onNext} loading={saving} />
      </View>
    </SafeAreaView>
  );
}
