import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { formErrorMessage } from "./validation";

/**
 * Ambil data saat layar dibuka dan setiap kali layar kembali fokus
 * (misalnya setelah kembali dari form). Tidak butuh library tambahan.
 */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fetcherRef.current();
      if (!mounted.current || id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (!mounted.current || id !== requestId.current) return;
      setError({
        status: e instanceof ApiError ? e.status : -1,
        message: formErrorMessage(e),
      });
    } finally {
      if (mounted.current && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Fetch ulang (dengan indikator loading) saat deps berubah, bukan saat mount pertama
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    return load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  return { data, error, loading, refreshing, reload: load, refresh, retry };
}
