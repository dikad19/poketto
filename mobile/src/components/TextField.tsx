import { forwardRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius } from "../lib/theme";

type Props = Omit<TextInputProps, "secureTextEntry" | "style"> & {
  label: string;
  error?: string | null;
  hint?: string;
  secure?: boolean;
};

const webReset: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, secure, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          ref={ref}
          style={[styles.input, webReset]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Tampilkan password" : "Sembunyikan password"}
          >
            <MaterialCommunityIcons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: colors.primary },
  boxError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  error: { fontSize: 13, lineHeight: 18, color: colors.error, marginTop: 6 },
  hint: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 6 },
  formError: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorLine,
    borderRadius: radius.field,
    padding: 12,
    marginBottom: 18,
  },
  formErrorText: { fontSize: 14, lineHeight: 20, color: colors.error },
});
