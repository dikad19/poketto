import { useRef, useState } from "react";
import { TextInput } from "react-native";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { FormError, TextField } from "../components/TextField";
import { useAuth } from "../lib/auth";
import { formErrorMessage, isEmail } from "../lib/validation";

type Errors = { email?: string; password?: string; form?: string };

export default function LoginScreen() {
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    const next: Errors = {};
    if (!isEmail(email)) next.email = "Masukkan email yang valid, contoh: nama@email.com";
    if (!password) next.password = "Masukkan password Anda";
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setErrors({ form: formErrorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Masuk ke Poketto"
      subtitle="Lihat keuangan Anda dan keluarga di satu tempat."
      footerQuestion="Belum punya akun?"
      footerLinkText="Buat akun"
      footerHref="/register"
    >
      <FormError message={errors.form} />
      <TextField
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email || errors.form) setErrors({ ...errors, email: undefined, form: undefined });
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
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password || errors.form) {
            setErrors({ ...errors, password: undefined, form: undefined });
          }
        }}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button title="Masuk" onPress={onSubmit} loading={submitting} />
    </AuthLayout>
  );
}
