import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AVATAR_KEYS } from "../lib/avatars";
import {
  getExpHistory,
  getProgressSummary,
  getQuestStatus,
} from "../services/gamification.service";

// Mount di app.ts:  app.use("/me", requireAuth, meRouter);
export const meRouter = Router();

const MAX_PIN_FAILS = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;
const AUTO_USERNAME = /^user_[0-9a-f]{10}$/; // username bawaan dari /auth/register
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME_RESERVE_MS = 90 * 24 * 60 * 60 * 1000;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function fail(res: Response, e: unknown, uniqueMsg = "Data sudah dipakai") {
  if (e instanceof HttpError)
    return res.status(e.status).json({ error: e.message });
  if ((e as { code?: string })?.code === "P2002")
    return res.status(409).json({ error: uniqueMsg });
  throw e;
}

const isWeakPin = (p: string) =>
  /^(\d)\1{5}$/.test(p) || "0123456789".includes(p) || "9876543210".includes(p);

const newPin = z
  .string()
  .regex(/^\d{6}$/, "PIN harus 6 digit angka")
  .refine((p) => !isWeakPin(p), "PIN terlalu mudah ditebak");

/* ------------------------------------------------------------------ */
/* PROFIL: avatar + username (onboarding langkah 2)                    */
/* ------------------------------------------------------------------ */
const profileSchema = z
  .object({
    avatarKey: z.enum(AVATAR_KEYS).optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9_]{3,20}$/,
        "Username 3-20 karakter: huruf kecil, angka, atau _",
      )
      .optional(),
  })
  .refine((d) => d.avatarKey || d.username, "Tidak ada perubahan");

meRouter.patch("/profile", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" });

  const userId = req.userId!;
  const { avatarKey, username } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (avatarKey) {
        await tx.userProfile.upsert({
          where: { userId },
          update: { avatarKey },
          create: { userId, avatarKey },
        });
      }

      if (username) {
        const me = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { username: true, usernameChangedAt: true },
        });
        if (me.username === username) return;

        // username bawaan boleh diganti bebas; setelah itu ada cooldown 30 hari
        const isAuto = AUTO_USERNAME.test(me.username);
        if (
          !isAuto &&
          me.usernameChangedAt &&
          Date.now() - me.usernameChangedAt.getTime() < USERNAME_COOLDOWN_MS
        )
          throw new HttpError(
            429,
            "Username hanya bisa diganti sekali dalam 30 hari",
          );

        if (await tx.reservedUsername.findUnique({ where: { username } }))
          throw new HttpError(409, "Username tidak tersedia");

        const held = await tx.usernameHistory.findFirst({
          where: {
            oldUsername: username,
            reservedUntil: { gt: new Date() },
            userId: { not: userId },
          },
        });
        if (held)
          throw new HttpError(
            409,
            "Username sedang dicadangkan, coba yang lain",
          );

        await tx.user.update({
          where: { id: userId },
          data: {
            username,
            usernameChangedAt: new Date(),
            ...(!isAuto && { usernameChangeCount: { increment: 1 } }),
          },
        });
        if (!isAuto) {
          await tx.usernameHistory.create({
            data: {
              userId,
              oldUsername: me.username,
              newUsername: username,
              reservedUntil: new Date(Date.now() + USERNAME_RESERVE_MS),
            },
          });
        }
      }
    });
  } catch (e) {
    return fail(res, e, "Username sudah dipakai, coba yang lain");
  }
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* PIN pertama (onboarding langkah 3). Sekaligus menandai onboarding selesai */
/* ------------------------------------------------------------------ */
meRouter.post("/pin", async (req, res) => {
  const parsed = z.object({ pin: newPin }).safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" });

  const userId = req.userId!;
  if (await prisma.userSecurity.findUnique({ where: { userId } }))
    return res.status(409).json({
      error: "PIN sudah dibuat. Gunakan reset PIN untuk menggantinya.",
    });

  const pinHash = await bcrypt.hash(parsed.data.pin, 12);
  try {
    await prisma.$transaction([
      prisma.userSecurity.create({ data: { userId, pinHash } }),
      prisma.userProfile.upsert({
        where: { userId },
        update: { onboardingDone: true },
        create: { userId, onboardingDone: true },
      }),
    ]);
  } catch (e) {
    return fail(res, e, "PIN sudah dibuat");
  }
  res.status(201).json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Verifikasi PIN lama (login di HP baru). Salah 5x -> kunci 5 menit     */
/* ------------------------------------------------------------------ */
meRouter.post("/pin/verify", async (req, res) => {
  const parsed = z
    .object({ pin: z.string().regex(/^\d{6}$/) })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "PIN harus 6 digit angka" });

  const userId = req.userId!;
  const sec = await prisma.userSecurity.findUnique({ where: { userId } });
  if (!sec) return res.status(404).json({ error: "PIN belum dibuat" });

  if (sec.pinLockedUntil && sec.pinLockedUntil > new Date()) {
    const mins = Math.ceil(
      (sec.pinLockedUntil.getTime() - Date.now()) / 60_000,
    );
    return res.status(429).json({
      error: `Terlalu banyak percobaan. Coba lagi dalam ${mins} menit`,
    });
  }

  if (await bcrypt.compare(parsed.data.pin, sec.pinHash)) {
    await prisma.userSecurity.update({
      where: { userId },
      data: { pinFailedCount: 0, pinLockedUntil: null },
    });
    return res.json({ ok: true });
  }

  const fails = sec.pinFailedCount + 1;
  if (fails >= MAX_PIN_FAILS) {
    await prisma.userSecurity.update({
      where: { userId },
      data: {
        pinFailedCount: 0,
        pinLockedUntil: new Date(Date.now() + PIN_LOCK_MS),
      },
    });
    return res
      .status(429)
      .json({ error: "Terlalu banyak percobaan. Coba lagi dalam 5 menit" });
  }
  await prisma.userSecurity.update({
    where: { userId },
    data: { pinFailedCount: fails },
  });
  res
    .status(401)
    .json({ error: `PIN salah. Sisa percobaan: ${MAX_PIN_FAILS - fails}` });
});

/* ------------------------------------------------------------------ */
/* Lupa / ganti PIN: wajib konfirmasi password                          */
/* ------------------------------------------------------------------ */
async function checkPassword(userId: string, password: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!u?.passwordHash)
    throw new HttpError(
      400,
      "Akun ini masuk lewat Google/Facebook dan belum punya password",
    );
  if (!(await bcrypt.compare(password, u.passwordHash)))
    throw new HttpError(401, "Password salah");
}

meRouter.post("/verify-password", async (req, res) => {
  const parsed = z
    .object({ password: z.string().min(1).max(72) })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Data tidak valid" });
  try {
    await checkPassword(req.userId!, parsed.data.password);
  } catch (e) {
    return fail(res, e);
  }
  res.json({ ok: true });
});

meRouter.post("/pin/reset", async (req, res) => {
  const parsed = z
    .object({ password: z.string().min(1).max(72), pin: newPin })
    .safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" });

  const userId = req.userId!;
  try {
    await checkPassword(userId, parsed.data.password);
  } catch (e) {
    return fail(res, e);
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 12);
  await prisma.userSecurity.upsert({
    where: { userId },
    update: {
      pinHash,
      pinSetAt: new Date(),
      pinFailedCount: 0,
      pinLockedUntil: null,
    },
    create: { userId, pinHash },
  });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Level, EXP, badge (memanggil service yang sudah dibuat sebelumnya)   */
/* ------------------------------------------------------------------ */
meRouter.get("/progress", async (req, res) => {
  res.json(await getProgressSummary(req.userId!));
});

meRouter.get("/quests", async (req, res) => {
  res.json(await getQuestStatus(req.userId!));
});

meRouter.get("/exp-history", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  res.json(await getExpHistory(req.userId!, limit));
});
