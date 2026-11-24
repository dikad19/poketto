import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  RoleBadge,
  Screen,
  SectionTitle,
  SpaceEmoji,
} from "../../../components/SpaceUI";
import { useAuth } from "../../../lib/auth";
import { useSpaces } from "../../../lib/SpaceContext";
import { invitationsApi, TYPE_LABEL } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { useLoad } from "../../../lib/useLoad";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { spaces, active, setActiveId, loading, error, reload } = useSpaces();
  // Gagal memuat undangan tidak boleh menghalangi daftar space
  const invites = useLoad(() => invitationsApi.inbox().catch(() => []));
  const pending = invites.data?.length ?? 0;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <Screen
      edges={["top"]}
      refreshing={invites.refreshing}
      onRefresh={() => {
        reload();
        return invites.refresh();
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={styles.title} accessibilityRole="header">
          {user?.name ?? user?.username}
        </Text>
        <Text style={styles.meta}>@{user?.username}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
      </View>

      {pending > 0 ? (
        <Card onPress={() => router.push("/invitations")} style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {pending} undangan menunggu jawaban Anda
          </Text>
          <Text style={styles.meta}>Ketuk untuk melihat dan menjawab.</Text>
        </Card>
      ) : null}

      <SectionTitle>Space saya</SectionTitle>
      {loading ? (
        <Loading />
      ) : error && spaces.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : spaces.length === 0 ? (
        <EmptyState
          title="Belum ada space"
          body="Buat space untuk mencatat keuangan bersama."
        />
      ) : (
        spaces.map((s) => (
          <Card
            key={s.id}
            onPress={() =>
              router.push({
                pathname: "/spaces/[spaceId]",
                params: { spaceId: s.id },
              })
            }
          >
            <View style={styles.row}>
              <SpaceEmoji emoji={s.emoji} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {s.name}
                  {s.id === active?.id ? "  ·  aktif" : ""}
                </Text>
                <Text style={styles.meta}>
                  {TYPE_LABEL[s.type]} · {s.memberCount} anggota
                </Text>
              </View>
              <RoleBadge role={s.role} />
            </View>
            {s.id !== active?.id ? (
              <Button
                title="Pakai space ini"
                variant="secondary"
                onPress={() => setActiveId(s.id)}
              />
            ) : null}
          </Card>
        ))
      )}

      <View style={styles.actions}>
        <Button
          title="Buat space baru"
          onPress={() => router.push("/spaces/new")}
        />
        <Button
          title={pending > 0 ? `Undangan saya (${pending})` : "Undangan saya"}
          variant="secondary"
          onPress={() => router.push("/invitations")}
        />
        <Button title="Keluar" variant="secondary" onPress={logout} />
      </View>
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
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { fontSize: 17, fontWeight: "600", color: colors.ink },
  banner: { backgroundColor: "#FFF6E0", borderColor: colors.coin },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  actions: { gap: space.sm, marginTop: space.md },
});
