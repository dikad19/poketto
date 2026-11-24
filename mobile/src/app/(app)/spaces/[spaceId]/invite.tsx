import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../../components/Button";
import {
  Card,
  ChoiceRow,
  confirmAction,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
  SectionTitle,
  showMessage,
  SmallButton,
} from "../../../../components/SpaceUI";
import { FormError, TextField } from "../../../../components/TextField";
import {
  AssignableRole,
  daysLeft,
  hasRole,
  invitationsApi,
  ROLE_HINT,
  ROLE_LABEL,
  spacesApi,
} from "../../../../lib/spaces";
import { colors, radius, space } from "../../../../lib/theme";
import { useLoad } from "../../../../lib/useLoad";
import { formErrorMessage } from "../../../../lib/validation";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function InviteScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();

  const detail = useLoad(() => spacesApi.get(spaceId));
  const pending = useLoad(() =>
    // 403 untuk non-admin ditangani lewat cek peran di bawah
    invitationsApi.listForSpace(spaceId).catch(() => null)
  );

  const [username, setUsername] = useState("");
  const [role, setRole] = useState<AssignableRole>("MEMBER");
  const [message, setMessage] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  if (detail.loading) {
    return (
      <Screen>
        <ScreenHeader title="Undang anggota" />
        <Loading />
      </Screen>
    );
  }
  if (!detail.data) {
    return (
      <Screen>
        <ScreenHeader title="Undang anggota" />
        <ErrorState message={detail.error?.message ?? "Gagal memuat space."} onRetry={detail.retry} />
      </Screen>
    );
  }

  const s = detail.data;
  if (s.type === "PERSONAL") {
    return (
      <Screen>
        <ScreenHeader title="Undang anggota" />
        <ErrorState message="Space pribadi tidak bisa memiliki anggota lain." />
      </Screen>
    );
  }
  if (!hasRole(s.myRole, "ADMIN")) {
    return (
      <Screen>
        <ScreenHeader title="Undang anggota" />
        <ErrorState message="Hanya pemilik dan admin yang bisa mengundang anggota." />
      </Screen>
    );
  }

  const roleOptions: AssignableRole[] =
    s.myRole === "OWNER" ? ["ADMIN", "MEMBER", "VIEWER"] : ["MEMBER", "VIEWER"];

  async function onSubmit() {
    if (submitting) return;
    setSuccess(null);
    setFormError(undefined);

    const clean = username.trim().replace(/^@/, "").toLowerCase();
    if (!USERNAME_RE.test(clean)) {
      return setUsernameError("Username 3–20 karakter: huruf kecil, angka, atau garis bawah");
    }
    setUsernameError(undefined);

    setSubmitting(true);
    try {
      await invitationsApi.send(spaceId, {
        username: clean,
        role,
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      setSuccess(`Undangan untuk @${clean} sudah dikirim. Berlaku 7 hari.`);
      setUsername("");
      setMessage("");
      pending.reload();
    } catch (e) {
      setFormError(formErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: string, who: string) {
    const ok = await confirmAction("Batalkan undangan?", `Undangan untuk @${who} akan dibatalkan.`, "Batalkan");
    if (!ok) return;
    setCancelling(id);
    try {
      await invitationsApi.cancel(spaceId, id);
    } catch (e) {
      showMessage("Gagal membatalkan", formErrorMessage(e));
    } finally {
      setCancelling(null);
      pending.reload();
    }
  }

  return (
    <Screen refreshing={pending.refreshing} onRefresh={pending.refresh}>
      <ScreenHeader title="Undang anggota" subtitle={`Ke ${s.name}`} />

      {success ? (
        <View style={styles.success}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}
      <FormError message={formError} />

      <TextField
        label="Username"
        placeholder="username"
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setUsernameError(undefined);
          setSuccess(null);
          setFormError(undefined);
        }}
        error={usernameError}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <ChoiceRow<AssignableRole>
        label="Peran"
        value={role}
        onChange={setRole}
        options={roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r], hint: ROLE_HINT[r] }))}
      />
      <TextField
        label="Pesan (opsional)"
        placeholder="Tulis pesan singkat untuk penerima"
        value={message}
        onChangeText={setMessage}
        maxLength={200}
        multiline
      />
      <Button title="Kirim undangan" onPress={onSubmit} loading={submitting} />

      <SectionTitle>Menunggu jawaban</SectionTitle>
      {pending.loading ? (
        <Loading />
      ) : !pending.data || pending.data.length === 0 ? (
        <EmptyState title="Belum ada undangan" body="Undangan yang belum dijawab akan muncul di sini." />
      ) : (
        pending.data.map((i) => (
          <Card key={i.id}>
            <Text style={styles.name}>{i.inviteeName ?? `@${i.inviteeUsername}`}</Text>
            <Text style={styles.meta}>
              @{i.inviteeUsername} · {ROLE_LABEL[i.role]} · sisa {daysLeft(i.expiresAt)} hari
            </Text>
            {i.message ? <Text style={styles.meta}>“{i.message}”</Text> : null}
            <View style={{ flexDirection: "row" }}>
              <SmallButton
                title="Batalkan"
                tone="danger"
                onPress={() => onCancel(i.id, i.inviteeUsername)}
                loading={cancelling === i.id}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: {
    backgroundColor: "#ECFDF3",
    borderColor: "#A6F4C5",
    borderWidth: 1,
    borderRadius: radius.field,
    padding: space.md,
  },
  successText: { color: "#067647", fontSize: 15, lineHeight: 22 },
  name: { fontSize: 16, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted },
});
