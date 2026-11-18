import { Logo } from "@/components/Logo";

interface SiteHeaderProps {
  readonly name: string;
  readonly role: string;
  readonly motionReduced: boolean;
  readonly onToggleMotion: () => void;
}

export function SiteHeader({ name, role, motionReduced, onToggleMotion }: SiteHeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-16">
      <div className="flex items-center gap-3">
        <Logo size={30} />
        <p className="text-[11px] uppercase tracking-[0.24em] text-paper">
          {name}
          <span className="hidden text-muted sm:inline"> &nbsp;/&nbsp; {role}</span>
        </p>
      </div>
      <button
        type="button"
        aria-pressed={motionReduced}
        onClick={onToggleMotion}
        className="pointer-events-auto rounded-full border border-paper/20 bg-ink/50 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-paper transition-colors hover:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal aria-pressed:border-signal aria-pressed:text-signal"
      >
        Reduce motion
      </button>
    </header>
  );
}
