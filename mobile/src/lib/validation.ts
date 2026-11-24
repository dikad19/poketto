import { ApiError } from "./api";

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function formErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message;
    if (error.status === 429) {
      return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
    }
    if (error.status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat lagi.";
    return error.message;
  }
  return "Terjadi kesalahan. Coba lagi.";
}
