import { router } from "expo-router";
import { useState } from "react";
import { useSpaces } from "../lib/SpaceContext";
import { Tx } from "../lib/finance";
import { formatMoney, monthLabel } from "../lib/format";
import { TYPE_LABEL } from "../lib/spaces";
import { colors, radius, space } from "../lib/theme";
import { Button } from "./Button";
import { categoryLabel, CategoryGlyph, TransferGlyph } from "./CategoryGlyph";
import { SpaceEmoji } from "./SpaceUI";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
export const POSITIVE = "#067647";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BottomSheet } from "./BottomSheet";
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
    tx.type === "INCOME"
      ? POSITIVE
      : tx.type === "EXPENSE"
        ? colors.ink
        : colors.muted;

  const parts: string[] =
    tx.type === "TRANSFER"
      ? [`${tx.wallet.name} → ${tx.toWallet?.name ?? "?"}`]
      : [
          tx.category ? categoryLabel(tx.category.name) : "Tanpa kategori",
          tx.wallet.name,
        ];
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
  onDark,
}: {
  from: Date;
  offset: number;
  onChange: (offset: number) => void;
  /** Teks putih, untuk dipakai di atas latar gelap (hero) */
  onDark?: boolean;
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
        <Text style={[styles.stepIcon, onDark && { color: "#FFFFFF" }]}>‹</Text>
      </Pressable>
      <Text style={[styles.stepLabel, onDark && { color: "#FFFFFF" }]}>
        {monthLabel(from)}
      </Text>
      <Pressable
        onPress={() => onChange(offset + 1)}
        disabled={offset >= 0}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Bulan berikutnya"
        style={[styles.stepBtn, offset >= 0 && { opacity: 0.3 }]}
      >
        <Text style={[styles.stepIcon, onDark && { color: "#FFFFFF" }]}>›</Text>
      </Pressable>
    </View>
  );
}

function Avatar({ size = 34 }: { size?: number }) {
  const { user } = useAuth();
  const photo = (user as { avatarUrl?: string | null } | null)?.avatarUrl;
  const initial = (user?.name ?? user?.username ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{
            width: size - 3,
            height: size - 3,
            borderRadius: (size - 3) / 2,
          }}
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} baru` : label}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={16} color="#FFFFFF" />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function HeroTopBar({
  notificationCount = 0,
  onNotifications,
  onAvatarPress,
}: {
  notificationCount?: number;
  onNotifications?: () => void;
  onAvatarPress?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onAvatarPress}
        disabled={!onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Profil"
      >
        <Avatar />
      </Pressable>

      <View style={styles.topActions}>
        <SpaceSwitcher />
        <IconButton
          icon="notifications-outline"
          label="Notifikasi"
          onPress={onNotifications}
          badge={notificationCount}
        />
      </View>
    </View>
  );
}

export function SpaceSwitcher() {
  const { spaces, active, setActiveId } = useSpaces();
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();

  if (!active) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Space aktif: ${active.name}. Ketuk untuk ganti.`}
        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="layers-outline" size={16} color="#FFFFFF" />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Pilih space"
        subtitle="Ganti ruang keuangan yang sedang aktif"
      >
        <ScrollView
          style={{ maxHeight: height * 0.42 }}
          contentContainerStyle={{ gap: space.sm }}
          showsVerticalScrollIndicator={false}
        >
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
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <SpaceEmoji emoji={s.emoji} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.optionName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {TYPE_LABEL[s.type]} · {s.memberCount} anggota
                  </Text>
                </View>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected ? colors.primary : colors.line}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => {
            setOpen(false);
            router.push("/spaces/new");
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.addIcon}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
          <Text style={styles.addText}>Buat space baru</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  rowMeta: { fontSize: 13, color: colors.muted },
  rowAmount: { fontSize: 15, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.line, opacity: 0.6 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
  pillDark: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  pillText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
    flexShrink: 1,
  },
  pillCaret: { fontSize: 12, color: colors.muted },
  avatarText: { color: "#FFFFFF", fontWeight: "500", fontSize: 12 },
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm + 4,
    borderRadius: radius.field + 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.paper },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  side: { flex: 1, flexDirection: "row" },
  sideEnd: { justifyContent: "flex-end" },
  topText: { flex: 1, minWidth: 0, gap: 4 },
  greet: { fontSize: 12, color: "rgba(255,255,255,0.72)" },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.coin,
    borderWidth: 1.5,
    borderColor: "#7A1D3A",
  },
  switcher: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  switcherName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: colors.ink },

  compactTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  compactName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    flexShrink: 1,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm + 4,
    borderRadius: radius.field + 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  addText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  optionName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  check: { fontSize: 18, color: colors.primary, fontWeight: "700" },
});
