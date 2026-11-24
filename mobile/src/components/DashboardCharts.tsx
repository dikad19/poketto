import { useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";
import { categoryLabel } from "./CategoryGlyph";
import { formatMoney } from "../lib/format";
import { colors } from "../lib/theme";

const PALETTE = [
  "#344054",
  "#12B76A",
  "#F79009",
  "#2E90FA",
  "#F04438",
  "#98A2B3",
];
const INCOME = "#12B76A";
const EXPENSE = "#F04438";

export type DailyPoint = { date: string; income: number; expense: number };

type CategoryItem = {
  categoryId: string | null;
  name: string;
  amount: number;
  percent: number;
};

/* ---------- Donut: tap a slice or a row to see details ---------- */

export function SpendingDonut({
  items,
  total,
  currency,
}: {
  items: CategoryItem[];
  total: number;
  currency: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const top = items.slice(0, 5).map((c) => ({
    label: categoryLabel(c.name),
    amount: c.amount,
    percent: c.percent,
  }));
  const rest = items.slice(5);
  if (rest.length > 0) {
    top.push({
      label: "Other",
      amount: rest.reduce((s, c) => s + c.amount, 0),
      percent: rest.reduce((s, c) => s + c.percent, 0),
    });
  }

  const toggle = (i: number) => setSelected((cur) => (cur === i ? null : i));

  const pieData = top.map((c, i) => ({
    value: c.amount,
    color: PALETTE[i % PALETTE.length],
    focused: selected === i,
    onPress: () => toggle(i),
  }));

  const sel = selected !== null ? top[selected] : null;

  return (
    <View style={styles.donutWrap}>
      <PieChart
        data={pieData}
        donut
        radius={96}
        innerRadius={68}
        innerCircleColor={colors.surface}
        isAnimated
        animationDuration={500}
        centerLabelComponent={() => (
          <View style={{ alignItems: "center", maxWidth: 110 }}>
            <Text style={styles.centerLabel} numberOfLines={1}>
              {sel ? sel.label : "Spent"}
            </Text>
            <Text
              style={styles.centerValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(sel ? sel.amount : total, currency)}
            </Text>
            {sel ? (
              <Text style={styles.centerLabel}>{Math.round(sel.percent)}%</Text>
            ) : null}
          </View>
        )}
      />

      <View style={styles.legend}>
        {top.map((c, i) => (
          <Pressable
            key={c.label}
            onPress={() => toggle(i)}
            style={[styles.legendRow, selected === i && styles.legendRowActive]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: PALETTE[i % PALETTE.length] },
              ]}
            />
            <Text style={styles.legendName} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={styles.legendPct}>{Math.round(c.percent)}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ---------- Line chart: drag finger to see the value per day ---------- */

export function CashflowChart({
  daily,
  currency,
}: {
  daily: DailyPoint[];
  currency: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  if (daily.length < 2) return null;

  const expense = daily.map((d) => ({ value: d.expense, date: d.date }));
  const income = daily.map((d) => ({ value: d.income, date: d.date }));
  const chartWidth = Math.max(width - 8, 0);
  const spacing = chartWidth / (daily.length - 1);

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <LineChart
          data={expense}
          data2={income}
          width={chartWidth}
          height={160}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={0}
          curved
          areaChart
          isAnimated
          animationDuration={600}
          color1={EXPENSE}
          color2={INCOME}
          thickness={2.5}
          startFillColor1={EXPENSE}
          startFillColor2={INCOME}
          startOpacity={0.18}
          endOpacity={0.01}
          hideDataPoints
          hideRules
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={0}
          noOfSections={3}
          pointerConfig={{
            pointerStripColor: colors.line,
            pointerStripWidth: 1,
            pointerColor: colors.primary,
            radius: 5,
            pointerLabelWidth: 140,
            pointerLabelHeight: 84,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[], secondary: any[]) => (
              <View style={styles.tooltip}>
                <Text style={styles.tipDate}>{fmtDay(items[0].date)}</Text>
                <Text style={[styles.tipRow, { color: INCOME }]}>
                  In {formatMoney(secondary?.[0]?.value ?? 0, currency)}
                </Text>
                <Text style={[styles.tipRow, { color: EXPENSE }]}>
                  Out {formatMoney(items[0].value, currency)}
                </Text>
              </View>
            ),
          }}
        />
      ) : null}
      <View style={styles.axis}>
        <Text style={styles.axisText}>{fmtDay(daily[0].date)}</Text>
        <Text style={styles.axisText}>
          {fmtDay(daily[daily.length - 1].date)}
        </Text>
      </View>
      <View style={styles.keyRow}>
        <View style={styles.keyItem}>
          <View style={[styles.dot, { backgroundColor: INCOME }]} />
          <Text style={styles.axisText}>Income</Text>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.dot, { backgroundColor: EXPENSE }]} />
          <Text style={styles.axisText}>Expenses</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { alignItems: "center", gap: 20 },
  centerLabel: { fontSize: 12, color: colors.muted },
  centerValue: { fontSize: 16, fontWeight: "700", color: colors.ink },
  legend: { alignSelf: "stretch", gap: 4 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  legendRowActive: { backgroundColor: colors.paper },
  legendName: { flex: 1, fontSize: 14, color: colors.ink, fontWeight: "500" },
  legendPct: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  dot: { width: 10, height: 10, borderRadius: 5 },

  tooltip: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  tipDate: { color: "#D0D5DD", fontSize: 11, marginBottom: 2 },
  tipRow: { fontSize: 12, fontWeight: "700" },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  axisText: { fontSize: 12, color: colors.muted },
  keyRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  keyItem: { flexDirection: "row", alignItems: "center", gap: 6 },
});
