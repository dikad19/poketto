import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import {
  categoryLabel,
  CategoryIconName,
  Glyph,
} from "../../components/CategoryGlyph";
import {
  ChoiceRow,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
} from "../../components/SpaceUI";
import { FormError, TextField } from "../../components/TextField";
import {
  Category,
  CreateTxInput,
  financeApi,
  TX_TYPE_LABEL,
  TxType,
  Wallet,
} from "../../lib/finance";
import {
  digitsOnly,
  groupThousands,
  noonDaysAgo,
  parseIsoDay,
} from "../../lib/format";
import { useSpaces } from "../../lib/SpaceContext";
import { hasRole, SpaceSummary } from "../../lib/spaces";
import { colors, space } from "../../lib/theme";
import { useLoad } from "../../lib/useLoad";
import { formErrorMessage } from "../../lib/validation";

type DayChoice = "0" | "1" | "2" | "custom";
type Visibility = "SHARED" | "PRIVATE";
type Errors = {
  amount?: string;
  wallet?: string;
  toWallet?: string;
  category?: string;
  date?: string;
  form?: string;
};

export default function AddScreen() {
  const { active, loading } = useSpaces();

  if (loading || !active) {
    return (
      <Screen>
        <ScreenHeader title="Catat transaksi" />
        <Loading />
      </Screen>
    );
  }
  if (!hasRole(active.role, "MEMBER")) {
    return (
      <Screen>
        <ScreenHeader title="Catat transaksi" />
        <ErrorState message="Peran Anda di space ini hanya bisa melihat. Minta pemilik mengubah peran Anda untuk mencatat transaksi." />
      </Screen>
    );
  }
  // key: ganti space = form baru
  return <AddForm key={active.id} spaceInfo={active} />;
}

function AddForm({ spaceInfo }: { spaceInfo: SpaceSummary }) {
  const spaceId = spaceInfo.id;
  const isShared = spaceInfo.type !== "PERSONAL";

  const refs = useLoad(async () => {
    const [wallets, categories] = await Promise.all([
      financeApi.wallets(spaceId),
      financeApi.categories(spaceId),
    ]);
    return { wallets, categories };
  });

  const [type, setType] = useState<TxType>("EXPENSE");
  const [amountText, setAmountText] = useState("");
  const [walletSel, setWalletSel] = useState<string | null>(null);
  const [toWalletSel, setToWalletSel] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [day, setDay] = useState<DayChoice>("0");
  const [customDay, setCustomDay] = useState("");
  const [title, setTitle] = useState("");
  const [feeText, setFeeText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("SHARED");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (refs.loading) {
    return (
      <Screen>
        <ScreenHeader title="Catat transaksi" />
        <Loading />
      </Screen>
    );
  }
  if (!refs.data) {
    return (
      <Screen>
        <ScreenHeader title="Catat transaksi" />
        <ErrorState
          message={refs.error?.message ?? "Gagal memuat data."}
          onRetry={refs.retry}
        />
      </Screen>
    );
  }

  const wallets: Wallet[] = refs.data.wallets;
  const categories: Category[] = refs.data.categories.filter(
    (c) => c.type === type,
  );

  if (wallets.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Catat transaksi" />
        <EmptyState
          title="Buat dompet dulu"
          body="Transaksi dicatat ke sebuah dompet, misalnya Tunai atau rekening bank."
        >
          <Button
            title="Buat dompet"
            onPress={() => {
              router.back();
              router.push("/wallets/new");
            }}
          />
        </EmptyState>
      </Screen>
    );
  }

  const walletId = walletSel ?? wallets[0].id;
  const toWalletId =
    toWalletSel && toWalletSel !== walletId
      ? toWalletSel
      : (wallets.find((w) => w.id !== walletId)?.id ?? "");

  const clear = (k: keyof Errors) =>
    setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));

  async function onSubmit() {
    if (submitting) return;
    const next: Errors = {};

    const amount = Number(digitsOnly(amountText));
    if (!amount) next.amount = "Masukkan nominal lebih dari 0";

    if (type === "TRANSFER") {
      if (!toWalletId)
        next.toWallet = "Perlu minimal dua dompet untuk transfer";
    } else if (!categoryId) {
      next.category = "Pilih kategori";
    }

    let date: Date | null = null;
    if (day === "0") date = new Date();
    else if (day === "1" || day === "2") date = noonDaysAgo(Number(day));
    else {
      date = parseIsoDay(customDay);
      if (!date) next.date = "Format tanggal: TTTT-BB-HH, contoh 2026-11-20";
      else if (date.getTime() > Date.now())
        next.date = "Tanggal tidak boleh di masa depan";
    }

    setErrors(next);
    if (Object.keys(next).length > 0 || !date) return;

    const body: CreateTxInput = {
      type,
      amount,
      walletId,
      date: date.toISOString(),
    };
    if (type === "TRANSFER") {
      body.toWalletId = toWalletId;
      const fee = Number(digitsOnly(feeText));
      if (fee > 0) body.fee = fee;
    } else if (categoryId) {
      body.categoryId = categoryId;
    }
    if (title.trim()) body.title = title.trim();
    if (isShared && visibility === "PRIVATE") body.visibility = "PRIVATE";

    setSubmitting(true);
    try {
      await financeApi.createTransaction(spaceId, body);
      router.back();
    } catch (e) {
      setErrors({ form: formErrorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  }

  const walletOptions = wallets.map((w) => ({ value: w.id, label: w.name }));

  return (
    <Screen>
      <ScreenHeader title="Catat transaksi" subtitle={`Ke ${spaceInfo.name}`} />
      <FormError message={errors.form} />

      <ChoiceRow<TxType>
        label="Jenis"
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId(null);
          setErrors({});
        }}
        options={(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => ({
          value: t,
          label: TX_TYPE_LABEL[t],
        }))}
      />

      <TextField
        label="Nominal"
        placeholder="0"
        value={groupThousands(digitsOnly(amountText))}
        onChangeText={(v) => {
          setAmountText(digitsOnly(v));
          clear("amount");
        }}
        error={errors.amount}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={18}
        autoFocus
      />

      <ChoiceRow<string>
        label={type === "TRANSFER" ? "Dari dompet" : "Dompet"}
        value={walletId}
        onChange={(id) => {
          setWalletSel(id);
          clear("wallet");
        }}
        options={walletOptions}
      />

      {type === "TRANSFER" ? (
        <>
          <ChoiceRow<string>
            label="Ke dompet"
            value={toWalletId}
            onChange={(id) => {
              setToWalletSel(id);
              clear("toWallet");
            }}
            options={walletOptions.filter((o) => o.value !== walletId)}
          />
          {errors.toWallet ? (
            <Text style={styles.error}>{errors.toWallet}</Text>
          ) : null}
          <TextField
            label="Biaya admin (opsional)"
            placeholder="0"
            value={groupThousands(digitsOnly(feeText))}
            onChangeText={(v) => setFeeText(digitsOnly(v))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={12}
          />
        </>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chips}>
            {categories.map((c) => {
              const selected = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setCategoryId(c.id);
                    clear("category");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.catChip, selected && styles.catChipActive]}
                >
                  <Glyph
                    name={CategoryIconName(c.icon)}
                    size={28}
                    tint={selected ? "#FFFFFF" : colors.primary}
                    bg={selected ? "rgba(255,255,255,0.18)" : colors.paper}
                  />
                  <Text
                    style={[styles.catText, selected && { color: "#FFFFFF" }]}
                    numberOfLines={1}
                  >
                    {categoryLabel(c.name)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.category ? (
            <Text style={styles.error}>{errors.category}</Text>
          ) : null}
        </View>
      )}

      <ChoiceRow<DayChoice>
        label="Tanggal"
        value={day}
        onChange={(d) => {
          setDay(d);
          clear("date");
        }}
        options={[
          { value: "0", label: "Hari ini" },
          { value: "1", label: "Kemarin" },
          { value: "2", label: "2 hari lalu" },
          { value: "custom", label: "Tanggal lain" },
        ]}
      />
      {day === "custom" ? (
        <TextField
          label="Tanggal (TTTT-BB-HH)"
          placeholder="2026-11-20"
          value={customDay}
          onChangeText={(v) => {
            setCustomDay(v);
            clear("date");
          }}
          error={errors.date}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      ) : null}

      <TextField
        label="Keterangan (opsional)"
        placeholder={
          type === "TRANSFER"
            ? "Contoh: Isi saldo e-wallet"
            : "Contoh: Makan siang"
        }
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        returnKeyType="done"
      />

      {isShared ? (
        <ChoiceRow<Visibility>
          label="Siapa yang bisa melihat"
          value={visibility}
          onChange={setVisibility}
          options={[
            {
              value: "SHARED",
              label: "Semua anggota",
              hint: "Terlihat oleh semua anggota space ini",
            },
            {
              value: "PRIVATE",
              label: "Hanya saya",
              hint: "Tidak muncul di daftar anggota lain",
            },
          ]}
        />
      ) : null}

      <Button
        title="Simpan transaksi"
        onPress={onSubmit}
        loading={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink,
    maxWidth: 170,
  },
  error: { fontSize: 13, color: colors.error },
});
