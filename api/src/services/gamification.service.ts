import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

/* =====================================================================
   KONFIGURASI (sengaja dibuat lambat)
   Maks/bulan = 30 hari x 5 + 100 = 250 EXP. Level 9 butuh 5500 EXP
   => minimal ~22 bulan kalau SEMPURNA terus. Realistisnya jauh lebih lama.
   ===================================================================== */
export const DAILY_EXP = 5;
export const MONTHLY_EXP = 100; // jauh lebih besar dari harian
const MIN_LOGGED_DAYS_PER_MONTH = 15; // anti-curang: bulan harus cukup tercatat
const MAX_CATCHUP_DAYS = 62;
const MAX_CATCHUP_MONTHS = 6;

export const LEVELS = [
  { level: 1, minExp: 0, name: "Tunas Hemat", emoji: "🌱" },
  { level: 2, minExp: 100, name: "Pencatat Rajin", emoji: "📝" },
  { level: 3, minExp: 250, name: "Penabung Pemula", emoji: "🐷" },
  { level: 4, minExp: 500, name: "Pengendali Dompet", emoji: "👛" },
  { level: 5, minExp: 900, name: "Penghemat Cerdas", emoji: "💡" },
  { level: 6, minExp: 1500, name: "Master Anggaran", emoji: "🎯" },
  { level: 7, minExp: 2400, name: "Penjaga Kas", emoji: "🛡️" },
  { level: 8, minExp: 3700, name: "Raja Hemat", emoji: "👑" },
  { level: 9, minExp: 5500, name: "Legenda Finansial", emoji: "🏆" },
] as const;
export const MAX_LEVEL = LEVELS.length; // 9

export function levelFromExp(exp: number): number {
  let lv = 1;
  for (const l of LEVELS) if (exp >= l.minExp) lv = l.level;
  return Math.min(lv, MAX_LEVEL);
}

/* =====================================================================
   HELPER TANGGAL (semua berbasis timezone user, bukan timezone server)
   ===================================================================== */
const dayKey = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const addMonths = (mk: string, n: number) => {
  const [y, m] = mk.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const monthOf = (key: string) => key.slice(0, 7);
const monthStart = (mk: string) => `${mk}-01`;
const monthEnd = (mk: string) => addDays(`${addMonths(mk, 1)}-01`, -1);

/* =====================================================================
   TOTAL PENGELUARAN PER HARI / BULAN
   - hanya transaksi buatan user, deletedAt null
   - pengeluaran = EXPENSE (amount x exchangeRate) + fee (EXPENSE & TRANSFER)
   - TRANSFER antar dompet sendiri TIDAK dihitung sebagai pengeluaran
   - hari/bulan hanya "ada" kalau minimal ada 1 transaksi tercatat
   ===================================================================== */
type Bucket = { expense: number; tx: number; days: number };

async function totals(
  userId: string,
  tz: string,
  fromKey: string,
  toKey: string,
  grain: "day" | "month",
) {
  const fmt = Prisma.raw(grain === "day" ? `'YYYY-MM-DD'` : `'YYYY-MM'`);
  const local = Prisma.sql`(("date" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}::text)`;

  const rows = await prisma.$queryRaw<
    Array<{ period: string; expense: string; tx: number; days: number }>
  >`
    SELECT
      to_char(${local}, ${fmt}) AS period,
      COALESCE(SUM(
        CASE WHEN "type" = 'EXPENSE' THEN "amount" * COALESCE("exchangeRate", 1) ELSE 0 END
        + CASE WHEN "type" <> 'INCOME' THEN "fee" ELSE 0 END
      ), 0)::text AS expense,
      COUNT(*)::int AS tx,
      COUNT(DISTINCT to_char(${local}, 'YYYY-MM-DD'))::int AS days
    FROM "transactions"
    WHERE "createdById" = ${userId}
      AND "deletedAt" IS NULL
      AND "date" >= (${fromKey}::date - 2) AND "date" < (${toKey}::date + 3)  -- pakai index
      AND ${local} >= ${fromKey}::date
      AND ${local} <  (${toKey}::date + 1)
    GROUP BY 1`;

  return new Map<string, Bucket>(
    rows.map((r) => [
      r.period,
      { expense: Number(r.expense), tx: r.tx, days: r.days },
    ]),
  );
}

/* =====================================================================
   PROSES EXP UNTUK 1 USER (idempotent, aman dipanggil berulang)
   ===================================================================== */
type NewEvent = {
  source: "DAILY_QUEST" | "MONTHLY_QUEST";
  periodKey: string;
  exp: number;
  cur: number;
  prev: number;
};

export async function processUserProgress(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      status: true,
      profile: { select: { timezone: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;

  const tz = user.profile?.timezone ?? "Asia/Jakarta";
  const today = dayKey(now, tz);
  const yesterday = addDays(today, -1);
  const createdDay = dayKey(user.createdAt, tz);

  const progress = await prisma.userProgress.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  const events: NewEvent[] = [];

  /* ---- HARIAN: hari D dihitung setelah D lewat (>= 00:00 hari berikutnya) ---- */
  let dFrom = progress.lastDailyKey
    ? addDays(progress.lastDailyKey, 1)
    : addDays(createdDay, 1);
  const dFloor = addDays(today, -MAX_CATCHUP_DAYS);
  if (dFrom < dFloor) dFrom = dFloor;
  const dailyRan = dFrom <= yesterday;

  if (dailyRan) {
    const t = await totals(userId, tz, addDays(dFrom, -1), yesterday, "day");
    for (let d = dFrom; d <= yesterday; d = addDays(d, 1)) {
      const cur = t.get(d);
      const prev = t.get(addDays(d, -1));
      // kedua hari harus ada catatan (kalau lupa mencatat -> TIDAK dapat EXP)
      if (cur && prev && cur.expense < prev.expense) {
        events.push({
          source: "DAILY_QUEST",
          periodKey: d,
          exp: DAILY_EXP,
          cur: cur.expense,
          prev: prev.expense,
        });
      }
    }
  }

  /* ---- BULANAN: dihitung tepat setelah pergantian bulan ---- */
  const thisMonth = monthOf(today);
  const lastFinished = addMonths(thisMonth, -1);
  let mFrom = progress.lastMonthlyKey
    ? addMonths(progress.lastMonthlyKey, 1)
    : addMonths(monthOf(createdDay), 1);
  const mFloor = addMonths(thisMonth, -MAX_CATCHUP_MONTHS);
  if (mFrom < mFloor) mFrom = mFloor;
  const monthlyRan = mFrom <= lastFinished;

  if (monthlyRan) {
    const t = await totals(
      userId,
      tz,
      monthStart(addMonths(mFrom, -1)),
      monthEnd(lastFinished),
      "month",
    );
    for (let m = mFrom; m <= lastFinished; m = addMonths(m, 1)) {
      const cur = t.get(m);
      const prev = t.get(addMonths(m, -1));
      if (
        cur &&
        prev &&
        cur.days >= MIN_LOGGED_DAYS_PER_MONTH &&
        prev.days >= MIN_LOGGED_DAYS_PER_MONTH &&
        cur.expense < prev.expense
      ) {
        events.push({
          source: "MONTHLY_QUEST",
          periodKey: m,
          exp: MONTHLY_EXP,
          cur: cur.expense,
          prev: prev.expense,
        });
      }
    }
  }

  /* ---- SIMPAN (atomic + advisory lock supaya tidak balapan) ---- */
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const fresh = await tx.userProgress.findUniqueOrThrow({
        where: { userId },
      });

      const existing = events.length
        ? await tx.expEvent.findMany({
            where: {
              userId,
              periodKey: { in: events.map((e) => e.periodKey) },
            },
            select: { source: true, periodKey: true },
          })
        : [];
      const seen = new Set(existing.map((e) => `${e.source}:${e.periodKey}`));
      const toAdd = events.filter(
        (e) => !seen.has(`${e.source}:${e.periodKey}`),
      );
      const gained = toAdd.reduce((s, e) => s + e.exp, 0);

      if (toAdd.length) {
        await tx.expEvent.createMany({
          data: toAdd.map((e) => ({
            userId,
            source: e.source,
            periodKey: e.periodKey,
            exp: e.exp,
            currentSpend: e.cur,
            previousSpend: e.prev,
          })),
          skipDuplicates: true,
        });
      }

      const totalExp = fresh.totalExp + gained;
      const level = levelFromExp(totalExp);

      await tx.userProgress.update({
        where: { userId },
        data: {
          totalExp,
          level,
          ...(dailyRan && { lastDailyKey: yesterday }),
          ...(monthlyRan && { lastMonthlyKey: lastFinished }),
        },
      });

      // pastikan semua badge s/d level saat ini ada (level 1 otomatis)
      await tx.userBadge.createMany({
        data: Array.from({ length: level }, (_, i) => ({
          userId,
          level: i + 1,
        })),
        skipDuplicates: true,
      });

      if (level > fresh.level) {
        const l = LEVELS[level - 1];
        await tx.notification.create({
          data: {
            userId,
            type: "SYSTEM",
            title: `Naik ke Level ${level}! ${l.emoji}`,
            body: `Kamu mendapat badge "${l.name}". Pertahankan kebiasaan hemat kamu!`,
            data: { level },
          },
        });
      }

      return { gained, totalExp, level, leveledUp: level > fresh.level };
    },
    { timeout: 15_000 },
  );
}

/* =====================================================================
   DATA UNTUK UI (dipanggil saat app dibuka; sekalian catch-up)
   ===================================================================== */
export async function getProgressSummary(userId: string) {
  await processUserProgress(userId);
  const p = await prisma.userProgress.findUniqueOrThrow({ where: { userId } });
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    select: { level: true, earnedAt: true },
  });

  const cur = LEVELS[p.level - 1];
  const next = LEVELS[p.level] ?? null; // null = sudah max
  const progressPct = next
    ? Math.floor(((p.totalExp - cur.minExp) / (next.minExp - cur.minExp)) * 100)
    : 100;

  return {
    totalExp: p.totalExp,
    level: p.level,
    levelName: cur.name,
    nextLevelExp: next?.minExp ?? null,
    progressPct,
    badges: LEVELS.map((l) => ({
      ...l,
      earned: badges.some((b) => b.level === l.level),
    })),
  };
}

/* =====================================================================
   JOB TERJADWAL. Jalankan tiap jam di menit ke-1 (mis. node-cron):
     cron.schedule("1 * * * *", runProgressJob);
   Karena tiap user dihitung pakai timezone-nya sendiri, user WIB dapat EXP
   tepat sekitar 00:01 WIB. Kalau server mati, job berikutnya otomatis catch-up.
   ===================================================================== */
export async function runProgressJob() {
  let cursor: string | undefined;
  for (;;) {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    if (!users.length) break;
    for (const u of users) {
      try {
        await processUserProgress(u.id);
      } catch (e) {
        console.error("[progress-job]", u.id, e);
      }
    }
    cursor = users[users.length - 1].id;
  }
}
