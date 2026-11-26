import { Text, View } from "react-native";
import { AvatarWithBorder } from "./AvatarWithBorder";
import { useAuth } from "../lib/auth";
import { levelColor } from "../lib/levelAssets";
import type { Progress } from "../lib/progress";

// Kartu level: avatar + border, nama level, progress bar EXP.
// Dipakai di halaman Pencapaian dan bisa ditaruh di home/profil.
export function LevelCard({ progress }: { progress: Progress }) {
  const { user } = useAuth();
  const color = levelColor(progress.level);
  const isMax = progress.nextLevelExp === null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <AvatarWithBorder
        avatarKey={user?.avatarKey}
        avatarUrl={user?.avatarUrl}
        name={user?.name ?? user?.username}
        level={progress.level}
        size={64}
        showLevel
      />

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: "#6b7280" }}>Level {progress.level}</Text>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 2 }}>{progress.levelName}</Text>

        <View
          style={{ height: 8, borderRadius: 4, backgroundColor: "#f3f4f6", marginTop: 10, overflow: "hidden" }}
        >
          <View
            style={{
              height: 8,
              borderRadius: 4,
              width: `${Math.min(100, Math.max(isMax ? 100 : 2, progress.progressPct))}%`,
              backgroundColor: color,
            }}
          />
        </View>

        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          {isMax
            ? `${progress.totalExp.toLocaleString("id-ID")} EXP · Level maksimum 🏆`
            : `${progress.totalExp.toLocaleString("id-ID")} / ${progress.nextLevelExp!.toLocaleString("id-ID")} EXP`}
        </Text>
      </View>
    </View>
  );
}
