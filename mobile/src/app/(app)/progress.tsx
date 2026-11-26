import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LevelCard } from "../../components/LevelCard";
import { QuestCard, formatRp } from "../../components/QuestCard";
import { BADGE_IMAGES, levelColor } from "../../lib/levelAssets";
import {
  useExpHistory,
  useProgress,
  useQuests,
  type BadgeInfo,
  type ExpEvent,
} from "../../lib/progress";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function periodLabel(e: ExpEvent) {
  const [y, m, d] = e.periodKey.split("-");
  const tgl = `${+d} ${BULAN[+m - 1]?.slice(0, 3)} ${y}`;
  switch (e.source) {
    case "MONTHLY_QUEST":
      return `Quest bulanan · ${BULAN[+m - 1]} ${y}`;
    case "WEEKLY_LOG":
      return `Konsisten seminggu · mulai ${tgl}`;
    case "DAILY_LOG_1":
      return `Catat transaksi · ${tgl}`;
    case "DAILY_LOG_3":
      return `Rajin mencatat · ${tgl}`;
    default:
      return `Quest harian · ${tgl}`;
  }
}

function eventDetail(e: ExpEvent) {
  if (e.source === "WEEKLY_LOG") return `${e.count} hari tercatat`;
  if (e.source === "DAILY_LOG_1" || e.source === "DAILY_LOG_3")
    return `${e.count} transaksi tercatat`;
  return `${formatRp(e.currentSpend)} lebih hemat dari ${formatRp(e.previousSpend)}`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
        marginTop: 8,
      }}
    >
      {children}
    </Text>
  );
}

function BadgeCell({ badge }: { badge: BadgeInfo }) {
  const color = levelColor(badge.level);
  const image = BADGE_IMAGES[badge.level];

  return (
    <View style={{ width: "31%", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: badge.earned ? color + "22" : "#f3f4f6",
          borderWidth: 2,
          borderColor: badge.earned ? color : "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {image ? (
          <Image
            source={image}
            style={{ width: 52, height: 52, opacity: badge.earned ? 1 : 0.25 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 32, opacity: badge.earned ? 1 : 0.25 }}>
            {badge.emoji}
          </Text>
        )}
        {!badge.earned && (
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              backgroundColor: "#9ca3af",
              borderRadius: 10,
              padding: 3,
            }}
          >
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: badge.earned ? "#111827" : "#9ca3af",
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      <Text style={{ fontSize: 11, color: "#9ca3af" }}>
        {badge.earned
          ? `Level ${badge.level}`
          : `${badge.minExp.toLocaleString("id-ID")} EXP`}
      </Text>
    </View>
  );
}

export default function ProgressScreen() {
  const progress = useProgress();
  const quests = useQuests();
  const history = useExpHistory(30);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([progress.reload(), quests.reload(), history.reload()]);
    setRefreshing(false);
  }

  if (progress.loading && !progress.data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#f9fafb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>
          Pencapaian
        </Text>

        {progress.error && !progress.data && (
          <Text style={{ color: "#dc2626" }}>
            {progress.error}. Tarik ke bawah untuk coba lagi.
          </Text>
        )}

        {progress.data && <LevelCard progress={progress.data} />}

        {quests.data && (
          <>
            <SectionTitle>Quest</SectionTitle>
            {quests.data.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </>
        )}

        {progress.data && (
          <>
            <SectionTitle>Koleksi badge</SectionTitle>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                rowGap: 18,
                justifyContent: "space-between",
              }}
            >
              {progress.data.badges.map((b) => (
                <BadgeCell key={b.level} badge={b} />
              ))}
            </View>
          </>
        )}

        <SectionTitle>Riwayat EXP</SectionTitle>
        {history.data && history.data.length === 0 && (
          <Text style={{ color: "#6b7280", fontSize: 13, lineHeight: 19 }}>
            Belum ada EXP. Catat transaksi dan hemat dari kemarin, EXP muncul
            setelah tengah malam.
          </Text>
        )}
        {history.data?.map((e) => (
          <View
            key={e.id}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}
              >
                {periodLabel(e)}
              </Text>
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {eventDetail(e)}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#16a34a" }}>
              +{e.exp} EXP
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
