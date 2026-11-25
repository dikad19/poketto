import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/Button";
import { WalletGlyph } from "../../../components/CategoryGlyph";
import {
  Card,
  ErrorState,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "../../../components/SpaceUI";
import { FormError, TextField } from "../../../components/TextField";
import {
  financeApi,
  WALLET_TYPE_LABEL,
  WalletType,
} from "../../../lib/finance";
import { digitsOnly, formatMoney, groupThousands } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, radius, space } from "../../../lib/theme";
import { formErrorMessage } from "../../../lib/validation";

const TYPES = Object.keys(WALLET_TYPE_LABEL) as WalletType[];
const HERO = "#7A1D3A";

function TypeOption({
  type,
  selected,
  onPress,
}: {
  type: WalletType;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.typeCard,
        selected && styles.typeCardActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <WalletGlyph type={type} size={34} />
      <Text
        style={[styles.typeLabel, selected && { color: colors.primary }]}
        numberOfLines={1}
      >
        {WALLET_TYPE_LABEL[type]}
      </Text>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={selected ? colors.primary : colors.line}
      />
    </Pressable>
  );
}

export default function NewWalletScreen() {
  const { active } = useSpaces();
  const [type, setType] = useState<WalletType>("CASH");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  if (!active || !hasRole(active.role, "MEMBER")) {
    return (
      <Screen>
        <ScreenHeader title="Tambah dompet" />
        <ErrorState message="Anda tidak punya izin menambah dompet di space ini." />
      </Screen>
    );
  }

  const isDebtType = type === "CREDIT_CARD" || type === "PAYLATER";
  const showInstitution = type === "BANK" || type === "EWALLET" || isDebtType;

  const amount = Number(digitsOnly(balanceText)) || 0;
  const previewValue = isDebtType ? -amount : amount;

  async function onSubmit() {
    if (submitting || !active) return;
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Masukkan nama dompet");
    setNameError(undefined);
    setFormError(undefined);

    setSubmitting(true);
    try {
      await financeApi.createWallet(active.id, {
        name: trimmed,
        type,
        initialBalance: isDebtType ? -amount : amount,
        ...(institution.trim() ? { institution: institution.trim() } : {}),
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
      <ScreenHeader title="Tambah dompet" subtitle={`Di ${active.name}`} />
      <FormError message={formError} />

      {/* Preview */}
      <View
        style={styles.preview}
        accessible
        accessibilityLabel="Pratinjau dompet"
      >
        <View style={styles.previewTop}>
          <Text style={styles.previewType}>
            {institution.trim() || WALLET_TYPE_LABEL[type]}
          </Text>
          <Ionicons
            name="wallet-outline"
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </View>
        <View>
          <Text style={styles.previewName} numberOfLines={1}>
            {name.trim() || "Nama dompet"}
          </Text>
          <Text
            style={styles.previewBalance}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(previewValue, "IDR")}
          </Text>
        </View>
      </View>

      {/* Jenis */}
      <View style={styles.section}>
        <SectionTitle>Jenis dompet</SectionTitle>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <TypeOption
              key={t}
              type={t}
              selected={t === type}
              onPress={() => setType(t)}
            />
          ))}
        </View>
      </View>

      {/* Detail */}
      <View style={styles.section}>
        <SectionTitle>Detail</SectionTitle>
        <Card style={{ gap: space.md }}>
          <TextField
            label="Nama dompet"
            placeholder={type === "CASH" ? "Tunai" : "Contoh: BCA Utama"}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setNameError(undefined);
            }}
            error={nameError}
            maxLength={40}
          />
          {showInstitution ? (
            <TextField
              label="Nama institusi (opsional)"
              placeholder={type === "EWALLET" ? "Contoh: GoPay" : "Contoh: BCA"}
              value={institution}
              onChangeText={setInstitution}
              maxLength={40}
            />
          ) : null}
        </Card>
      </View>

      {/* Saldo */}
      <View style={styles.section}>
        <SectionTitle>
          {isDebtType ? "Tagihan saat ini (opsional)" : "Saldo awal (opsional)"}
        </SectionTitle>
        <Card style={{ gap: space.sm }}>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>Rp</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.line}
              value={groupThousands(digitsOnly(balanceText))}
              onChangeText={(v) => setBalanceText(digitsOnly(v))}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={18}
              accessibilityLabel={
                isDebtType ? "Tagihan saat ini" : "Saldo awal"
              }
            />
          </View>
          <View style={styles.hintRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.muted}
            />
            <Text style={styles.hint}>
              {isDebtType
                ? "Isi jumlah yang sudah terpakai dan belum dibayar. Akan dicatat sebagai tagihan."
                : "Saldo dompet saat ini, sebelum transaksi yang akan Anda catat."}
            </Text>
          </View>
        </Card>
      </View>

      <Button title="Simpan dompet" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },

  preview: {
    height: 140,
    borderRadius: radius.field + 8,
    backgroundColor: HERO,
    padding: space.md + 2,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewType: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.3,
  },
  previewName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  previewBalance: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  typeCard: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.sm + 2,
    borderRadius: radius.field + 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.paper,
  },
  typeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },

  amountRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  amountPrefix: { fontSize: 22, fontWeight: "700", color: colors.muted },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    paddingVertical: 4,
  },
  hintRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  hint: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.muted },
});
