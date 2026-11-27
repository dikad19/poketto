import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BADGE_IMAGES, levelColor } from "../lib/levelAssets";
import { colors, space } from "../lib/theme";
import type { Progress, Quest, Quests } from "../lib/progress";
import { STATE_STYLE, TYPE_LABEL, formatRp } from "./QuestCard";

const MAX_VISIBLE = 3;
const SETTLED = new Set(["DONE", "OVER", "NO_BASELINE", "MISSED"]);

// Quest yang masih bisa dikerjakan tampil dulu, sisanya mengisi kekosongan
function pickQuests(all: Quest[]) {
  const active = all.filter((q) => !SETTLED.has(q.state));
  const rest = all.filter((q) => SETTLED.has(q.state));
  return [...active, ...rest].slice(0, MAX_VISIBLE);
}

function QuestRow({ quest }: { quest: Quest }) {
  const st = STATE_STYLE[quest.state];
  const isLog = quest.kind === "LOG";
  const hasBar = isLog
    ? quest.goal > 0
    : quest.target !== null && quest.target > 0;
  const ratio = isLog
    ? Math.min(1, quest.progress / Math.max(1, quest.goal))
    : hasBar
      ? Math.min(1, quest.spent / quest.target!)
      : 0;
  const detail = isLog
    ? `${quest.progress}/${quest.goal}`
    : hasBar
      ? `${formatRp(quest.spent)} dari ${formatRp(quest.target!)}`
      : null;

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.ink,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {quest.title}
          </Text>
        </View>
        <Text
          style={{ fontSize: 12, fontWeight: "500", color: colors.primary }}
        >
          +{quest.exp} EXP
        </Text>
      </View>

      {hasBar ? (
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: "#f3f4f6",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              width: `${ratio * 100}%`,
              borderRadius: 3,
              backgroundColor: st.color,
            }}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: colors.muted }}>
          {TYPE_LABEL[quest.type]}
          {detail ? ` · ${detail}` : ""}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: st.color }}>
          {st.label}
        </Text>
      </View>
    </View>
  );
}

export function QuestWidget({
  progress,
  quests,
  onPress,
}: {
  progress: Progress | null;
  quests: Quests | null;
  onPress: () => void;
}) {
  if (!progress && !quests) return null;

  const color = levelColor(progress?.level ?? 1);
  const badge = progress?.badges.find((b) => b.level === progress.level);
  const image = progress ? BADGE_IMAGES[progress.level] : undefined;
  const pct = Math.max(0, Math.min(100, progress?.progressPct ?? 0));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: space.md,
        borderRadius: 6,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        gap: 14,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {progress ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 45,
              height: 45,
              borderRadius: 26,
              backgroundColor: color + "22",
              borderWidth: 2,
              borderColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {image ? (
              <Image
                source={image}
                style={{ width: 30, height: 30, marginBottom: 5 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 24 }}>{badge?.emoji}</Text>
            )}
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "500", color: colors.ink }}
                numberOfLines={1}
              >
                {progress.levelName}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Level {progress.level}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#f3f4f6",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 6,
                  width: `${pct}%`,
                  borderRadius: 3,
                  backgroundColor: color,
                }}
              />
            </View>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {progress.totalExp.toLocaleString("id-ID")} EXP
              {progress.nextLevelExp !== null
                ? ` · berikutnya ${progress.nextLevelExp.toLocaleString("id-ID")}`
                : " · level maksimum"}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.placeholder}
          />
        </View>
      ) : null}

      {progress && quests ? (
        <View style={{ height: 1, backgroundColor: colors.line }} />
      ) : null}

      {quests && quests.length > 0 ? (
        <View style={{ gap: 14 }}>
          {pickQuests(quests).map((q) => (
            <QuestRow key={q.id} quest={q} />
          ))}
          {/* {quests.length > MAX_VISIBLE ? (
            <Text
              style={{ fontSize: 12, fontWeight: "500", color: colors.primary }}
            >
              Lihat semua quest ({quests.length})
            </Text>
          ) : null} */}
        </View>
      ) : null}
    </Pressable>
  );
}
