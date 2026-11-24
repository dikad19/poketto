import { router } from "expo-router";
import { useState } from "react";
import { Button } from "../../../components/Button";
import { ChoiceRow, Screen, ScreenHeader } from "../../../components/SpaceUI";
import { FormError, TextField } from "../../../components/TextField";
import { CreateSpaceInput, spacesApi } from "../../../lib/spaces";
import { formErrorMessage } from "../../../lib/validation";

type Errors = { name?: string; form?: string };
type NewType = CreateSpaceInput["type"];

export default function NewSpaceScreen() {
  const [type, setType] = useState<NewType>("COUPLE");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) return setErrors({ name: "Masukkan nama space" });
    if (trimmedName.length > 60) return setErrors({ name: "Nama maksimal 60 karakter" });
    setErrors({});

    const input: CreateSpaceInput = { name: trimmedName, type };
    if (emoji.trim()) input.emoji = emoji.trim();
    if (description.trim()) input.description = description.trim();

    setSubmitting(true);
    try {
      const created = await spacesApi.create(input);
      router.replace({ pathname: "/spaces/[spaceId]", params: { spaceId: created.id } });
    } catch (e) {
      setErrors({ form: formErrorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Buat space"
        subtitle="Space adalah tempat keuangan bersama. Anda bisa mengundang anggota setelah dibuat."
      />
      <FormError message={errors.form} />
      <ChoiceRow<NewType>
        label="Jenis space"
        value={type}
        onChange={setType}
        options={[
          { value: "COUPLE", label: "Pasangan" },
          { value: "FAMILY", label: "Keluarga" },
          { value: "CUSTOM", label: "Lainnya" },
        ]}
      />
      <TextField
        label="Nama"
        placeholder={type === "COUPLE" ? "Contoh: Kami berdua" : "Contoh: Keluarga Budi"}
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (errors.name || errors.form) setErrors({});
        }}
        error={errors.name}
        maxLength={60}
        returnKeyType="next"
      />
      <TextField
        label="Emoji (opsional)"
        placeholder="🏠"
        value={emoji}
        onChangeText={setEmoji}
        maxLength={40}
      />
      <TextField
        label="Deskripsi (opsional)"
        placeholder="Untuk apa space ini dipakai"
        value={description}
        onChangeText={setDescription}
        maxLength={200}
        multiline
      />
      <Button title="Buat space" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}
