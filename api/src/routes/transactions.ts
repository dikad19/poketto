import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hasRole, requireMember, Role } from "../lib/access";

export const transactionsRouter = Router({ mergeParams: true });

const TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
type TxType = (typeof TYPES)[number];
const MOODS = ["HAPPY", "NEUTRAL", "STRESSED", "BORED", "SAD", "CELEBRATING"] as const;

const money = z.number().finite().positive().max(1e13);
const fee = z.number().finite().min(0).max(1e13);

const DEFAULT_TITLE: Record<TxType, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
};

/* ---------- Dipakai juga oleh dashboard ---------- */

export const txInclude = {
  wallet: { select: { id: true, name: true } },
  toWallet: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, type: true } },
  createdBy: {
    select: { id: true, username: true, profile: { select: { displayName: true } } },
  },
} as const;

/** Transaksi PRIVATE hanya terlihat oleh pembuatnya. */
export const visibleTo = (userId: string) => ({
  OR: [{ visibility: "SHARED" as const }, { createdById: userId }],
});

type TxRow = {
  id: string;
  type: string;
  amount: unknown;
  fee: unknown;
  title: string;
  note: string | null;
  merchant: string | null;
  date: Date;
  visibility: string;
  isImpulse: boolean;
  mood: string | null;
  createdAt: Date;
  wallet: { id: string; name: string };
  toWallet: { id: string; name: string } | null;
  category: { id: string; name: string; icon: string | null; type: string } | null;
  createdBy: { id: string; username: string; profile: { displayName: string | null } | null };
};

export function serializeTx(t: TxRow) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    fee: Number(t.fee),
    title: t.title,
    note: t.note,
    merchant: t.merchant,
    date: t.date,
    visibility: t.visibility,
    isImpulse: t.isImpulse,
    mood: t.mood,
    createdAt: t.createdAt,
    wallet: t.wallet,
    toWallet: t.toWallet,
    category: t.category,
    createdBy: {
      id: t.createdBy.id,
      username: t.createdBy.username,
      name: t.createdBy.profile?.displayName ?? null,
    },
  };
}

/* ---------- Validasi ---------- */

const createSchema = z
  .object({
    type: z.enum(TYPES),
    amount: money,
    walletId: z.string().min(1),
    toWalletId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    fee: fee.optional(),
    title: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().max(500).optional(),
    merchant: z.string().trim().max(100).optional(),
    date: z.coerce.date().optional(),
    visibility: z.enum(["SHARED", "PRIVATE"]).optional(),
    isImpulse: z.boolean().optional(),
    mood: z.enum(MOODS).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "TRANSFER") {
      if (!v.toWalletId) {
        ctx.addIssue({ code: "custom", path: ["toWalletId"], message: "Pilih dompet tujuan" });
      } else if (v.toWalletId === v.walletId) {
        ctx.addIssue({
          code: "custom",
          path: ["toWalletId"],
          message: "Dompet tujuan harus berbeda dari dompet asal",
        });
      }
    } else if (v.toWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["toWalletId"],
        message: "Dompet tujuan hanya untuk transfer",
      });
    }
  });

const updateSchema = z
  .object({
    amount: money.optional(),
    walletId: z.string().min(1).optional(),
    toWalletId: z.string().min(1).optional(),
    categoryId: z.string().min(1).nullable().optional(),
    fee: fee.optional(),
    title: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().max(500).nullable().optional(),
    merchant: z.string().trim().max(100).nullable().optional(),
    date: z.coerce.date().optional(),
    visibility: z.enum(["SHARED", "PRIVATE"]).optional(),
    isImpulse: z.boolean().optional(),
    mood: z.enum(MOODS).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada data yang diubah" });

const listSchema = z.object({
  from: z.coerce.date().optional(), // inklusif
  to: z.coerce.date().optional(), // eksklusif
  type: z.enum(TYPES).optional(),
  walletId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().min(1).optional(),
});

/** Pastikan dompet dan kategori milik space ini dan cocok dengan jenis transaksi. */
async function checkRefs(
  spaceId: string,
  type: TxType,
  refs: { walletId?: string; toWalletId?: string; categoryId?: string | null }
): Promise<{ error?: string; categoryName?: string }> {
  const ids = [refs.walletId, refs.toWalletId].filter((x): x is string => !!x);
  if (ids.length > 0) {
    const found = await prisma.wallet.findMany({
      where: { spaceId, isArchived: false, id: { in: ids } },
      select: { id: true },
    });
    const ok = new Set(found.map((w) => w.id));
    if (refs.walletId && !ok.has(refs.walletId)) return { error: "Dompet tidak ditemukan" };
    if (refs.toWalletId && !ok.has(refs.toWalletId)) {
      return { error: "Dompet tujuan tidak ditemukan" };
    }
  }

  if (refs.categoryId) {
    if (type === "TRANSFER") return { error: "Transfer tidak memakai kategori" };
    const category = await prisma.category.findFirst({
      where: { id: refs.categoryId, spaceId, isArchived: false, type },
      select: { name: true },
    });
    if (!category) return { error: "Kategori tidak cocok dengan jenis transaksi ini" };
    return { categoryName: category.name };
  }
  return {};
}

/* ---------- Routes ---------- */

transactionsRouter.get("/", requireMember(), async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Parameter tidak valid", details: parsed.error.issues });
  }
  const q = parsed.data;
  const me = req.membership!;

  const rows = await prisma.transaction.findMany({
    where: {
      spaceId: me.spaceId,
      deletedAt: null,
      ...visibleTo(me.userId),
      ...(q.type ? { type: q.type } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.from || q.to ? { date: { gte: q.from, lt: q.to } } : {}),
      ...(q.walletId
        ? { AND: [{ OR: [{ walletId: q.walletId }, { toWalletId: q.walletId }] }] }
        : {}),
    },
    include: txInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > q.limit;
  const items = hasMore ? rows.slice(0, q.limit) : rows;
  res.json({
    items: items.map(serializeTx),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
});

transactionsRouter.post("/", requireMember("MEMBER"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const me = req.membership!;
  const v = parsed.data;

  const refs = await checkRefs(me.spaceId, v.type, v);
  if (refs.error) return res.status(400).json({ error: refs.error });

  const created = await prisma.transaction.create({
    data: {
      spaceId: me.spaceId,
      createdById: me.userId,
      type: v.type,
      walletId: v.walletId,
      toWalletId: v.type === "TRANSFER" ? v.toWalletId : null,
      categoryId: v.categoryId ?? null,
      amount: v.amount,
      fee: v.type === "TRANSFER" ? (v.fee ?? 0) : 0,
      currency: me.space.currency,
      title: v.title ?? refs.categoryName ?? DEFAULT_TITLE[v.type],
      note: v.note || null,
      merchant: v.merchant || null,
      date: v.date ?? new Date(),
      visibility: v.visibility ?? "SHARED",
      isImpulse: v.isImpulse ?? false,
      mood: v.mood ?? null,
    },
    include: txInclude,
  });

  res.status(201).json(serializeTx(created));
});

async function findVisible(spaceId: string, userId: string, id: string) {
  return prisma.transaction.findFirst({
    where: { id, spaceId, deletedAt: null, ...visibleTo(userId) },
    include: txInclude,
  });
}

transactionsRouter.get("/:transactionId", requireMember(), async (req, res) => {
  const me = req.membership!;
  const tx = await findVisible(me.spaceId, me.userId, String(req.params.transactionId));
  if (!tx) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
  res.json(serializeTx(tx));
});

transactionsRouter.patch("/:transactionId", requireMember("MEMBER"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const me = req.membership!;
  const existing = await findVisible(me.spaceId, me.userId, String(req.params.transactionId));
  if (!existing) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
  if (existing.createdBy.id !== me.userId && !hasRole(me.role as Role, "ADMIN")) {
    return res.status(403).json({ error: "Anda hanya bisa mengubah transaksi buatan sendiri" });
  }

  const v = parsed.data;
  const type = existing.type as TxType;

  if (type !== "TRANSFER" && v.toWalletId) {
    return res.status(400).json({ error: "Dompet tujuan hanya untuk transfer" });
  }
  const effectiveFrom = v.walletId ?? existing.wallet.id;
  const effectiveTo = v.toWalletId ?? existing.toWallet?.id;
  if (type === "TRANSFER" && effectiveTo === effectiveFrom) {
    return res.status(400).json({ error: "Dompet tujuan harus berbeda dari dompet asal" });
  }

  const refs = await checkRefs(me.spaceId, type, v);
  if (refs.error) return res.status(400).json({ error: refs.error });

  const updated = await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      amount: v.amount,
      walletId: v.walletId,
      toWalletId: v.toWalletId,
      categoryId: v.categoryId,
      fee: type === "TRANSFER" ? v.fee : undefined,
      title: v.title,
      note: v.note === undefined ? undefined : v.note || null,
      merchant: v.merchant === undefined ? undefined : v.merchant || null,
      date: v.date,
      visibility: v.visibility,
      isImpulse: v.isImpulse,
      mood: v.mood,
    },
    include: txInclude,
  });

  res.json(serializeTx(updated));
});

// Dihapus secara "soft" supaya bisa dilacak dan tidak merusak data lain
transactionsRouter.delete("/:transactionId", requireMember("MEMBER"), async (req, res) => {
  const me = req.membership!;
  const existing = await findVisible(me.spaceId, me.userId, String(req.params.transactionId));
  if (!existing) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
  if (existing.createdBy.id !== me.userId && !hasRole(me.role as Role, "ADMIN")) {
    return res.status(403).json({ error: "Anda hanya bisa menghapus transaksi buatan sendiri" });
  }

  await prisma.transaction.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  res.status(204).end();
});
