import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getItem, setItem } from "./storage";
import { SpaceSummary, spacesApi } from "./spaces";
import { formErrorMessage } from "./validation";

const ACTIVE_KEY = "poketto.activeSpace";

type SpaceContextValue = {
  spaces: SpaceSummary[];
  active: SpaceSummary | null;
  loading: boolean;
  error: string | null;
  setActiveId: (id: string) => void;
  reload: () => Promise<void>;
};

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await spacesApi.list();
      setSpaces(list);
      setError(null);
      // Pertahankan pilihan kalau masih ada; kalau tidak, pakai space pribadi
      setActiveIdState((current) => {
        if (current && list.some((s) => s.id === current)) return current;
        return (list.find((s) => s.type === "PERSONAL") ?? list[0])?.id ?? null;
      });
    } catch (e) {
      setError(formErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getItem(ACTIVE_KEY).catch(() => null);
      if (stored) setActiveIdState(stored);
      await reload();
    })();
  }, [reload]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    setItem(ACTIVE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo<SpaceContextValue>(
    () => ({
      spaces,
      active: spaces.find((s) => s.id === activeId) ?? null,
      loading,
      error,
      setActiveId,
      reload,
    }),
    [spaces, activeId, loading, error, setActiveId, reload]
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpaces() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpaces harus dipakai di dalam SpaceProvider");
  return ctx;
}
