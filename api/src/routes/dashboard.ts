import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireMember } from "../lib/access";
import { listWalletsWithBalance } from "../lib/balances";
import { serializeTx, txInclude, visibleTo } from "./transactions";

export const dashboardRouter = Router({ mergeParams: true });

const querySchema = z.object({
  from: z.coerce.date().optional(), // inklusif
  to: z.coerce.date().optional(), // eksklusif
});

/**
 * Ringkasan satu periode (default: bulan berjalan).
 * FE sebaiknya mengirim from/to sesuai zona waktu perangkat, misalnya:
 *   from = new Date(2026, 10, 1).toISOString()
 *   to   = new Date(2026, 11, 1).toISOString()
 */
dashboardRouter.get("/", requireMember(), async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Parameter tidak valid", details: parsed.error.issues });
  }
  const me = req.membership!;

  const now = new Date();
  const from =
    parsed.data.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to =
    parsed.data.to ?? new Date(from.getFullYear(), from.getMonth() + 1, 1);
  if (from >= to) {
    return res.status(400).json({ error: "Rentang tanggal tidak valid" });
  }

  const inRange = {
    spaceId: me.spaceId,
    deletedAt: null,
    date: { gte: from, lt: to },
    ...visibleTo(me.userId),
  };

  const [totals, byCategoryRaw, wallets, recent, largest] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...inRange, type: { in: ["INCOME", "EXPENSE"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...inRange, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    listWalletsWithBalance(me.spaceId),
    prisma.transaction.findMany({
      where: { spaceId: me.spaceId, deletedAt: null, ...visibleTo(me.userId) },
      include: txInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    // Pengeluaran tunggal terbesar di periode ini
    prisma.transaction.findFirst({
      where: { ...inRange, type: "EXPENSE" },
      orderBy: { amount: "desc" },
      select: { amount: true, title: true },
    }),
  ]);

  const sumOf = (type: "INCOME" | "EXPENSE") =>
    Number(totals.find((t) => t.type === type)?._sum.amount ?? 0);
  const income = sumOf("INCOME");
  const expense = sumOf("EXPENSE");
  const count = totals.reduce((n, t) => n + t._count._all, 0);

  const categoryIds = byCategoryRaw
    .map((r) => r.categoryId)
    .filter((x): x is string => !!x);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true },
  });
  const catById = new Map(categories.map((c) => [c.id, c]));

  const byCategory = byCategoryRaw
    .map((r) => {
      const amount = Number(r._sum.amount ?? 0);
      const cat = r.categoryId ? catById.get(r.categoryId) : undefined;
      return {
        categoryId: r.categoryId,
        name: cat?.name ?? "Tanpa kategori",
        icon: cat?.icon ?? null,
        amount,
        percent: expense > 0 ? Math.round((amount / expense) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  res.json({
    range: { from, to },
    currency: me.space.currency,
    totalBalance: wallets
      .filter((w) => w.includeInTotal)
      .reduce((sum, w) => sum + w.balance, 0),
    income,
    expense,
    net: income - expense,
    count,
    largestExpense: largest
      ? { amount: Number(largest.amount), title: largest.title }
      : null,
    byCategory,
    wallets,
    recent: recent.map(serializeTx),
  });
});

/* ---------- Deret waktu untuk chart ---------- */

const seriesSchema = z.object({
  from: z.coerce.date(), // inklusif
  to: z.coerce.date(), // eksklusif
  bucket: z.enum(["day", "month"]).default("day"),
  // Menit, sama dengan `new Date().getTimezoneOffset()` di JS (WIB = -420)
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Pemasukan dan pengeluaran per hari atau per bulan, dengan hari/bulan kosong diisi 0
 * supaya grafik tidak bolong. Batas hari mengikuti zona waktu perangkat (tzOffset).
 */
dashboardRouter.get("/series", requireMember(), async (req, res) => {
  const parsed = seriesSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Parameter tidak valid", details: parsed.error.issues });
  }
  const { from, to, bucket, tzOffset } = parsed.data;
  if (from >= to)
    return res.status(400).json({ error: "Rentang tanggal tidak valid" });

  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  if (
    (bucket === "day" && spanDays > 100) ||
    (bucket === "month" && spanDays > 800)
  ) {
    return res.status(400).json({ error: "Rentang tanggal terlalu panjang" });
  }
  const me = req.membership!;

  const rows = await prisma.transaction.findMany({
    where: {
      spaceId: me.spaceId,
      deletedAt: null,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: from, lt: to },
      ...visibleTo(me.userId),
    },
    select: { date: true, type: true, amount: true },
  });

  // Geser ke "waktu lokal" lalu baca komponen UTC-nya
  const shiftMs = -tzOffset * 60_000;
  const fmt = (shifted: Date) => {
    const y = shifted.getUTCFullYear();
    const m = pad2(shifted.getUTCMonth() + 1);
    return bucket === "month"
      ? `${y}-${m}`
      : `${y}-${m}-${pad2(shifted.getUTCDate())}`;
  };
  const keyOf = (d: Date) => fmt(new Date(d.getTime() + shiftMs));

  const points = new Map<
    string,
    { key: string; income: number; expense: number }
  >();
  const start = new Date(from.getTime() + shiftMs);
  let cursor =
    bucket === "month"
      ? Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)
      : Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate(),
        );
  const end = to.getTime() + shiftMs;
  while (cursor < end) {
    const d = new Date(cursor);
    const key = fmt(d);
    points.set(key, { key, income: 0, expense: 0 });
    cursor =
      bucket === "month"
        ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
        : cursor + 86_400_000;
  }

  for (const r of rows) {
    const p = points.get(keyOf(r.date));
    if (!p) continue;
    if (r.type === "INCOME") p.income += Number(r.amount);
    else p.expense += Number(r.amount);
  }

  res.json({ bucket, points: [...points.values()] });
});
