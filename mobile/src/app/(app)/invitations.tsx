import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
  showMessage,
  SmallButton,
  SpaceEmoji,
} from "../../components/SpaceUI";
import { ApiError } from "../../lib/api";
import {
  daysLeft,
  invitationsApi,
  MyInvitation,
  ROLE_LABEL,
  TYPE_LABEL,
} from "../../lib/spaces";
import { colors, space } from "../../lib/theme";
import { useLoad } from "../../lib/useLoad";
import { formErrorMessage } from "../../lib/validation";

export default function InvitationsScreen() {
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(invitationsApi.inbox);
  const [busy, setBusy] = useState<{ id: string; action: "accept" | "decline" } | null>(null);

  async function respond(inv: MyInvitation, action: "accept" | "decline") {
    if (busy) return;
    setBusy({ id: inv.id, action });
    try {
      if (action === "accept") {
        const res = await invitationsApi.accept(inv.id);
        router.replace({ pathname: "/spaces/[spaceId]", params: { spaceId: res.space.id } });
        return;
      }
      await invitationsApi.decline(inv.id);
      reload();
    } catch (e) {
      // 404/409/410: undangan dibatalkan, sudah dijawab, atau kedaluwarsa
      if (e instanceof ApiError && [404, 409, 410].includes(e.status)) {
        showMessage("Undangan tidak berlaku", e.message);
        reload();
      } else {
        showMessage("Gagal menjawab undangan", formErrorMessage(e));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader title="Undangan saya" subtitle="Undangan untuk bergabung ke space lain." />

      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : data && data.length === 0 ? (
        <EmptyState
          title="Tidak ada undangan"
          body="Bagikan username Anda ke pasangan atau keluarga agar mereka bisa mengundang Anda."
        />
      ) : (
        data?.map((inv) => {
          const who = inv.inviter.name ?? `@${inv.inviter.username}`;
          const accepting = busy?.id === inv.id && busy.action === "accept";
          const declining = busy?.id === inv.id && busy.action === "decline";
          return (
            <Card key={inv.id}>
              <View style={styles.row}>
                <SpaceEmoji emoji={inv.space.emoji} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {inv.space.name}
                  </Text>
                  <Text style={styles.meta}>
                    {TYPE_LABEL[inv.space.type]} · sebagai {ROLE_LABEL[inv.role]}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Dari {who} (@{inv.inviter.username}) · sisa {daysLeft(inv.expiresAt)} hari
              </Text>
              {inv.message ? <Text style={styles.message}>“{inv.message}”</Text> : null}
              <View style={styles.actions}>
                <SmallButton
                  title="Terima"
                  tone="primary"
                  onPress={() => respond(inv, "accept")}
                  loading={accepting}
                  disabled={!!busy}
                />
                <SmallButton
                  title="Tolak"
                  onPress={() => respond(inv, "decline")}
                  loading={declining}
                  disabled={!!busy}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { fontSize: 17, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted },
  message: { fontSize: 15, lineHeight: 22, color: colors.ink },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
});
