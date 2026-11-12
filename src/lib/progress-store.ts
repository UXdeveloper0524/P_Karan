import { damp } from "@/lib/math";
import { type JourneyState, resolveJourney } from "@/lib/journey";

export type FrameListener = (state: JourneyState, time: number, dt: number) => void;

/**
 * A small external store. One animation loop updates it every frame, and
 * components read from it without re-rendering React:
 *  - `subscribeFrame` fires every frame (for canvas and direct DOM updates)
 *  - `subscribeCoarse` fires only when the stop or project changes (for
 *    `useSyncExternalStore`, so React re-renders rarely)
 */
export interface ProgressStore {
  getState(): JourneyState;
  getStopIndex(): number;
  getProjectIndex(): number;
  subscribeFrame(listener: FrameListener): () => void;
  subscribeCoarse(listener: () => void): () => void;
  /** Advance one frame. `raw` is the real scroll progress; the store smooths it. */
  tick(raw: number, time: number, dt: number, reduced: boolean): void;
}

const SMOOTHING = 6;

export function createProgressStore(): ProgressStore {
  const frameListeners = new Set<FrameListener>();
  const coarseListeners = new Set<() => void>();

  let shown = 0;
  let initialised = false;
  let state: JourneyState = resolveJourney(0);

  return {
    getState: () => state,
    getStopIndex: () => state.stopIndex,
    getProjectIndex: () => state.projectIndex,

    subscribeFrame(listener) {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },

    subscribeCoarse(listener) {
      coarseListeners.add(listener);
      return () => {
        coarseListeners.delete(listener);
      };
    },

    tick(raw, time, dt, reduced) {
      if (!initialised || reduced) {
        shown = raw;
        initialised = true;
      } else {
        shown = damp(shown, raw, SMOOTHING, dt);
      }

      const previous = state;
      state = resolveJourney(shown);

      if (
        previous.stopIndex !== state.stopIndex ||
        previous.projectIndex !== state.projectIndex
      ) {
        coarseListeners.forEach((listener) => listener());
      }
      frameListeners.forEach((listener) => listener(state, time, dt));
    },
  };
}
