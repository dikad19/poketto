export function formatMoney(amount: number, currency = "IDR") {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("id-ID")}`;
  }
}

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export const groupThousands = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function monthRange(offset: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return { from, to };
}

export const monthLabel = (d: Date) =>
  d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  if (key === dayKey(today)) return "Hari ini";
  if (key === dayKey(yesterday)) return "Kemarin";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function noonDaysAgo(n: number) {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - n,
    12,
    0,
    0,
  );
}

export function parseIsoDay(text: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  )
    return null;
  return date;
}

export function formatCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number, unit: string) =>
    `${sign}${(Math.round(v * 10) / 10).toString().replace(".", ",")} ${unit}`;
  if (abs >= 1e9) return fmt(abs / 1e9, "M");
  if (abs >= 1e6) return fmt(abs / 1e6, "jt");
  if (abs >= 1e3) return fmt(abs / 1e3, "rb");
  return `${sign}${Math.round(abs)}`;
}

export function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const shortMonth = (d: Date) =>
  d.toLocaleDateString("id-ID", { month: "short" });

export const fullDay = (d: Date) =>
  d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
