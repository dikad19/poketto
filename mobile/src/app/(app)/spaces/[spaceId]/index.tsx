import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../../components/Button";
import {
  Card,
  ChoiceRow,
  confirmAction,
  DangerButton,
  ErrorState,
  Loading,
  RoleBadge,
  Screen,
  ScreenHeader,
  SectionTitle,
  showMessage,
  SmallButton,
  SpaceEmoji,
} from "../../../../components/SpaceUI";
import { TextField } from "../../../../components/TextField";
import { useAuth } from "../../../../lib/auth";
import {
  AssignableRole,
  hasRole,
  Member,
  outranks,
  ROLE_HINT,
  ROLE_LABEL,
  spacesApi,
  SpaceDetail,
  TYPE_LABEL,
} from "../../../../lib/spaces";
import { colors, space } from "../../../../lib/theme";
import { useLoad } from "../../../../lib/useLoad";
import { formErrorMessage } from "../../../../lib/validation";

export default function SpaceDetailScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(() =>
    spacesApi.get(spaceId)
  );
  const [busy, setBusy] = useState<"leave" | "archive" | null>(null);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Space" />
        <Loading />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ScreenHeader title="Space" />
        <ErrorState
          message={error?.status === 404 ? "Space tidak ditemukan atau sudah diarsipkan." : (error?.message ?? "Gagal memuat space.")}
          onRetry={error?.status === 404 ? undefined : retry}
        />
      </Screen>
    );
  }

  const s: SpaceDetail = data;
  const isPersonal = s.type === "PERSONAL";
  const isOwner = s.myRole === "OWNER";
  const isAdmin = hasRole(s.myRole, "ADMIN");

  async function onLeave() {
    const ok = await confirmAction(
      "Keluar dari space?",
      `Anda tidak akan bisa melihat ${s.name} lagi sampai diundang kembali.`,
      "Keluar"
    );
    if (!ok) return;
    setBusy("leave");
    try {
      await spacesApi.leave(s.id);
      router.replace("/");
    } catch (e) {
      showMessage("Gagal keluar", formErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onArchive() {
    const ok = await confirmAction(
      "Arsipkan space?",
      `${s.name} akan disembunyikan dari semua anggota.`,
      "Arsipkan"
    );
    if (!ok) return;
    setBusy("archive");
    try {
      await spacesApi.archive(s.id);
      router.replace("/");
    } catch (e) {
      showMessage("Gagal mengarsipkan", formErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader title={s.name} subtitle={s.description ?? undefined} />

      <View style={styles.meta}>
        <SpaceEmoji emoji={s.emoji} size={52} />
        <View style={{ gap: 4 }}>
          <Text style={styles.metaText}>
            {TYPE_LABEL[s.type]} · {s.currency}
          </Text>
          <RoleBadge role={s.myRole} />
        </View>
      </View>

      {isAdmin ? (
        <View style={styles.actions}>
          {!isPersonal ? (
            <Button
              title="Undang anggota"
              onPress={() =>
                router.push({ pathname: "/spaces/[spaceId]/invite", params: { spaceId: s.id } })
              }
            />
          ) : null}
          <Button
            title="Ubah info space"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/spaces/[spaceId]/edit", params: { spaceId: s.id } })
            }
          />
        </View>
      ) : null}

      <SectionTitle>Anggota ({s.members.length})</SectionTitle>
      {s.members.map((m) => (
        <MemberCard key={m.id} space={s} member={m} onChanged={reload} />
      ))}

      {!isPersonal ? (
        <View style={styles.danger}>
          {isOwner ? (
            <DangerButton
              title="Arsipkan space"
              onPress={onArchive}
              loading={busy === "archive"}
            />
          ) : (
            <DangerButton
              title="Keluar dari space"
              onPress={onLeave}
              loading={busy === "leave"}
            />
          )}
          {isOwner ? (
            <Text style={styles.note}>
              Pemilik tidak bisa keluar. Arsipkan space jika sudah tidak dipakai.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function MemberCard({
  space: s,
  member: m,
  onChanged,
}: {
  space: SpaceDetail;
  member: Member;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"nickname" | "role" | null>(null);
  const [nickname, setNickname] = useState(m.nickname ?? "");
  const [role, setRole] = useState<AssignableRole>(
    m.role === "OWNER" ? "MEMBER" : (m.role as AssignableRole)
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { user } = useAuth();
  const me = s.myRole;
  const isSelf = m.userId === user?.id;
  const displayName = m.nickname || m.name || m.username;

  const canNickname = isSelf || hasRole(me, "ADMIN");
  const canChangeRole = me === "OWNER" && m.role !== "OWNER" && !isSelf;
  const canRemove =
    hasRole(me, "ADMIN") && !isSelf && m.role !== "OWNER" && outranks(me, m.role);

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      if (mode === "nickname") {
        await spacesApi.updateMember(s.id, m.id, { nickname: nickname.trim() || null });
      } else if (mode === "role") {
        await spacesApi.updateMember(s.id, m.id, { role });
      }
      setMode(null);
      onChanged();
    } catch (e) {
      setFormError(formErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirmAction(
      "Keluarkan anggota?",
      `${displayName} tidak akan bisa mengakses space ini lagi.`,
      "Keluarkan"
    );
    if (!ok) return;
    setRemoving(true);
    try {
      await spacesApi.removeMember(s.id, m.id);
      onChanged();
    } catch (e) {
      showMessage("Gagal mengeluarkan", formErrorMessage(e));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <View style={styles.memberTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {displayName}
            {isSelf ? " (Anda)" : ""}
          </Text>
          <Text style={styles.metaText}>@{m.username}</Text>
        </View>
        <RoleBadge role={m.role} />
      </View>

      {mode === null && (canNickname || canChangeRole || canRemove) ? (
        <View style={styles.memberActions}>
          {canNickname ? (
            <SmallButton title="Ubah panggilan" onPress={() => setMode("nickname")} />
          ) : null}
          {canChangeRole ? (
            <SmallButton title="Ubah peran" onPress={() => setMode("role")} />
          ) : null}
          {canRemove ? (
            <SmallButton title="Keluarkan" tone="danger" onPress={remove} loading={removing} />
          ) : null}
        </View>
      ) : null}

      {mode === "nickname" ? (
        <View style={styles.edit}>
          <TextField
            label="Panggilan"
            hint="Kosongkan untuk menghapus panggilan"
            value={nickname}
            onChangeText={setNickname}
            maxLength={40}
            error={formError ?? undefined}
          />
          <EditButtons saving={saving} onSave={save} onCancel={() => setMode(null)} />
        </View>
      ) : null}

      {mode === "role" ? (
        <View style={styles.edit}>
          <ChoiceRow<AssignableRole>
            label="Peran"
            value={role}
            onChange={setRole}
            options={(["ADMIN", "MEMBER", "VIEWER"] as const).map((r) => ({
              value: r,
              label: ROLE_LABEL[r],
              hint: ROLE_HINT[r],
            }))}
          />
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <EditButtons saving={saving} onSave={save} onCancel={() => setMode(null)} />
        </View>
      ) : null}
    </Card>
  );
}

function EditButtons({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.memberActions}>
      <SmallButton title="Simpan" tone="primary" onPress={onSave} loading={saving} />
      <SmallButton title="Batal" onPress={onCancel} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: "row", alignItems: "center", gap: space.md },
  metaText: { fontSize: 14, color: colors.muted },
  actions: { gap: space.sm },
  memberTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  memberName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  memberActions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  edit: { gap: space.md, marginTop: space.xs },
  formError: { color: colors.error, fontSize: 14 },
  danger: { marginTop: space.lg, gap: space.sm },
  note: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
