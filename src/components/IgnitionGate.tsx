import type { IgnitionState } from "@/lib/world/rig";

interface IgnitionGateProps {
  readonly state: IgnitionState;
  readonly onStart: () => void;
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3v8" />
      <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
    </svg>
  );
}

/**
 * The ignition. The car waits on the grid until the visitor starts the engine,
 * which also turns the sound on, because browsers only allow audio after a click.
 */
export function IgnitionGate({ state, onStart }: IgnitionGateProps) {
  const running = state === "running";
  const starting = state === "starting";

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-6 pb-20 transition-opacity duration-700 md:pb-24 ${
        running ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={running}
    >
      <button
        type="button"
        onClick={onStart}
        disabled={state !== "off"}
        className={`group pointer-events-auto flex items-center gap-3 rounded-full border border-signal bg-ink/80 px-7 py-4 font-mono text-sm uppercase tracking-[0.22em] text-paper backdrop-blur-sm transition-colors enabled:hover:bg-signal enabled:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal ${
          starting ? "animate-pulse" : ""
        }`}
      >
        <KeyIcon />
        {starting ? "Starting…" : "Start engine"}
      </button>
      <p role="status" className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/80">
        {starting ? "Engine turning over" : "Turns the sound on · then scroll to drive"}
      </p>
    </div>
  );
}
