import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, Link } from "expo-router";
import { colors, radius, space } from "../lib/theme";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerQuestion: string;
  footerLinkText: string;
  footerHref: Href;
};

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Logo Poketto">
        <View style={styles.stitch} />
        <View style={styles.coin} />
      </View>
      <Text style={styles.brandName}>Poketto</Text>
    </View>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footerQuestion,
  footerLinkText,
  footerHref,
}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Brand />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>{children}</View>
            <Text style={styles.footerText}>
              {footerQuestion}{" "}
              <Link href={footerHref} style={styles.link}>
                {footerLinkText}
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: space.lg },
  content: { width: "100%", maxWidth: 420, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", marginBottom: space.xl },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.logo,
    backgroundColor: colors.primary,
  },
  stitch: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  coin: {
    position: "absolute",
    top: -6,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.coin,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  brandName: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: space.sm },
  form: { marginTop: space.lg },
  footerText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    marginTop: space.lg,
  },
  link: { color: colors.primary, fontWeight: "600" },
});
