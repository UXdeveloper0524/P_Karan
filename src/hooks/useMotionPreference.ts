import { useCallback, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;
const getServerSnapshot = (): boolean => false;

export interface MotionPreference {
  /** True when motion should be reduced (system setting or the on-page toggle). */
  readonly reduced: boolean;
  readonly toggle: () => void;
}

/** Follows the system "reduce motion" setting and lets the visitor override it. */
export function useMotionPreference(): MotionPreference {
  const system = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [override, setOverride] = useState<boolean | null>(null);

  const reduced = override ?? system;
  const toggle = useCallback(() => setOverride(!reduced), [reduced]);

  return { reduced, toggle };
}
