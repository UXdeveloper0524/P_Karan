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

export type RoadName = "roadStart" | "roadStraight" | "roadStraightLong" | "roadCornerLarge";

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
  | "raceCarRed"
  | "raceCarGreen"
  | "raceCarOrange"
  | "raceCarWhite"
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

const CORNER_RADIUS = 1.5;
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
  | "gallery"
  | "toolbox"
  | "finish";

const ROUTE: readonly RouteOp[] = [
  // A short lead-in, so the first view looks at the start gantry instead of sitting under it.
  { op: "straight", tiles: 2 },
  { op: "mark", id: "grid" },
  { op: "start" },
  { op: "mark", id: "pits" },
  { op: "straight", tiles: 6 },
  { op: "mark", id: "stands" },
  { op: "right" },
  { op: "straight", tiles: 4 },
  { op: "mark", id: "paddock" },
  { op: "right" },
  { op: "mark", id: "gates" },
  { op: "straight", tiles: 12 },
  { op: "right" },
  { op: "mark", id: "bay" },
  { op: "straight", tiles: 10 },
  { op: "right" },
  { op: "mark", id: "gallery" },
  { op: "straight", tiles: 16 },
  { op: "right" },
  { op: "mark", id: "toolbox" },
  { op: "straight", tiles: 4 },
  { op: "straight", tiles: 2 },
  { op: "mark", id: "finish" },
  { op: "start" },
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

const ROAD_ENTRY: Anchor = [0.5, 0];

function placeRoad(model: RoadName, x: number, z: number, heading: number): Placement {
  const yaw = yawOfHeading(heading);
  const [ox, oz] = rotate(ROAD_ENTRY[0], ROAD_ENTRY[1], yaw);
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
      roads.push(placeRoad("roadCornerLarge", x, z, heading));
      x += (dx + rx) * CORNER_RADIUS;
      z += (dz + rz) * CORNER_RADIUS;
      heading += 1;
      s += CORNER_LENGTH;
    }
  }
  return { roads, segments, marks, length: s };
}

const ROUTE_BUILT = buildRoute(ROUTE);

export const TRACK_LENGTH = ROUTE_BUILT.length;
export const markOf = (id: MarkId): number => ROUTE_BUILT.marks[id];

export interface TrackSample {
  readonly x: number;
  readonly z: number;
  /** Unit direction of travel. */
  readonly dx: number;
  readonly dz: number;
}

/** The point on the road's centre line `s` units from the start, and which way it runs. */
export function sampleTrack(distance: number): TrackSample {
  const s = Math.min(Math.max(distance, 0), TRACK_LENGTH);
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

/** A prop standing on the road itself, front toward the direction of travel. */
function onRoad(model: PropName, distance: number, lateral = 0, scale = 1): Placement {
  const p = besideTrack(distance, lateral);
  return place(model, p.x, p.z, yawFacing(p.tangent.dx, p.tangent.dz), { scale });
}

/** A prop standing across the road, spanning it. */
function across(model: PropName, distance: number): Placement {
  const p = sampleTrack(distance);
  return place(model, p.x, p.z, yawFacing(-p.dx, -p.dz));
}

/* ---------- The project gallery: eight billboards, four on each side ---------- */

export const BILLBOARD_COUNT = 8;
const BILLBOARD_LATERAL = 1.9;
const BILLBOARD_SCALE = 1.45;
const BILLBOARD_FIRST_ROW = 2.3;
const BILLBOARD_ROW_SPACING = 3.7;
const BILLBOARD_GAZE_HEIGHT = 0.72;

/** Even-numbered projects stand on the left, odd-numbered on the right. */
export const billboardSide = (index: number): -1 | 1 => (index % 2 === 0 ? -1 : 1);

/** Distance along the track of the row that holds project `index`. */
export const billboardDistance = (index: number): number =>
  markOf("gallery") + BILLBOARD_FIRST_ROW + Math.floor(index / 2) * BILLBOARD_ROW_SPACING;

/** How far behind a billboard's row the camera sits while studying it. */
const BILLBOARD_VIEW_BACK = 2.6;
const ROW_COUNT = BILLBOARD_COUNT / 2;

/**
 * Camera distance while the gallery plays. `u` runs from 0 to BILLBOARD_COUNT.
 * The camera waits at a row while the gaze swings from the left billboard to the
 * right one, then glides on to the next row.
 */
export function galleryCameraDistance(u: number): number {
  const q = Math.min(Math.max(u, 0), BILLBOARD_COUNT) / 2;
  const row = Math.min(Math.floor(q), ROW_COUNT - 1);
  const frac = q - row;
  const t = Math.min(Math.max((frac - 0.6) / 0.4, 0), 1);
  const eased = t * t * (3 - 2 * t);
  const here = billboardDistance(row * 2);
  const there = row < ROW_COUNT - 1 ? billboardDistance((row + 1) * 2) : here;
  return here + (there - here) * eased - BILLBOARD_VIEW_BACK;
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

/** The kit's cars are toy-sized next to its road; this brings them into proportion. */
const CAR_SCALE = 0.5;

function setPieces(): Placement[] {
  const pieces: Placement[] = [];
  const m = markOf;

  // The grid: four cars wait in staggered rows ahead of the first corner.
  const cars: readonly PropName[] = ["raceCarRed", "raceCarWhite", "raceCarGreen", "raceCarOrange"];
  cars.forEach((car, i) => {
    pieces.push(onRoad(car, m("grid") + 1.9 + i * 0.95, i % 2 === 0 ? -0.2 : 0.2, CAR_SCALE));
  });

  // The pits: garages and an office along the left of the first straight.
  for (let i = 0; i < 5; i += 1) {
    pieces.push(beside(i === 2 ? "pitsOffice" : "pitsGarage", m("pits") + 0.6 + i * 1.15, -1.15));
  }
  pieces.push(beside("pitsOfficeRoof", m("pits") + 0.6 + 2 * 1.15, -1.15));

  // The stands: three covered grandstands on the outside of the first corner.
  pieces.push(beside("grandStandCovered", m("stands") - 0.4, -1.5));
  pieces.push(beside("grandStandCovered", m("stands") + 1.0, -2.2));
  pieces.push(beside("grandStand", m("stands") + 2.4, -2.7));
  pieces.push(beside("grandStandCovered", m("stands") + 4.4, -1.4));
  pieces.push(beside("grandStand", m("stands") + 5.6, -1.4));

  // The paddock: tents and banner towers beside the short straight.
  for (let i = 0; i < 3; i += 1) {
    pieces.push(beside(i === 1 ? "tentClosed" : "tent", m("paddock") - 3.2 + i * 1.4, 1.5));
  }
  pieces.push(beside("bannerTowerRed", m("paddock") - 2.4, -0.95));
  pieces.push(beside("bannerTowerGreen", m("paddock") - 0.9, -0.95));

  // The speed gates: a run of overhead lights across the long straight.
  for (let i = 0; i < 6; i += 1) {
    pieces.push(across("overheadLights", m("gates") + 1.2 + i * 1.6));
  }

  // The bay: a long pit complex on the right of the third straight.
  for (let i = 0; i < 6; i += 1) {
    pieces.push(beside(i === 3 ? "pitsOffice" : "pitsGarage", m("bay") + 0.8 + i * 1.3, 1.15));
  }
  pieces.push(beside("pitsOfficeRoof", m("bay") + 0.8 + 3 * 1.3, 1.15));
  pieces.push(onRoad("raceCarRed", m("bay") + 6.4, 0.2, CAR_SCALE));

  // The toolbox: flags and tents on the way out of the gallery.
  pieces.push(beside("tentClosed", m("toolbox") + 0.6, -1.4));
  pieces.push(beside("tent", m("toolbox") + 1.9, -1.4));
  pieces.push(beside("bannerTowerRed", m("toolbox") + 1.2, 0.9));
  pieces.push(beside("bannerTowerGreen", m("toolbox") + 2.6, 0.9));

  // The finish: stands on both sides, flags along the edge, a gantry across the line.
  const finish = m("finish");
  pieces.push(across("overheadLights", finish - 1.6));
  for (const [offset, lateral] of [
    [-3.4, -1.3],
    [-2.0, -1.3],
    [-3.4, 1.3],
    [-2.0, 1.3],
  ] as const) {
    pieces.push(beside("grandStandCovered", finish + offset, lateral));
  }
  for (let i = 0; i < 4; i += 1) {
    pieces.push(beside("flagCheckers", finish - 4.4 + i * 1.1, i % 2 === 0 ? -0.75 : 0.75));
  }
  pieces.push(beside("lightPostLarge", finish - 1.4, -0.9));
  pieces.push(beside("lightPostLarge", finish - 1.4, 0.9));

  return pieces;
}

/** Barriers on both edges of every straight, alternating red and white. */
function barriers(): Placement[] {
  const result: Placement[] = [];
  let index = 0;
  for (const seg of ROUTE_BUILT.segments) {
    if (seg.kind !== "line" || seg.length < 4) continue;
    for (let d = 0.5; d < seg.length - 0.4; d += 1) {
      for (const side of [-1, 1] as const) {
        const p = besideTrack(seg.s0 + d, side * 0.58);
        const yaw = Math.atan2(-p.tangent.dz, p.tangent.dx);
        result.push(place(index % 2 === 0 ? "barrierRed" : "barrierWhite", p.x, p.z, yaw));
      }
      index += 1;
    }
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
  for (let s = 0; s < TRACK_LENGTH; s += 0.9) {
    for (const side of [-1, 1] as const) {
      const lateral = side * (2.6 + random() * 6.5);
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

