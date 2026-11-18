import { useEffect } from "react";

/**
 * Holds the page at the top and stops it scrolling while `locked` is true.
 * Used so the car cannot drive before the engine is started.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousRestoration = history.scrollRestoration;

    // A refreshed page would otherwise reopen halfway down the road.
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    root.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousOverflow;
      history.scrollRestoration = previousRestoration;
    };
  }, [locked]);
}
