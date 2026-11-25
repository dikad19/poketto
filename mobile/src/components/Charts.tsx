import { ReactNode, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { formatCompact, formatMoney } from "../lib/format";
import { colors, radius, space } from "../lib/theme";

export const CHART = {
  income: "#12B76A",
  incomeTop: "#6CE9A6",
  expense: colors.primary,
  expenseTop: "#5C84BA",
  track: "#F2F4F7",
  highlight: "#F7F8FA",
  palette: ["#1F3A5F", "#F5B335", "#12B76A", "#E5509A", "#7A5AF8", "#98A2B3"],
};

/* ---------- Pembungkus kartu ---------- */

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={{ gap: 2 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

/* ---------- 1. Bar: pemasukan vs pengeluaran per bulan ---------- */

export type TrendPoint = {
  key: string;
  label: string; // "Nov"
  title: string; // "November 2026"
  income: number;
  expense: number;
};

export function BarTrendChart({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const n = points.length;
  const idx = Math.min(sel ?? n - 1, n - 1);
  const current = points[idx];
  const max = Math.max(0, ...points.flatMap((p) => [p.income, p.expense]));

  if (n === 0 || max === 0) return <Empty text="Belum ada data untuk ditampilkan." />;

  const H = 170;
  const TOP = 6;
  const gw = w / n;
  const bw = Math.max(8, Math.min(16, gw * 0.26));
  const gap = 4;
  const barH = (v: number) => (v <= 0 ? 0 : Math.max(8, (v / max) * (H - TOP)));

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.summaryRow} accessibilityLiveRegion="polite">
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{current.title}</Text>
          <Text style={[styles.summaryValue, { color: CHART.income }]}>
            +{formatMoney(current.income, currency)}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={styles.summaryTitle}>Pengeluaran</Text>
          <Text style={[styles.summaryValue, { color: CHART.expense }]}>
            -{formatMoney(current.expense, currency)}
          </Text>
        </View>
      </View>

      <View
        style={{ height: H + 26 }}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      >
        {w > 0 ? (
          <Svg width={w} height={H} style={styles.abs} pointerEvents="none">
            <Defs>
              <LinearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={CHART.incomeTop} />
                <Stop offset="1" stopColor={CHART.income} />
              </LinearGradient>
              <LinearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={CHART.expenseTop} />
                <Stop offset="1" stopColor={CHART.expense} />
              </LinearGradient>
            </Defs>
            {points.map((p, i) => {
              const cx = gw * i + gw / 2;
              const xi = cx - bw - gap / 2;
              const xe = cx + gap / 2;
              const active = i === idx;
              const hi = barH(p.income);
              const he = barH(p.expense);
              return (
                <G key={p.key}>
                  {active ? (
                    <Rect x={gw * i + 3} y={0} width={gw - 6} height={H} rx={14} fill={CHART.highlight} />
                  ) : null}
                  <Rect x={xi} y={TOP} width={bw} height={H - TOP} rx={bw / 2} fill={CHART.track} />
                  <Rect x={xe} y={TOP} width={bw} height={H - TOP} rx={bw / 2} fill={CHART.track} />
                  {hi > 0 ? (
                    <Rect
                      x={xi}
                      y={H - hi}
                      width={bw}
                      height={hi}
                      rx={bw / 2}
                      fill="url(#barIncome)"
                      opacity={active ? 1 : 0.6}
                    />
                  ) : null}
                  {he > 0 ? (
                    <Rect
                      x={xe}
                      y={H - he}
                      width={bw}
                      height={he}
                      rx={bw / 2}
                      fill="url(#barExpense)"
                      opacity={active ? 1 : 0.6}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}

        <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
          {points.map((p, i) => (
            <Pressable
              key={p.key}
              onPress={() => setSel(i)}
              accessibilityRole="button"
              accessibilityLabel={`${p.title}: pemasukan ${formatCompact(p.income)}, pengeluaran ${formatCompact(p.expense)}`}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <Text style={[styles.axis, i === idx && styles.axisActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <LegendDot color={CHART.income} label="Pemasukan" />
        <LegendDot color={CHART.expense} label="Pengeluaran" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/* ---------- 2. Area: tren harian ---------- */

export type DayPoint = { key: string; label: string; title: string; value: number };

/** Kurva halus (Catmull-Rom -> bezier), dijepit supaya tidak melengkung di bawah dasar. */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  points,
  currency,
  caption,
  color = colors.primary,
}: {
  points: DayPoint[];
  currency: string;
  caption: string;
  color?: string;
}) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const n = points.length;
  const total = points.reduce((s, p) => s + p.value, 0);
  const max = Math.max(0, ...points.map((p) => p.value));

  if (n === 0 || max === 0) return <Empty text="Belum ada pengeluaran bulan ini." />;

  const H = 140;
  const PAD = 10;
  const xAt = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const yAt = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const line = smoothPath(pts);
  const area = n > 1 ? `${line} L ${pts[n - 1].x} ${H} L ${pts[0].x} ${H} Z` : "";

  const pick = (e: GestureResponderEvent) => {
    if (!w) return;
    const i = n === 1 ? 0 : Math.round((e.nativeEvent.locationX / w) * (n - 1));
    setSel(Math.min(n - 1, Math.max(0, i)));
  };

  const ticks = Array.from(new Set([0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1]));
  const shown = sel !== null ? points[sel] : null;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.summaryRow} accessibilityLiveRegion="polite">
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryValue}>{formatMoney(shown ? shown.value : total, currency)}</Text>
          <Text style={styles.summaryTitle}>{shown ? shown.title : caption}</Text>
        </View>
        {shown ? (
          <Pressable onPress={() => setSel(null)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.reset}>Reset</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Geser untuk lihat per hari</Text>
        )}
      </View>

      <View
        style={{ height: H }}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
      >
        {w > 0 ? (
          <Svg width={w} height={H} pointerEvents="none">
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.3} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                x1={0}
                x2={w}
                y1={PAD + (H - PAD * 2) * f}
                y2={PAD + (H - PAD * 2) * f}
                stroke={CHART.track}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ))}
            {n > 1 ? <Path d={area} fill="url(#areaFill)" /> : null}
            {n > 1 ? (
              <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            ) : null}
            {sel !== null ? (
              <>
                <Line x1={pts[sel].x} x2={pts[sel].x} y1={0} y2={H} stroke={color} strokeOpacity={0.25} strokeWidth={1.5} />
                <Circle cx={pts[sel].x} cy={pts[sel].y} r={9} fill={color} fillOpacity={0.18} />
                <Circle cx={pts[sel].x} cy={pts[sel].y} r={5} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>

      <View style={styles.ticks}>
        {ticks.map((i) => (
          <Text key={i} style={styles.axisPlain}>
            {points[i].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ---------- 3. Donut: komposisi kategori ---------- */

export type DonutItem = { key: string; label: string; value: number; color: string };

export function DonutChart({
  items,
  currency,
  centerLabel = "Total",
}: {
  items: DonutItem[];
  currency: string;
  centerLabel?: string;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return <Empty text="Belum ada pengeluaran bulan ini." />;

  const SIZE = 184;
  const STROKE = 26;
  const r = (SIZE - STROKE - 6) / 2;
  const c = SIZE / 2;
  const circ = 2 * Math.PI * r;
  const gapLen = items.length > 1 ? 3 : 0;

  const selected = items.find((i) => i.key === sel) ?? null;
  let acc = 0;

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={c} cy={c} r={r} stroke={CHART.track} strokeWidth={STROKE} fill="none" />
            {items.map((item) => {
              const len = (item.value / total) * circ;
              const dash = Math.max(0, len - gapLen);
              const offset = acc;
              acc += len;
              const active = selected?.key === item.key;
              return (
                <Circle
                  key={item.key}
                  cx={c}
                  cy={c}
                  r={r}
                  stroke={item.color}
                  strokeWidth={active ? STROKE + 6 : STROKE}
                  strokeOpacity={selected && !active ? 0.35 : 1}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset}
                  rotation={-90}
                  origin={`${c}, ${c}`}
                  fill="none"
                  onPress={() => setSel(active ? null : item.key)}
                />
              );
            })}
          </Svg>
          <View style={styles.donutCenter} pointerEvents="none">
            <Text style={styles.donutLabel} numberOfLines={1}>
              {selected ? selected.label : centerLabel}
            </Text>
            <Text style={styles.donutValue}>
              {formatCompact(selected ? selected.value : total)}
            </Text>
            {selected ? (
              <Text style={styles.donutLabel}>{Math.round((selected.value / total) * 100)}%</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        {items.map((item) => {
          const active = selected?.key === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSel(active ? null : item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.legendRow, active && { backgroundColor: CHART.highlight }]}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendPct}>{Math.round((item.value / total) * 100)}%</Text>
              <Text style={styles.legendAmount}>{formatMoney(item.value, currency)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field + 4,
    padding: space.md,
    gap: space.md,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  cardSub: { fontSize: 13, color: colors.muted },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.md },
  abs: { position: "absolute", top: 0, left: 0 },

  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  summaryTitle: { fontSize: 13, color: colors.muted },
  summaryValue: { fontSize: 20, fontWeight: "700", color: colors.ink, letterSpacing: -0.2 },
  hint: { fontSize: 12, color: colors.placeholder, marginTop: 4 },
  reset: { fontSize: 13, fontWeight: "700", color: colors.primary },

  axis: { textAlign: "center", fontSize: 12, color: colors.muted, paddingBottom: 2 },
  axisActive: { color: colors.ink, fontWeight: "700" },
  axisPlain: { fontSize: 12, color: colors.muted },
  ticks: { flexDirection: "row", justifyContent: "space-between" },

  legend: { flexDirection: "row", justifyContent: "center", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 13, color: colors.muted },
  dot: { width: 10, height: 10, borderRadius: 5 },

  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  donutLabel: { fontSize: 12, color: colors.muted },
  donutValue: { fontSize: 22, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
    borderRadius: 10,
  },
  legendName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  legendPct: { fontSize: 13, color: colors.muted, width: 40, textAlign: "right" },
  legendAmount: { fontSize: 14, fontWeight: "700", color: colors.ink, minWidth: 96, textAlign: "right" },
});
