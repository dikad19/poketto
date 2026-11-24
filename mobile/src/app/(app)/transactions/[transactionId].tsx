import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { categoryLabel } from "../../../components/CategoryGlyph";
import { POSITIVE } from "../../../components/FinanceUI";
import {
  Card,
  confirmAction,
  DangerButton,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
  showMessage,
} from "../../../components/SpaceUI";
import { useAuth } from "../../../lib/auth";
import { financeApi, TX_TYPE_LABEL } from "../../../lib/finance";
import { formatDateTime, formatMoney } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";
import { formErrorMessage } from "../../../lib/validation";

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const { active } = useSpaces();
  const { user } = useAuth();
  const spaceId = active?.id ?? null;
  const [deleting, setDeleting] = useState(false);

  const { data: tx, error, loading, retry } = useLoad(
    () => (spaceId ? financeApi.transaction(spaceId, transactionId) : Promise.resolve(null)),
    [spaceId, transactionId]
  );

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Detail transaksi" />
        <Loading />
      </Screen>
    );
  }
  if (!tx || !spaceId) {
    return (
      <Screen>
        <ScreenHeader title="Detail transaksi" />
        <ErrorState
          message={
            error?.status === 404
              ? "Transaksi tidak ditemukan. Mungkin sudah dihapus atau milik space lain."
              : (error?.message ?? "Gagal memuat transaksi.")
          }
          onRetry={error?.status === 404 ? undefined : retry}
        />
      </Screen>
    );
  }

  const canDelete =
    !!active && hasRole(active.role, "MEMBER") && (tx.createdBy.id === user?.id || hasRole(active.role, "ADMIN"));
  const sign = tx.type === "EXPENSE" ? "-" : tx.type === "INCOME" ? "+" : "";
  const color = tx.type === "INCOME" ? POSITIVE : tx.type === "EXPENSE" ? colors.ink : colors.muted;

  async function onDelete() {
    const ok = await confirmAction(
      "Hapus transaksi?",
      "Saldo dompet akan dihitung ulang tanpa transaksi ini.",
      "Hapus"
    );
    if (!ok || !spaceId) return;
    setDeleting(true);
    try {
      await financeApi.deleteTransaction(spaceId, tx!.id);
      router.back();
    } catch (e) {
      showMessage("Gagal menghapus", formErrorMessage(e));
      setDeleting(false);
    }
  }

  const rows: [string, string][] = [
    ["Jenis", TX_TYPE_LABEL[tx.type]],
    tx.type === "TRANSFER"
      ? ["Dompet", `${tx.wallet.name} → ${tx.toWallet?.name ?? "?"}`]
      : ["Dompet", tx.wallet.name],
  ];
  if (tx.category) rows.push(["Kategori", categoryLabel(tx.category.name)]);
  rows.push(["Tanggal", formatDateTime(tx.date)]);
  if (tx.fee > 0) rows.push(["Biaya admin", formatMoney(tx.fee)]);
  if (tx.note) rows.push(["Catatan", tx.note]);
  rows.push(["Dicatat oleh", tx.createdBy.name ?? `@${tx.createdBy.username}`]);
  rows.push(["Terlihat oleh", tx.visibility === "PRIVATE" ? "Hanya Anda" : "Semua anggota"]);

  return (
    <Screen>
      <ScreenHeader title={tx.title} />
      <Text style={[styles.amount, { color }]} accessibilityLabel="Nominal">
        {sign}
        {formatMoney(tx.amount)}
      </Text>
      <Card style={{ gap: space.md }}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </Card>
      {canDelete ? <DangerButton title="Hapus transaksi" onPress={onDelete} loading={deleting} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 34, lineHeight: 42, fontWeight: "700", letterSpacing: -0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 15, color: colors.ink, fontWeight: "500", flexShrink: 1, textAlign: "right" },
});
