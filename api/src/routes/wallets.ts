import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hasRole, requireMember, Role } from "../lib/access";
import { listWalletsWithBalance } from "../lib/balances";

const MAX_WALLETS = 30;

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z
    .enum(["CASH", "BANK", "EWALLET", "CREDIT_CARD", "PAYLATER", "SAVINGS", "INVESTMENT", "OTHER"])
    .default("CASH"),
  // boleh negatif, misalnya kartu kredit yang sudah berisi tagihan
  initialBalance: z.number().finite().min(-1e13).max(1e13).default(0),
  institution: z.string().trim().max(40).optional(),
  includeInTotal: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    initialBalance: z.number().finite().min(-1e13).max(1e13).optional(),
    institution: z.string().trim().max(40).nullable().optional(),
    includeInTotal: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada data yang diubah" });

export const walletsRouter = Router({ mergeParams: true });

walletsRouter.get("/", requireMember(), async (req, res) => {
  res.json(await listWalletsWithBalance(req.membership!.spaceId));
});

walletsRouter.post("/", requireMember("MEMBER"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const me = req.membership!;

  const count = await prisma.wallet.count({ where: { spaceId: me.spaceId, isArchived: false } });
  if (count >= MAX_WALLETS) {
    return res.status(409).json({ error: `Maksimal ${MAX_WALLETS} dompet per space` });
  }

  const v = parsed.data;
  const wallet = await prisma.wallet.create({
    data: {
      spaceId: me.spaceId,
      ownerId: me.userId,
      name: v.name,
      type: v.type,
      currency: me.space.currency,
      initialBalance: v.initialBalance,
      institution: v.institution || null,
      includeInTotal: v.includeInTotal ?? true,
      sortOrder: count,
    },
  });

  res.status(201).json({
    id: wallet.id,
    name: wallet.name,
    type: wallet.type,
    institution: wallet.institution,
    ownerId: wallet.ownerId,
    includeInTotal: wallet.includeInTotal,
    initialBalance: Number(wallet.initialBalance),
    balance: Number(wallet.initialBalance),
  });
});

async function loadEditableWallet(req: any, res: any) {
  const me = req.membership!;
  const wallet = await prisma.wallet.findFirst({
    where: { id: String(req.params.walletId), spaceId: me.spaceId, isArchived: false },
  });
  if (!wallet) {
    res.status(404).json({ error: "Dompet tidak ditemukan" });
    return null;
  }
  if (wallet.ownerId !== me.userId && !hasRole(me.role as Role, "ADMIN")) {
    res.status(403).json({ error: "Hanya pemilik dompet atau admin yang bisa mengubahnya" });
    return null;
  }
  return wallet;
}

walletsRouter.patch("/:walletId", requireMember("MEMBER"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const wallet = await loadEditableWallet(req, res);
  if (!wallet) return;

  const v = parsed.data;
  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      name: v.name,
      initialBalance: v.initialBalance,
      institution: v.institution === undefined ? undefined : v.institution || null,
      includeInTotal: v.includeInTotal,
    },
  });
  res.json({ id: updated.id, name: updated.name });
});

// Dompet diarsipkan, bukan dihapus, supaya riwayat transaksi tetap utuh
walletsRouter.delete("/:walletId", requireMember("MEMBER"), async (req, res) => {
  const wallet = await loadEditableWallet(req, res);
  if (!wallet) return;
  await prisma.wallet.update({ where: { id: wallet.id }, data: { isArchived: true } });
  res.status(204).end();
});

/* ---------- Kategori ---------- */

export const categoriesRouter = Router({ mergeParams: true });

categoriesRouter.get("/", requireMember(), async (req, res) => {
  const type = req.query.type === "INCOME" || req.query.type === "EXPENSE" ? req.query.type : undefined;

  const rows = await prisma.category.findMany({
    where: { spaceId: req.membership!.spaceId, isArchived: false, type },
    orderBy: { sortOrder: "asc" },
  });

  res.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isEssential: c.isEssential,
    }))
  );
});
