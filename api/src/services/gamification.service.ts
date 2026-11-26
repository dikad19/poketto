import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

/* =====================================================================
   KONFIGURASI (sengaja dibuat lambat)
   Maks/bulan = 30 hari x 5 + 100 = 250 EXP. Level 9 butuh 5500 EXP
   => minimal ~22 bulan kalau SEMPURNA terus. Realistisnya jauh lebih lama.
   ===================================================================== */
export const DAILY_EXP = 5; // hemat dari kemarin
export const MONTHLY_EXP = 100; // hemat dari bulan lalu
export const LOG_1_EXP = 2; // catat >= 1 transaksi
export const LOG_3_EXP = 3; // catat >= 3 transaksi
export const WEEKLY_LOG_EXP = 15; // catat transaksi >= 5 dari 7 hari
const WEEKLY_LOG_DAYS = 5;
const MIN_TX_AMOUNT = 1000; // anti-curang: transaksi di bawah ini tidak dihitung (0 = nonaktif)
const MIN_LOGGED_DAYS_PER_MONTH = 15;
const MAX_CATCHUP_DAYS = 62;
const MAX_CATCHUP_WEEKS = 9;
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
// Senin (awal minggu) dari sebuah tanggal "YYYY-MM-DD". Dipakai juga sebagai periodKey mingguan.
const weekStart = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Senin = 0
  return addDays(key, -dow);
};
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

/* Jumlah transaksi yang DICATAT per hari (berdasarkan createdAt, bukan tanggal transaksi,
   supaya tidak bisa diisi dengan transaksi bertanggal mundur). */
async function loggedPerDay(
  userId: string,
  tz: string,
  fromKey: string,
  toKey: string,
) {
  const local = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}::text)`;
  const rows = await prisma.$queryRaw<Array<{ day: string; n: number }>>`
    SELECT to_char(${local}, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
    FROM "transactions"
    WHERE "createdById" = ${userId}
      AND "deletedAt" IS NULL
      AND "type" <> 'TRANSFER'
      AND "amount" * COALESCE("exchangeRate", 1) >= ${MIN_TX_AMOUNT}::numeric
      AND "createdAt" >= (${fromKey}::date - 2) AND "createdAt" < (${toKey}::date + 3)
      AND ${local} >= ${fromKey}::date
      AND ${local} <  (${toKey}::date + 1)
    GROUP BY 1`;
  return new Map<string, number>(rows.map((r) => [r.day, r.n]));
}

/* =====================================================================
   PROSES EXP UNTUK 1 USER (idempotent, aman dipanggil berulang)
   ===================================================================== */
type NewEvent = {
  source:
    | "DAILY_QUEST"
    | "MONTHLY_QUEST"
    | "DAILY_LOG_1"
    | "DAILY_LOG_3"
    | "WEEKLY_LOG";
  periodKey: string;
  exp: number;
  cur: number;
  prev: number;
  count: number;
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

  /* ---- jendela HARIAN: hari D dihitung setelah D lewat ---- */
  let dFrom = progress.lastDailyKey
    ? addDays(progress.lastDailyKey, 1)
    : addDays(createdDay, 1);
  const dFloor = addDays(today, -MAX_CATCHUP_DAYS);
  if (dFrom < dFloor) dFrom = dFloor;
  const dailyRan = dFrom <= yesterday;

  /* ---- jendela MINGGUAN: minggu (Senin-Minggu) dihitung setelah berakhir ---- */
  const thisWeek = weekStart(today);
  const lastWeekDone = addDays(thisWeek, -7);
  let wFrom = progress.lastWeeklyKey
    ? addDays(progress.lastWeeklyKey, 7)
    : addDays(weekStart(createdDay), 7);
  const wFloor = addDays(thisWeek, -7 * MAX_CATCHUP_WEEKS);
  if (wFrom < wFloor) wFrom = wFloor;
  const weeklyRan = wFrom <= lastWeekDone;

  /* ---- jendela BULANAN ---- */
  const thisMonth = monthOf(today);
  const lastFinished = addMonths(thisMonth, -1);
  let mFrom = progress.lastMonthlyKey
    ? addMonths(progress.lastMonthlyKey, 1)
    : addMonths(monthOf(createdDay), 1);
  const mFloor = addMonths(thisMonth, -MAX_CATCHUP_MONTHS);
  if (mFrom < mFloor) mFrom = mFloor;
  const monthlyRan = mFrom <= lastFinished;

  // satu query untuk semua quest pencatatan (harian + mingguan)
  const logFrom = [dailyRan ? dFrom : null, weeklyRan ? wFrom : null]
    .filter((k): k is string => !!k)
    .sort()[0];
  const logs = logFrom
    ? await loggedPerDay(userId, tz, logFrom, yesterday)
    : new Map<string, number>();

  /* ---- HARIAN ---- */
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
          count: 0,
        });
      }
      const n = logs.get(d) ?? 0;
      if (n >= 1)
        events.push({
          source: "DAILY_LOG_1",
          periodKey: d,
          exp: LOG_1_EXP,
          cur: 0,
          prev: 0,
          count: n,
        });
      if (n >= 3)
        events.push({
          source: "DAILY_LOG_3",
          periodKey: d,
          exp: LOG_3_EXP,
          cur: 0,
          prev: 0,
          count: n,
        });
    }
  }

  /* ---- MINGGUAN ---- */
  if (weeklyRan) {
    for (let w = wFrom; w <= lastWeekDone; w = addDays(w, 7)) {
      let n = 0;
      for (let i = 0; i < 7; i++) if ((logs.get(addDays(w, i)) ?? 0) > 0) n++;
      if (n >= WEEKLY_LOG_DAYS)
        events.push({
          source: "WEEKLY_LOG",
          periodKey: w,
          exp: WEEKLY_LOG_EXP,
          cur: 0,
          prev: 0,
          count: n,
        });
    }
  }

  /* ---- BULANAN ---- */
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
          count: 0,
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
            count: e.count,
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
          ...(weeklyRan && { lastWeeklyKey: lastWeekDone }),
          ...(monthlyRan && { lastMonthlyKey: lastFinished }),
        },
      });

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

/* =====================================================================
   STATUS QUEST YANG SEDANG BERJALAN (untuk UI)
   Hari ini & bulan ini masih berjalan, jadi hasilnya SEMENTARA.
   EXP baru diberikan oleh processUserProgress setelah periodenya lewat.
   ===================================================================== */
export type QuestState =
  | "NO_BASELINE" // pembanding (kemarin / bulan lalu) belum cukup tercatat
  | "NEEDS_LOG" // belum ada catatan / catatan bulan ini tidak akan cukup
  | "ON_TRACK" // pengeluaran masih di bawah pembanding
  | "OVER" // sudah menyamai / melebihi pembanding
  | "IN_PROGRESS" // quest pencatatan: masih berjalan
  | "DONE" // quest pencatatan: target sudah tercapai (EXP menyusul saat periode lewat)
  | "MISSED"; // quest pencatatan: sudah tidak mungkin tercapai

export type QuestId =
  | "DAILY_SAVE"
  | "DAILY_LOG_1"
  | "DAILY_LOG_3"
  | "WEEKLY_LOG"
  | "MONTHLY_SAVE";

export type QuestDto = {
  id: QuestId;
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  kind: "SAVE" | "LOG";
  title: string;
  subtitle: string;
  exp: number;
  state: QuestState;
  periodKey: string;
  resolvesOn: string;
  spent: number; // kind SAVE
  target: number | null; // kind SAVE
  progress: number; // kind LOG
  goal: number; // kind LOG
  loggedDays?: number; // khusus bulanan
  requiredDays?: number;
  daysLeft?: number; // bulanan: sisa hari bulan ini; mingguan: sisa hari minggu ini
};

export async function getQuestStatus(
  userId: string,
  now = new Date(),
): Promise<QuestDto[]> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { timezone: true } } },
  });
  const tz = u?.profile?.timezone ?? "Asia/Jakarta";
  const today = dayKey(now, tz);
  const yesterday = addDays(today, -1);
  const month = monthOf(today);
  const prevMonth = addMonths(month, -1);
  const wStart = weekStart(today);

  const [days, months, logs] = await Promise.all([
    totals(userId, tz, yesterday, today, "day"),
    totals(userId, tz, monthStart(prevMonth), monthEnd(month), "month"),
    loggedPerDay(userId, tz, wStart, today),
  ]);

  /* ---- hemat harian ---- */
  const dCur = days.get(today);
  const dPrev = days.get(yesterday);
  const dSpent = dCur?.expense ?? 0;
  const dState: QuestState = !dPrev
    ? "NO_BASELINE"
    : !dCur
      ? "NEEDS_LOG"
      : dSpent < dPrev.expense
        ? "ON_TRACK"
        : "OVER";

  /* ---- hemat bulanan ---- */
  const mCur = months.get(month);
  const mPrev = months.get(prevMonth);
  const [y, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const daysLeft = daysInMonth - Number(today.slice(8, 10)) + 1; // termasuk hari ini
  const logged = mCur?.days ?? 0;
  const mSpent = mCur?.expense ?? 0;

  let mState: QuestState;
  if (!mPrev || mPrev.days < MIN_LOGGED_DAYS_PER_MONTH) mState = "NO_BASELINE";
  else if (logged + daysLeft < MIN_LOGGED_DAYS_PER_MONTH) mState = "NEEDS_LOG";
  else if (mSpent >= mPrev.expense) mState = "OVER";
  else mState = "ON_TRACK";

  /* ---- pencatatan harian ---- */
  const todayLogs = logs.get(today) ?? 0;
  const logState = (goal: number): QuestState =>
    todayLogs >= goal ? "DONE" : "IN_PROGRESS";

  /* ---- pencatatan mingguan ---- */
  const weekDays = [...logs.values()].filter((n) => n > 0).length;
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekDaysLeft = 7 - dow; // termasuk hari ini
  const wState: QuestState =
    weekDays >= WEEKLY_LOG_DAYS
      ? "DONE"
      : weekDays + weekDaysLeft >= WEEKLY_LOG_DAYS
        ? "IN_PROGRESS"
        : "MISSED";

  const base = { spent: 0, target: null, progress: 0, goal: 0 };

  return [
    {
      ...base,
      id: "DAILY_SAVE",
      type: "DAILY",
      kind: "SAVE",
      title: "Hemat Harian",
      subtitle: "Hemat dari kemarin",
      exp: DAILY_EXP,
      state: dState,
      spent: dSpent,
      target: dPrev?.expense ?? null,
      periodKey: today,
      resolvesOn: addDays(today, 1),
    },
    {
      ...base,
      id: "DAILY_LOG_1",
      type: "DAILY",
      kind: "LOG",
      title: "Catat Transaksi",
      subtitle: "Catat minimal 1 transaksi hari ini",
      exp: LOG_1_EXP,
      state: logState(1),
      progress: Math.min(todayLogs, 1),
      goal: 1,
      periodKey: today,
      resolvesOn: addDays(today, 1),
    },
    {
      ...base,
      id: "DAILY_LOG_3",
      type: "DAILY",
      kind: "LOG",
      title: "Rajin Mencatat",
      subtitle: "Catat minimal 3 transaksi hari ini",
      exp: LOG_3_EXP,
      state: logState(3),
      progress: Math.min(todayLogs, 3),
      goal: 3,
      periodKey: today,
      resolvesOn: addDays(today, 1),
    },
    {
      ...base,
      id: "WEEKLY_LOG",
      type: "WEEKLY",
      kind: "LOG",
      title: "Konsisten Seminggu",
      subtitle: `Catat transaksi ${WEEKLY_LOG_DAYS} dari 7 hari`,
      exp: WEEKLY_LOG_EXP,
      state: wState,
      progress: Math.min(weekDays, WEEKLY_LOG_DAYS),
      goal: WEEKLY_LOG_DAYS,
      daysLeft: weekDaysLeft,
      periodKey: wStart,
      resolvesOn: addDays(wStart, 7),
    },
    {
      ...base,
      id: "MONTHLY_SAVE",
      type: "MONTHLY",
      kind: "SAVE",
      title: "Hemat Bulanan",
      subtitle: "Hemat dari bulan lalu",
      exp: MONTHLY_EXP,
      state: mState,
      spent: mSpent,
      target: mPrev?.expense ?? null,
      periodKey: month,
      resolvesOn: `${addMonths(month, 1)}-01`,
      loggedDays: logged,
      requiredDays: MIN_LOGGED_DAYS_PER_MONTH,
      daysLeft,
    },
  ];
}

/* =====================================================================
   RIWAYAT EXP
   ===================================================================== */
export async function getExpHistory(userId: string, limit = 30) {
  const rows = await prisma.expEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    periodKey: r.periodKey,
    exp: r.exp,
    currentSpend: Number(r.currentSpend),
    previousSpend: Number(r.previousSpend),
    count: r.count,
    createdAt: r.createdAt,
  }));
}
