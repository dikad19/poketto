import { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma";

export type Role = "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export const hasRole = (role: Role, min: Role) => RANK[role] >= RANK[min];
export const outranks = (a: Role, b: Role) => RANK[a] > RANK[b];

export function loadMembership(userId: string, spaceId: string) {
  return prisma.spaceMember.findFirst({
    where: { spaceId, userId, leftAt: null, space: { archivedAt: null } },
    include: { space: true },
  });
}

export type ActiveMembership = NonNullable<Awaited<ReturnType<typeof loadMembership>>>;

declare global {
  namespace Express {
    interface Request {
      membership?: ActiveMembership;
    }
  }
}

export function requireMember(min: Role = "VIEWER") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const membership = await loadMembership(req.userId!, String(req.params.spaceId));
    if (!membership) return res.status(404).json({ error: "Space tidak ditemukan" });
    if (!hasRole(membership.role as Role, min)) {
      return res.status(403).json({ error: "Anda tidak punya izin untuk tindakan ini" });
    }
    req.membership = membership;
    next();
  };
}
