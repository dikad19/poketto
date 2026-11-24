import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button } from "../../../../components/Button";
import { ErrorState, Loading, Screen, ScreenHeader } from "../../../../components/SpaceUI";
import { FormError, TextField } from "../../../../components/TextField";
import { hasRole, spacesApi } from "../../../../lib/spaces";
import { useLoad } from "../../../../lib/useLoad";
import { formErrorMessage } from "../../../../lib/validation";

export default function EditSpaceScreen() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const { data, error, loading, retry } = useLoad(() => spacesApi.get(spaceId));

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  // Isi form sekali saja; refetch saat fokus tidak boleh menimpa ketikan
  useEffect(() => {
    if (data && !loaded) {
      setName(data.name);
      setEmoji(data.emoji ?? "");
      setDescription(data.description ?? "");
      setLoaded(true);
    }
  }, [data, loaded]);

  if (loading || (data && !loaded)) {
    return (
      <Screen>
        <ScreenHeader title="Ubah info space" />
        <Loading />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <ScreenHeader title="Ubah info space" />
        <ErrorState message={error?.message ?? "Gagal memuat space."} onRetry={retry} />
      </Screen>
    );
  }
  if (!hasRole(data.myRole, "ADMIN")) {
    return (
      <Screen>
        <ScreenHeader title="Ubah info space" />
        <ErrorState message="Hanya pemilik dan admin yang bisa mengubah info space." />
      </Screen>
    );
  }

  async function onSubmit() {
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Masukkan nama space");
    setNameError(undefined);
    setFormError(undefined);

    setSubmitting(true);
    try {
      await spacesApi.update(spaceId, {
        name: trimmed,
        emoji: emoji.trim() || null,
        description: description.trim() || null,
      });
      router.back();
    } catch (e) {
      setFormError(formErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Ubah info space" />
      <FormError message={formError} />
      <TextField
        label="Nama"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        maxLength={60}
      />
      <TextField label="Emoji" placeholder="🏠" value={emoji} onChangeText={setEmoji} maxLength={40} />
      <TextField
        label="Deskripsi"
        value={description}
        onChangeText={setDescription}
        maxLength={200}
        multiline
      />
      <Button title="Simpan perubahan" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}
