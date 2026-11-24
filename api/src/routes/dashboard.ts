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
    return res.status(400).json({ error: "Parameter tidak valid", details: parsed.error.issues });
  }
  const me = req.membership!;

  const now = new Date();
  const from = parsed.data.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = parsed.data.to ?? new Date(from.getFullYear(), from.getMonth() + 1, 1);
  if (from >= to) {
    return res.status(400).json({ error: "Rentang tanggal tidak valid" });
  }

  const inRange = {
    spaceId: me.spaceId,
    deletedAt: null,
    date: { gte: from, lt: to },
    ...visibleTo(me.userId),
  };

  const [totals, byCategoryRaw, wallets, recent] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...inRange, type: { in: ["INCOME", "EXPENSE"] } },
      _sum: { amount: true },
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
  ]);

  const sumOf = (type: "INCOME" | "EXPENSE") =>
    Number(totals.find((t) => t.type === type)?._sum.amount ?? 0);
  const income = sumOf("INCOME");
  const expense = sumOf("EXPENSE");

  const categoryIds = byCategoryRaw.map((r) => r.categoryId).filter((x): x is string => !!x);
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
    totalBalance: wallets.filter((w) => w.includeInTotal).reduce((sum, w) => sum + w.balance, 0),
    income,
    expense,
    net: income - expense,
    byCategory,
    wallets,
    recent: recent.map(serializeTx),
  });
});
