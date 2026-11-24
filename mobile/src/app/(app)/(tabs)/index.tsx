import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  CashflowChart,
  SpendingDonut,
  type DailyPoint,
} from "../../../components/DashboardCharts";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
  DimensionValue,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
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
  Screen,
} from "../../../components/SpaceUI";
import { financeApi } from "../../../lib/finance";
import { formatMoney, monthRange } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const POSITIVE = "#039855";
const POSITIVE_BG = "#ECFDF3";
const NEGATIVE = "#D92D20";
const NEGATIVE_BG = "#FEF3F2";

/* ---------- Skeleton ---------- */

function Skeleton({
  width = "100%",
  height,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.line,
        },
        animated,
        style,
      ]}
    />
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.content} accessibilityLabel="Loading dashboard">
      {/* Hero */}
      <Skeleton height={168} radius={24} />

      {/* Income / Expense */}
      <View style={styles.statRow}>
        <Skeleton height={92} radius={20} style={{ flex: 1 }} />
        <Skeleton height={92} radius={20} style={{ flex: 1 }} />
      </View>

      {(() => {
        const daily = (data as { daily?: DailyPoint[] }).daily;
        return daily && daily.length > 1 ? (
          <View style={styles.section}>
            <SectionHeader title="Cash flow" />
            <Card>
              <CashflowChart daily={daily} currency={currency} />
            </Card>
          </View>
        ) : null;
      })()}

      {/* Quick actions */}
      <View style={styles.statRow}>
        <Skeleton height={64} radius={16} style={{ flex: 1 }} />
        <Skeleton height={64} radius={16} style={{ flex: 1 }} />
        <Skeleton height={64} radius={16} style={{ flex: 1 }} />
      </View>

      {/* Wallets */}
      <View style={{ gap: 12 }}>
        <Skeleton width={100} height={20} />
        <View style={styles.statRow}>
          <Skeleton width={150} height={110} radius={20} />
          <Skeleton width={150} height={110} radius={20} />
        </View>
      </View>

      {/* Categories */}
      <View style={{ gap: 12 }}>
        <Skeleton width={160} height={20} />
        <Card style={{ gap: 18 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ gap: 10 }}>
              <View style={styles.rowCenter}>
                <Skeleton width={36} height={36} radius={18} />
                <Skeleton width="40%" height={14} />
                <View style={{ flex: 1 }} />
                <Skeleton width={70} height={14} />
              </View>
              <Skeleton height={6} radius={3} />
            </View>
          ))}
        </Card>
      </View>

      {/* Recent */}
      <View style={{ gap: 12 }}>
        <Skeleton width={150} height={20} />
        <Card style={{ gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.rowCenter}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="30%" height={11} />
              </View>
              <Skeleton width={72} height={14} />
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}

/* ---------- Small building blocks ---------- */

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatCard({
  label,
  amount,
  icon,
  tint,
  tintBg,
}: {
  label: string;
  amount: string;
  icon: IconName;
  tint: string;
  tintBg: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tintBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statAmount} numberOfLines={1} adjustsFontSizeToFit>
          {amount}
        </Text>
      </View>
    </Card>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Screen ---------- */

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

  // Member count / role may change after returning from the space screen
  useFocusEffect(
    useCallback(() => {
      reloadSpaces();
    }, [reloadSpaces]),
  );

  const canAdd = !!active && hasRole(active.role, "MEMBER");
  const currency = data?.currency ?? "IDR";
  const showAuthor = !!active && active.type !== "PERSONAL";

  // Share of income that was kept this month
  const savedPct =
    data && data.income > 0 ? Math.round((data.net / data.income) * 100) : null;

  return (
    <Screen edges={["top"]} refreshing={refreshing} onRefresh={refresh}>
      <SpaceSwitcher />
      <MonthStepper from={from} offset={offset} onChange={setOffset} />

      {spacesLoading || loading ? (
        <DashboardSkeleton />
      ) : spacesError && !active ? (
        <ErrorState message={spacesError} onRetry={reloadSpaces} />
      ) : !active ? (
        <EmptyState
          title="No spaces yet"
          body="Create a space from the Account tab to start tracking."
        />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : data ? (
        <View style={styles.content}>
          {/* Hero */}
          <View style={styles.hero} accessibilityLabel="Monthly summary">
            <Text style={styles.heroLabel}>Total balance</Text>
            <Text
              style={styles.heroAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(data.totalBalance, currency)}
            </Text>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons
                name={data.net >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={data.net >= 0 ? "#A6F4C5" : "#FECDCA"}
              />
              <Text style={styles.heroPillText}>
                {data.net >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(data.net), currency)} this month
              </Text>
            </View>
          </View>

          {/* Income / Expense */}
          <View style={styles.statRow}>
            <StatCard
              label="Income"
              amount={formatMoney(data.income, currency)}
              icon="arrow-bottom-left"
              tint={POSITIVE}
              tintBg={POSITIVE_BG}
            />
            <StatCard
              label="Expenses"
              amount={formatMoney(data.expense, currency)}
              icon="arrow-top-right"
              tint={NEGATIVE}
              tintBg={NEGATIVE_BG}
            />
          </View>

          {/* Savings insight */}
          {savedPct !== null ? (
            <View
              style={[
                styles.insight,
                { backgroundColor: savedPct >= 0 ? POSITIVE_BG : NEGATIVE_BG },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  savedPct >= 0 ? "piggy-bank-outline" : "alert-circle-outline"
                }
                size={20}
                color={savedPct >= 0 ? POSITIVE : NEGATIVE}
              />
              <Text
                style={[
                  styles.insightText,
                  { color: savedPct >= 0 ? POSITIVE : NEGATIVE },
                ]}
              >
                {savedPct >= 0
                  ? `You kept ${savedPct}% of your income this month.`
                  : "You spent more than you earned this month."}
              </Text>
            </View>
          ) : null}

          {/* Quick actions */}
          <View style={styles.statRow}>
            {canAdd && data.wallets.length > 0 ? (
              <QuickAction
                label="Add"
                icon="plus"
                onPress={() => router.push("/add")}
              />
            ) : null}
            {canAdd ? (
              <QuickAction
                label="New wallet"
                icon="wallet-outline"
                onPress={() => router.push("/wallets/new")}
              />
            ) : null}
            <QuickAction
              label="History"
              icon="format-list-bulleted"
              onPress={() => router.navigate("/transactions")}
            />
          </View>

          {/* Wallets */}
          {data.wallets.length === 0 ? (
            <EmptyState
              title="No wallets yet"
              body="Create a wallet first (for example Cash or a bank account) so you can record transactions."
            >
              {canAdd ? (
                <Button
                  title="Create wallet"
                  onPress={() => router.push("/wallets/new")}
                />
              ) : null}
            </EmptyState>
          ) : (
            <View style={styles.section}>
              <SectionHeader
                title="Wallets"
                actionLabel="See all"
                onAction={() => router.navigate("/wallets")}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.walletRow}
              >
                {data.wallets.map((w) => (
                  <Card key={w.id} style={styles.walletCard}>
                    <WalletGlyph type={w.type} size={36} />
                    <View style={{ gap: 2 }}>
                      <Text style={styles.walletName} numberOfLines={1}>
                        {w.name}
                      </Text>
                      <Text
                        style={[
                          styles.walletBalance,
                          w.balance < 0 && { color: colors.error },
                        ]}
                        numberOfLines={1}
                      >
                        {formatMoney(w.balance, currency)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Spending by category */}
          <View style={styles.section}>
            <SectionHeader title="Spending by category" />
            {data.byCategory.length === 0 ? (
              <EmptyState title="No spending this month" />
            ) : (
              <Card>
                <SpendingDonut
                  items={data.byCategory}
                  total={data.expense}
                  currency={currency}
                />
              </Card>
            )}
          </View>

          {/* Recent transactions */}
          <View style={styles.section}>
            <SectionHeader
              title="Recent transactions"
              actionLabel={data.recent.length > 0 ? "See all" : undefined}
              onAction={() => router.navigate("/transactions")}
            />
            {data.recent.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                body="Tap the + button to record your first one."
              >
                {canAdd && data.wallets.length > 0 ? (
                  <Button
                    title="Add transaction"
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
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  section: { gap: 12 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 12 },

  // Hero
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 22,
    gap: 6,
  },
  heroLabel: { color: "#D0D5DD", fontSize: 14, fontWeight: "500" },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },

  // Income / Expense
  statRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, gap: 12, borderRadius: 20 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 13, color: colors.muted },
  statAmount: { fontSize: 17, fontWeight: "700", color: colors.ink },

  // Insight
  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
  },
  insightText: { flex: 1, fontSize: 14, fontWeight: "600" },

  // Quick actions
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.ink },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  sectionAction: { fontSize: 14, fontWeight: "600", color: colors.primary },

  // Wallets
  walletRow: { gap: 12, paddingRight: space.lg },
  walletCard: { width: 156, gap: 14, borderRadius: 20 },
  walletName: { fontSize: 13, color: colors.muted },
  walletBalance: { fontSize: 16, fontWeight: "700", color: colors.ink },

  // Categories
  catName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  catPercent: { fontSize: 12, color: colors.muted, marginTop: 1 },
  catAmount: { fontSize: 15, fontWeight: "700", color: colors.ink },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.coin },
});
