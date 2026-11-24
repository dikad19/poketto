import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { WalletType } from "../lib/finance";
import { colors } from "../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Nama ikon dari BE (gaya lucide) -> MaterialCommunityIcons
const CATEGORY_ICON: Record<string, string> = {
  briefcase: "briefcase-outline",
  gift: "gift-outline",
  storefront: "storefront-outline",
  "chart-line": "chart-line",
  laptop: "laptop",
  house: "home-city-outline",
  "cash-plus": "cash-plus",
  home: "home-outline",
  "shopping-cart": "cart-outline",
  zap: "lightning-bolt-outline",
  bus: "bus",
  stethoscope: "stethoscope",
  "graduation-cap": "school-outline",
  receipt: "receipt",
  "shield-check": "shield-check-outline",
  utensils: "silverware-fork-knife",
  clapperboard: "movie-open-outline",
  "shopping-bag": "shopping-outline",
  tv: "television-play",
  "hand-heart": "hand-heart-outline",
  heart: "heart-outline",
  plane: "airplane",
  "gamepad-2": "gamepad-variant-outline",
  "circle-ellipsis": "dots-horizontal-circle-outline",
};

const WALLET_ICON: Record<WalletType, string> = {
  CASH: "cash",
  BANK: "bank-outline",
  EWALLET: "wallet-outline",
  CREDIT_CARD: "credit-card-outline",
  PAYLATER: "calendar-clock-outline",
  SAVINGS: "piggy-bank-outline",
  INVESTMENT: "chart-line",
  OTHER: "dots-horizontal-circle-outline",
};

// Kategori default di BE bernama Inggris; tampilkan dalam Indonesia
const CATEGORY_LABEL: Record<string, string> = {
  Salary: "Gaji",
  "Bonus & Allowances": "Bonus & Tunjangan",
  "Business Income": "Pendapatan Usaha",
  "Investment Returns": "Hasil Investasi",
  Freelance: "Freelance",
  "Rental Income": "Pendapatan Sewa",
  "Other Income": "Pemasukan Lain",
  Housing: "Tempat Tinggal",
  Groceries: "Belanja Harian",
  "Bills & Utilities": "Tagihan & Utilitas",
  Transportation: "Transportasi",
  Healthcare: "Kesehatan",
  Education: "Pendidikan",
  "Debt & Installments": "Utang & Cicilan",
  Insurance: "Asuransi",
  "Dining Out": "Makan di Luar",
  Entertainment: "Hiburan",
  Shopping: "Belanja",
  Subscriptions: "Langganan",
  "Gifts & Donations": "Hadiah & Donasi",
  "Personal Care": "Perawatan Diri",
  "Travel & Vacation": "Liburan",
  Hobbies: "Hobi",
  "Other Expenses": "Pengeluaran Lain",
};

export const categoryLabel = (name: string) => CATEGORY_LABEL[name] ?? name;

export function Glyph({
  name,
  size = 44,
  tint = colors.primary,
  bg = colors.paper,
}: {
  name: string;
  size?: number;
  tint?: string;
  bg?: string;
}) {
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: size / 3, backgroundColor: bg }]}
    >
      <MaterialCommunityIcons name={name as IconName} size={size * 0.5} color={tint} />
    </View>
  );
}

/** Nama ikon MaterialCommunityIcons untuk ikon kategori dari BE. */
export const CategoryIconName = (icon?: string | null) =>
  (icon && CATEGORY_ICON[icon]) || "tag-outline";

export function CategoryGlyph({ icon, size }: { icon?: string | null; size?: number }) {
  return <Glyph name={CategoryIconName(icon)} size={size} />;
}

export function WalletGlyph({ type, size }: { type: WalletType; size?: number }) {
  return <Glyph name={WALLET_ICON[type] ?? "wallet-outline"} size={size} />;
}

export function TransferGlyph({ size }: { size?: number }) {
  return <Glyph name="swap-horizontal" size={size} />;
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
