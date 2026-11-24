import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireMember } from "../lib/access";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
  message: z.string().trim().max(200).optional(),
});

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "P2002";

export const spaceInvitationsRouter = Router({ mergeParams: true });

spaceInvitationsRouter.post("/", requireMember("ADMIN"), async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }
  const { username, role, message } = parsed.data;
  const me = req.membership!;
  const space = me.space;

  if (space.type === "PERSONAL") {
    return res.status(409).json({ error: "Space pribadi tidak bisa memiliki anggota lain" });
  }
  if (role === "ADMIN" && me.role !== "OWNER") {
    return res.status(403).json({ error: "Hanya pemilik yang bisa mengundang sebagai admin" });
  }

  const invitee = await prisma.user.findFirst({
    where: { username, status: "ACTIVE", deletedAt: null },
    include: { profile: true },
  });
  if (invitee?.id === me.userId) {
    return res.status(400).json({ error: "Anda tidak bisa mengundang diri sendiri" });
  }

  const notFound = { error: "Username tidak ditemukan atau tidak bisa menerima undangan" };
  if (
    !invitee ||
    !invitee.profile?.searchableByUsername ||
    invitee.profile.invitePolicy === "NOBODY"
  ) {
    return res.status(404).json(notFound);
  }

  const blocked = await prisma.userBlock.findFirst({
    where: { blockerId: invitee.id, blockedId: me.userId },
  });
  if (blocked) return res.status(404).json(notFound);

  const alreadyMember = await prisma.spaceMember.findFirst({
    where: { spaceId: space.id, userId: invitee.id, leftAt: null },
  });
  if (alreadyMember) {
    return res.status(409).json({ error: "User ini sudah menjadi anggota space ini" });
  }

  const now = new Date();
  await prisma.invitation.updateMany({
    where: { spaceId: space.id, inviteeId: invitee.id, status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: me.userId },
    select: { username: true, profile: { select: { displayName: true } } },
  });

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          spaceId: space.id,
          inviterId: me.userId,
          inviteeId: invitee.id,
          inviteeUsername: invitee.username,
          role,
          message,
          expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
        },
      });
      await tx.notification.create({
        data: {
          userId: invitee.id,
          type: "INVITATION_RECEIVED",
          title: `Undangan ke ${space.name}`,
          body: `${inviter.profile?.displayName ?? inviter.username} (@${inviter.username}) mengundang Anda bergabung.`,
          data: { invitationId: created.id, spaceId: space.id },
        },
      });
      return created;
    });

    res.status(201).json({
      id: invitation.id,
      inviteeUsername: invitation.inviteeUsername,
      inviteeName: invitee.profile?.displayName ?? null,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return res.status(409).json({ error: "Undangan untuk user ini masih menunggu jawaban" });
    }
    throw e;
  }
});

spaceInvitationsRouter.get("/", requireMember("ADMIN"), async (req, res) => {
  const rows = await prisma.invitation.findMany({
    where: { spaceId: req.membership!.spaceId, status: "PENDING", expiresAt: { gt: new Date() } },
    include: { invitee: { select: { profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    rows.map((i) => ({
      id: i.id,
      inviteeUsername: i.inviteeUsername,
      inviteeName: i.invitee.profile?.displayName ?? null,
      role: i.role,
      message: i.message,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }))
  );
});

spaceInvitationsRouter.delete("/:invitationId", requireMember("ADMIN"), async (req, res) => {
  const result = await prisma.invitation.updateMany({
    where: {
      id: String(req.params.invitationId),
      spaceId: req.membership!.spaceId,
      status: "PENDING",
    },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  if (result.count === 0) return res.status(404).json({ error: "Undangan tidak ditemukan" });
  res.status(204).end();
});

export const myInvitationsRouter = Router();

myInvitationsRouter.get("/", async (req, res) => {
  const rows = await prisma.invitation.findMany({
    where: {
      inviteeId: req.userId!,
      status: "PENDING",
      expiresAt: { gt: new Date() },
      space: { archivedAt: null },
    },
    include: {
      space: { select: { id: true, name: true, type: true, emoji: true } },
      inviter: { select: { username: true, profile: { select: { displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    rows.map((i) => ({
      id: i.id,
      space: i.space,
      role: i.role,
      message: i.message,
      expiresAt: i.expiresAt,
      inviter: {
        username: i.inviter.username,
        name: i.inviter.profile?.displayName ?? null,
      },
    }))
  );
});

type AcceptResult =
  | { ok: true; space: { id: string; name: string; type: string } }
  | { ok: false; status: number; error: string };

myInvitationsRouter.post("/:invitationId/accept", async (req, res) => {
  const id = String(req.params.invitationId);
  const userId = req.userId!;

  const result = await prisma.$transaction(async (tx): Promise<AcceptResult> => {
    const invitation = await tx.invitation.findFirst({
      where: { id, inviteeId: userId },
      include: { space: true },
    });
    if (!invitation) return { ok: false, status: 404, error: "Undangan tidak ditemukan" };
    if (invitation.status !== "PENDING") {
      return { ok: false, status: 409, error: "Undangan ini sudah tidak berlaku" };
    }
    if (invitation.expiresAt <= new Date() || invitation.space.archivedAt) {
      await tx.invitation.update({ where: { id }, data: { status: "EXPIRED" } });
      return { ok: false, status: 410, error: "Undangan sudah kedaluwarsa" };
    }

    const existing = await tx.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: invitation.spaceId, userId } },
    });
    if (existing && !existing.leftAt) {
      return { ok: false, status: 409, error: "Anda sudah menjadi anggota space ini" };
    }

    const claimed = await tx.invitation.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    if (claimed.count === 0) {
      return { ok: false, status: 409, error: "Undangan ini sudah tidak berlaku" };
    }

    await tx.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: invitation.spaceId, userId } },
      create: { spaceId: invitation.spaceId, userId, role: invitation.role },
      update: { role: invitation.role, leftAt: null, joinedAt: new Date() },
    });

    const me = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true, profile: { select: { displayName: true } } },
    });
    await tx.notification.create({
      data: {
        userId: invitation.inviterId,
        type: "INVITATION_ACCEPTED",
        title: `${me.profile?.displayName ?? me.username} bergabung`,
        body: `@${me.username} menerima undangan ke ${invitation.space.name}.`,
        data: { spaceId: invitation.spaceId },
      },
    });

    return {
      ok: true,
      space: { id: invitation.space.id, name: invitation.space.name, type: invitation.space.type },
    };
  });

  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json({ space: result.space });
});

myInvitationsRouter.post("/:invitationId/decline", async (req, res) => {
  const id = String(req.params.invitationId);
  const userId = req.userId!;

  const invitation = await prisma.invitation.findFirst({
    where: { id, inviteeId: userId, status: "PENDING" },
    include: { space: { select: { name: true } } },
  });
  if (!invitation) return res.status(404).json({ error: "Undangan tidak ditemukan" });

  const claimed = await prisma.invitation.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  if (claimed.count === 0) return res.status(409).json({ error: "Undangan ini sudah tidak berlaku" });

  const me = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { username: true },
  });
  await prisma.notification.create({
    data: {
      userId: invitation.inviterId,
      type: "INVITATION_DECLINED",
      title: "Undangan ditolak",
      body: `@${me.username} menolak undangan ke ${invitation.space.name}.`,
      data: { spaceId: invitation.spaceId },
    },
  });

  res.status(204).end();
});
