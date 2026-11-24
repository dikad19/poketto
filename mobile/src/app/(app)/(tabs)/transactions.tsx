import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import {
  Divider,
  MonthStepper,
  SpaceSwitcher,
  TxRow,
} from "../../../components/FinanceUI";
import {
  Card,
  ChoiceRow,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  showMessage,
} from "../../../components/SpaceUI";
import { financeApi, Tx, TxType } from "../../../lib/finance";
import { dayKey, dayLabel, monthRange } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";
import { formErrorMessage } from "../../../lib/validation";

type Filter = "ALL" | TxType;

export default function TransactionsScreen() {
  const { active } = useSpaces();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>("ALL");
  const { from, to } = monthRange(offset);
  const spaceId = active?.id ?? null;
  const type = filter === "ALL" ? undefined : filter;

  const { data, error, loading, refreshing, refresh, retry } = useLoad(
    () =>
      spaceId
        ? financeApi.transactions(spaceId, { from, to, type })
        : Promise.resolve(null),
    [spaceId, offset, filter],
  );

  // Halaman berikutnya ("Muat lagi") disimpan terpisah dan di-reset setiap halaman pertama berubah
  const [more, setMore] = useState<Tx[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setMore([]);
    setCursor(data?.nextCursor ?? null);
  }, [data]);

  async function loadMore() {
    if (!spaceId || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await financeApi.transactions(spaceId, {
        from,
        to,
        type,
        cursor,
      });
      setMore((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      showMessage("Gagal memuat", formErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const groups = useMemo(() => {
    const items = [...(data?.items ?? []), ...more];
    const map = new Map<string, Tx[]>();
    for (const tx of items) {
      const key = dayKey(new Date(tx.date));
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    return [...map.entries()];
  }, [data, more]);

  const currency = "IDR";
  const showAuthor = !!active && active.type !== "PERSONAL";

  return (
    <Screen edges={["top"]} refreshing={refreshing} onRefresh={refresh}>
      <SpaceSwitcher />
      <Text style={styles.title} accessibilityRole="header">
        Transaksi
      </Text>
      <MonthStepper from={from} offset={offset} onChange={setOffset} />
      <ChoiceRow<Filter>
        label="Tampilkan"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "Semua" },
          { value: "EXPENSE", label: "Pengeluaran" },
          { value: "INCOME", label: "Pemasukan" },
          { value: "TRANSFER", label: "Transfer" },
        ]}
      />

      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Tidak ada transaksi"
          body="Belum ada transaksi untuk bulan dan filter ini."
        />
      ) : (
        <>
          {groups.map(([key, items]) => (
            <View key={key} style={{ gap: space.sm }}>
              <Text style={styles.day}>{dayLabel(key)}</Text>
              <Card style={{ gap: 0, paddingVertical: space.xs }}>
                {items.map((tx, i) => (
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
            </View>
          ))}
          {cursor ? (
            <Button
              title="Muat lagi"
              variant="secondary"
              onPress={loadMore}
              loading={loadingMore}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  day: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
    marginTop: space.xs,
  },
});
