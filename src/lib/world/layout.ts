/**
 * The circuit: one road, laid out tile by tile, plus everything standing beside it.
 * This file is pure data and maths (no three.js), so the journey config and the
 * renderer can both use it.
 *
 * Units: one unit is one road tile, which is also the road's width.
 * Positions are on the ground plane as (x, z). A heading is 0 (-Z), 1 (+X), 2 (+Z) or 3 (-X);
 * a right turn is heading + 1, so the whole lap turns clockwise.
 */

export type Vec3 = readonly [number, number, number];

/* ---------- Models ---------- */

export type RoadName = "roadStart" | "roadStraight" | "roadStraightLong" | "roadCornerLarger";

export type PropName =
  | "grandStandCovered"
  | "grandStand"
  | "pitsGarage"
  | "pitsOffice"
  | "pitsOfficeRoof"
  | "tent"
  | "tentClosed"
  | "billboard"
  | "overheadLights"
  | "treeLarge"
  | "treeSmall"
  | "bannerTowerRed"
  | "bannerTowerGreen"
  | "flagCheckers"
  | "flagGreen"
  | "flagRed"
  | "lightPostLarge"
  | "barrierRed"
  | "barrierWhite";

export type ModelName = RoadName | PropName | "grass";

export const modelUrl = (name: ModelName): string => `/models/racing/${name}.glb`;

/**
 * Where each model's pivot sits, as (x, z) in its own space, once the kit's
 * export offset is removed. Placing a model puts this point on the target spot.
 */
type Anchor = readonly [number, number];
const TILE_CENTER: Anchor = [0.5, -0.5];
const ANCHORS: Readonly<Partial<Record<ModelName, Anchor>>> = {
  grandStandCovered: TILE_CENTER,
  grandStand: TILE_CENTER,
  pitsGarage: TILE_CENTER,
  pitsOffice: TILE_CENTER,
  pitsOfficeRoof: TILE_CENTER,
  tent: TILE_CENTER,
  tentClosed: TILE_CENTER,
  billboard: [0.44, -0.2],
  overheadLights: [0.5, 0.1],
  bannerTowerRed: [0.2, -0.2],
  bannerTowerGreen: [0.2, -0.2],
  flagCheckers: [0.1, -0.02],
  flagGreen: [0.1, -0.02],
  flagRed: [0.1, -0.02],
  barrierRed: [0.5, -0.06],
  barrierWhite: [0.5, -0.06],
};

/* ---------- Placements ---------- */

export interface Placement {
  readonly model: ModelName;
  /** Where the model's own origin goes on the ground, and its turn about the Y axis. */
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** Uniform size; the pivot stays where it was placed. */
  readonly scale: number;
  readonly tag?: "billboard";
}

/** Rotate a local (x, z) offset by a yaw, matching three.js rotation.y. */
const rotate = (x: number, z: number, yaw: number): readonly [number, number] => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

/** Put `model`'s anchor on ground point (x, z), turned by `yaw`. */
function place(
  model: ModelName,
  x: number,
  z: number,
  yaw: number,
  options: { readonly tag?: "billboard"; readonly scale?: number } = {},
): Placement {
  const scale = options.scale ?? 1;
  const [ax, az] = ANCHORS[model] ?? [0, 0];
  const [ox, oz] = rotate(ax * scale, az * scale, yaw);
  return { model, x: x - ox, z: z - oz, yaw, scale, tag: options.tag };
}

/* ---------- The route ---------- */

/** The kit's widest corner: a 3 by 3 tile whose centre line has a radius of 2.5. */
const CORNER_RADIUS = 2.5;
const CORNER_LENGTH = (Math.PI / 2) * CORNER_RADIUS;

type RouteOp =
  | { readonly op: "start" }
  | { readonly op: "straight"; readonly tiles: number }
  | { readonly op: "right" }
  | { readonly op: "mark"; readonly id: MarkId };

export type MarkId =
  | "grid"
  | "pits"
  | "stands"
  | "paddock"
  | "gates"
  | "bay"
  | "galleryA"
  | "galleryB"
  | "stats";

/**
 * A closed lap, clockwise: four straights joined by four wide corners. A rectangle only
 * closes when opposite sides match, so side 1 equals side 3 (20 tiles) and side 2 equals
 * side 4 (32 tiles). Every mark sits on a tile edge, so scenery can be snapped to tile centres.
 * The lap starts and ends at the start line.
 */
const ROUTE: readonly RouteOp[] = [
  { op: "mark", id: "grid" },
  // Side 1 (20): a lead-in, the start gantry, the pit lane, then the grandstands.
  { op: "straight", tiles: 2 },
  { op: "start" },
  { op: "straight", tiles: 2 },
  { op: "mark", id: "pits" },
  { op: "straight", tiles: 7 },
  { op: "mark", id: "stands" },
  { op: "straight", tiles: 7 },
  { op: "right" },
  // Side 2 (32): the paddock, then the run under the overhead lights.
  { op: "mark", id: "paddock" },
  { op: "straight", tiles: 14 },
  { op: "mark", id: "gates" },
  { op: "straight", tiles: 18 },
  { op: "right" },
  // Side 3 (20): the pit bay, then the first gallery run.
  { op: "mark", id: "bay" },
  { op: "straight", tiles: 7 },
  { op: "mark", id: "galleryA" },
  { op: "straight", tiles: 13 },
  { op: "right" },
  // Side 4 (32): the second gallery run, then the stats, then round to the start line.
  { op: "mark", id: "galleryB" },
  { op: "straight", tiles: 24 },
  { op: "mark", id: "stats" },
  { op: "straight", tiles: 8 },
  { op: "right" },
];

interface LineSegment {
  readonly kind: "line";
  readonly s0: number;
  readonly length: number;
  readonly x: number;
  readonly z: number;
  readonly dx: number;
  readonly dz: number;
}

interface ArcSegment {
  readonly kind: "arc";
  readonly s0: number;
  readonly length: number;
  readonly x: number;
  readonly z: number;
  /** Heading on entry and the direction to the right of it. */
  readonly dx: number;
  readonly dz: number;
}

type TrackSegment = LineSegment | ArcSegment;

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const yawOfHeading = (heading: number): number => -heading * (Math.PI / 2);
const directionOf = (heading: number): readonly [number, number] =>
  DIRECTIONS[((heading % 4) + 4) % 4] as readonly [number, number];

/**
 * Where the road enters each tile, in the model's own space. Every tile is one unit wide with
 * the road in the middle, except the start tile, whose road sits 0.135 to one side in the kit.
 */
const ROAD_ENTRY: Readonly<Record<RoadName, Anchor>> = {
  roadStart: [0.635, 0],
  roadStraight: [0.5, 0],
  roadStraightLong: [0.5, 0],
  roadCornerLarger: [0.5, 0],
};

function placeRoad(model: RoadName, x: number, z: number, heading: number): Placement {
  const yaw = yawOfHeading(heading);
  const [ox, oz] = rotate(ROAD_ENTRY[model][0], ROAD_ENTRY[model][1], yaw);
  return { model, x: x - ox, z: z - oz, yaw, scale: 1 };
}

interface BuiltRoute {
  readonly roads: readonly Placement[];
  readonly segments: readonly TrackSegment[];
  readonly marks: Readonly<Record<MarkId, number>>;
  readonly length: number;
}

function buildRoute(ops: readonly RouteOp[]): BuiltRoute {
  const roads: Placement[] = [];
  const segments: TrackSegment[] = [];
  const marks = {} as Record<MarkId, number>;
  let x = 0;
  let z = 0;
  let heading = 0;
  let s = 0;

  const straightRun = (tiles: number): void => {
    const [dx, dz] = directionOf(heading);
    segments.push({ kind: "line", s0: s, length: tiles, x, z, dx, dz });
    let left = tiles;
    while (left > 0) {
      const long = left >= 2;
      roads.push(placeRoad(long ? "roadStraightLong" : "roadStraight", x, z, heading));
      const step = long ? 2 : 1;
      x += dx * step;
      z += dz * step;
      left -= step;
    }
    s += tiles;
  };

  for (const step of ops) {
    if (step.op === "mark") marks[step.id] = s;
    else if (step.op === "start") {
      const [dx, dz] = directionOf(heading);
      segments.push({ kind: "line", s0: s, length: 2, x, z, dx, dz });
      roads.push(placeRoad("roadStart", x, z, heading));
      x += dx * 2;
      z += dz * 2;
      s += 2;
    } else if (step.op === "straight") straightRun(step.tiles);
    else {
      const [dx, dz] = directionOf(heading);
      const [rx, rz] = directionOf(heading + 1);
      segments.push({ kind: "arc", s0: s, length: CORNER_LENGTH, x, z, dx, dz });
      roads.push(placeRoad("roadCornerLarger", x, z, heading));
      x += (dx + rx) * CORNER_RADIUS;
      z += (dz + rz) * CORNER_RADIUS;
      heading += 1;
      s += CORNER_LENGTH;
    }
  }
  // The lap must come back to where it began, facing the way it began.
  if (Math.hypot(x, z) > 1e-6 || ((heading % 4) + 4) % 4 !== 0) {
    throw new Error(`The route does not close: it ends at (${x}, ${z}) heading ${heading}`);
  }
  return { roads, segments, marks, length: s };
}

const ROUTE_BUILT = buildRoute(ROUTE);

/** Length of one lap. The road is a closed loop, so distances wrap around this. */
export const TRACK_LENGTH = ROUTE_BUILT.length;
/** The camera's place on the road when the story ends: just past the start line, a lap later. */
export const FINISH_DISTANCE = TRACK_LENGTH + 5;
export const markOf = (id: MarkId): number => ROUTE_BUILT.marks[id];

export interface TrackSample {
  readonly x: number;
  readonly z: number;
  /** Unit direction of travel. */
  readonly dx: number;
  readonly dz: number;
}

/** The point on the road's centre line `distance` units from the start (wrapping each lap), and which way it runs. */
export function sampleTrack(distance: number): TrackSample {
  const s = ((distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  const found = ROUTE_BUILT.segments.find((seg) => s <= seg.s0 + seg.length) ?? ROUTE_BUILT.segments[ROUTE_BUILT.segments.length - 1];
  const seg = found as TrackSegment;
  const local = s - seg.s0;

  if (seg.kind === "line") {
    return { x: seg.x + seg.dx * local, z: seg.z + seg.dz * local, dx: seg.dx, dz: seg.dz };
  }
  // Arc: turn right about a centre one radius to the right of the entry point.
  const rx = -seg.dz;
  const rz = seg.dx;
  const phi = local / CORNER_RADIUS;
  const cx = seg.x + rx * CORNER_RADIUS;
  const cz = seg.z + rz * CORNER_RADIUS;
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  return {
    x: cx - rx * CORNER_RADIUS * cos + seg.dx * CORNER_RADIUS * sin,
    z: cz - rz * CORNER_RADIUS * cos + seg.dz * CORNER_RADIUS * sin,
    dx: seg.dx * cos + rx * sin,
    dz: seg.dz * cos + rz * sin,
  };
}

/** A point `lateral` units to the right of the road's centre (negative is left). */
export function besideTrack(distance: number, lateral: number): { x: number; z: number; tangent: TrackSample } {
  const t = sampleTrack(distance);
  return { x: t.x - t.dz * lateral, z: t.z + t.dx * lateral, tangent: t };
}

/** Yaw that turns a model's front (+Z) toward the given ground direction. */
const yawFacing = (dx: number, dz: number): number => Math.atan2(dx, dz);

/* ---------- Dressing ---------- */

/** A small deterministic random source, so the scenery is the same on every visit. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Put a prop beside the road, with its front toward the road. */
function beside(
  model: PropName,
  distance: number,
  lateral: number,
  options: { readonly tag?: "billboard"; readonly scale?: number; readonly turn?: number } = {},
): Placement {
  const p = besideTrack(distance, lateral);
  const side = Math.sign(lateral) || 1;
  // The road lies in the direction opposite the side the prop sits on.
  const toRoadX = p.tangent.dz * side;
  const toRoadZ = -p.tangent.dx * side;
  return place(model, p.x, p.z, yawFacing(toRoadX, toRoadZ) + (options.turn ?? 0), options);
}

/** Gantries are scaled up so the camera passes under their beam. */
const GANTRY_SCALE = 1.6;

/** A prop standing across the road, spanning it. */
function across(model: PropName, distance: number, scale = GANTRY_SCALE): Placement {
  const p = sampleTrack(distance);
  return place(model, p.x, p.z, yawFacing(-p.dx, -p.dz), { scale });
}

/* ---------- The project gallery: nine billboards in two runs, alternating sides ---------- */

export interface GalleryRun {
  readonly mark: MarkId;
  /** Global index of the run's first billboard, and how many it holds. */
  readonly first: number;
  readonly count: number;
}

/** Live projects line the third side; projects in development line the fourth. */
export const GALLERY_RUNS: readonly GalleryRun[] = [
  { mark: "galleryA", first: 0, count: 3 },
  { mark: "galleryB", first: 3, count: 6 },
];

export const BILLBOARD_COUNT = GALLERY_RUNS.reduce((sum, run) => sum + run.count, 0);
const BILLBOARD_LATERAL = 2.3;
const BILLBOARD_SCALE = 1.9;
const BILLBOARD_FIRST_ROW = 2.5;
const BILLBOARD_ROW_SPACING = 4;
const BILLBOARD_GAZE_HEIGHT = 1.1;
/** How far behind a billboard the camera sits while studying it. */
const BILLBOARD_VIEW_BACK = 2.6;

/** Billboards alternate sides along the whole gallery: left, right, left, and so on. */
export const billboardSide = (index: number): -1 | 1 => (index % 2 === 0 ? -1 : 1);

const runOf = (index: number): GalleryRun =>
  GALLERY_RUNS.find((run) => index >= run.first && index < run.first + run.count) as GalleryRun;

/** Distance along the track of billboard `index`, at the centre of a tile. */
export const billboardDistance = (index: number): number => {
  const run = runOf(index);
  return markOf(run.mark) + BILLBOARD_FIRST_ROW + (index - run.first) * BILLBOARD_ROW_SPACING;
};

/** The run that holds the first billboard at or after `first`. */
export const galleryRun = (first: number): GalleryRun => runOf(first);

const ease = (t: number): number => t * t * (3 - 2 * t);

/** Where the camera is inside a run, for `u` from 0 to the run's count. */
function runPosition(run: GalleryRun, u: number): { local: number; frac: number } {
  const clamped = Math.min(Math.max(u, 0), run.count);
  const local = Math.min(Math.floor(clamped), run.count - 1);
  return { local, frac: clamped - local };
}

/**
 * Camera distance while a gallery run plays. The camera waits behind each billboard,
 * then glides on to the next one.
 */
export function galleryCameraDistance(run: GalleryRun, u: number): number {
  const { local, frac } = runPosition(run, u);
  const t = ease(Math.min(Math.max((frac - 0.6) / 0.4, 0), 1));
  const here = billboardDistance(run.first + local);
  const there = local < run.count - 1 ? billboardDistance(run.first + local + 1) : here;
  return here + (there - here) * t - BILLBOARD_VIEW_BACK;
}

/** The billboard to look at (and describe) at `u`: it switches halfway through the glide. */
export function galleryActiveIndex(run: GalleryRun, u: number): number {
  const { local, frac } = runPosition(run, u);
  return run.first + (frac >= 0.75 && local < run.count - 1 ? local + 1 : local);
}

/** Where to look, in the camera's own frame, to study project `index` from distance `s`. */
export function billboardGaze(index: number, cameraDistance: number, eyeHeight: number): Vec3 {
  return [
    billboardSide(index) * BILLBOARD_LATERAL,
    BILLBOARD_GAZE_HEIGHT - eyeHeight,
    billboardDistance(index) - cameraDistance,
  ];
}

const billboards: readonly Placement[] = Array.from({ length: BILLBOARD_COUNT }, (_, index) =>
  beside("billboard", billboardDistance(index), billboardSide(index) * BILLBOARD_LATERAL, {
    tag: "billboard",
    scale: BILLBOARD_SCALE,
  }),
);

/* ---------- Set pieces, one per stop ---------- */

/** The centre of the `k`th tile after a mark. */
const tile = (id: MarkId, k: number): number => markOf(id) + k + 0.5;

/** Lateral offsets from the centre line. Positive is the inside of the loop. */
const OUTSIDE = -1.3;
const INSIDE = 1.3;

function setPieces(): Placement[] {
  const pieces: Placement[] = [];

  // The start line: stands and flags on both sides of the gantry. The lap ends here too.
  for (const lateral of [-1.5, 1.5]) {
    pieces.push(beside("grandStandCovered", 3.5, lateral));
    pieces.push(beside("grandStandCovered", 4.5, lateral));
    pieces.push(beside("grandStand", 5.5, lateral));
  }
  for (let i = 0; i < 4; i += 1) {
    pieces.push(beside("flagCheckers", 1.5 + i, i % 2 === 0 ? -0.78 : 0.78));
  }
  pieces.push(beside("lightPostLarge", 2.5, -0.9));
  pieces.push(beside("lightPostLarge", 2.5, 0.9));

  // Qualifying: garages and an office along the inside of the first straight.
  for (let i = 0; i < 5; i += 1) {
    pieces.push(beside(i === 2 ? "pitsOffice" : "pitsGarage", tile("pits", i), INSIDE));
  }
  pieces.push(beside("pitsOfficeRoof", tile("pits", 2), INSIDE));

  // Rookie season: covered grandstands along the left of the straight before the first corner.
  for (let i = 0; i < 6; i += 1) {
    pieces.push(beside(i % 3 === 2 ? "grandStand" : "grandStandCovered", tile("stands", i), -1.6));
  }

  // Design sector: tents inside the loop and banner towers on the outside.
  for (let i = 0; i < 5; i += 1) {
    pieces.push(beside(i % 2 === 1 ? "tentClosed" : "tent", tile("paddock", i + 1), INSIDE));
  }
  for (let i = 0; i < 3; i += 1) {
    pieces.push(beside(i % 2 === 0 ? "bannerTowerRed" : "bannerTowerGreen", tile("paddock", 1 + i * 2), -0.95));
  }

  // Full throttle: a run of overhead lights across the straight, one every two tiles.
  for (let i = 0; i < 8; i += 1) {
    pieces.push(across("overheadLights", markOf("gates") + 1 + i * 2));
  }

  // Current lap: a pit complex inside the loop.
  for (let i = 0; i < 5; i += 1) {
    pieces.push(beside(i === 2 ? "pitsOffice" : "pitsGarage", tile("bay", i + 1), INSIDE));
  }
  pieces.push(beside("pitsOfficeRoof", tile("bay", 3), INSIDE));

  // Lap time: tents and banner towers on the run back to the start line.
  pieces.push(beside("tentClosed", tile("stats", 1), OUTSIDE));
  pieces.push(beside("tent", tile("stats", 2), OUTSIDE));
  pieces.push(beside("tentClosed", tile("stats", 3), OUTSIDE));
  pieces.push(beside("bannerTowerRed", tile("stats", 1), 0.95));
  pieces.push(beside("bannerTowerGreen", tile("stats", 3), 0.95));

  return pieces;
}

/**
 * Barriers on both edges of the road, alternating red and white. Each edge is split into a
 * whole number of equal pieces, so the barriers meet end to end on straights and curves alike.
 */
function barriers(): Placement[] {
  const result: Placement[] = [];
  let index = 0;
  for (const seg of ROUTE_BUILT.segments) {
    // The lead-in and start tile stay clear, so the gantry and its stands read cleanly.
    if (seg.kind === "line" && seg.length < 4) continue;
    for (const side of [-1, 1] as const) {
      const edge = seg.kind === "line" ? seg.length : (CORNER_RADIUS + side * -0.58) * (Math.PI / 2);
      const count = Math.max(1, Math.round(edge));
      for (let k = 0; k < count; k += 1) {
        const d = ((k + 0.5) / count) * seg.length;
        const p = besideTrack(seg.s0 + d, side * 0.58);
        const yaw = Math.atan2(-p.tangent.dz, p.tangent.dx);
        result.push(place((index + k) % 2 === 0 ? "barrierRed" : "barrierWhite", p.x, p.z, yaw));
      }
    }
    index += 1;
  }
  return result;
}

/** Trees, kept off every road and out of the way of the set pieces. */
function trees(taken: readonly Placement[]): Placement[] {
  const random = seeded(2018);
  const centreLine: { x: number; z: number }[] = [];
  for (let s = 0; s <= TRACK_LENGTH; s += 0.25) centreLine.push(sampleTrack(s));
  const occupied = taken.map((p) => ({ x: p.x, z: p.z }));

  const clear = (x: number, z: number): boolean =>
    centreLine.every((c) => Math.hypot(c.x - x, c.z - z) > 1.7) &&
    occupied.every((o) => Math.hypot(o.x - x, o.z - z) > 1.1);

  const result: Placement[] = [];
  for (let s = 0; s < TRACK_LENGTH; s += 0.75) {
    for (const side of [-1, 1] as const) {
      const lateral = side * (2.6 + random() * 8);
      const p = besideTrack(s + random() * 0.8, lateral);
      if (!clear(p.x, p.z)) continue;
      result.push({
        model: random() > 0.55 ? "treeLarge" : "treeSmall",
        x: p.x,
        z: p.z,
        yaw: random() * Math.PI * 2,
        scale: 1,
      });
      occupied.push({ x: p.x, z: p.z });
    }
  }
  return result;
}

export const ROAD_PLACEMENTS: readonly Placement[] = ROUTE_BUILT.roads;

export const PROP_PLACEMENTS: readonly Placement[] = (() => {
  const fixed = [...setPieces(), ...billboards];
  return [...fixed, ...barriers(), ...trees(fixed)];
})();

/** Every model the scene needs, so the loader fetches each one once. */
export const ALL_MODELS: readonly ModelName[] = Array.from(
  new Set<ModelName>(["grass", ...ROAD_PLACEMENTS.map((p) => p.model), ...PROP_PLACEMENTS.map((p) => p.model)]),
);

