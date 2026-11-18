"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { SITE } from "@/data/story";

/** The loader stays up at least this long, so the brand has time to land even on a fast connection. */
const MIN_DURATION_MS = 3400;
/** After the bar fills, hold a beat before fading out. */
const HOLD_MS = 350;

interface LoadingScreenProps {
  /** Real loading progress, 0 to 1. */
  readonly progress: number;
  /** True once the 3D scene is ready to show. */
  readonly ready: boolean;
  /** Called once, when the bar has filled and the loader is about to fade. */
  readonly onFinished: () => void;
}

/** A quiet loader: the monogram draws itself, the name rises, and a hairline fills. */
export function LoadingScreen({ progress, ready, onFinished }: LoadingScreenProps) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const targetRef = useRef({ progress, ready });
  const finishedRef = useRef(onFinished);

  useEffect(() => {
    targetRef.current = { progress, ready };
    finishedRef.current = onFinished;
  });

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    let finishedAt = 0;

    const loop = (now: number): void => {
      const timeShare = Math.min(1, (now - start) / MIN_DURATION_MS);
      // Ease the clock so the bar starts quickly and settles, and never outruns the real loading.
      const eased = 1 - (1 - timeShare) ** 2;
      const { progress: real, ready: isReady } = targetRef.current;
      const limit = isReady ? 1 : Math.min(0.92, real);
      const value = Math.min(eased, limit);
      setShown(value);

      if (value >= 1) {
        finishedAt ||= now;
        if (now - finishedAt >= HOLD_MS) {
          setDone(true);
          finishedRef.current();
          return;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute inset-x-0 top-0 z-30 grid h-lvh place-content-center justify-items-center bg-ink px-6 transition-opacity duration-1000 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Logo size={96} animate />
      <p
        className="mt-8 font-display text-3xl text-paper md:text-4xl"
        style={{ animation: "rise 0.7s ease-out 1.5s both" }}
      >
        {SITE.name}
      </p>
      <p
        className="mt-2 text-[10px] uppercase tracking-[0.34em] text-muted"
        style={{ animation: "rise 0.7s ease-out 1.8s both" }}
      >
        {SITE.role}
      </p>
      <div className="mt-10 h-px w-44 bg-paper/15">
        <div className="h-full origin-left bg-signal" style={{ transform: `scaleX(${shown})` }} />
      </div>
      <p className="mt-3 text-[10px] tracking-[0.3em] text-muted tabular-nums">
        <span className="sr-only">Loading </span>
        {String(Math.round(shown * 100)).padStart(3, "0")}
      </p>
    </div>
  );
}
