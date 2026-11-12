import { useEffect, useSyncExternalStore } from "react";
import { useProgressStore } from "@/context/ProgressContext";
import { useLatest } from "@/hooks/useLatest";
import type { FrameListener } from "@/lib/progress-store";

/**
 * Runs `callback` on every animation frame without re-rendering React.
 * Use it for canvas drawing and direct DOM style updates.
 */
export function useJourneyFrame(callback: FrameListener): void {
  const store = useProgressStore();
  const callbackRef = useLatest(callback);

  useEffect(
    () =>
      store.subscribeFrame((state, time, dt) => callbackRef.current(state, time, dt)),
    [store, callbackRef],
  );
}

/** The active stop. Re-renders only when the stop changes. */
export function useStopIndex(): number {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribeCoarse, store.getStopIndex, () => 0);
}

/** The active project billboard in the gallery, or -1. Re-renders only when it changes. */
export function useProjectIndex(): number {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribeCoarse, store.getProjectIndex, () => -1);
}
