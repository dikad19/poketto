import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import {
  categoryLabel,
  CategoryGlyph,
  WalletGlyph,
} from "../../../components/CategoryGlyph";
import {
  Divider,
  MonthStepper,
  SpaceSwitcher,
  TxRow,
} from "../../../components/FinanceUI";
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionTitle,
} from "../../../components/SpaceUI";
import { financeApi } from "../../../lib/finance";
import { formatMoney, monthRange } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, radius, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";

export default function DashboardScreen() {
  const {
    active,
    loading: spacesLoading,
    error: spacesError,
    reload: reloadSpaces,
  } = useSpaces();
  const [offset, setOffset] = useState(0);
  const { from, to } = monthRange(offset);
  const spaceId = active?.id ?? null;

  const { data, error, loading, refreshing, refresh, retry } = useLoad(
    () =>
      spaceId ? financeApi.dashboard(spaceId, from, to) : Promise.resolve(null),
    [spaceId, offset],
  );

  // Jumlah anggota / peran bisa berubah setelah kembali dari layar space
  useFocusEffect(
    useCallback(() => {
      reloadSpaces();
    }, [reloadSpaces]),
  );

  const canAdd = !!active && hasRole(active.role, "MEMBER");
  const currency = data?.currency ?? "IDR";
  const showAuthor = !!active && active.type !== "PERSONAL";

  return (
    <Screen edges={["top"]} refreshing={refreshing} onRefresh={refresh}>
      <SpaceSwitcher />
      <MonthStepper from={from} offset={offset} onChange={setOffset} />

      {spacesLoading || loading ? (
        <Loading />
      ) : spacesError && !active ? (
        <ErrorState message={spacesError} onRetry={reloadSpaces} />
      ) : !active ? (
        <EmptyState
          title="Belum ada space"
          body="Buat space dari tab Akun untuk mulai mencatat."
        />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : data ? (
        <>
          <View style={styles.hero} accessibilityLabel="Ringkasan bulan ini">
            <Text style={styles.heroLabel}>Total saldo</Text>
            <Text style={styles.heroAmount}>
              {formatMoney(data.totalBalance, currency)}
            </Text>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSub}>Pemasukan</Text>
                <Text style={[styles.heroSubAmount, { color: "#A6F4C5" }]}>
                  +{formatMoney(data.income, currency)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSub}>Pengeluaran</Text>
                <Text style={[styles.heroSubAmount, { color: "#FECDCA" }]}>
                  -{formatMoney(data.expense, currency)}
                </Text>
              </View>
            </View>
            <Text style={styles.heroNet}>
              Selisih bulan ini: {data.net >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(data.net), currency)}
            </Text>
          </View>

          {data.wallets.length === 0 ? (
            <EmptyState
              title="Belum ada dompet"
              body="Buat dompet dulu (misalnya Tunai atau rekening bank) supaya bisa mencatat transaksi."
            >
              {canAdd ? (
                <Button
                  title="Buat dompet"
                  onPress={() => router.push("/wallets/new")}
                />
              ) : null}
            </EmptyState>
          ) : (
            <>
              <SectionTitle>Dompet</SectionTitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.walletRow}
              >
                {data.wallets.map((w) => (
                  <Card key={w.id} style={styles.walletCard}>
                    <WalletGlyph type={w.type} size={36} />
                    <Text style={styles.walletName} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text
                      style={[
                        styles.walletBalance,
                        w.balance < 0 && { color: colors.error },
                      ]}
                    >
                      {formatMoney(w.balance, currency)}
                    </Text>
                  </Card>
                ))}
              </ScrollView>
            </>
          )}

          <SectionTitle>Pengeluaran per kategori</SectionTitle>
          {data.byCategory.length === 0 ? (
            <EmptyState title="Belum ada pengeluaran bulan ini" />
          ) : (
            <Card style={{ gap: space.md }}>
              {data.byCategory.slice(0, 6).map((c) => (
                <View key={c.categoryId ?? "none"} style={{ gap: 6 }}>
                  <View style={styles.catTop}>
                    <CategoryGlyph icon={c.icon} size={32} />
                    <Text style={styles.catName} numberOfLines={1}>
                      {categoryLabel(c.name)}
                    </Text>
                    <Text style={styles.catAmount}>
                      {formatMoney(c.amount, currency)}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(c.percent, 2)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.catPercent}>
                    {c.percent}% dari pengeluaran
                  </Text>
                </View>
              ))}
            </Card>
          )}

          <SectionTitle>Transaksi terakhir</SectionTitle>
          {data.recent.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              body="Ketuk tombol + untuk mencatat yang pertama."
            >
              {canAdd && data.wallets.length > 0 ? (
                <Button
                  title="Catat transaksi"
                  onPress={() => router.push("/add")}
                />
              ) : null}
            </EmptyState>
          ) : (
            <Card style={{ gap: 0, paddingVertical: space.xs }}>
              {data.recent.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 ? <Divider /> : null}
                  <TxRow
                    tx={tx}
                    currency={currency}
                    showAuthor={showAuthor}
                    onPress={() =>
                      router.push({
                        pathname: "/transactions/[transactionId]",
                        params: { transactionId: tx.id },
                      })
                    }
                  />
                </View>
              ))}
            </Card>
          )}
          {data.recent.length > 0 ? (
            <Button
              title="Lihat semua transaksi"
              variant="secondary"
              onPress={() => router.navigate("/transactions")}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.field + 4,
    padding: space.lg,
    gap: 4,
  },
  heroLabel: { color: "#D0D5DD", fontSize: 14 },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heroRow: { flexDirection: "row", gap: space.md, marginTop: space.md },
  heroSub: { color: "#D0D5DD", fontSize: 13 },
  heroSubAmount: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  heroNet: { color: "#D0D5DD", fontSize: 13, marginTop: space.md },

  walletRow: { gap: space.sm, paddingRight: space.lg },
  walletCard: { width: 160, gap: 6 },
  walletName: { fontSize: 14, color: colors.muted },
  walletBalance: { fontSize: 16, fontWeight: "700", color: colors.ink },

  catTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  catName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
  catAmount: { fontSize: 15, fontWeight: "700", color: colors.ink },
  catPercent: { fontSize: 12, color: colors.muted },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.coin },
});
