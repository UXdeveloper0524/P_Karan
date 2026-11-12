interface LoadingScreenProps {
  /** 0 to 1 */
  readonly progress: number;
  readonly visible: boolean;
}

export function LoadingScreen({ progress, visible }: LoadingScreenProps) {
  const percent = Math.round(progress * 100);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute inset-0 z-30 grid place-content-center gap-4 bg-ink px-6 text-center transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Warming up the engines {percent}%
      </p>
      <div className="mx-auto h-0.5 w-48 bg-paper/10">
        <div
          className="h-full origin-left bg-signal transition-transform duration-300"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
