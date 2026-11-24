import { useRef, useState } from "react";
import { TextInput } from "react-native";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { FormError, TextField } from "../components/TextField";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { formErrorMessage, isEmail } from "../lib/validation";

type Errors = { name?: string; email?: string; password?: string; form?: string };

export default function RegisterScreen() {
  const { register } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function clear(field: keyof Errors) {
    if (errors[field] || errors.form) setErrors({ ...errors, [field]: undefined, form: undefined });
  }

  async function onSubmit() {
    if (submitting) return;

    const next: Errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) next.name = "Masukkan nama Anda";
    else if (trimmedName.length > 100) next.name = "Nama maksimal 100 karakter";
    if (!isEmail(email)) next.email = "Masukkan email yang valid, contoh: nama@email.com";
    if (password.length < 8) next.password = "Password minimal 8 karakter";
    else if (password.length > 72) next.password = "Password maksimal 72 karakter";
    setErrors(next);
    if (next.name || next.email || next.password) return;

    setSubmitting(true);
    try {
      await register({ name: trimmedName, email: email.trim().toLowerCase(), password });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErrors({ email: "Email ini sudah terdaftar. Coba masuk dengan email ini." });
      } else {
        setErrors({ form: formErrorMessage(e) });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Buat akun"
      subtitle="Mulai catat keuangan sendiri, lalu ajak pasangan atau keluarga."
      footerQuestion="Sudah punya akun?"
      footerLinkText="Masuk"
      footerHref="/login"
    >
      <FormError message={errors.form} />
      <TextField
        label="Nama"
        placeholder="Nama panggilan Anda"
        value={name}
        onChangeText={(v) => {
          setName(v);
          clear("name");
        }}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clear("email");
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        hint="Minimal 8 karakter"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clear("password");
        }}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button title="Buat akun" onPress={onSubmit} loading={submitting} />
    </AuthLayout>
  );
}
