import { useEffect, useState } from "react";

type Step = { label: string; run: () => Promise<unknown> };

// Isi dengan fetch asli kamu (lihat catatan di bawah)
const PREFETCH_STEPS: Step[] = [
  {
    label: "Memuat dompet...",
    run: async () => {
      /* await api.get("/wallets") */
    },
  },
  {
    label: "Memuat transaksi...",
    run: async () => {
      /* await api.get("/transactions?...") */
    },
  },
];
const MIN_DURATION = 1500;
export function useBootstrap(
  user: { id: string | number } | null,
  authLoading: boolean,
) {
  const [done, setDone] = useState(0);
  const [label, setLabel] = useState("Memeriksa sesi...");
  const [loadedFor, setLoadedFor] = useState<string | number | null>(null);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      setDone(0);
      return;
    }
    let cancelled = false;
    (async () => {
      for (const step of PREFETCH_STEPS) {
        if (cancelled) return;
        setLabel(step.label);
        try {
          await step.run();
        } catch {
          // gagal/offline: tetap lanjut masuk app, jangan menahan user
        }
        if (!cancelled) setDone((d) => d + 1);
      }
      if (!cancelled) setLoadedFor(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const total = PREFETCH_STEPS.length + 1;
  const ready = minElapsed && !authLoading && (!user || loadedFor === user.id);
  const progress = authLoading ? 0.1 : user && !ready ? (1 + done) / total : 1;

  return { ready, progress, label };
}
