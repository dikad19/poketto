import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bill,
  BillFrequency,
  billsApi,
  occurrencesInMonth,
} from "../lib/bills";
import { formatMoney } from "../lib/format";
import { colors } from "../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const INCOME = "#12B76A";
const EXPENSE = "#F04438";
const GAP = 4;
const CELL_H = 88;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Ikon + warna per tagihan (dari judul, tanpa kolom baru di schema)
function billStyle(title: string): { icon: IconName; color: string } {
  const t = title.toLowerCase();
  if (/listrik|pln|electric|power/.test(t))
    return { icon: "lightning-bolt", color: "#F5B301" };
  if (/spotify/.test(t)) return { icon: "spotify", color: "#1DB954" };
  if (/netflix/.test(t)) return { icon: "netflix", color: "#E50914" };
  if (/youtube/.test(t)) return { icon: "youtube", color: "#FF0000" };
  if (/wifi|internet|indihome/.test(t))
    return { icon: "wifi", color: "#2E90FA" };
  if (/air|pdam|water/.test(t)) return { icon: "water", color: "#06AED4" };
  if (/pulsa|phone|telp|data/.test(t))
    return { icon: "cellphone", color: "#7A5AF8" };
  if (/kos|sewa|rent|rumah/.test(t)) return { icon: "home", color: "#B54708" };
  if (/cicil|loan|kredit|pinjam/.test(t))
    return { icon: "credit-card", color: "#344054" };
  return { icon: "receipt-text", color: "#F79009" };
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // minggu mulai Senin
  return x;
};

const short = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export type DayTotals = Record<number, { income: number; expense: number }>;
type WalletLite = { id: string; name: string };

export function BillCalendar({
  spaceId,
  month,
  currency,
  dayTotals,
  bills,
  wallets,
  canEdit,
  onChanged,
}: {
  spaceId: string;
  month: Date; // tanggal 1 bulan yang sedang aktif
  currency: string;
  dayTotals: DayTotals;
  bills: Bill[];
  wallets: WalletLite[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === m;
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // Semua minggu yang menyentuh bulan ini
  const weeks = useMemo(() => {
    const out: Date[][] = [];
    const last = new Date(year, m, daysInMonth);
    const s = startOfWeek(new Date(year, m, 1));
    while (s <= last) {
      out.push(
        Array.from(
          { length: 7 },
          (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i),
        ),
      );
      s.setDate(s.getDate() + 7);
    }
    return out;
  }, [year, m, daysInMonth]);

  const todayWeek = isThisMonth
    ? Math.max(
        0,
        weeks.findIndex((w) => w.some((d) => sameDay(d, today))),
      )
    : 0;

  const [width, setWidth] = useState(0);
  const [weekIndex, setWeekIndex] = useState(todayWeek);
  const [selected, setSelected] = useState<Date>(
    isThisMonth ? today : new Date(year, m, 1),
  );
  const [form, setForm] = useState<{ bill: Bill | null } | null>(null);
  const listRef = useRef<FlatList<Date[]>>(null);
  const indexRef = useRef(todayWeek);

  // Ganti bulan: kembali ke minggu hari ini / minggu pertama
  useEffect(() => {
    indexRef.current = todayWeek;
    setWeekIndex(todayWeek);
    setSelected(isThisMonth ? new Date() : new Date(year, m, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, m]);

  const billsOn = (d: Date) =>
    bills.filter((b) =>
      occurrencesInMonth(b, d.getFullYear(), d.getMonth()).includes(
        d.getDate(),
      ),
    );

  const monthBills = useMemo(() => {
    let count = 0;
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      for (const b of bills) {
        if (occurrencesInMonth(b, year, m).includes(d)) {
          count++;
          total += b.amount;
        }
      }
    }
    return { count, total };
  }, [bills, year, m, daysInMonth]);

  const changeWeek = (i: number) => {
    if (i < 0 || i >= weeks.length) return;
    indexRef.current = i;
    setWeekIndex(i);
    setSelected((prev) => weeks[i][(prev.getDay() + 6) % 7]);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= weeks.length) return;
    listRef.current?.scrollToIndex({ index: i, animated: true });
    changeWeek(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== indexRef.current) changeWeek(i);
  };

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const week = weeks[Math.min(weekIndex, weeks.length - 1)];
  const weekLabel = `${short(week[0])} – ${
    week[0].getMonth() === week[6].getMonth()
      ? week[6].getDate()
      : short(week[6])
  }`;

  const cellW = width ? (width - GAP * 6) / 7 : 0;
  const selInMonth =
    selected.getMonth() === m && selected.getFullYear() === year;
  const selTotals = selInMonth ? dayTotals[selected.getDate()] : undefined;
  const selBills = billsOn(selected);

  const confirmDelete = (b: Bill) =>
    Alert.alert(
      "Delete bill",
      `Delete "${b.title}"? This stops all future reminders.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await billsApi.remove(spaceId, b.id);
              onChanged();
            } catch (e: any) {
              Alert.alert("Failed", e?.message ?? "Could not delete the bill.");
            }
          },
        },
      ],
    );

  const renderWeek = ({ item }: { item: Date[] }) => (
    <View style={[s.page, { width }]}>
      {item.map((d) => {
        const inMonth = d.getMonth() === m && d.getFullYear() === year;
        const isToday = sameDay(d, today);
        const isSel = sameDay(d, selected);
        const t = inMonth ? dayTotals[d.getDate()] : undefined;
        const dayBills = billsOn(d);
        const shown = dayBills.length > 4 ? dayBills.slice(0, 3) : dayBills;
        const extra = dayBills.length - shown.length;

        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => setSelected(d)}
            style={[
              s.cell,
              { width: cellW },
              isSel && s.cellSel,
              !inMonth && { opacity: 0.45 },
            ]}
          >
            <View
              style={[
                s.dateBadge,
                isToday && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[s.dateText, isToday && { color: "#fff" }]}>
                {d.getDate()}
              </Text>
            </View>

            <View style={s.events}>
              {shown.map((b) => {
                const st = billStyle(b.title);
                return (
                  <View
                    key={b.id}
                    style={[s.tile, { backgroundColor: st.color + "22" }]}
                  >
                    <MaterialCommunityIcons
                      name={st.icon}
                      size={11}
                      color={st.color}
                    />
                  </View>
                );
              })}
              {extra > 0 ? (
                <View style={[s.tile, { backgroundColor: colors.paper }]}>
                  <Text style={s.more}>+{extra + 1}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.marks}>
              {t && t.expense > 0 ? (
                <View style={[s.dot, { backgroundColor: EXPENSE }]} />
              ) : null}
              {t && t.income > 0 ? (
                <View style={[s.dot, { backgroundColor: INCOME }]} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={s.card}>
      {/* Header: navigasi minggu */}
      {/* Header: judul + aksi */}
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Tagihan</Text>
          <Text style={s.sub} numberOfLines={1}>
            {monthBills.count} tagihan ·{" "}
            {formatMoney(monthBills.total, currency)} bulan ini
          </Text>
        </View>
        {isThisMonth && weekIndex !== todayWeek ? (
          <Pressable
            onPress={() => {
              goTo(todayWeek);
              setSelected(new Date());
            }}
            style={s.todayChip}
          >
            <Text style={s.todayText}>Hari ini</Text>
          </Pressable>
        ) : null}
        {canEdit ? (
          <Pressable
            onPress={() => setForm({ bill: null })}
            style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityLabel="Tambah tagihan"
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {/* Nama hari (tetap) + pager mingguan */}
      <View onLayout={onLayout}>
        {width > 0 ? (
          <>
            <View style={[s.weekRow, { gap: GAP }]}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={[s.weekday, { width: cellW }]}>
                  {w}
                </Text>
              ))}
            </View>
            <FlatList
              key={`${year}-${m}-${width}`}
              ref={listRef}
              data={weeks}
              renderItem={renderWeek}
              keyExtractor={(w) => w[0].toISOString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={todayWeek}
              getItemLayout={(_, i) => ({
                length: width,
                offset: width * i,
                index: i,
              })}
              onScroll={onScroll}
              scrollEventThrottle={16}
              extraData={[bills, dayTotals, selected]}
            />
            <View style={s.pageDots}>
              {weeks.map((_, i) => (
                <View
                  key={i}
                  style={[s.pageDot, i === weekIndex && s.pageDotActive]}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>

      {/* Detail hari terpilih */}
      <View style={s.detail}>
        <View style={s.detailHead}>
          <Text style={s.detailDate}>
            {selected.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </Text>
          <Text style={s.totalText}>
            <Text style={{ color: EXPENSE }}>
              −{formatMoney(selTotals?.expense ?? 0, currency)}
            </Text>
            {"   "}
            <Text style={{ color: INCOME }}>
              +{formatMoney(selTotals?.income ?? 0, currency)}
            </Text>
          </Text>
        </View>

        {selBills.length === 0 ? (
          <Text style={s.empty}>No bills this day 🎉</Text>
        ) : (
          selBills.map((b) => {
            const st = billStyle(b.title);
            return (
              <View key={b.id} style={s.billRow}>
                <View
                  style={[s.billIcon, { backgroundColor: st.color + "22" }]}
                >
                  <MaterialCommunityIcons
                    name={st.icon}
                    size={18}
                    color={st.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.billTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={s.billSub}>
                    {b.frequency === "MONTHLY" ? "Every month" : "Every year"}
                  </Text>
                </View>
                <Text style={s.billAmount}>
                  {formatMoney(b.amount, currency)}
                </Text>
                {canEdit ? (
                  <View style={s.billActions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => setForm({ bill: b })}
                      accessibilityLabel={`Edit ${b.title}`}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={19}
                        color={colors.muted}
                      />
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() => confirmDelete(b)}
                      accessibilityLabel={`Delete ${b.title}`}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={19}
                        color={EXPENSE}
                      />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {form ? (
        <BillForm
          key={form.bill?.id ?? "new"}
          bill={form.bill}
          defaultDay={selected.getDate()}
          year={selected.getFullYear()}
          month={selected.getMonth()}
          wallets={wallets}
          onClose={() => setForm(null)}
          onSave={async (input) => {
            if (form.bill) await billsApi.update(spaceId, form.bill.id, input);
            else await billsApi.create(spaceId, input);
            onChanged();
            setForm(null);
          }}
        />
      ) : null}
    </View>
  );
}

/* ---------- Form tambah / edit ---------- */

function BillForm({
  bill,
  defaultDay,
  year,
  month,
  wallets,
  onClose,
  onSave,
}: {
  bill: Bill | null;
  defaultDay: number;
  year: number;
  month: number;
  wallets: WalletLite[];
  onClose: () => void;
  onSave: (input: {
    title: string;
    amount: number;
    frequency: BillFrequency;
    startDate: string;
    walletId: string;
  }) => Promise<void>;
}) {
  const existing = bill ? new Date(bill.startDate) : null;
  const [title, setTitle] = useState(bill?.title ?? "");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [day, setDay] = useState(
    String(existing ? existing.getDate() : Math.min(defaultDay, 28)),
  );
  const [frequency, setFrequency] = useState<BillFrequency>(
    bill?.frequency ?? "MONTHLY",
  );
  const [walletId, setWalletId] = useState(
    bill?.walletId ?? wallets[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amt = Number(amount.replace(/[^\d]/g, ""));
    const d = Number(day);
    if (!title.trim()) return Alert.alert("Missing name", "Enter a bill name.");
    if (!amt) return Alert.alert("Missing amount", "Enter the bill amount.");
    if (!d || d < 1 || d > 28)
      return Alert.alert("Invalid day", "Day must be between 1 and 28.");
    if (!walletId) return Alert.alert("No wallet", "Create a wallet first.");

    // Edit: pertahankan bulan/tahun mulai asli, ubah harinya saja
    const sy = existing ? existing.getFullYear() : year;
    const sm = existing ? existing.getMonth() : month;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        amount: amt,
        frequency,
        startDate: new Date(sy, sm, d, 12).toISOString(),
        walletId,
      });
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Could not save the bill.");
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{bill ? "Edit bill" : "New bill"}</Text>

          <Text style={s.label}>Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Electricity, Spotify, Wi-Fi…"
            placeholderTextColor={colors.placeholder}
            style={s.input}
          />

          <Text style={s.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            style={s.input}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Due day (1–28)</Text>
              <TextInput
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
                style={s.input}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={s.label}>Repeats</Text>
              <View style={s.chips}>
                {(["MONTHLY", "YEARLY"] as BillFrequency[]).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[s.chip, frequency === f && s.chipActive]}
                  >
                    <Text
                      style={[s.chipText, frequency === f && { color: "#fff" }]}
                    >
                      {f === "MONTHLY" ? "Monthly" : "Yearly"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Text style={s.label}>Pay from</Text>
          <View style={[s.chips, { flexWrap: "wrap" }]}>
            {wallets.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => setWalletId(w.id)}
                style={[s.chip, walletId === w.id && s.chipActive]}
              >
                <Text
                  style={[s.chipText, walletId === w.id && { color: "#fff" }]}
                  numberOfLines={1}
                >
                  {w.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.formActions}>
            <Pressable onPress={onClose} style={[s.btn, s.btnGhost]}>
              <Text style={[s.btnText, { color: colors.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving}
              style={[
                s.btn,
                { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 },
              ]}
            >
              <Text style={s.btnText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.paper,
  },
  todayText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginLeft: 2,
  },

  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekday: {
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  page: { flexDirection: "row", gap: GAP },
  cell: {
    height: CELL_H,
    borderRadius: 12,
    backgroundColor: colors.paper,
    alignItems: "center",
    paddingTop: 6,
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pageDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
  },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  pageDotActive: { backgroundColor: colors.primary, width: 14 },
  cellSel: { borderColor: colors.primary, backgroundColor: colors.surface },
  dateBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  events: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "flex-start",
    gap: 3,
    marginTop: 6,
    width: 37,
  },
  tile: {
    width: 17,
    height: 17,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  more: { fontSize: 9, fontWeight: "700", color: colors.muted },
  marks: { flexDirection: "row", gap: 3, height: 10, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },

  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 10,
    gap: 10,
  },
  detailHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailDate: { fontSize: 14, fontWeight: "700", color: colors.ink },
  totalText: { fontSize: 12, fontWeight: "600" },
  empty: { fontSize: 13, color: colors.muted },
  billRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  billTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  billSub: { fontSize: 12, color: colors.muted },
  billAmount: { fontSize: 14, fontWeight: "700", color: colors.ink },
  billActions: { flexDirection: "row", gap: 12, marginLeft: 4 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginTop: 6 },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.paper,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  formActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  btnGhost: { backgroundColor: colors.paper },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
