import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { monthLabel } from "../lib/format";
import { colors, radius, space } from "../lib/theme";
import { BottomSheet } from "./BottomSheet";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MIN_YEAR_SPAN = 10; // batas mundur (tahun)

export function MonthPicker({
  from,
  offset,
  onChange,
}: {
  /** Tanggal di bulan yang sedang dipilih */
  from: Date;
  /** 0 = bulan ini, -1 = bulan lalu, dst. */
  offset: number;
  onChange: (offset: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const selYear = from.getFullYear();
  const selIdx = selYear * 12 + from.getMonth();

  // Tahun yang sedang ditampilkan di sheet; direset ke tahun terpilih setiap dibuka
  const [year, setYear] = useState(selYear);
  useEffect(() => {
    if (open) setYear(selYear);
  }, [open, selYear]);

  const pick = (month: number) => {
    const idx = year * 12 + month;
    if (idx > nowIdx) return;
    onChange(offset + (idx - selIdx));
    setOpen(false);
  };

  const canNext = offset < 0;
  const canYearPrev = year > now.getFullYear() - MIN_YEAR_SPAN;
  const canYearNext = year < now.getFullYear();

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(offset - 1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Bulan dipilih ${monthLabel(from)}. Ketuk untuk ganti.`}
          style={styles.pill}
        >
          <Text style={styles.pillText}>{monthLabel(from)}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color="rgba(255,255,255,0.8)"
          />
        </Pressable>

        <Pressable
          onPress={() => onChange(offset + 1)}
          disabled={!canNext}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
          style={[styles.arrow, !canNext && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Pilih Bulan"
        subtitle="Lihat ringkasan untuk bulan lain"
      >
        <View style={styles.yearRow}>
          <Pressable
            onPress={() => setYear((y) => y - 1)}
            disabled={!canYearPrev}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Tahun sebelumnya"
            style={[styles.yearBtn, !canYearPrev && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
          </Pressable>
          <Text style={styles.yearText}>{year}</Text>
          <Pressable
            onPress={() => setYear((y) => y + 1)}
            disabled={!canYearNext}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Tahun berikutnya"
            style={[styles.yearBtn, !canYearNext && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {MONTHS.map((label, m) => {
            const idx = year * 12 + m;
            const future = idx > nowIdx;
            const selected = idx === selIdx;
            const current = idx === nowIdx;
            return (
              <Pressable
                key={label}
                onPress={() => pick(m)}
                disabled={future}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: future }}
                style={[
                  styles.cell,
                  current && styles.cellCurrent,
                  selected && styles.cellSelected,
                  future && { opacity: 0.3 },
                ]}
              >
                <Text
                  style={[styles.cellText, selected && { color: "#FFFFFF" }]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            onChange(0);
            setOpen(false);
          }}
          disabled={offset === 0}
          accessibilityRole="button"
          style={[styles.todayBtn, offset === 0 && { opacity: 0.4 }]}
        >
          <Text style={styles.todayText}>Kembali ke bulan ini</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  pillText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  yearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  yearText: { fontSize: 20, fontWeight: "700", color: colors.ink },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: {
    flexBasis: "31%",
    flexGrow: 1,
    height: 52,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cellCurrent: { borderColor: colors.primary },
  cellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cellText: { fontSize: 15, fontWeight: "600", color: colors.ink },

  todayBtn: {
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  todayText: { fontSize: 15, fontWeight: "600", color: colors.primary },
});
