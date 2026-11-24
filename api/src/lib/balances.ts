import { prisma } from "./prisma";

/**
 * Perubahan saldo tiap dompet dari semua transaksi (belum dihapus).
 * Saldo akhir = initialBalance + delta.
 *
 * - INCOME   : dompet bertambah sebesar amount
 * - EXPENSE  : dompet berkurang sebesar amount
 * - TRANSFER : dompet asal berkurang, dompet tujuan bertambah
 * - fee      : selalu mengurangi dompet asal
 *
 * Transaksi PRIVATE tetap dihitung, karena saldo dompet harus sesuai kenyataan.
 */
export async function walletDeltas(spaceId: string) {
  const [outgoing, incoming] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["walletId", "type"],
      where: { spaceId, deletedAt: null },
      _sum: { amount: true, fee: true },
    }),
    prisma.transaction.groupBy({
      by: ["toWalletId"],
      where: { spaceId, deletedAt: null, type: "TRANSFER", toWalletId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const deltas = new Map<string, number>();
  const add = (id: string, n: number) => deltas.set(id, (deltas.get(id) ?? 0) + n);

  for (const r of outgoing) {
    const amount = Number(r._sum.amount ?? 0);
    const fee = Number(r._sum.fee ?? 0);
    add(r.walletId, (r.type === "INCOME" ? amount : -amount) - fee);
  }
  for (const r of incoming) {
    if (r.toWalletId) add(r.toWalletId, Number(r._sum.amount ?? 0));
  }
  return deltas;
}

export async function listWalletsWithBalance(spaceId: string) {
  const [wallets, deltas] = await Promise.all([
    prisma.wallet.findMany({
      where: { spaceId, isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    walletDeltas(spaceId),
  ]);

  return wallets.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    institution: w.institution,
    ownerId: w.ownerId,
    includeInTotal: w.includeInTotal,
    initialBalance: Number(w.initialBalance),
    balance: Number(w.initialBalance) + (deltas.get(w.id) ?? 0),
  }));
}
