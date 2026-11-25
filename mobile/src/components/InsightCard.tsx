import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../lib/theme";
import {
  AreaChart,
  BarTrendChart,
  ChartCard,
  DayPoint,
  DonutChart,
  DonutItem,
  TrendPoint,
} from "./Charts";

type Tab = "cashflow" | "daily" | "category";

const TABS: { key: Tab; label: string; subtitle: string }[] = [
  { key: "cashflow", label: "Arus kas", subtitle: "Pemasukan dan pengeluaran 6 bulan terakhir" },
  { key: "daily", label: "Harian", subtitle: "Pengeluaran per hari" },
  { key: "category", label: "Kategori", subtitle: "Ke mana uang Anda pergi" },
];

/**
 * Satu kartu, tiga sudut pandang. Dashboard tetap ringkas dan pengguna
 * memilih sendiri chart yang ingin dilihat.
 */
export function InsightCard({
  monthTitle,
  currency,
  trend,
  days,
  categories,
}: {
  monthTitle: string;
  currency: string;
  trend: TrendPoint[];
  days: DayPoint[];
  categories: DonutItem[];
}) {
  const [tab, setTab] = useState<Tab>("category");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <ChartCard
      title={`Insight · ${monthTitle}`}
      subtitle={current.subtitle}
    >
      <View style={styles.segment} accessibilityRole="tablist">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "cashflow" ? <BarTrendChart points={trend} currency={currency} /> : null}
      {tab === "daily" ? (
        <AreaChart points={days} currency={currency} caption="Total pengeluaran bulan ini" />
      ) : null}
      {tab === "category" ? (
        <DonutChart items={categories} currency={currency} centerLabel="Pengeluaran" />
      ) : null}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  segmentTextActive: { color: colors.ink },
});
