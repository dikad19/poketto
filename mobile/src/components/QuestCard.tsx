import { Text, View } from "react-native";
import type { Quest, QuestState } from "../lib/progress";

export const formatRp = (n: number) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

export const STATE_STYLE: Record<
  QuestState,
  { color: string; bg: string; label: string }
> = {
  ON_TRACK: { color: "#16a34a", bg: "#dcfce7", label: "Sedang hemat" },
  OVER: { color: "#dc2626", bg: "#fee2e2", label: "Melebihi" },
  NEEDS_LOG: { color: "#d97706", bg: "#fef3c7", label: "Perlu dicatat" },
  NO_BASELINE: {
    color: "#6b7280",
    bg: "#f3f4f6",
    label: "Belum ada pembanding",
  },
  IN_PROGRESS: { color: "#2563eb", bg: "#eff6ff", label: "Berjalan" },
  DONE: { color: "#16a34a", bg: "#dcfce7", label: "Tercapai" },
  MISSED: { color: "#6b7280", bg: "#f3f4f6", label: "Terlewat" },
};

export const TYPE_LABEL = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
} as const;

const SETTLE_NOTE = {
  DAILY: "Status sementara. EXP dihitung setelah tengah malam.",
  WEEKLY: "Status sementara. EXP dihitung saat minggu berakhir (Senin 00:00).",
  MONTHLY: "Status sementara. EXP dihitung saat pergantian bulan.",
} as const;

function message(q: Quest): string {
  if (q.kind === "LOG") {
    if (q.state === "DONE")
      return q.type === "WEEKLY"
        ? "Target minggu ini sudah tercapai. EXP masuk saat minggu berakhir."
        : "Mantap, target hari ini tercapai. EXP masuk setelah tengah malam.";
    if (q.state === "MISSED")
      return "Hari tercatat minggu ini tidak akan cukup lagi. Coba lagi minggu depan.";
    return q.type === "WEEKLY"
      ? `Tercatat ${q.progress} dari ${q.goal} hari. Sisa ${q.daysLeft} hari minggu ini.`
      : `Tinggal ${q.goal - q.progress} transaksi lagi.`;
  }

  const daily = q.type === "DAILY";
  const base = daily ? "kemarin" : "bulan lalu";

  switch (q.state) {
    case "NO_BASELINE":
      return daily
        ? "Kemarin belum ada catatan, jadi belum ada pembanding. Catat transaksi harianmu mulai sekarang."
        : `Catatan bulan lalu kurang dari ${q.requiredDays} hari, jadi belum ada pembanding bulan ini.`;
    case "NEEDS_LOG":
      return daily
        ? `Catat transaksi hari ini supaya quest terhitung. Usahakan pengeluaran di bawah ${formatRp(q.target ?? 0)}.`
        : `Hari tercatat bulan ini tidak akan mencapai ${q.requiredDays} hari, jadi EXP bulan ini tidak bisa didapat. Bulan depan coba lagi.`;
    case "ON_TRACK":
      return `Bagus! Masih di bawah ${base}. Sisa ruang ${formatRp((q.target ?? 0) - q.spent)}.`;
    default:
      return `Pengeluaran sudah menyamai atau melebihi ${base}. ${daily ? "Besok coba lagi." : "Tahan sisa bulan ini supaya tidak bertambah."}`;
  }
}

export function QuestCard({ quest }: { quest: Quest }) {
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

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
            {quest.title}
          </Text>
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {TYPE_LABEL[quest.type]} · {quest.subtitle}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "#eff6ff",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563eb" }}>
            +{quest.exp} EXP
          </Text>
        </View>
      </View>

      {hasBar && (
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            {isLog ? (
              <>
                <Text
                  style={{ fontSize: 13, color: "#111827", fontWeight: "600" }}
                >
                  {quest.progress}/{quest.goal}
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>
                  {quest.type === "WEEKLY" ? "hari" : "transaksi"}
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{ fontSize: 13, color: "#111827", fontWeight: "600" }}
                >
                  {formatRp(quest.spent)}
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>
                  batas {formatRp(quest.target!)}
                </Text>
              </>
            )}
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#f3f4f6",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${ratio * 100}%`,
                backgroundColor: st.color,
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      )}

      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: st.bg,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", color: st.color }}>
          {st.label}
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: "#374151", lineHeight: 19 }}>
        {message(quest)}
      </Text>

      {quest.type === "MONTHLY" && quest.loggedDays !== undefined && (
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          Hari tercatat: {quest.loggedDays}/{quest.requiredDays} · sisa{" "}
          {quest.daysLeft} hari
        </Text>
      )}

      <Text style={{ fontSize: 11, color: "#9ca3af" }}>
        {SETTLE_NOTE[quest.type]}
      </Text>
    </View>
  );
}
