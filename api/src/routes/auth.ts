import crypto from "node:crypto";
import { Router, Request } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CATEGORIES } from "../lib/defaultCategories";

export const authRouter = Router();

const REFRESH_TTL_DAYS = 30;
const DUMMY_HASH = bcrypt.hashSync("password-palsu-untuk-timing", 12);

const registerSchema = z.object({
  email: z.email().transform((s) => s.trim().toLowerCase()),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const generateUsername = () => "user_" + crypto.randomBytes(5).toString("hex");

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const isUniqueViolation = (e: unknown) =>
  (e as { code?: string })?.code === "P2002";

function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

async function issueTokens(userId: string, req: Request) {
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? null,
    },
  });
  return { token: signAccessToken(userId), refreshToken };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const { email, name, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email sudah terdaftar" });

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
          username: generateUsername(),
          profile: { create: { fullName: name, displayName: name } },
        },
      });

      const space = await tx.space.create({
        data: {
          name: "Pribadi",
          type: "PERSONAL",
          createdById: u.id,
          members: { create: { userId: u.id, role: "OWNER" } },
        },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, i) => ({
          spaceId: space.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          isEssential: c.isEssential,
          sortOrder: i,
        })),
      });

      return u;
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return res.status(409).json({ error: "Email sudah terdaftar" });
    throw e;
  }

  const tokens = await issueTokens(user.id, req);
  res.status(201).json({
    ...tokens,
    user: { id: user.id, email: user.email, username: user.username, name },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Data tidak valid" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { profile: true },
  });

  const match = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !user.passwordHash || user.status !== "ACTIVE" || !match) {
    return res.status(401).json({ error: "Email atau password salah" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user.id, req);
  res.json({
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.profile?.displayName ?? null,
    },
  });
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Data tidak valid" });

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(parsed.data.refreshToken) },
    include: { user: true },
  });

  const valid =
    session &&
    !session.revokedAt &&
    session.expiresAt > new Date() &&
    session.user.status === "ACTIVE" &&
    !session.user.deletedAt;
  if (!valid)
    return res.status(401).json({ error: "Refresh token tidak valid" });

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(session.userId, req);
  res.json(tokens);
});

authRouter.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256(parsed.data.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: (req as any).userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.profile?.displayName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  });
});
