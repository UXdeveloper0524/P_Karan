import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps the newest value in a ref, so long-lived callbacks (animation loops,
 * subscriptions) can read it without being torn down and recreated.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
