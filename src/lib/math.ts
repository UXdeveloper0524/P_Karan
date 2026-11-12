export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/** Smooth ease from 0 to 1 (zero slope at both ends). */
export const smoothstep = (t: number): number => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/**
 * Frame-rate independent smoothing. Moves `current` toward `target`;
 * a higher `lambda` follows faster.
 */
export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number => lerp(current, target, 1 - Math.exp(-lambda * dt));
