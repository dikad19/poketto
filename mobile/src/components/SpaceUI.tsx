import { router } from "expo-router";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space } from "../lib/theme";
import { Role, ROLE_LABEL } from "../lib/spaces";
import { Button } from "./Button";

/* ---------- Dialog helpers (Alert.alert tidak berfungsi di web) ---------- */

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
) {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Batal", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/* ---------- Layout ---------- */

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  edges,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Button title="Coba lagi" variant="secondary" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.85 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/* ---------- Small pieces ---------- */

export function SpaceEmoji({
  emoji,
  size = 44,
}: {
  emoji?: string | null;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.emoji,
        { width: size, height: size, borderRadius: size / 3 },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji || "💰"}</Text>
    </View>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const owner = role === "OWNER";
  return (
    <View style={[styles.badge, owner && styles.badgeOwner]}>
      <Text style={[styles.badgeText, owner && styles.badgeTextOwner]}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  );
}

export function SmallButton({
  title,
  onPress,
  tone = "default",
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.small,
        tone === "primary" && styles.smallPrimary,
        tone === "danger" && styles.smallDanger,
        (pressed || off) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={tone === "primary" ? "#fff" : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.smallText,
            tone === "primary" && { color: "#fff" },
            tone === "danger" && { color: colors.error },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function DangerButton({
  title,
  onPress,
  loading,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.danger,
        (pressed || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.error} />
      ) : (
        <Text style={styles.dangerText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {current?.hint ? <Text style={styles.hint}>{current.hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: space.lg, paddingBottom: space.xl * 2 },
  column: { width: "100%", maxWidth: 560, alignSelf: "center", gap: space.md },

  header: { gap: 4, marginBottom: space.sm },
  back: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: space.sm },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },

  center: { paddingVertical: space.xl * 2, alignItems: "center" },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorLine,
    borderWidth: 1,
    borderRadius: radius.field,
    padding: space.md,
    gap: space.md,
  },
  errorText: { color: colors.error, fontSize: 15, lineHeight: 22 },

  empty: {
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: radius.field,
    padding: space.lg,
    gap: space.sm,
    alignItems: "flex-start",
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.ink },
  emptyBody: { fontSize: 15, lineHeight: 22, color: colors.muted },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field,
    padding: space.md,
    gap: space.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginTop: space.sm,
  },

  emoji: {
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeOwner: { backgroundColor: colors.coin, borderColor: colors.coin },
  badgeText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  badgeTextOwner: { color: colors.ink },

  small: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  smallPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallDanger: {
    borderColor: colors.errorLine,
    backgroundColor: colors.errorBg,
  },
  smallText: { fontSize: 14, fontWeight: "600", color: colors.primary },

  danger: {
    minHeight: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.errorLine,
    backgroundColor: colors.errorBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  dangerText: { color: colors.error, fontSize: 16, fontWeight: "600" },

  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.ink, fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  hint: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
