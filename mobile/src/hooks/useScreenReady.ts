// src/hooks/useScreenReady.ts
import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

export function useScreenReady(...conditions: boolean[]) {
  const [transitionDone, setTransitionDone] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setTransitionDone(true),
    );
    return () => task.cancel();
  }, []);

  return transitionDone && conditions.every(Boolean);
}
