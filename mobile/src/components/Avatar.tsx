import { Image, Text, View } from "react-native";
import { AVATAR_SOURCES } from "../lib/avatars";

type Props = {
  avatarKey?: string | null;
  avatarUrl?: string | null; // foto upload (kalau nanti ada), diprioritaskan
  name?: string | null;
  size?: number;
};

export function Avatar({ avatarKey, avatarUrl, name, size = 48 }: Props) {
  const source = avatarUrl ? { uri: avatarUrl } : avatarKey ? AVATAR_SOURCES[avatarKey] : undefined;
  const base = { width: size, height: size, borderRadius: size / 2 };

  if (source) return <Image source={source} style={[base, { backgroundColor: "#e5e7eb" }]} />;

  // fallback: inisial nama
  return (
    <View style={[base, { backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: "700", color: "#2563eb" }}>
        {(name?.trim()[0] ?? "?").toUpperCase()}
      </Text>
    </View>
  );
}
