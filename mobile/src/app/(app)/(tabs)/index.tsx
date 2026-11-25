import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { categoryLabel, WalletGlyph } from "../../../components/CategoryGlyph";
import {
  CHART,
  DayPoint,
  DonutItem,
  TrendPoint,
} from "../../../components/Charts";
import {
  HeroHeader,
  HeroSummary,
  HeroSummarySkeleton,
} from "../../../components/HeroCard";
import { InsightCard } from "../../../components/InsightCard";
import { Divider, TxRow, HeroTopBar } from "../../../components/FinanceUI";
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionTitle,
} from "../../../components/SpaceUI";
import { financeApi } from "../../../lib/finance";
import {
  formatMoney,
  fullDay,
  keyToDate,
  monthLabel,
  monthRange,
  shortMonth,
} from "../../../lib/format";
import { useSmoothLoading } from "../../../lib/useSmoothLoading";
import { FadeIn } from "../../../components/FadeIn";
import { DashboardSkeleton } from "../../../components/Skeleton";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";
import { MonthPicker } from "../../../components/MonthPicker";
// import { Divider, HeroTopBar, TxRow } from "../../../components/FinanceUI";
import { invitationsApi } from "../../../lib/spaces"; // gabungkan dengan import hasRole
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
  const invites = useLoad(() => invitationsApi.inbox().catch(() => []));
  const pending = invites.data?.length ?? 0;

  const { data, error, loading, refreshing, refresh, retry } = useLoad(
    () =>
      spaceId ? financeApi.dashboard(spaceId, from, to) : Promise.resolve(null),
    [spaceId, offset],
  );

  // Tepat di bawah useLoad utama, setelah `loading` tersedia
  const showSkeleton = useSmoothLoading(loading || spacesLoading);

  // Deret waktu untuk chart; kalau gagal, chart saja yang hilang, dashboard tetap tampil
  const trendFrom = monthRange(offset - 5).from;
  const monthly = useLoad(
    () =>
      spaceId
        ? financeApi.series(spaceId, trendFrom, to, "month")
        : Promise.resolve(null),
    [spaceId, offset],
  );
  const daily = useLoad(
    () =>
      spaceId
        ? financeApi.series(spaceId, from, to, "day")
        : Promise.resolve(null),
    [spaceId, offset],
  );

  const trendPoints: TrendPoint[] = (monthly.data?.points ?? []).map((p) => {
    const d = keyToDate(p.key);
    return {
      key: p.key,
      label: shortMonth(d),
      title: monthLabel(d),
      income: p.income,
      expense: p.expense,
    };
  });
  const dayPoints: DayPoint[] = (daily.data?.points ?? []).map((p) => {
    const d = keyToDate(p.key);
    return {
      key: p.key,
      label: String(d.getDate()),
      title: fullDay(d),
      value: p.expense,
    };
  });

  // Jumlah anggota / peran bisa berubah setelah kembali dari layar space
  useFocusEffect(
    useCallback(() => {
      reloadSpaces();
      invites.reload();
    }, [reloadSpaces]),
  );

  // Hero berlatar gelap: ikon status bar putih selama tab ini aktif
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  const canAdd = !!active && hasRole(active.role, "MEMBER");
  const currency = data?.currency ?? "IDR";
  const showAuthor = !!active && active.type !== "PERSONAL";

  // Statistik untuk hero
  const now = new Date();
  const daysInPeriod =
    offset === 0
      ? now.getDate()
      : Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const avgDaily = data ? data.expense / Math.max(1, daysInPeriod) : 0;
  const daysLeft =
    offset === 0
      ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
        now.getDate()
      : null;

  // Pembanding: rata-rata harian bulan sebelumnya (dari deret 6 bulan)
  const prev =
    trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null;
  let prevAvgDaily: number | null = null;
  if (prev && prev.expense > 0) {
    const pd = keyToDate(prev.key);
    prevAvgDaily =
      prev.expense / new Date(pd.getFullYear(), pd.getMonth() + 1, 0).getDate();
  }

  // Lima kategori terbesar + "Lainnya"
  const cats = data?.byCategory ?? [];
  const donutItems: DonutItem[] = cats.slice(0, 5).map((c, i) => ({
    key: c.categoryId ?? "none",
    label: categoryLabel(c.name),
    value: c.amount,
    color: CHART.palette[i],
  }));
  const rest = cats.slice(5).reduce((sum, c) => sum + c.amount, 0);
  if (rest > 0)
    donutItems.push({
      key: "rest",
      label: "Lainnya",
      value: rest,
      color: CHART.palette[5],
    });

  return (
    <Screen
      edges={[]}
      refreshing={refreshing}
      onRefresh={() => {
        monthly.reload();
        daily.reload();
        return refresh();
      }}
      header={
        <HeroHeader>
          <HeroTopBar
            notificationCount={pending}
            onNotifications={() => router.push("/invitations")}
          />
          <MonthPicker from={from} offset={offset} onChange={setOffset} />
          {showSkeleton ? (
            <HeroSummarySkeleton />
          ) : data ? (
            <FadeIn key={`${spaceId}-${offset}`}>
              <HeroSummary
                currency={currency}
                totalBalance={data.totalBalance}
                income={data.income}
                expense={data.expense}
                count={data.count}
                largestExpense={data.largestExpense}
                avgDaily={avgDaily}
                prevAvgDaily={prevAvgDaily}
                daysLeft={daysLeft}
                isCurrentMonth={offset === 0}
                periodLabel={monthLabel(from)}
              />
            </FadeIn>
          ) : null}
        </HeroHeader>
      }
    >
      {showSkeleton ? (
        <DashboardSkeleton />
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
        <FadeIn key={`${spaceId}-${offset}`} style={{ gap: space.md }}>
          <>
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

            <InsightCard
              monthTitle={monthLabel(from)}
              currency={currency}
              trend={trendPoints}
              days={dayPoints}
              categories={donutItems}
            />

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
        </FadeIn>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  walletRow: { gap: space.sm, paddingRight: space.lg },
  walletCard: { width: 160, gap: 6 },
  walletName: { fontSize: 14, color: colors.muted },
  walletBalance: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
