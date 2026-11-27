import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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
import { setLanguage } from "../../../i18n";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
] as const;

function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={styles.langWrap}>
      <Text style={styles.meta}>{t("account.language")}</Text>
      <View style={styles.langToggle} accessibilityRole="radiogroup">
        {LANGUAGES.map((l) => {
          const selected = current === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.langOption, selected && styles.langOptionActive]}
            >
              <Text
                style={[styles.langText, selected && styles.langTextActive]}
              >
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { spaces, active, setActiveId, loading, error, reload } = useSpaces();
  // Failing to load invitations must not block the space list
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

      <LanguageToggle />

      {pending > 0 ? (
        <Card onPress={() => router.push("/invitations")} style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {t("account.pendingInvites", { count: pending })}
          </Text>
          <Text style={styles.meta}>{t("account.pendingInvitesHint")}</Text>
        </Card>
      ) : null}

      <SectionTitle>{t("account.mySpaces")}</SectionTitle>
      {loading ? (
        <Loading />
      ) : error && spaces.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : spaces.length === 0 ? (
        <EmptyState
          title={t("account.noSpacesTitle")}
          body={t("account.noSpacesBody")}
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
                  {s.id === active?.id ? `  ·  ${t("account.active")}` : ""}
                </Text>
                <Text style={styles.meta}>
                  {t(`spaces.types.${s.type}`, {
                    defaultValue: TYPE_LABEL[s.type],
                  })}{" "}
                  · {t("account.members", { count: s.memberCount })}
                </Text>
              </View>
              <RoleBadge role={s.role} />
            </View>
            {s.id !== active?.id ? (
              <Button
                title={t("account.useThisSpace")}
                variant="secondary"
                onPress={() => setActiveId(s.id)}
              />
            ) : null}
          </Card>
        ))
      )}

      <View style={styles.actions}>
        <Button
          title={t("account.createSpace")}
          onPress={() => router.push("/spaces/new")}
        />
        <Button
          title={
            pending > 0
              ? t("account.myInvitesCount", { count: pending })
              : t("account.myInvites")
          }
          variant="secondary"
          onPress={() => router.push("/invitations")}
        />
        <Button
          title={t("account.logout")}
          variant="secondary"
          onPress={logout}
        />
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
  langWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 999,
    padding: 2,
  },
  langOption: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  langOptionActive: { backgroundColor: colors.ink },
  langText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  langTextActive: { color: "#FFFFFF" },
});
