import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "../../../components/BottomSheet";
import { WalletGlyph } from "../../../components/CategoryGlyph";
import {
  Card,
  ErrorState,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "../../../components/SpaceUI";
import { FormError } from "../../../components/TextField";
import {
  financeApi,
  WALLET_TYPE_LABEL,
  WalletType,
} from "../../../lib/finance";
import { digitsOnly, formatMoney, groupThousands } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { colors, space } from "../../../lib/theme";
import { formErrorMessage } from "../../../lib/validation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
const TYPES = Object.keys(WALLET_TYPE_LABEL) as WalletType[];
const HERO = "#7A1D3A";
type McIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];
// One source of truth: every field, card, row and button uses the same size/radius
const FIELD_H = 40;
const R = 6;
const STRIPES = Array.from({ length: 16 });
const TYPE_ICON: Record<string, McIcon> = {
  CASH: "cash",
  BANK: "bank-outline",
  EWALLET: "wallet-outline",
  CREDIT_CARD: "credit-card-outline",
  PAYLATER: "calendar-clock-outline",
};
const iconFor = (t: WalletType): McIcon => TYPE_ICON[t] ?? "wallet-outline";
const webNoOutline = Platform.select({
  web: { outlineStyle: "none" } as object,
});

/* ---------- Text field ---------- */
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldBox,
          focused && { borderColor: colors.primary },
          !!error && { borderColor: colors.error },
        ]}
      >
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function TypeField({
  type,
  onPress,
}: {
  type: WalletType;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>Jenis dompet</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Jenis dompet: ${WALLET_TYPE_LABEL[type]}. Ketuk untuk mengubah`}
        style={({ pressed }) => [styles.fieldBox, pressed && { opacity: 0.8 }]}
      >
        <MaterialCommunityIcons
          name={iconFor(type)}
          size={22}
          color={colors.ink}
        />
        <Text style={styles.typeFieldValue} numberOfLines={1}>
          {WALLET_TYPE_LABEL[type]}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function TypeRow({
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
        styles.typeRow,
        selected && styles.typeRowActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <MaterialCommunityIcons
        name={iconFor(type)}
        size={24}
        color={selected ? colors.primary : colors.ink}
        style={styles.typeRowIcon}
      />
      <Text
        style={[styles.typeRowLabel, selected && { color: colors.primary }]}
        numberOfLines={1}
      >
        {WALLET_TYPE_LABEL[type]}
      </Text>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? colors.primary : colors.line}
      />
    </Pressable>
  );
}

/* ---------- Save button (rendered in the Screen footer) ---------- */
function SaveButton({
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
        styles.saveBtn,
        (pressed || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.saveText}>{title}</Text>
      )}
    </Pressable>
  );
}

export default function NewWalletScreen() {
  const { active } = useSpaces();
  const [type, setType] = useState<WalletType>("CASH");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const [amountFocused, setAmountFocused] = useState(false);
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
    <Screen
      footer={
        <SaveButton title="Simpan" onPress={onSubmit} loading={submitting} />
      }
    >
      <ScreenHeader title="Tambah dompet" subtitle={`Di ${active.name}`} />
      <FormError message={formError} />

      {/* Preview card */}
      <View
        style={styles.preview}
        accessible
        accessibilityLabel="Pratinjau dompet"
      >
        {/* diagonal line pattern */}
        <View style={styles.stripes} pointerEvents="none">
          {STRIPES.map((_, i) => (
            <View key={i} style={styles.stripe} />
          ))}
        </View>

        <View style={styles.previewTop}>
          <View style={styles.previewBadge}>
            <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
            <Text style={styles.previewType} numberOfLines={1}>
              {institution.trim() || WALLET_TYPE_LABEL[type]}
            </Text>
          </View>
          <Text style={styles.previewTag}>
            {isDebtType ? "Tagihan" : "Saldo"}
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text
            style={styles.previewBalance}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(previewValue, "IDR")}
          </Text>
          <Text style={styles.previewName} numberOfLines={1}>
            {name.trim() || "Nama dompet"}
          </Text>
        </View>
      </View>

      {/* Type + details */}
      <View style={styles.section}>
        <SectionTitle>Detail</SectionTitle>
        <Card style={{ gap: space.md, borderRadius: R }}>
          <TypeField type={type} onPress={() => setPickerOpen(true)} />
          <InputField
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
            <InputField
              label="Nama institusi (opsional)"
              placeholder={type === "EWALLET" ? "Contoh: GoPay" : "Contoh: BCA"}
              value={institution}
              onChangeText={setInstitution}
              maxLength={40}
            />
          ) : null}
        </Card>
      </View>

      {/* Balance */}
      <View style={styles.section}>
        <SectionTitle>
          {isDebtType ? "Tagihan saat ini (opsional)" : "Saldo awal (opsional)"}
        </SectionTitle>
        <View
          style={[
            styles.fieldBox,
            amountFocused && { borderColor: colors.primary },
          ]}
        >
          <Text style={styles.amountPrefix}>Rp</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={groupThousands(digitsOnly(balanceText))}
            onChangeText={(v) => setBalanceText(digitsOnly(v))}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={18}
            accessibilityLabel={isDebtType ? "Tagihan saat ini" : "Saldo awal"}
          />
        </View>
      </View>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Jenis Dompet"
        subtitle="Pilih jenis yang paling sesuai"
      >
        <View style={styles.typeList} accessibilityRole="radiogroup">
          {TYPES.map((t) => (
            <TypeRow
              key={t}
              type={t}
              selected={t === type}
              onPress={() => {
                setType(t);
                setPickerOpen(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },

  /* preview card */
  preview: {
    height: 148,
    borderRadius: R,
    backgroundColor: HERO,
    padding: space.md + 2,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  stripes: {
    position: "absolute",
    top: -220,
    left: -160,
    width: 700,
    gap: 22,
    transform: [{ rotate: "-35deg" }],
  },
  stripe: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeRowIcon: { width: 28, textAlign: "center" },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "70%",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  previewType: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  previewTag: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  previewBalance: {
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  previewName: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
  },

  /* shared field look */
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: FIELD_H,
    paddingHorizontal: space.md,
    borderRadius: R,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
    ...webNoOutline,
  },
  fieldError: { fontSize: 12, color: colors.error },

  typeFieldValue: { flex: 1, fontSize: 16, color: colors.ink },

  /* type sheet */
  typeList: { gap: space.sm },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + 2,
    padding: space.sm + 2,
    borderRadius: R,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  typeRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.paper,
  },
  typeRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },

  /* balance */
  amountPrefix: { fontSize: 16, fontWeight: "500", color: colors.muted },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink,
    paddingVertical: 0,
    ...webNoOutline,
  },
  hintRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  hint: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.muted },

  /* save button */
  saveBtn: {
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  saveText: { fontSize: 14, fontWeight: "500", color: "#FFFFFF" },
});
