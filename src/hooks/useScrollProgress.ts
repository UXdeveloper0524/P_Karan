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
  probeRef: RefObject<HTMLElement | null>,
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

      const probe = probeRef.current;
      if (track && probe) {
        // The probe is as tall as the largest viewport (100lvh), which never changes. window.innerHeight
        // does change as the iOS toolbar slides, and would make progress jitter.
        const viewport = probe.offsetHeight > 100 ? probe.offsetHeight : window.innerHeight;
        const scrollable = track.offsetHeight - viewport;
        const raw =
          scrollable > 0 ? clamp(-track.getBoundingClientRect().top / scrollable) : 0;
        store.tick(raw, now, dt, reducedRef.current);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [trackRef, probeRef, store, reducedRef]);
}
