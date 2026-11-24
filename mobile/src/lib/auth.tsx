import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  clearTokens,
  getRefreshToken,
  loadTokens,
  saveTokens,
  setSessionExpiredHandler,
  Tokens,
} from "./api";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
};

type AuthResponse = Tokens & { user: User };

type RegisterInput = { name: string; email: string; password: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSessionExpiredHandler(() => setUser(null));

    (async () => {
      try {
        await loadTokens();
        const me = await api<User>("/auth/me");
        if (!cancelled) setUser(me);
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await saveTokens(res);
    setUser(res.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    });
    await saveTokens(res);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await api("/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
      } catch {}
    }
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
