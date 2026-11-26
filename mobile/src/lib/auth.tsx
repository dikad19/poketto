import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  api,
  clearTokens,
  getRefreshToken,
  loadTokens,
  saveTokens,
  setSessionExpiredHandler,
  Tokens,
} from "./api";
import { clearLocalSecurity, hasLocalPin } from "../components/AppLock";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
  avatarKey?: string | null;
  hasPin: boolean;
  onboardingDone: boolean;
};

type AuthResponse = Tokens & {
  user: Pick<User, "id" | "email" | "username" | "name">;
};

type RegisterInput = { name: string; email: string; password: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  /** true = layar kunci (PIN/biometrik) sedang tampil menutupi app */
  locked: boolean;
  unlock: () => void;
  /** ambil ulang /auth/me (dipanggil setelah avatar/PIN berubah) */
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const LOCK_AFTER_MS = 30_000; // terkunci jika di background > 30 detik

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const refreshUser = useCallback(async () => {
    const me = await api<User>("/auth/me");
    setUser(me);
  }, []);

  // Cold start: pulihkan sesi, lalu kunci kalau PIN lokal ada
  useEffect(() => {
    let cancelled = false;

    setSessionExpiredHandler(() => {
      // sesi habis -> bersihkan PIN lokal juga, login berikutnya wajib verifikasi PIN
      clearLocalSecurity();
      setLocked(false);
      setUser(null);
    });

    (async () => {
      try {
        await loadTokens();
        const me = await api<User>("/auth/me");
        const needLock = await hasLocalPin();
        if (!cancelled) {
          setUser(me);
          setLocked(needLock);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
    };
  }, []);

  // Kunci otomatis kalau app di background > 30 detik
  useEffect(() => {
    if (!user) return;
    let bgAt: number | null = null;

    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background") bgAt = Date.now();
      if (state === "active") {
        if (bgAt && Date.now() - bgAt > LOCK_AFTER_MS && (await hasLocalPin()))
          setLocked(true);
        bgAt = null;
      }
    });
    return () => sub.remove();
  }, [user]);

  // Login/register berhasil: password baru saja diketik -> tidak perlu PIN lagi
  const startSession = useCallback(async (res: AuthResponse) => {
    await saveTokens(res);
    try {
      setUser(await api<User>("/auth/me"));
    } catch {
      setUser({
        ...res.user,
        avatarKey: null,
        hasPin: false,
        onboardingDone: false,
      });
    }
    setLocked(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      await startSession(res);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: input,
        auth: false,
      });
      await startSession(res);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await api("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          auth: false,
        });
      } catch {}
    }
    await clearTokens();
    await clearLocalSecurity(); // logout = hapus PIN lokal
    setLocked(false);
    setUser(null);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      locked,
      unlock,
      refreshUser,
      login,
      register,
      logout,
    }),
    [user, loading, locked, unlock, refreshUser, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
