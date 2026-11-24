import { router } from "expo-router";
import { useState } from "react";
import { Button } from "../../../components/Button";
import {
  ChoiceRow,
  ErrorState,
  Screen,
  ScreenHeader,
} from "../../../components/SpaceUI";
import { FormError, TextField } from "../../../components/TextField";
import {
  financeApi,
  WALLET_TYPE_LABEL,
  WalletType,
} from "../../../lib/finance";
import { digitsOnly, groupThousands } from "../../../lib/format";
import { useSpaces } from "../../../lib/SpaceContext";
import { hasRole } from "../../../lib/spaces";
import { formErrorMessage } from "../../../lib/validation";

const TYPES = Object.keys(WALLET_TYPE_LABEL) as WalletType[];

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

  async function onSubmit() {
    if (submitting || !active) return;
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Masukkan nama dompet");
    setNameError(undefined);
    setFormError(undefined);

    const amount = Number(digitsOnly(balanceText));
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
      <ChoiceRow<WalletType>
        label="Jenis"
        value={type}
        onChange={setType}
        options={TYPES.map((t) => ({ value: t, label: WALLET_TYPE_LABEL[t] }))}
      />
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
      {type === "BANK" || type === "EWALLET" || isDebtType ? (
        <TextField
          label="Nama institusi (opsional)"
          placeholder={type === "EWALLET" ? "Contoh: GoPay" : "Contoh: BCA"}
          value={institution}
          onChangeText={setInstitution}
          maxLength={40}
        />
      ) : null}
      <TextField
        label={
          isDebtType ? "Tagihan saat ini (opsional)" : "Saldo awal (opsional)"
        }
        hint={
          isDebtType
            ? "Isi jumlah yang sudah terpakai dan belum dibayar"
            : "Saldo dompet saat ini, sebelum transaksi yang akan Anda catat"
        }
        placeholder="0"
        value={groupThousands(digitsOnly(balanceText))}
        onChangeText={(v) => setBalanceText(digitsOnly(v))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={18}
      />
      <Button title="Simpan dompet" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}
