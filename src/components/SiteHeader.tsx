interface ToggleButtonProps {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
}

function ToggleButton({ label, pressed, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-sm border border-paper/25 bg-ink/60 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper backdrop-blur-sm transition-colors hover:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal aria-pressed:border-signal aria-pressed:text-signal"
    >
      {label}
    </button>
  );
}

interface SiteHeaderProps {
  readonly name: string;
  readonly role: string;
  readonly soundEnabled: boolean;
  readonly soundSupported: boolean;
  readonly onToggleSound: () => void;
  readonly motionReduced: boolean;
  readonly onToggleMotion: () => void;
}

export function SiteHeader({
  name,
  role,
  soundEnabled,
  soundSupported,
  onToggleSound,
  motionReduced,
  onToggleMotion,
}: SiteHeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-paper">
        {name}
        <span className="hidden text-muted sm:inline"> · {role}</span>
      </p>
      <div className="pointer-events-auto flex gap-2">
        {soundSupported && (
          <ToggleButton
            label={soundEnabled ? "Sound on" : "Sound off"}
            pressed={soundEnabled}
            onClick={onToggleSound}
          />
        )}
        <ToggleButton label="Reduce motion" pressed={motionReduced} onClick={onToggleMotion} />
      </div>
    </header>
  );
}
