import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireMember } from "../lib/access";

export const billsRouter = Router({ mergeParams: true });

// Kolom yang dikirim ke FE (sesuai tipe `Bill` di FE)
const billSelect = {
  id: true,
  title: true,
  amount: true,
  frequency: true,
  interval: true,
  startDate: true,
  endDate: true,
  walletId: true,
} as const;

type BillRow = {
  id: string;
  title: string;
  amount: { toNumber(): number };
  frequency: string;
  interval: number;
  startDate: Date;
  endDate: Date | null;
  walletId: string;
};

// Decimal dari Prisma harus diubah ke number, karena FE mengharapkan number
const serializeBill = (b: BillRow) => ({ ...b, amount: b.amount.toNumber() });

const billSchema = z.object({
  title: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(999_999_999_999),
  frequency: z.enum(["MONTHLY", "YEARLY"]),
  startDate: z.coerce.date(),
  walletId: z.string().min(1),
});

const canEditRole = (role: string) =>
  ["OWNER", "ADMIN", "MEMBER"].includes(role);

// Pastikan wallet benar-benar milik space ini
const walletInSpace = (spaceId: string, walletId: string) =>
  prisma.wallet.findFirst({
    where: { id: walletId, spaceId },
    select: { id: true },
  });

/* ---------- GET /spaces/:spaceId/bills ---------- */
billsRouter.get("/", requireMember(), async (req, res) => {
  const me = req.membership!;
  const rows = await prisma.recurringTransaction.findMany({
    where: { spaceId: me.spaceId, isBill: true, isActive: true },
    select: billSelect,
    orderBy: { startDate: "asc" },
  });
  res.json(rows.map(serializeBill));
});

/* ---------- POST /spaces/:spaceId/bills ---------- */
billsRouter.post("/", requireMember(), async (req, res) => {
  const me = req.membership!;
  if (!canEditRole(me.role)) {
    return res.status(403).json({ error: "Tidak punya izin mengubah tagihan" });
  }

  const parsed = billSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const input = parsed.data;

  if (!(await walletInSpace(me.spaceId, input.walletId))) {
    return res.status(400).json({ error: "Wallet tidak ditemukan" });
  }

  const created = await prisma.recurringTransaction.create({
    data: {
      spaceId: me.spaceId,
      createdById: me.userId,
      walletId: input.walletId,
      type: "EXPENSE",
      isBill: true,
      title: input.title,
      amount: input.amount,
      frequency: input.frequency,
      startDate: input.startDate,
      nextRunAt: input.startDate,
    },
    select: billSelect,
  });
  res.status(201).json(serializeBill(created));
});

/* ---------- PATCH /spaces/:spaceId/bills/:id ---------- */
billsRouter.patch("/:id", requireMember(), async (req, res) => {
  const me = req.membership!;
  if (!canEditRole(me.role)) {
    return res.status(403).json({ error: "Tidak punya izin mengubah tagihan" });
  }

  const parsed = billSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const input = parsed.data;
  const id = String(req.params.id);

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, spaceId: me.spaceId, isBill: true },
    select: { id: true },
  });
  if (!existing)
    return res.status(404).json({ error: "Tagihan tidak ditemukan" });

  if (input.walletId && !(await walletInSpace(me.spaceId, input.walletId))) {
    return res.status(400).json({ error: "Wallet tidak ditemukan" });
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      ...input,
      ...(input.startDate ? { nextRunAt: input.startDate } : {}),
    },
    select: billSelect,
  });
  res.json(serializeBill(updated));
});

/* ---------- DELETE /spaces/:spaceId/bills/:id ---------- */
billsRouter.delete("/:id", requireMember(), async (req, res) => {
  const me = req.membership!;
  if (!canEditRole(me.role)) {
    return res.status(403).json({ error: "Tidak punya izin mengubah tagihan" });
  }

  const { count } = await prisma.recurringTransaction.deleteMany({
    where: { id: String(req.params.id), spaceId: me.spaceId, isBill: true },
  });
  if (count === 0)
    return res.status(404).json({ error: "Tagihan tidak ditemukan" });
  res.status(204).end();
});
