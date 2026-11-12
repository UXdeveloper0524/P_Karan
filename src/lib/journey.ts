import { clamp, lerp, smoothstep } from "@/lib/math";
import {
  BILLBOARD_COUNT,
  billboardGaze,
  galleryCameraDistance,
  markOf,
  TRACK_LENGTH,
  type Vec3,
} from "@/lib/world/layout";
import type { StopId } from "@/types/story";

/**
 * The journey maps one number, scroll progress (0 to 1), to everything the
 * page needs: how far along the road the camera is, where it looks, which text
 * is visible and which project billboard is active. It is pure, so it is easy to test.
 *
 * Gaze vectors are in the camera's own frame: [right, up, forward].
 */

/** Camera height above the road, a little over a race car's roof. */
export const EYE_HEIGHT = 0.42;
export const DEFAULT_GAZE: Vec3 = [0, -0.16, 3];

interface JourneyStopConfig {
  readonly id: StopId;
  /** Share of the total scroll length. */
  readonly weight: number;
  /** Fraction of the stop spent at its anchor; the rest is travel to the next stop. */
  readonly holdRatio: number;
  /** Distance along the road at the start and end of the hold. */
  readonly sFrom: number;
  readonly sTo: number;
  /** Where to look during the hold, relative to the camera. */
  readonly gaze?: Vec3;
}

export const JOURNEY: readonly JourneyStopConfig[] = [
  { id: "grid", weight: 0.9, holdRatio: 0.5, sFrom: 0, sTo: 0.6 },
  {
    id: "about",
    weight: 1,
    holdRatio: 0.6,
    sFrom: markOf("pits") + 0.4,
    sTo: markOf("pits") + 2.2,
    gaze: [-1.4, -0.02, 2.6],
  },
  {
    id: "climb",
    weight: 1.1,
    holdRatio: 0.65,
    sFrom: markOf("stands") - 0.2,
    sTo: markOf("stands") + 1.4,
    gaze: [-2.2, 0.3, 2.2],
  },
  {
    id: "design",
    weight: 1,
    holdRatio: 0.6,
    sFrom: markOf("paddock") - 3.4,
    sTo: markOf("paddock") - 1.8,
    gaze: [1.8, -0.04, 2.4],
  },
  { id: "speed", weight: 0.9, holdRatio: 0.55, sFrom: markOf("gates") + 0.2, sTo: markOf("gates") + 7.5 },
  {
    id: "engineering",
    weight: 1.1,
    holdRatio: 0.6,
    sFrom: markOf("bay") + 0.2,
    sTo: markOf("bay") + 3.2,
    gaze: [1.6, 0.04, 2.6],
  },
  {
    id: "projects",
    weight: 4.4,
    holdRatio: 0.92,
    sFrom: galleryCameraDistance(0),
    sTo: galleryCameraDistance(BILLBOARD_COUNT),
  },
  {
    id: "toolbox",
    weight: 1,
    holdRatio: 0.6,
    sFrom: markOf("toolbox") + 0.4,
    sTo: markOf("toolbox") + 1.6,
    gaze: [-1.2, 0.04, 2.8],
  },
  {
    id: "contact",
    weight: 1,
    holdRatio: 1,
    sFrom: markOf("finish") - 4.8,
    sTo: markOf("finish") - 4.8,
    gaze: [0, 0.05, 3.2],
  },
];

export const STOP_COUNT = JOURNEY.length;
const PROJECTS_INDEX = JOURNEY.findIndex((stop) => stop.id === "projects");
const TOTAL_WEIGHT = JOURNEY.reduce((sum, stop) => sum + stop.weight, 0);

/** Scroll length per unit of weight, as a percentage of the viewport height. */
const SCROLL_VH_PER_WEIGHT = 80;
export const TRACK_HEIGHT_VH = Math.round(TOTAL_WEIGHT * SCROLL_VH_PER_WEIGHT) + 100;

const RANGES: readonly { readonly start: number; readonly end: number }[] = (() => {
  let consumed = 0;
  return JOURNEY.map((stop) => {
    const start = consumed / TOTAL_WEIGHT;
    consumed += stop.weight;
    return { start, end: consumed / TOTAL_WEIGHT };
  });
})();

export interface JourneyState {
  readonly progress: number;
  /** How far along the road the camera is. */
  readonly distance: number;
  readonly stopIndex: number;
  /** Which project billboard is active, or -1 outside the gallery. */
  readonly projectIndex: number;
  /** One visibility value (0 to 1) per stop. */
  readonly opacities: readonly number[];
  /** Look direction relative to the camera: [right, up, forward]. */
  readonly gaze: Vec3;
}

function stopVisibility(index: number, local: number, hold: number): number {
  const fadeIn = index === 0 ? 1 : smoothstep(local / 0.14);
  const isLast = index === STOP_COUNT - 1;
  const fadeOut = isLast
    ? 1
    : 1 - smoothstep((local - (hold - 0.04)) / ((1 - hold) * 0.6 + 0.04));
  return fadeIn * fadeOut;
}

const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

export function resolveJourney(progress: number): JourneyState {
  const p = clamp(progress);
  const found = RANGES.findIndex((range) => p < range.end);
  const index = found === -1 ? STOP_COUNT - 1 : found;

  const config = JOURNEY[index] as JourneyStopConfig;
  const range = RANGES[index] as { start: number; end: number };
  const next = JOURNEY[index + 1];

  const local = clamp((p - range.start) / (range.end - range.start));
  const hold = config.holdRatio;
  const holdFraction = clamp(local / hold);

  const holding = local <= hold || !next;
  const holdDistance =
    index === PROJECTS_INDEX
      ? galleryCameraDistance(holdFraction * BILLBOARD_COUNT)
      : lerp(config.sFrom, config.sTo, holdFraction);
  const distance = Math.min(
    TRACK_LENGTH,
    holding ? holdDistance : lerp(config.sTo, next.sFrom, smoothstep((local - hold) / (1 - hold))),
  );

  const opacities = JOURNEY.map((_, i) =>
    i === index ? stopVisibility(index, local, hold) : 0,
  );
  const visibility = opacities[index] ?? 0;

  const projectIndex =
    index === PROJECTS_INDEX
      ? Math.min(BILLBOARD_COUNT - 1, Math.floor(holdFraction * BILLBOARD_COUNT))
      : -1;

  let target = config.gaze ?? DEFAULT_GAZE;
  if (projectIndex >= 0) target = billboardGaze(projectIndex, distance, EYE_HEIGHT);
  const gaze = lerpVec(DEFAULT_GAZE, target, visibility);

  return { progress: p, distance, stopIndex: index, projectIndex, opacities, gaze };
}
