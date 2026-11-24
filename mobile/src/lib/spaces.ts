import { api } from "./api";

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type AssignableRole = Exclude<Role, "OWNER">;
export type SpaceType = "PERSONAL" | "COUPLE" | "FAMILY" | "CUSTOM";

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

// Sama persis dengan aturan di BE (lib/access.ts)
export const hasRole = (role: Role, min: Role) => RANK[role] >= RANK[min];
export const outranks = (a: Role, b: Role) => RANK[a] > RANK[b];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  MEMBER: "Anggota",
  VIEWER: "Pelihat",
};

export const ROLE_HINT: Record<AssignableRole, string> = {
  ADMIN: "Bisa mengundang dan mengeluarkan anggota",
  MEMBER: "Bisa mencatat transaksi",
  VIEWER: "Hanya bisa melihat",
};

export const TYPE_LABEL: Record<SpaceType, string> = {
  PERSONAL: "Pribadi",
  COUPLE: "Pasangan",
  FAMILY: "Keluarga",
  CUSTOM: "Lainnya",
};

export type SpaceSummary = {
  id: string;
  name: string;
  type: SpaceType;
  emoji: string | null;
  description: string | null;
  role: Role;
  memberCount: number;
};

export type Member = {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  nickname: string | null;
  joinedAt: string;
};

export type SpaceDetail = {
  id: string;
  name: string;
  type: SpaceType;
  emoji: string | null;
  description: string | null;
  currency: string;
  myRole: Role;
  members: Member[];
};

export type SentInvitation = {
  id: string;
  inviteeUsername: string;
  inviteeName: string | null;
  role: AssignableRole;
  message: string | null;
  expiresAt: string;
  createdAt: string;
};

export type MyInvitation = {
  id: string;
  space: { id: string; name: string; type: SpaceType; emoji: string | null };
  role: AssignableRole;
  message: string | null;
  expiresAt: string;
  inviter: { username: string; name: string | null };
};

export type CreateSpaceInput = {
  name: string;
  type: Exclude<SpaceType, "PERSONAL">;
  description?: string;
  emoji?: string;
};

export const spacesApi = {
  list: () => api<SpaceSummary[]>("/spaces"),
  get: (id: string) => api<SpaceDetail>(`/spaces/${id}`),
  create: (input: CreateSpaceInput) =>
    api<SpaceSummary>("/spaces", { method: "POST", body: input }),
  update: (
    id: string,
    input: { name?: string; description?: string | null; emoji?: string | null }
  ) => api(`/spaces/${id}`, { method: "PATCH", body: input }),
  archive: (id: string) => api(`/spaces/${id}`, { method: "DELETE" }),
  leave: (id: string) => api(`/spaces/${id}/leave`, { method: "POST" }),
  updateMember: (
    id: string,
    memberId: string,
    input: { role?: AssignableRole; nickname?: string | null }
  ) => api(`/spaces/${id}/members/${memberId}`, { method: "PATCH", body: input }),
  removeMember: (id: string, memberId: string) =>
    api(`/spaces/${id}/members/${memberId}`, { method: "DELETE" }),
};

export const invitationsApi = {
  // sisi admin space
  send: (
    spaceId: string,
    input: { username: string; role: AssignableRole; message?: string }
  ) => api(`/spaces/${spaceId}/invitations`, { method: "POST", body: input }),
  listForSpace: (spaceId: string) => api<SentInvitation[]>(`/spaces/${spaceId}/invitations`),
  cancel: (spaceId: string, invitationId: string) =>
    api(`/spaces/${spaceId}/invitations/${invitationId}`, { method: "DELETE" }),

  // sisi penerima
  inbox: () => api<MyInvitation[]>("/invitations"),
  accept: (id: string) =>
    api<{ space: { id: string; name: string; type: SpaceType } }>(`/invitations/${id}/accept`, {
      method: "POST",
    }),
  decline: (id: string) => api(`/invitations/${id}/decline`, { method: "POST" }),
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
