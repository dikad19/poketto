import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSpaces } from "../lib/SpaceContext";
import { Tx } from "../lib/finance";
import { formatMoney, monthLabel } from "../lib/format";
import { TYPE_LABEL } from "../lib/spaces";
import { colors, radius, space } from "../lib/theme";
import { Button } from "./Button";
import { categoryLabel, CategoryGlyph, TransferGlyph } from "./CategoryGlyph";
import { SpaceEmoji } from "./SpaceUI";

export const POSITIVE = "#067647";

/* ---------- Baris transaksi ---------- */

export function TxRow({
  tx,
  currency,
  showAuthor,
  onPress,
}: {
  tx: Tx;
  currency: string;
  showAuthor?: boolean;
  onPress?: () => void;
}) {
  const sign = tx.type === "EXPENSE" ? "-" : tx.type === "INCOME" ? "+" : "";
  const color =
    tx.type === "INCOME" ? POSITIVE : tx.type === "EXPENSE" ? colors.ink : colors.muted;

  const parts: string[] =
    tx.type === "TRANSFER"
      ? [`${tx.wallet.name} → ${tx.toWallet?.name ?? "?"}`]
      : [tx.category ? categoryLabel(tx.category.name) : "Tanpa kategori", tx.wallet.name];
  if (showAuthor) parts.push(tx.createdBy.name ?? `@${tx.createdBy.username}`);
  if (tx.visibility === "PRIVATE") parts.push("Pribadi");

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      {tx.type === "TRANSFER" ? (
        <TransferGlyph size={40} />
      ) : (
        <CategoryGlyph icon={tx.category?.icon} size={40} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {tx.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {parts.join(" · ")}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color }]}>
        {sign}
        {formatMoney(tx.amount, currency)}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* ---------- Pemilih bulan ---------- */

export function MonthStepper({
  from,
  offset,
  onChange,
}: {
  from: Date;
  offset: number;
  onChange: (offset: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(offset - 1)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Bulan sebelumnya"
        style={styles.stepBtn}
      >
        <Text style={styles.stepIcon}>‹</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{monthLabel(from)}</Text>
      <Pressable
        onPress={() => onChange(offset + 1)}
        disabled={offset >= 0}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Bulan berikutnya"
        style={[styles.stepBtn, offset >= 0 && { opacity: 0.3 }]}
      >
        <Text style={styles.stepIcon}>›</Text>
      </Pressable>
    </View>
  );
}

/* ---------- Pemilih space ---------- */

export function SpaceSwitcher() {
  const { spaces, active, setActiveId } = useSpaces();
  const [open, setOpen] = useState(false);

  if (!active) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Space aktif: ${active.name}. Ketuk untuk ganti.`}
        style={styles.pill}
      >
        <Text style={{ fontSize: 16 }}>{active.emoji || "💰"}</Text>
        <Text style={styles.pillText} numberOfLines={1}>
          {active.name}
        </Text>
        <Text style={styles.pillCaret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Pilih space</Text>
            {spaces.map((s) => {
              const selected = s.id === active.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setActiveId(s.id);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionActive]}
                >
                  <SpaceEmoji emoji={s.emoji} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {TYPE_LABEL[s.type]} · {s.memberCount} anggota
                    </Text>
                  </View>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
            <Button
              title="Buat space baru"
              variant="secondary"
              onPress={() => {
                setOpen(false);
                router.push("/spaces/new");
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  rowMeta: { fontSize: 13, color: colors.muted },
  rowAmount: { fontSize: 15, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.line, opacity: 0.6 },

  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stepIcon: { fontSize: 28, color: colors.primary, fontWeight: "600" },
  stepLabel: { fontSize: 17, fontWeight: "700", color: colors.ink },

  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pillText: { fontSize: 15, fontWeight: "600", color: colors.ink, flexShrink: 1 },
  pillCaret: { fontSize: 12, color: colors.muted },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.45)",
    justifyContent: "center",
    padding: space.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.field + 4,
    padding: space.md,
    gap: space.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.paper },
  optionName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  check: { fontSize: 18, color: colors.primary, fontWeight: "700" },
});
