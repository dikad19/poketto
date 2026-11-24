import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "../lib/theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function Button({ title, onPress, loading, disabled, variant = "primary" }: Props) {
  const inactive = !!disabled || !!loading;
  const secondary = variant === "secondary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        secondary ? styles.secondary : styles.primary,
        pressed && (secondary ? styles.secondaryPressed : styles.primaryPressed),
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.ink : "#FFFFFF"} />
      ) : (
        <Text style={[styles.text, secondary ? styles.textSecondary : styles.textPrimary]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryPressed: { backgroundColor: colors.paper },
  inactive: { opacity: 0.6 },
  text: { fontSize: 16, fontWeight: "600" },
  textPrimary: { color: "#FFFFFF" },
  textSecondary: { color: colors.ink },
});
