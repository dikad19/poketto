import { api } from "./api";

export type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
export type WalletType =
  | "CASH"
  | "BANK"
  | "EWALLET"
  | "CREDIT_CARD"
  | "PAYLATER"
  | "SAVINGS"
  | "INVESTMENT"
  | "OTHER";

export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  CASH: "Tunai",
  BANK: "Bank",
  EWALLET: "E-wallet",
  CREDIT_CARD: "Kartu kredit",
  PAYLATER: "PayLater",
  SAVINGS: "Tabungan",
  INVESTMENT: "Investasi",
  OTHER: "Lainnya",
};

export const TX_TYPE_LABEL: Record<TxType, string> = {
  EXPENSE: "Pengeluaran",
  INCOME: "Pemasukan",
  TRANSFER: "Transfer",
};

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  institution: string | null;
  ownerId: string | null;
  includeInTotal: boolean;
  initialBalance: number;
  balance: number;
};

export type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  isEssential: boolean;
};

export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  fee: number;
  title: string;
  note: string | null;
  merchant: string | null;
  date: string;
  visibility: "SHARED" | "PRIVATE";
  isImpulse: boolean;
  mood: string | null;
  createdAt: string;
  wallet: { id: string; name: string };
  toWallet: { id: string; name: string } | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    type: string;
  } | null;
  createdBy: { id: string; username: string; name: string | null };
};

export type Dashboard = {
  range: { from: string; to: string };
  currency: string;
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
  count: number;
  largestExpense: { amount: number; title: string } | null;
  byCategory: {
    categoryId: string | null;
    name: string;
    icon: string | null;
    amount: number;
    percent: number;
  }[];
  wallets: Wallet[];
  recent: Tx[];
};

export type SeriesPoint = { key: string; income: number; expense: number };
export type Series = { bucket: "day" | "month"; points: SeriesPoint[] };

export type TxPage = { items: Tx[]; nextCursor: string | null };

export type CreateTxInput = {
  type: TxType;
  amount: number;
  walletId: string;
  toWalletId?: string;
  categoryId?: string;
  fee?: number;
  title?: string;
  date?: string;
  visibility?: "SHARED" | "PRIVATE";
};

export type CreateWalletInput = {
  name: string;
  type: WalletType;
  initialBalance: number;
  institution?: string;
};

function qs(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export const financeApi = {
  dashboard: (spaceId: string, from: Date, to: Date) =>
    api<Dashboard>(
      `/spaces/${spaceId}/dashboard${qs({ from: from.toISOString(), to: to.toISOString() })}`,
    ),

  series: (spaceId: string, from: Date, to: Date, bucket: "day" | "month") =>
    api<Series>(
      `/spaces/${spaceId}/dashboard/series${qs({
        from: from.toISOString(),
        to: to.toISOString(),
        bucket,
        tzOffset: new Date().getTimezoneOffset(),
      })}`,
    ),

  transactions: (
    spaceId: string,
    p: {
      from: Date;
      to: Date;
      type?: TxType;
      cursor?: string | null;
      limit?: number;
    },
  ) =>
    api<TxPage>(
      `/spaces/${spaceId}/transactions${qs({
        from: p.from.toISOString(),
        to: p.to.toISOString(),
        type: p.type,
        cursor: p.cursor,
        limit: p.limit ?? 30,
      })}`,
    ),
  transaction: (spaceId: string, id: string) =>
    api<Tx>(`/spaces/${spaceId}/transactions/${id}`),
  createTransaction: (spaceId: string, body: CreateTxInput) =>
    api<Tx>(`/spaces/${spaceId}/transactions`, { method: "POST", body }),
  deleteTransaction: (spaceId: string, id: string) =>
    api(`/spaces/${spaceId}/transactions/${id}`, { method: "DELETE" }),

  wallets: (spaceId: string) => api<Wallet[]>(`/spaces/${spaceId}/wallets`),
  createWallet: (spaceId: string, body: CreateWalletInput) =>
    api<Wallet>(`/spaces/${spaceId}/wallets`, { method: "POST", body }),
  archiveWallet: (spaceId: string, id: string) =>
    api(`/spaces/${spaceId}/wallets/${id}`, { method: "DELETE" }),

  categories: (spaceId: string) =>
    api<Category[]>(`/spaces/${spaceId}/categories`),
};
