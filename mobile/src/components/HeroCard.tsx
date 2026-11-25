import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatCompact, formatMoney } from "../lib/format";
import { colors, radius, space } from "../lib/theme";
import { SHEET_OVERLAP } from "./SpaceUI";
import { Skeleton } from "./Skeleton";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const GOOD = "#A6F4C5";
const BAD = "#FFD8A8";
const SOFT = "rgba(255,255,255,0.78)";

const GLOWS = [
  { id: "glowLight", cx: 40, cy: 30, r: 300, color: "#9CBEF5", opacity: 0.6 },
  {
    id: "glowIndigo",
    cx: 385,
    cy: 60,
    r: 230,
    color: "#7B7CF2",
    opacity: 0.42,
  },
  { id: "glowSky", cx: 395, cy: 260, r: 210, color: "#4F8FE0", opacity: 0.3 },
  {
    id: "glowCoin",
    cx: 320,
    cy: 440,
    r: 240,
    color: colors.coin,
    opacity: 0.32,
  },
  { id: "glowDeep", cx: 10, cy: 450, r: 280, color: "#081426", opacity: 0.6 },
];

export function HeroHeader({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.shell}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="heroBg" x1="0" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor="#B03A5B" />
            <Stop offset="0.5" stopColor="#7A1D3A" />
            <Stop offset="1" stopColor="#3A0B1C" />
          </LinearGradient>

          <RadialGradient id="heroGlow" cx="0.15" cy="0.05" r="0.7">
            <Stop offset="0" stopColor="#f16384" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#f16384" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroBg)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
      </Svg>

      <View style={[styles.inner, { paddingTop: insets.top + space.md }]}>
        {children}
      </View>
    </View>
  );
}

function splitTail(text: string): [string, string] {
  const i = text.lastIndexOf(".");
  if (i <= 0 || text.length - i !== 4) return [text, ""];
  return [text.slice(0, i), text.slice(i)];
}

export function HeroSummary({
  currency,
  totalBalance,
  income,
  expense,
  count,
  largestExpense,
  avgDaily,
  prevAvgDaily,
  daysLeft,
  isCurrentMonth = true,
  periodLabel = "bulan ini",
}: {
  currency: string;
  totalBalance: number;
  income: number;
  expense: number;
  count: number;
  largestExpense: { amount: number; title: string } | null;
  avgDaily: number;
  prevAvgDaily: number | null;
  daysLeft: number | null;
  isCurrentMonth?: boolean;
  periodLabel?: string;
}) {
  const vs = isCurrentMonth ? "bln lalu" : "bln sebelumnya";
  const CURRENCY_PREFIX: Record<string, string> = {
    IDR: "Rp",
    USD: "$",
    EUR: "€",
  };
  const prefix = (c: string) => CURRENCY_PREFIX[c] ?? c;
  const [head, tail] = splitTail(formatMoney(expense, currency));
  const when = isCurrentMonth ? "bulan ini" : periodLabel;
  const parts: string[] = [];
  if (income > 0) {
    parts.push(`dari pemasukan ${formatMoney(income, currency)}`);
    parts.push(`${Math.round((expense / income) * 100)}%`);
  } else {
    parts.push(`Belum ada pemasukan ${when}`);
  }
  if (daysLeft !== null) parts.push(`${daysLeft} hari lagi`);

  let delta: { text: string; color: string } | null = null;
  if (prevAvgDaily && prevAvgDaily > 0) {
    const pct = Math.round(((avgDaily - prevAvgDaily) / prevAvgDaily) * 100);
    delta =
      pct === 0
        ? { text: `Sama seperti ${vs}`, color: SOFT }
        : {
            text: `${pct > 0 ? "+" : ""}${pct}% vs ${vs}`,
            color: pct < 0 ? GOOD : BAD,
          };
  }

  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel={`Pengeluaran ${when} ${formatMoney(expense, currency)}. Total saldo ${formatMoney(totalBalance, currency)}.`}
    >
      <View style={styles.balancePill}>
        <Text style={styles.pillLabel}>Total saldo</Text>
        <Text style={styles.pillValue}>
          {formatMoney(totalBalance, currency)}
        </Text>
      </View>

      <Text style={styles.label}>Pengeluaran {when}</Text>
      <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
        {head}
        {tail ? <Text style={styles.amountTail}>{tail}</Text> : null}
      </Text>
      <Text style={styles.subtitle}>{parts.join("  •  ")}</Text>

      <View style={styles.stats}>
        <Stat
          label="Rata-rata harian"
          value={`${prefix(currency)} ${formatCompact(avgDaily)}`}
        >
          {delta ? (
            <Text style={[styles.statNote, { color: delta.color }]}>
              {delta.text}
            </Text>
          ) : null}
        </Stat>
        <View style={styles.divider} />
        <Stat label="Transaksi" value={String(count)}>
          <Text style={styles.statNote}>{when}</Text>
        </Stat>
        <View style={styles.divider} />
        <Stat
          label="Terbesar"
          value={
            largestExpense
              ? `${prefix(currency)} ${formatCompact(largestExpense.amount)}`
              : "–"
          }
        >
          <Text style={styles.statNote} numberOfLines={1}>
            {largestExpense?.title ?? "belum ada"}
          </Text>
        </Stat>
      </View>
    </View>
  );
}

export function HeroSummarySkeleton() {
  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel="Memuat ringkasan"
    >
      <Skeleton
        width={170}
        height={28}
        radius={14}
        style={{ marginBottom: space.lg }}
      />
      <Skeleton width={130} height={14} />
      <Skeleton
        width={220}
        height={36}
        radius={10}
        style={{ marginVertical: 6 }}
      />
      <Skeleton width={190} height={12} style={{ marginBottom: space.md }} />

      <View style={styles.stats}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", flex: 1 }}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Skeleton width={60} height={11} />
              <Skeleton width={50} height={17} />
              <Skeleton width={44} height={11} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.primary,
  },
  inner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingBottom: space.xl + SHEET_OVERLAP,
    gap: space.sm,
  },

  summary: { alignItems: "center", gap: 4, marginTop: space.sm },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginBottom: space.md,
    maxWidth: "100%",
  },
  pillLabel: { fontSize: 12, color: SOFT },
  pillValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
  },

  label: { fontSize: 14, color: "#fafafa" },
  amount: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    maxWidth: "100%",
  },
  amountTail: { color: "rgba(255,255,255,0.5)" },
  subtitle: {
    fontSize: 12,
    color: SOFT,
    textAlign: "center",
    marginBottom: space.md,
  },

  stats: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: radius.field,
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 6 },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginVertical: 2,
  },
  statLabel: { fontSize: 11, color: SOFT },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    maxWidth: "100%",
  },
  statNote: {
    fontSize: 11,
    color: SOFT,
    textAlign: "center",
    maxWidth: "100%",
  },
});
