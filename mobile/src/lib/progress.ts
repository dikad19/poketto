import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";

export type BadgeInfo = {
  level: number;
  minExp: number;
  name: string;
  emoji: string;
  earned: boolean;
};

export type Progress = {
  totalExp: number;
  level: number;
  levelName: string;
  nextLevelExp: number | null; // null = level maksimum
  progressPct: number;
  badges: BadgeInfo[];
};

export type QuestState =
  | "NO_BASELINE"
  | "NEEDS_LOG"
  | "ON_TRACK"
  | "OVER"
  | "IN_PROGRESS"
  | "DONE"
  | "MISSED";

export type QuestId =
  | "DAILY_SAVE"
  | "DAILY_LOG_1"
  | "DAILY_LOG_3"
  | "WEEKLY_LOG"
  | "MONTHLY_SAVE";

export type Quest = {
  id: QuestId;
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  kind: "SAVE" | "LOG";
  title: string;
  subtitle: string;
  exp: number;
  state: QuestState;
  periodKey: string;
  resolvesOn: string;
  spent: number;
  target: number | null;
  progress: number;
  goal: number;
  loggedDays?: number;
  requiredDays?: number;
  daysLeft?: number;
};

export type Quests = Quest[];

export type ExpEvent = {
  id: string;
  source:
    | "DAILY_QUEST"
    | "MONTHLY_QUEST"
    | "DAILY_LOG_1"
    | "DAILY_LOG_3"
    | "WEEKLY_LOG";
  periodKey: string;
  exp: number;
  currentSpend: number;
  previousSpend: number;
  count: number;
  createdAt: string;
};

// Ambil data tiap layar difokuskan lagi, jadi angka selalu segar
function useApiData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, loading, error, reload };
}

export const useProgress = () => useApiData<Progress>("/me/progress");
export const useQuests = () => useApiData<Quests>("/me/quests");
export const useExpHistory = (limit = 30) =>
  useApiData<ExpEvent[]>(`/me/exp-history?limit=${limit}`);
