import { Group, MathUtils, type Object3D } from "three";
import { sampleTrack } from "@/lib/world/layout";
import { CAR_SCALE, WHEEL_RADIUS, type IgnitionState } from "@/lib/world/rig";

const WHEEL_NAMES = {
  frontLeft: "wheel-front-left",
  frontRight: "wheel-front-right",
  backLeft: "wheel-back-left",
  backRight: "wheel-back-right",
} as const;

/** How far ahead on the road the front wheels look when they steer. */
const STEER_LOOK_AHEAD = 0.5;
const MAX_STEER = 0.5;

const SHAKE: Readonly<Record<IgnitionState, number>> = {
  off: 0,
  starting: 0.0045,
  running: 0.0011,
};

export interface CarUpdate {
  /** Where the car's centre sits on the road. */
  readonly distance: number;
  /** Seconds, for the engine shake. */
  readonly seconds: number;
  readonly ignition: IgnitionState;
  readonly reduced: boolean;
}

export interface Car {
  readonly object: Group;
  update(input: CarUpdate): void;
}

const wrapAngle = (angle: number): number => {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
};

/**
 * Wraps a loaded car model so it can follow the road: it turns with the bend,
 * its wheels roll with the distance travelled, the front wheels steer, and the
 * body shakes while the engine runs.
 */
export function createCar(source: Object3D): Car {
  const object = new Group();
  const model = source.clone(true);
  model.scale.setScalar(CAR_SCALE);
  object.add(model);

  const find = (name: string): Object3D | undefined => model.getObjectByName(name);
  const body = find("body");
  const front = [find(WHEEL_NAMES.frontLeft), find(WHEEL_NAMES.frontRight)].filter(
    (wheel): wheel is Object3D => wheel !== undefined,
  );
  const back = [find(WHEEL_NAMES.backLeft), find(WHEEL_NAMES.backRight)].filter(
    (wheel): wheel is Object3D => wheel !== undefined,
  );
  // Steer first, then spin: the spin axis must follow the steering.
  [...front, ...back].forEach((wheel) => {
    wheel.rotation.order = "YXZ";
  });

  model.traverse((node) => {
    node.castShadow = true;
    node.receiveShadow = true;
  });

  const bodyBaseY = body?.position.y ?? 0;

  return {
    object,
    update({ distance, seconds, ignition, reduced }) {
      const here = sampleTrack(distance);
      const ahead = sampleTrack(distance + STEER_LOOK_AHEAD);
      const yaw = Math.atan2(here.dx, here.dz);
      const turn = wrapAngle(Math.atan2(ahead.dx, ahead.dz) - yaw);
      const steer = MathUtils.clamp(turn * 1.1, -MAX_STEER, MAX_STEER);

      object.position.set(here.x, 0, here.z);
      object.rotation.y = yaw;

      const spin = distance / (WHEEL_RADIUS * CAR_SCALE);
      front.forEach((wheel) => {
        wheel.rotation.y = steer;
        wheel.rotation.x = spin;
      });
      back.forEach((wheel) => {
        wheel.rotation.x = spin;
      });

      // The engine makes the whole car tremble a little.
      if (body) {
        const amount = reduced ? 0 : SHAKE[ignition];
        body.position.y = bodyBaseY + (Math.sin(seconds * 71) + Math.sin(seconds * 43) * 0.6) * amount;
        body.rotation.z = Math.sin(seconds * 57) * amount * 1.8;
      }
    },
  };
}
