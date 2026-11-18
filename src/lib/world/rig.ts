/**
 * Numbers that tie the hero car, the camera and the road together.
 * Pure data, so the journey config and the renderer can both read it.
 */

/** The car that drives the lap. Swap in any model from the Kenney Car Kit that has the same wheel names. */
export const HERO_CAR_URL = "/models/car/race.glb";

/** The kit's car is about 1.2 wide, but the road is 1 wide, so the car is scaled down. */
export const CAR_SCALE = 0.3;
/** Wheel radius in the model's own units. */
export const WHEEL_RADIUS = 0.3;

/** How far behind the car the camera rides, along the road. */
export const CHASE_BACK = 1.35;
/** Camera height above the road. */
export const CAMERA_HEIGHT = 0.72;

export type IgnitionState = "off" | "starting" | "running";
