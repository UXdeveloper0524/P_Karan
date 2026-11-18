import { clamp, lerp, smoothstep } from "@/lib/math";
import { CAMERA_HEIGHT } from "@/lib/world/rig";
import {
  GALLERY_RUNS,
  billboardGaze,
  galleryActiveIndex,
  galleryCameraDistance,
  markOf,
  FINISH_DISTANCE,
  type GalleryRun,
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

/**
 * The camera rides behind the hero car (see rig.ts), so `distance` is the camera's place
 * on the road and the car is a little further on. The default gaze leans left, which puts the
 * car on the right of the screen, clear of the text.
 */
export const DEFAULT_GAZE: Vec3 = [-0.4, -0.2, 3];

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
  /** Set on gallery stops: the run of billboards the camera studies. */
  readonly run?: GalleryRun;
}

const [RUN_LIVE, RUN_GARAGE] = GALLERY_RUNS as readonly [GalleryRun, GalleryRun];

const galleryStop = (id: StopId, run: GalleryRun, weight: number): JourneyStopConfig => ({
  id,
  weight,
  holdRatio: 0.92,
  sFrom: galleryCameraDistance(run, 0),
  sTo: galleryCameraDistance(run, run.count),
  run,
});

/** One entry per slide, in lap order. Must match `STOPS` in `data/story.ts`. */
export const JOURNEY: readonly JourneyStopConfig[] = [
  { id: "grid", weight: 0.9, holdRatio: 0.5, sFrom: 0, sTo: 0.6 },
  {
    id: "qualifying",
    weight: 1.2,
    holdRatio: 0.6,
    sFrom: markOf("pits") + 0.4,
    sTo: markOf("pits") + 2.2,
    gaze: [1.0, -0.04, 2.6],
  },
  {
    id: "rookie",
    weight: 1.2,
    holdRatio: 0.65,
    sFrom: markOf("stands") - 0.2,
    sTo: markOf("stands") + 1.6,
    gaze: [-1.5, 0.26, 2.4],
  },
  {
    id: "design",
    weight: 1.2,
    holdRatio: 0.6,
    sFrom: markOf("paddock") + 0.2,
    sTo: markOf("paddock") + 2,
    gaze: [0.7, -0.06, 2.6],
  },
  { id: "throttle", weight: 1.2, holdRatio: 0.6, sFrom: markOf("gates") + 0.2, sTo: markOf("gates") + 9.5 },
  {
    id: "present",
    weight: 1.1,
    holdRatio: 0.6,
    sFrom: markOf("bay") + 0.2,
    sTo: markOf("bay") + 3.2,
    gaze: [0.75, -0.02, 2.6],
  },
  galleryStop("live", RUN_LIVE, 2.4),
  galleryStop("garage", RUN_GARAGE, 4.6),
  {
    id: "laptime",
    weight: 1.1,
    holdRatio: 0.6,
    sFrom: markOf("stats") + 0.4,
    sTo: markOf("stats") + 1.8,
    gaze: [-0.9, 0.0, 2.8],
  },
  {
    id: "finish",
    weight: 1,
    holdRatio: 1,
    sFrom: FINISH_DISTANCE,
    sTo: FINISH_DISTANCE,
    gaze: [-0.3, 0.0, 3.2],
  },
];

export const STOP_COUNT = JOURNEY.length;
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
  /** Which project billboard is active (counted across both runs), or -1 outside the gallery. */
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
  const run = config.run;
  const holdDistance = run
    ? galleryCameraDistance(run, holdFraction * run.count)
    : lerp(config.sFrom, config.sTo, holdFraction);
  const distance = Math.min(
    FINISH_DISTANCE,
    holding ? holdDistance : lerp(config.sTo, next.sFrom, smoothstep((local - hold) / (1 - hold))),
  );

  const opacities = JOURNEY.map((_, i) =>
    i === index ? stopVisibility(index, local, hold) : 0,
  );
  const visibility = opacities[index] ?? 0;

  const projectIndex = run ? galleryActiveIndex(run, holdFraction * run.count) : -1;

  let target = config.gaze ?? DEFAULT_GAZE;
  if (projectIndex >= 0) target = billboardGaze(projectIndex, distance, CAMERA_HEIGHT);
  const gaze = lerpVec(DEFAULT_GAZE, target, visibility);

  return { progress: p, distance, stopIndex: index, projectIndex, opacities, gaze };
}

// Fail loudly if the stops are out of order along the lap (a bad mark would make the car jump back).
JOURNEY.forEach((stop, i) => {
  const previous = JOURNEY[i - 1];
  if (previous && stop.sFrom < previous.sTo - 1e-6) {
    throw new Error(`Stop "${stop.id}" starts behind "${previous.id}" on the road`);
  }
});
