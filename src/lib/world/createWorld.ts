import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { damp } from "@/lib/math";
import type { JourneyState } from "@/lib/journey";
import { SITE, STOPS } from "@/data/story";
import type { Project } from "@/types/story";
import {
  ALL_MODELS,
  modelUrl,
  PROP_PLACEMENTS,
  ROAD_PLACEMENTS,
  sampleTrack,
  type ModelName,
  type Placement,
} from "@/lib/world/layout";
import { createCar } from "@/lib/world/car";
import { CAMERA_HEIGHT, CHASE_BACK, HERO_CAR_URL, type IgnitionState } from "@/lib/world/rig";

const SKY = 0xc3d2de;
const HAZE = 0xe7e1d3;

/** The camera looks along the road a little ahead of itself, so it leans into corners. */
const LOOK_AHEAD = 1.1;

export interface WorldOptions {
  readonly reducedMotion: boolean;
  readonly signal: AbortSignal;
  /** Called with a value from 0 to 1 while models download. */
  readonly onProgress?: (fraction: number) => void;
}

export interface WorldHandle {
  update(state: JourneyState, time: number, dt: number): void;
  resize(width: number, height: number): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
}

/* ---------- Cleanup ---------- */

type Renderable = Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}

function disposeObject(root: Object3D): void {
  root.traverse((node) => {
    const { geometry, material } = node as Renderable;
    geometry?.dispose();
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

/* ---------- Model loading ---------- */

/**
 * The kit's files carry a small export offset on their top node. Removing it puts each
 * model's own origin where the layout expects it.
 */
function normalise(scene: Object3D): Object3D {
  scene.children.forEach((child) => child.position.set(0, 0, 0));
  return scene;
}

async function loadModels(
  onProgress?: (fraction: number) => void,
): Promise<Map<ModelName, Object3D>> {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress?.(total > 0 ? loaded / total : 0);
  const loader = new GLTFLoader(manager);

  const entries = await Promise.all(
    ALL_MODELS.map(async (name) => {
      const gltf = await loader.loadAsync(modelUrl(name));
      return [name, normalise(gltf.scene)] as const;
    }),
  );
  return new Map<ModelName, Object3D>(entries);
}

async function loadHeroCar(): Promise<Object3D> {
  const gltf = await new GLTFLoader().loadAsync(HERO_CAR_URL);
  return gltf.scene;
}

/* ---------- Billboard faces ---------- */

const FACE_WIDTH = 1024;
const FACE_HEIGHT = 512;

const INK = "#0d0f14";
const PANEL = "#171a22";
const BRASS = "#c9a45c";
const IVORY = "#f3efe6";
const MUTED = "#aaa598";

const FRAME = { x: 28, y: 28, w: FACE_WIDTH - 56, h: FACE_HEIGHT - 56, bar: 50 } as const;

function roundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  if (typeof c.roundRect === "function") c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

/** A stand-in for the site: a drawn page layout, so every billboard still reads as a website. */
function paintWireframe(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  c.fillStyle = "#1d212b";
  c.fillRect(x, y, w, h);
  c.fillStyle = "rgba(243,239,230,0.16)";
  c.fillRect(x + 28, y + 22, 70, 12);
  for (let i = 0; i < 4; i += 1) c.fillRect(x + w - 330 + i * 80, y + 24, 56, 8);
  c.fillStyle = "rgba(243,239,230,0.34)";
  c.fillRect(x + 28, y + 90, 360, 24);
  c.fillRect(x + 28, y + 128, 280, 24);
  c.fillStyle = "rgba(243,239,230,0.14)";
  c.fillRect(x + 28, y + 176, 330, 9);
  c.fillRect(x + 28, y + 196, 290, 9);
  c.strokeStyle = BRASS;
  c.lineWidth = 2;
  c.strokeRect(x + 28, y + 232, 130, 38);
  c.fillStyle = "rgba(201,164,92,0.18)";
  c.fillRect(x + w - 330, y + 80, 302, 200);
  c.strokeStyle = "rgba(243,239,230,0.14)";
  c.beginPath();
  c.moveTo(x + w - 330, y + 80);
  c.lineTo(x + w - 28, y + 280);
  c.moveTo(x + w - 28, y + 80);
  c.lineTo(x + w - 330, y + 280);
  c.stroke();
}

/** Draw the image like CSS `object-fit: cover`, anchored to the top. */
function paintCover(c: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.drawImage(image, x + (w - dw) / 2, y, dw, image.naturalHeight * scale);
  c.restore();
}

/** Paint a project's browser preview (or a wireframe) with its status and name onto a billboard face. */
function paintFace(canvas: HTMLCanvasElement, project: Project, image: HTMLImageElement | null): void {
  const c = canvas.getContext("2d");
  if (!c) return;
  const { x, y, w, h, bar } = FRAME;
  const live = project.status === "live";

  c.fillStyle = INK;
  c.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);

  // The browser window.
  roundedRect(c, x, y, w, h, 14);
  c.fillStyle = PANEL;
  c.fill();
  c.save();
  roundedRect(c, x, y, w, h, 14);
  c.clip();

  // Browser bar: three dots and an address pill.
  c.fillStyle = "#12141b";
  c.fillRect(x, y, w, bar);
  ["#5b5f6b", "#5b5f6b", "#5b5f6b"].forEach((color, i) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x + 28 + i * 22, y + bar / 2, 6, 0, Math.PI * 2);
    c.fill();
  });
  roundedRect(c, x + 120, y + 11, w - 240, bar - 22, 14);
  c.fillStyle = "#1d212b";
  c.fill();
  c.fillStyle = MUTED;
  c.font = "500 20px 'Manrope Variable', system-ui, sans-serif";
  c.textBaseline = "middle";
  c.fillText(project.name.toLowerCase(), x + 146, y + bar / 2 + 1);

  // The page itself.
  const px = x;
  const py = y + bar;
  const pw = w;
  const ph = h - bar;
  if (image) paintCover(c, image, px, py, pw, ph);
  else paintWireframe(c, px, py, pw, ph);

  // A soft fade at the foot keeps the name readable on any screenshot.
  const fade = c.createLinearGradient(0, py + ph - 190, 0, py + ph);
  fade.addColorStop(0, "rgba(13,15,20,0)");
  fade.addColorStop(1, "rgba(13,15,20,0.92)");
  c.fillStyle = fade;
  c.fillRect(px, py + ph - 190, pw, 190);
  c.restore();

  // Status chip and name.
  c.textBaseline = "alphabetic";
  c.font = "600 22px 'Manrope Variable', system-ui, sans-serif";
  const label = live ? "LIVE" : "IN DEVELOPMENT";
  const chipW = c.measureText(label).width + 36;
  roundedRect(c, x + 28, y + h - 118, chipW, 34, 17);
  c.fillStyle = live ? BRASS : "rgba(243,239,230,0.16)";
  c.fill();
  c.fillStyle = live ? INK : IVORY;
  c.fillText(label, x + 46, y + h - 94);

  let size = 74;
  c.fillStyle = IVORY;
  do {
    c.font = `500 ${size}px "Outfit Variable", system-ui, sans-serif`;
    size -= 4;
  } while (c.measureText(project.name).width > w - 80 && size > 36);
  c.fillText(project.name, x + 28, y + h - 28);
}

/** The billboard face for a project. The screenshot, when it exists, is painted in as soon as it loads. */
function createBillboardFace(project: Project): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_WIDTH;
  canvas.height = FACE_HEIGHT;
  paintFace(canvas, project, null);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  if (project.preview) {
    const image = new Image();
    image.onload = () => {
      paintFace(canvas, project, image);
      texture.needsUpdate = true;
    };
    // A missing file is fine: the drawn frame stays.
    image.src = project.preview;
  }
  return texture;
}

/** The sponsor sign printed on the kit's garages, redrawn with the owner's name. */
function createSignTexture(name: string, role: string): CanvasTexture {
  // The kit's own sign is a 2:1 tile that repeats along the banner, so this one is too.
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  if (c) {
    c.fillStyle = INK;
    c.fillRect(0, 0, 1024, 512);
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = IVORY;
    c.font = '500 150px "Outfit Variable", system-ui, sans-serif';
    c.fillText(name, 512, 270);
    c.fillStyle = BRASS;
    c.fillRect(402, 306, 220, 4);
    c.font = "500 34px 'Manrope Variable', system-ui, sans-serif";
    c.fillText(role.toUpperCase().split("").join(" "), 512, 370);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false; // glTF textures are not flipped
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Replace the kit's sample sponsor sign wherever it appears. */
function brandSigns(root: Object3D, material: MeshStandardMaterial): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === "tankco") {
      mesh.material = material;
    }
  });
}

/** The board's printable area, in the model's own space. */
const BOARD_CENTER = [0.44, 0.75] as const;
const BOARD_SIZE = [1, 0.5] as const;

/** Cover both sides of a billboard with the project's face, so it reads from either direction. */
function faceBillboard(root: Object3D, texture: CanvasTexture): Mesh[] {
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.9 });
  const geometry = new PlaneGeometry(BOARD_SIZE[0], BOARD_SIZE[1]);
  const front = new Mesh(geometry, material);
  front.position.set(BOARD_CENTER[0], BOARD_CENTER[1], 0.046);
  const back = new Mesh(geometry, material);
  back.rotation.y = Math.PI;
  back.position.set(BOARD_CENTER[0], BOARD_CENTER[1], -0.006);
  root.add(front, back);
  return [front, back];
}

function enableShadows(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

/* ---------- The world ---------- */

/** Every project, in billboard order: the live run first, then the ones in development. */
const PROJECTS = STOPS.flatMap((stop) => (stop.kind === "projects" ? stop.projects : []));

export async function createWorld(
  canvas: HTMLCanvasElement,
  options: WorldOptions,
): Promise<WorldHandle> {
  const { signal, onProgress } = options;
  let reduced = options.reducedMotion;

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  // Touch screens render fewer pixels: it keeps iOS smooth and avoids dropped frames.
  const touch = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(SKY);
  scene.fog = new FogExp2(HAZE, 0.032);

  const camera = new PerspectiveCamera(62, 1, 0.03, 160);

  // Daylight: sky and ground bounce, plus a low warm sun that casts shadows near the camera.
  scene.add(new HemisphereLight(0xf4f1ea, 0x93a88c, 1.85));
  const sun = new DirectionalLight(0xffe6c0, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 13;
  sun.shadow.camera.bottom = -13;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new Vector3(-9, 14, 7);

  let models: Map<ModelName, Object3D>;
  let heroSource: Object3D;
  try {
    [models, heroSource] = await Promise.all([loadModels(onProgress), loadHeroCar()]);
  } catch (error) {
    disposeObject(scene);
    renderer.dispose();
    throw error;
  }

  const disposeAll = (): void => {
    disposeObject(heroSource);
    models.forEach(disposeObject);
    disposeObject(scene);
    renderer.dispose();
  };

  if (signal.aborted) {
    disposeAll();
    throw new DOMException("Aborted", "AbortError");
  }

  // Ground: one wide plane in the kit's own grass colour, so the road sits on land.
  let grassColor = new Color(0x8fcf9f);
  models.get("grass")?.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material)) {
      const material = mesh.material as MeshStandardMaterial;
      if (material.color) grassColor = material.color.clone();
    }
  });
  const ground = new Mesh(
    new PlaneGeometry(600, 600),
    new MeshStandardMaterial({ color: grassColor, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.012;
  ground.receiveShadow = true;
  scene.add(ground);

  // Build the circuit by cloning each model to every place it is used.
  const world = new Group();
  const faces: CanvasTexture[] = [];

  // The sign and billboard faces use the site's own fonts, so wait for them before painting.
  await Promise.allSettled([
    document.fonts.load('500 100px "Outfit Variable"'),
    document.fonts.load("500 20px 'Manrope Variable'"),
  ]);
  const signTexture = createSignTexture(SITE.name, SITE.role);
  faces.push(signTexture);
  const signMaterial = new MeshStandardMaterial({ map: signTexture, roughness: 0.7 });
  models.forEach((model) => brandSigns(model, signMaterial));
  const addPlacement = (placement: Placement, billboardIndex: number): void => {
    const object = models.get(placement.model)?.clone(true);
    if (!object) return;
    object.position.set(placement.x, 0, placement.z);
    object.rotation.y = placement.yaw;
    object.scale.setScalar(placement.scale);
    enableShadows(object);
    if (placement.tag === "billboard") {
      const project = PROJECTS[billboardIndex];
      if (project) {
        const face = createBillboardFace(project);
        faces.push(face);
        faceBillboard(object, face);
      }
    }
    world.add(object);
  };
  ROAD_PLACEMENTS.forEach((placement) => addPlacement(placement, -1));
  let billboardIndex = 0;
  PROP_PLACEMENTS.forEach((placement) => {
    addPlacement(placement, placement.tag === "billboard" ? billboardIndex : -1);
    if (placement.tag === "billboard") billboardIndex += 1;
  });
  scene.add(world);

  // The one car that drives the lap.
  const car = createCar(heroSource);
  scene.add(car.object);
  const ignition: IgnitionState = "running";

  /* ---------- Frame state ---------- */

  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  const onPointerMove = (event: PointerEvent): void => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const position = new Vector3();
  const lookTarget = new Vector3();
  const desiredTarget = new Vector3();
  let lookReady = false;

  const resize = (width: number, height: number): void => {
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 78 : 62;
    camera.updateProjectionMatrix();
  };
  resize(canvas.clientWidth, canvas.clientHeight);

  return {
    update(state, time, dt) {
      const seconds = time * 0.001;
      const sway = reduced ? 0 : 1;

      pointer.smoothX = damp(pointer.smoothX, pointer.x * sway, 3, dt);
      pointer.smoothY = damp(pointer.smoothY, pointer.y * sway, 3, dt);

      car.update({ distance: state.distance + CHASE_BACK, seconds, ignition, reduced });

      // The camera rides the road's centre line behind the car, a little off to one side with the pointer.
      const here = sampleTrack(state.distance);
      const ahead = sampleTrack(state.distance + LOOK_AHEAD);
      const rightX = -here.dz;
      const rightZ = here.dx;
      const nudge = pointer.smoothX * 0.12;
      const rumble = reduced ? 0 : 0.0008;
      position.set(
        here.x + rightX * nudge + Math.sin(seconds * 63) * rumble,
        CAMERA_HEIGHT - pointer.smoothY * 0.03 + Math.sin(seconds * 0.9) * 0.004 * sway + Math.sin(seconds * 79) * rumble,
        here.z + rightZ * nudge + Math.sin(seconds * 51) * rumble,
      );
      camera.position.copy(position);

      // Gaze is [right, up, forward] in the road's frame; forward leans into the coming bend.
      const [gazeRight, gazeUp, gazeForward] = state.gaze;
      const forwardX = ahead.dx;
      const forwardZ = ahead.dz;
      const gazeRightX = -forwardZ;
      const gazeRightZ = forwardX;
      desiredTarget.set(
        position.x + gazeRightX * gazeRight + forwardX * gazeForward,
        position.y + gazeUp,
        position.z + gazeRightZ * gazeRight + forwardZ * gazeForward,
      );
      if (!lookReady || reduced) {
        lookTarget.copy(desiredTarget);
        lookReady = true;
      } else {
        lookTarget.set(
          damp(lookTarget.x, desiredTarget.x, 5, dt),
          damp(lookTarget.y, desiredTarget.y, 5, dt),
          damp(lookTarget.z, desiredTarget.z, 5, dt),
        );
      }
      camera.lookAt(lookTarget);

      // The shadow window follows the camera, so shadows stay sharp wherever it goes.
      sun.target.position.set(here.x, 0, here.z);
      sun.position.copy(sun.target.position).add(SUN_OFFSET);

      renderer.render(scene, camera);
    },

    resize,

    setReducedMotion(value) {
      reduced = value;
    },

    dispose() {
      window.removeEventListener("pointermove", onPointerMove);
      faces.forEach((face) => face.dispose());
      disposeAll();
    },
  };
}
