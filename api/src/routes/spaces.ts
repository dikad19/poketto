import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hasRole, outranks, requireMember, Role } from "../lib/access";
import { createDefaultCategories } from "../lib/spaces";

export const spacesRouter = Router();

const MAX_OWNED_SPACES = 10;

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["COUPLE", "FAMILY", "CUSTOM"]),
  description: z.string().trim().max(200).optional(),
  emoji: z.string().trim().max(40).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    description: z.string().trim().max(200).nullable().optional(),
    emoji: z.string().trim().max(40).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada data yang diubah" });

const memberUpdateSchema = z
  .object({
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
    nickname: z.string().trim().max(40).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada data yang diubah" });

function listMembers(spaceId: string) {
  return prisma.spaceMember
    .findMany({
      where: { spaceId, leftAt: null },
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    })
    .then((rows) =>
      rows.map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.user.username,
        name: m.user.profile?.displayName ?? null,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        role: m.role,
        nickname: m.nickname,
        joinedAt: m.joinedAt,
      }))
    );
}

spacesRouter.get("/", async (req, res) => {
  const memberships = await prisma.spaceMember.findMany({
    where: { userId: req.userId!, leftAt: null, space: { archivedAt: null } },
    include: {
      space: {
        include: { _count: { select: { members: { where: { leftAt: null } } } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  res.json(
    memberships.map((m) => ({
      id: m.space.id,
      name: m.space.name,
      type: m.space.type,
      emoji: m.space.emoji,
      description: m.space.description,
      role: m.role,
      memberCount: m.space._count.members,
    }))
  );
});

spacesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }

  const owned = await prisma.space.count({
    where: { createdById: req.userId!, archivedAt: null, type: { not: "PERSONAL" } },
  });
  if (owned >= MAX_OWNED_SPACES) {
    return res
      .status(409)
      .json({ error: `Anda sudah membuat ${MAX_OWNED_SPACES} space. Arsipkan yang tidak terpakai dulu.` });
  }

  const space = await prisma.$transaction(async (tx) => {
    const created = await tx.space.create({
      data: {
        ...parsed.data,
        createdById: req.userId!,
        members: { create: { userId: req.userId!, role: "OWNER" } },
      },
    });
    await createDefaultCategories(tx, created.id);
    return created;
  });

  res.status(201).json({
    id: space.id,
    name: space.name,
    type: space.type,
    emoji: space.emoji,
    description: space.description,
    role: "OWNER",
    memberCount: 1,
  });
});

spacesRouter.get("/:spaceId", requireMember(), async (req, res) => {
  const { space, role } = req.membership!;
  res.json({
    id: space.id,
    name: space.name,
    type: space.type,
    emoji: space.emoji,
    description: space.description,
    currency: space.currency,
    myRole: role,
    members: await listMembers(space.id),
  });
});

spacesRouter.patch("/:spaceId", requireMember("ADMIN"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }

  const space = await prisma.space.update({
    where: { id: req.membership!.spaceId },
    data: parsed.data,
  });
  res.json({
    id: space.id,
    name: space.name,
    emoji: space.emoji,
    description: space.description,
  });
});

spacesRouter.delete("/:spaceId", requireMember("OWNER"), async (req, res) => {
  const { space } = req.membership!;
  if (space.type === "PERSONAL") {
    return res.status(409).json({ error: "Space pribadi tidak bisa diarsipkan" });
  }

  await prisma.space.update({ where: { id: space.id }, data: { archivedAt: new Date() } });
  res.status(204).end();
});

spacesRouter.post("/:spaceId/leave", requireMember(), async (req, res) => {
  const me = req.membership!;
  if (me.space.type === "PERSONAL") {
    return res.status(409).json({ error: "Anda tidak bisa keluar dari space pribadi" });
  }
  if (me.role === "OWNER") {
    return res
      .status(409)
      .json({ error: "Pemilik tidak bisa keluar. Arsipkan space ini atau serahkan kepemilikan dulu." });
  }

  await prisma.spaceMember.update({ where: { id: me.id }, data: { leftAt: new Date() } });
  res.status(204).end();
});

spacesRouter.patch("/:spaceId/members/:memberId", requireMember(), async (req, res) => {
  const parsed = memberUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
  }

  const me = req.membership!;
  const target = await prisma.spaceMember.findFirst({
    where: { id: String(req.params.memberId), spaceId: me.spaceId, leftAt: null },
  });
  if (!target) return res.status(404).json({ error: "Anggota tidak ditemukan" });

  const isSelf = target.userId === me.userId;

  if (parsed.data.role !== undefined) {
    if (me.role !== "OWNER") {
      return res.status(403).json({ error: "Hanya pemilik yang bisa mengubah peran anggota" });
    }
    if (isSelf || target.role === "OWNER") {
      return res.status(400).json({ error: "Peran pemilik tidak bisa diubah" });
    }
  }
  if (parsed.data.nickname !== undefined && !isSelf && !hasRole(me.role as Role, "ADMIN")) {
    return res.status(403).json({ error: "Anda hanya bisa mengubah panggilan Anda sendiri" });
  }

  const updated = await prisma.spaceMember.update({
    where: { id: target.id },
    data: parsed.data,
  });
  res.json({ id: updated.id, role: updated.role, nickname: updated.nickname });
});

spacesRouter.delete("/:spaceId/members/:memberId", requireMember("ADMIN"), async (req, res) => {
  const me = req.membership!;
  const target = await prisma.spaceMember.findFirst({
    where: { id: String(req.params.memberId), spaceId: me.spaceId, leftAt: null },
  });
  if (!target) return res.status(404).json({ error: "Anggota tidak ditemukan" });

  if (target.role === "OWNER") {
    return res.status(400).json({ error: "Pemilik tidak bisa dikeluarkan" });
  }
  if (target.userId === me.userId) {
    return res.status(400).json({ error: "Gunakan fitur keluar dari space" });
  }
  if (!outranks(me.role as Role, target.role as Role)) {
    return res
      .status(403)
      .json({ error: "Anda tidak bisa mengeluarkan anggota dengan peran yang sama atau lebih tinggi" });
  }

  await prisma.spaceMember.update({ where: { id: target.id }, data: { leftAt: new Date() } });
  res.status(204).end();
});
