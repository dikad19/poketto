import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { WalletGlyph } from "../../../components/CategoryGlyph";
import { SpaceSwitcher } from "../../../components/FinanceUI";
import {
  Card,
  confirmAction,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  showMessage,
  SmallButton,
} from "../../../components/SpaceUI";
import { useAuth } from "../../../lib/auth";
import { financeApi, WALLET_TYPE_LABEL } from "../../../lib/finance";
import { formatMoney } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";
import { formErrorMessage } from "../../../lib/validation";

export default function WalletsScreen() {
  const { active } = useSpaces();
  const { user } = useAuth();
  const spaceId = active?.id ?? null;
  const [archiving, setArchiving] = useState<string | null>(null);

  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(
    () => (spaceId ? financeApi.wallets(spaceId) : Promise.resolve(null)),
    [spaceId],
  );

  const canCreate = !!active && hasRole(active.role, "MEMBER");
  const total = (data ?? [])
    .filter((w) => w.includeInTotal)
    .reduce((s, w) => s + w.balance, 0);

  async function archive(id: string, name: string) {
    if (!spaceId) return;
    const ok = await confirmAction(
      "Arsipkan dompet?",
      `${name} disembunyikan dari daftar. Riwayat transaksinya tetap tersimpan.`,
      "Arsipkan",
    );
    if (!ok) return;
    setArchiving(id);
    try {
      await financeApi.archiveWallet(spaceId, id);
      reload();
    } catch (e) {
      showMessage("Gagal mengarsipkan", formErrorMessage(e));
    } finally {
      setArchiving(null);
    }
  }

  return (
    <Screen edges={["top"]} refreshing={refreshing} onRefresh={refresh}>
      <SpaceSwitcher />
      <Text style={styles.title} accessibilityRole="header">
        Dompet
      </Text>

      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : data && data.length === 0 ? (
        <EmptyState
          title="Belum ada dompet"
          body="Tambahkan tempat uang Anda: tunai, rekening bank, e-wallet, atau kartu kredit."
        />
      ) : (
        <>
          <Text style={styles.total}>Total: {formatMoney(total)}</Text>
          {data?.map((w) => {
            const canManage =
              w.ownerId === user?.id ||
              (!!active && hasRole(active.role, "ADMIN"));
            return (
              <Card key={w.id}>
                <View style={styles.row}>
                  <WalletGlyph type={w.type} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={styles.meta}>
                      {WALLET_TYPE_LABEL[w.type]}
                      {w.institution ? ` · ${w.institution}` : ""}
                      {!w.includeInTotal ? " · Tidak dihitung di total" : ""}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.balance,
                      w.balance < 0 && { color: colors.error },
                    ]}
                  >
                    {formatMoney(w.balance)}
                  </Text>
                </View>
                {canManage ? (
                  <View style={{ flexDirection: "row" }}>
                    <SmallButton
                      title="Arsipkan"
                      tone="danger"
                      onPress={() => archive(w.id, w.name)}
                      loading={archiving === w.id}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </>
      )}

      {canCreate ? (
        <Button
          title="Tambah dompet"
          onPress={() => router.push("/wallets/new")}
        />
      ) : null}
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
  total: { fontSize: 16, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { fontSize: 16, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 13, color: colors.muted },
  balance: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
