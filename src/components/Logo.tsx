import { useId, type CSSProperties } from "react";

interface LogoProps {
  readonly size?: number;
  readonly className?: string;
  /** Draw the mark in: the badge fades up, the letters trace themselves, then the track line. */
  readonly animate?: boolean;
}

const LETTERS = ["M16 45V19h8a7 7 0 0 1 0 14H16", "M36 45V19M36 33l11-14M40.5 29 48 45"] as const;
const TRACK = "M13 53c10 4.5 28 4.5 38-3";

/**
 * The PK monogram: a brass badge with the letters cut in ink and a thin racing line sweeping
 * underneath, ending in a dot, the car, as the road does in the story.
 * `app/icon.svg` is the same drawing.
 */
export function Logo({ size = 32, className, animate = false }: LogoProps) {
  const gradient = useId();

  const draw = (delay: number, duration = 0.8): { className?: string; style?: CSSProperties; pathLength?: number } =>
    animate
      ? {
          className: "logo-draw",
          pathLength: 1,
          style: {
            strokeDasharray: 1,
            strokeDashoffset: 1,
            animation: `draw ${duration}s cubic-bezier(0.65, 0, 0.35, 1) ${delay}s forwards`,
          },
        }
      : {};

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="PK monogram" className={className}>
      <defs>
        <linearGradient id={gradient} x1="8" y1="4" x2="56" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ecd49c" />
          <stop offset="1" stopColor="#b48a42" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        fill={`url(#${gradient})`}
        className={animate ? "logo-badge" : undefined}
        style={animate ? { transformOrigin: "32px 32px", animation: "badge-in 0.6s ease-out both" } : undefined}
      />
      <g fill="none" stroke="#0d0f14" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={LETTERS[0]} {...draw(0.35)} />
        <path d={LETTERS[1]} {...draw(0.65)} />
      </g>
      <path d={TRACK} fill="none" stroke="#0d0f14" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6" {...draw(1.1, 0.7)} />
      <circle
        cx="51"
        cy="50"
        r="2.3"
        fill="#0d0f14"
        className={animate ? "logo-rise" : undefined}
        style={animate ? { animation: "rise 0.4s ease-out 1.7s both" } : undefined}
      />
    </svg>
  );
}
