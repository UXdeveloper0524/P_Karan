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
import { EYE_HEIGHT, type JourneyState } from "@/lib/journey";
import { STOPS } from "@/data/story";
import {
  ALL_MODELS,
  modelUrl,
  PROP_PLACEMENTS,
  ROAD_PLACEMENTS,
  sampleTrack,
  type ModelName,
  type Placement,
} from "@/lib/world/layout";

const SKY = 0xa9dcf2;
const HAZE = 0xcdeaf0;

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

/* ---------- Billboard faces ---------- */

const FACE_WIDTH = 1024;
const FACE_HEIGHT = 512;

/** Paint a project's name onto a billboard face. */
function createBillboardFace(name: string, domain: string, role: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_WIDTH;
  canvas.height = FACE_HEIGHT;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);
    context.fillStyle = "#ff9d4d";
    context.fillRect(0, 0, 22, FACE_HEIGHT);

    context.textBaseline = "alphabetic";
    context.fillStyle = "#ff9d4d";
    context.font = "600 34px ui-monospace, Menlo, Consolas, monospace";
    context.fillText(role.toUpperCase(), 70, 120);

    let size = 120;
    context.fillStyle = "#f4f1ea";
    do {
      context.font = `600 ${size}px Georgia, "Times New Roman", serif`;
      size -= 6;
    } while (context.measureText(name).width > FACE_WIDTH - 130 && size > 40);
    context.fillText(name, 70, 280);

    context.fillStyle = "#9aa3bd";
    context.font = "500 44px ui-monospace, Menlo, Consolas, monospace";
    context.fillText(domain, 70, 400);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
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

const projectsStop = STOPS.find((stop) => stop.kind === "projects");
const PROJECTS = projectsStop?.kind === "projects" ? projectsStop.projects : [];

export async function createWorld(
  canvas: HTMLCanvasElement,
  options: WorldOptions,
): Promise<WorldHandle> {
  const { signal, onProgress } = options;
  let reduced = options.reducedMotion;

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(SKY);
  scene.fog = new FogExp2(HAZE, 0.032);

  const camera = new PerspectiveCamera(62, 1, 0.03, 160);

  // Daylight: sky and ground bounce, plus a low warm sun that casts shadows near the camera.
  scene.add(new HemisphereLight(0xe8f6ff, 0x8fbf9a, 1.9));
  const sun = new DirectionalLight(0xfff0d2, 2.6);
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
  try {
    models = await loadModels(onProgress);
  } catch (error) {
    disposeObject(scene);
    renderer.dispose();
    throw error;
  }

  const disposeAll = (): void => {
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
        const face = createBillboardFace(project.name, project.domain, project.role);
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

      // The camera rides the road's centre line, a little off to one side with the pointer.
      const here = sampleTrack(state.distance);
      const ahead = sampleTrack(state.distance + LOOK_AHEAD);
      const rightX = -here.dz;
      const rightZ = here.dx;
      const nudge = pointer.smoothX * 0.12;
      position.set(
        here.x + rightX * nudge,
        EYE_HEIGHT - pointer.smoothY * 0.03 + Math.sin(seconds * 0.9) * 0.004 * sway,
        here.z + rightZ * nudge,
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
