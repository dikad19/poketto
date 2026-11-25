import { api } from "./api";

export type BillFrequency = "MONTHLY" | "YEARLY";

export type Bill = {
  id: string;
  title: string;
  amount: number;
  frequency: BillFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  walletId: string;
};

export type BillInput = {
  title: string;
  amount: number;
  frequency: BillFrequency;
  startDate: string;
  walletId: string;
};

export const billsApi = {
  list: (spaceId: string) => api<Bill[]>(`/spaces/${spaceId}/bills`),
  create: (spaceId: string, body: BillInput) =>
    api<Bill>(`/spaces/${spaceId}/bills`, { method: "POST", body }),
  update: (spaceId: string, id: string, body: BillInput) =>
    api<Bill>(`/spaces/${spaceId}/bills/${id}`, { method: "PATCH", body }),
  remove: (spaceId: string, id: string) =>
    api(`/spaces/${spaceId}/bills/${id}`, { method: "DELETE" }),
};

/** Tanggal (1-31) di bulan tertentu di mana tagihan jatuh tempo. */
export function occurrencesInMonth(
  b: Bill,
  year: number,
  month: number,
): number[] {
  const start = new Date(b.startDate);
  const sy = start.getFullYear();
  const sm = start.getMonth();
  const sd = start.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const step = Math.max(b.interval || 1, 1);

  let day: number | null = null;
  if (b.frequency === "MONTHLY") {
    const diff = (year - sy) * 12 + (month - sm);
    if (diff >= 0 && diff % step === 0) day = Math.min(sd, lastDay);
  } else {
    const diff = year - sy;
    if (month === sm && diff >= 0 && diff % step === 0) {
      day = Math.min(sd, lastDay);
    }
  }
  if (day === null) return [];

  if (b.endDate && new Date(year, month, day) > new Date(b.endDate)) return [];
  return [day];
}
