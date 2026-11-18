import { useEffect, type RefObject } from "react";
import { clamp } from "@/lib/math";
import type { ProgressStore } from "@/lib/progress-store";
import { useLatest } from "@/hooks/useLatest";

/** Longest frame we simulate, so a background tab does not cause a jump. */
const MAX_DT = 0.1;

/**
 * Runs the page's single animation loop. Each frame it measures how far the
 * visitor has scrolled through `trackRef` and advances the progress store,
 * which in turn notifies the canvas, overlay and HUD.
 */
export function useScrollProgress(
  trackRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  store: ProgressStore,
  reduced: boolean,
): void {
  const reducedRef = useLatest(reduced);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const loop = (now: number): void => {
      const track = trackRef.current;
      const dt = Math.min(MAX_DT, (now - last) / 1000);
      last = now;

      const stage = stageRef.current;
      if (track && stage) {
        // The stage has a fixed height, unlike window.innerHeight, which iOS changes as its toolbar slides.
        const scrollable = track.offsetHeight - stage.offsetHeight;
        const raw =
          scrollable > 0 ? clamp(-track.getBoundingClientRect().top / scrollable) : 0;
        store.tick(raw, now, dt, reducedRef.current);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [trackRef, stageRef, store, reducedRef]);
}
