"use client";

import { useRef } from "react";
import { STOPS } from "@/data/story";
import { useJourneyFrame, useStopIndex } from "@/hooks/useJourney";

const pad = (value: number): string => String(value).padStart(2, "0");

/** Progress readout. The percentage and bar update straight from the animation loop. */
export function Hud() {
  const stopIndex = useStopIndex();
  const percentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useJourneyFrame((state) => {
    if (percentRef.current) percentRef.current.textContent = `${Math.round(state.progress * 100)}%`;
    if (barRef.current) barRef.current.style.transform = `scaleX(${state.progress.toFixed(4)})`;
  });

  const stop = STOPS[stopIndex];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      <div className="flex items-end justify-between gap-4 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] font-mono text-[11px] uppercase tracking-[0.18em] text-muted tabular-nums md:px-16">
        <span ref={percentRef}>0%</span>
        <span>
          {pad(stopIndex + 1)} / {pad(STOPS.length)}
          {stop ? ` · ${stop.eyebrow}` : ""}
        </span>
        <span className="hidden sm:inline">Scroll to move</span>
      </div>
      <div className="h-0.5 bg-paper/10">
        <div
          ref={barRef}
          className="h-full origin-left bg-signal"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
