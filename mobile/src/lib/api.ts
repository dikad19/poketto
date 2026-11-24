import { deleteItem, getItem, setItem } from "./storage";

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ACCESS_KEY = "poketto.accessToken";
const REFRESH_KEY = "poketto.refreshToken";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type Tokens = { token: string; refreshToken: string };

type RefreshResult = "ok" | "expired" | "error";

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshResult> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export async function loadTokens() {
  accessToken = await getItem(ACCESS_KEY);
}

export async function saveTokens(tokens: Tokens) {
  accessToken = tokens.token;
  await setItem(ACCESS_KEY, tokens.token);
  await setItem(REFRESH_KEY, tokens.refreshToken);
}

export async function clearTokens() {
  accessToken = null;
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
}

export function getRefreshToken() {
  return getItem(REFRESH_KEY);
}

async function send(path: string, method: string, body: unknown, withAuth: boolean) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Tidak bisa terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi."
    );
  }
}

function refreshTokens(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshResult> => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return "expired";
      try {
        const res = await send("/auth/refresh", "POST", { refreshToken }, false);
        if (res.ok) {
          await saveTokens((await res.json()) as Tokens);
          return "ok";
        }
        if (res.status === 400 || res.status === 401) {
          await clearTokens();
          return "expired";
        }
        return "error";
      } catch {
        return "error";
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export async function api<T = unknown>(
  path: string,
  { method = "GET", body, auth = true }: Options = {}
): Promise<T> {
  let res = await send(path, method, body, auth);

  if (res.status === 401 && auth) {
    const result = await refreshTokens();
    if (result === "ok") {
      res = await send(path, method, body, auth);
    } else if (result === "expired") {
      onSessionExpired?.();
    }
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Terjadi kesalahan. Coba lagi.", data?.details);
  }
  return data as T;
}
