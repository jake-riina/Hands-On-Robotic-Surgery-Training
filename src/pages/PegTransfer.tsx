import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PegScreenFixedPortedNeedleDriver,
  type PortedToolWorldFrame,
} from '../components/SurgicalViewportControllers';
import { makeFulcrumBehindCamera, setPerspectiveCameraFromFulcrum } from '../utils/fulcrumCamera';
import { computeTipFromRcm, exponentialSmooth } from '../utils/rcmToolKinematics';

const PEG_ROWS = 2;
const PEG_COLS = 4;
const TOTAL_RINGS = 8;
const WALL_Z_BACK = -1.02;
const PEG_PROTRUDE = 0.22;
const PEG_RING_REST_Z = WALL_Z_BACK + PEG_PROTRUDE;
const GRID_SPACING_X = 0.4;
const GRID_SPACING_Y = 0.4;
const LEFT_GRID_CENTER_X = -1.05;
const RIGHT_GRID_CENTER_X = 1.05;
const GRID_CENTER_Y = 1.05;

function makeWallGridPositions(options: {
  rows: number;
  cols: number;
  spacingX: number;
  spacingY: number;
  centerX: number;
  centerY: number;
  ringZ: number;
}): [number, number, number][] {
  const { rows, cols, spacingX, spacingY, centerX, centerY, ringZ } = options;
  const positions: [number, number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = centerX + (row - (rows - 1) / 2) * spacingX;
      const y = centerY + (col - (cols - 1) / 2) * spacingY;
      positions.push([x, y, ringZ]);
    }
  }
  return positions;
}

const LEFT_PEG_POSITIONS = makeWallGridPositions({
  rows: PEG_ROWS,
  cols: PEG_COLS,
  spacingX: GRID_SPACING_X,
  spacingY: GRID_SPACING_Y,
  centerX: LEFT_GRID_CENTER_X,
  centerY: GRID_CENTER_Y,
  ringZ: PEG_RING_REST_Z,
});

const RIGHT_PEG_POSITIONS = makeWallGridPositions({
  rows: PEG_ROWS,
  cols: PEG_COLS,
  spacingX: GRID_SPACING_X,
  spacingY: GRID_SPACING_Y,
  centerX: RIGHT_GRID_CENTER_X,
  centerY: GRID_CENTER_Y,
  ringZ: PEG_RING_REST_Z,
});

const LEFT_MID_Y =
  (Math.min(...LEFT_PEG_POSITIONS.map((p) => p[1])) + Math.max(...LEFT_PEG_POSITIONS.map((p) => p[1]))) / 2;
const RIGHT_MID_Y =
  (Math.min(...RIGHT_PEG_POSITIONS.map((p) => p[1])) + Math.max(...RIGHT_PEG_POSITIONS.map((p) => p[1]))) / 2;

function getHasRing(side: 'left' | 'right', pegY: number): boolean {
  if (side === 'left') return pegY >= LEFT_MID_Y;
  return pegY <= RIGHT_MID_Y;
}

function getInitialRingPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (const pos of LEFT_PEG_POSITIONS) {
    if (getHasRing('left', pos[1])) positions.push([...pos] as [number, number, number]);
  }
  for (const pos of RIGHT_PEG_POSITIONS) {
    if (getHasRing('right', pos[1])) positions.push([...pos] as [number, number, number]);
  }
  return positions;
}

/** Strict placement: XY only peg centers, tighter than legacy. */
const SNAP_RADIUS = 0.1;
const SNAP_Z_HALF_WIDTH = 0.055;
const RING_AXIS_ALIGN_MIN_DOT = 0.88;
const RELEASE_SPEED_MAX = 0.85;
const PICKUP_REACH = 0.095;
const JAW_BITE_HALF_WIDTH = 0.024;
const GRASP_ALIGN_DOT = 0.72;

const PEG_CLEARANCE_Z = 0.08;
const MOVEMENT_START_MM_THRESHOLD = 2.0;
const MM_TO_SCENE_INSERT = 0.007;
const MM_TO_SCENE_PIVOT = 0.0045;
const MM_TO_SCENE_PIVOT_Y = 0.0045;

const CAMERA_YAW_SENSITIVITY = 0.0095;
const CAMERA_PITCH_SENSITIVITY = 0.0095;
const CAMERA_ZOOM_SENSITIVITY = 0.065;
const CAMERA_DEADZONE_MM = 0.4;
const CAMERA_DAMP = 14;
/** Narrower zoom-in bound (~telephoto task view). */
const FOV_MIN = 10;
/** Zoom-out cap; keeps pegboard fill similar to reference sims (~30–40° vertical). */
const FOV_MAX = 40;
/** Default zoom at module start (vertical deg). Tuned with ~1.5m eye–peg distance for ring/board scale. */
const FOV_INITIAL = 34;
const ROT_X_MAX = Math.PI / 3.2;

/** Eyepoint at init pitch/yaw; closer to peg plane (rings z ≈ -0.8) than legacy (z 1.12). */
const PT_CAM_INITIAL_POS = new THREE.Vector3(0, 1.32, 0.72);
const PT_CAM_ARM_LENGTH = 1.12;
const PT_CAM_INIT_PITCH = -0.22;
const PT_CAM_INIT_YAW = 0;
const PT_CAM_INIT_QUAT = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(PT_CAM_INIT_PITCH, PT_CAM_INIT_YAW, 0, 'YXZ')
);
const PEG_TRANSFER_CAMERA_FULCRUM = makeFulcrumBehindCamera(
  PT_CAM_INITIAL_POS,
  PT_CAM_INIT_PITCH,
  PT_CAM_INIT_YAW,
  PT_CAM_ARM_LENGTH
);

function PegCameraMount({
  rotRef,
  fovRef,
  rotTargetRef,
  fovTargetRef,
}: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  fovRef: React.MutableRefObject<number>;
  rotTargetRef: React.MutableRefObject<{ x: number; y: number }>;
  fovTargetRef: React.MutableRefObject<number>;
}) {
  useFrame(({ camera }, dt) => {
    const persp = camera as THREE.PerspectiveCamera;
    setPerspectiveCameraFromFulcrum(
      persp,
      PEG_TRANSFER_CAMERA_FULCRUM,
      PT_CAM_ARM_LENGTH,
      rotRef.current.x,
      rotRef.current.y
    );
    const td = Math.min(0.05, dt);
    const a = 1 - Math.exp(-CAMERA_DAMP * td);
    rotRef.current.x += (rotTargetRef.current.x - rotRef.current.x) * a;
    rotRef.current.y += (rotTargetRef.current.y - rotRef.current.y) * a;
    fovRef.current += (fovTargetRef.current - fovRef.current) * a;
    persp.fov = fovRef.current;
    persp.updateProjectionMatrix();
    // priority <= 0 only (>0 disables automatic rendering). -2 runs before instrument (-1) and sim (0).
  }, -2);
  return null;
}

const ALL_SNAP_TARGETS: [number, number, number][] = [
  ...LEFT_PEG_POSITIONS.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
  ...RIGHT_PEG_POSITIONS.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
];

function findNearestSnapTargetStrict(
  releasePos: [number, number, number],
  ringQuat: THREE.Quaternion
): { snapTo: [number, number, number]; distance: number } | null {
  const [x, y, z] = releasePos;
  if (Math.abs(z - PEG_RING_REST_Z) > SNAP_Z_HALF_WIDTH) return null;
  const ringHoleAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(ringQuat).normalize();
  if (Math.abs(ringHoleAxis.z) < RING_AXIS_ALIGN_MIN_DOT) return null;

  let bestDist = SNAP_RADIUS;
  let snapTo: [number, number, number] | null = null;
  for (const peg of ALL_SNAP_TARGETS) {
    const dx = x - peg[0];
    const dy = y - peg[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      snapTo = [peg[0], peg[1], peg[2]];
    }
  }
  return snapTo ? { snapTo, distance: bestDist } : null;
}

function findNearestPegForPreview(pos: [number, number, number]): [number, number, number] | null {
  const [x, y] = pos;
  let best = Infinity;
  let peg: [number, number, number] | null = null;
  for (const p of ALL_SNAP_TARGETS) {
    const d = Math.hypot(x - p[0], y - p[1]);
    if (d < best) {
      best = d;
      peg = [p[0], p[1], p[2]];
    }
  }
  return peg;
}

const CAMERA_NEAR = 0.52;
type ArmSide = 'left' | 'right';

type TouchStateMessage = {
  type: string;
  deviceId: string;
  timestampMs?: number;
  position?: { x: number; y: number; z: number };
  gimbal?: { x: number; y: number; z: number; xDeg?: number; yDeg?: number; zDeg?: number };
  buttons?: { button1: boolean; button2: boolean };
};

type ArmRuntimeState = {
  connected: boolean;
  position: [number, number, number];
  orientation: { yaw: number; pitch: number; roll: number };
  button1: boolean;
  button2: boolean;
};

type DebugOverlayState = {
  connected: boolean;
  right: ArmRuntimeState;
};

type SimMetrics = {
  drops: number;
  failedGrasps: number;
  clutchCount: number;
  cameraAdjustCount: number;
  pathLength: number;
};

type RingHoldMeta = {
  ringIndex: number;
  sourcePeg: [number, number, number] | null;
  clearedPeg: boolean;
  holdLocal: THREE.Vector3;
};

const DEFAULT_RIGHT_ARM_POS: [number, number, number] = [0.55, GRID_CENTER_Y, 0.38];

const RCM_FULCRUM = new THREE.Vector3(0.78, GRID_CENTER_Y, 0.26);
const _tmpTip = new THREE.Vector3(...DEFAULT_RIGHT_ARM_POS);
const RCM_BASE_SHAFT_DIR = new THREE.Vector3()
  .subVectors(_tmpTip, RCM_FULCRUM)
  .normalize();
const RCM_INSERTION_MIN = 0.22;
const RCM_INSERTION_MAX = 1.05;
const RCM_INSERTION_DEFAULT = _tmpTip.distanceTo(RCM_FULCRUM);

/**
 * R3F passes canvas + defaults; Three.js r170+ still builds getContext({ alpha: true }) internally,
 * so `alpha: false` on WebGLRenderer alone never yields an opaque context. Supply a WebGL2 context.
 */
function createPegTransferGl(defaults: {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: WebGLPowerPreference;
}): THREE.WebGLRenderer {
  const { canvas } = defaults;
  const ctx = canvas.getContext('webgl2', {
    alpha: false,
    antialias: defaults.antialias !== false,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: defaults.powerPreference ?? 'high-performance',
  });
  if (!ctx) {
    throw new Error('Peg Transfer requires WebGL2');
  }
  return new THREE.WebGLRenderer({
    canvas,
    context: ctx,
    antialias: defaults.antialias !== false,
    depth: true,
    stencil: false,
    alpha: false,
  });
}

const PEG_RADIUS = 0.04;
const RING_MAJOR_RADIUS = PEG_RADIUS * 2.1;
const RING_TUBE_RADIUS = PEG_RADIUS * 0.4;
const RING_SURFACE_BIAS_Z = 0.004;
const RING_COLOR_DEFAULT = '#1DA5FF';
const RING_COLOR_TRANSFERRED = '#22c55e';

const _pegAxis = new THREE.Vector3(0, 0, 1);
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _qTool = new THREE.Quaternion();
const _qRing = new THREE.Quaternion();
const _eTool = new THREE.Euler(0, 0, 0, 'YXZ');

function orientationToQuat(o: { yaw: number; pitch: number; roll: number }, out: THREE.Quaternion) {
  _eTool.set(o.pitch, o.yaw, o.roll);
  out.setFromEuler(_eTool);
}

function distPointToSegment(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const ab2 = abx * abx + aby * aby + abz * abz;
  const t = ab2 < 1e-8 ? 0 : THREE.MathUtils.clamp((apx * abx + apy * aby + apz * abz) / ab2, 0, 1);
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  const qz = az + t * abz;
  return Math.hypot(px - qx, py - qy, pz - qz);
}

function getOriginSide(ringIndex: number): 'left' | 'right' {
  return ringIndex < 4 ? 'left' : 'right';
}

function getSideOfPosition(position: [number, number, number]): 'left' | 'right' {
  return position[0] < 0 ? 'left' : 'right';
}

const INITIAL_RING_CURRENT_SIDES: ('left' | 'right')[] = [
  'left',
  'left',
  'left',
  'left',
  'right',
  'right',
  'right',
  'right',
];

const TIMER_INITIAL_SECONDS = 60;
const SETTLE_DURATION_SEC = 0.28;
const TIP_VEL_SMOOTH = 28;
const GRIP_LERP_SPEED = 14;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function allRingsTransferred(ringCurrentSides: ('left' | 'right')[]): boolean {
  return ringCurrentSides.length === 8 && ringCurrentSides.every((side, i) => getOriginSide(i) !== side);
}

function makeDefaultArmRuntime(position: [number, number, number]): ArmRuntimeState {
  return {
    connected: false,
    position,
    orientation: { yaw: 0, pitch: 0, roll: 0 },
    button1: false,
    button2: false,
  };
}

function copyRingPositions(src: [number, number, number][]): [number, number, number][] {
  return src.map((p) => [...p] as [number, number, number]);
}

function PegRingsUpdater({
  ringRefs,
  simPosRef,
  simQuatRef,
  transferred,
}: {
  ringRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  simPosRef: React.MutableRefObject<[number, number, number][]>;
  simQuatRef: React.MutableRefObject<THREE.Quaternion[]>;
  transferred: boolean[];
}) {
  useFrame(() => {
    const refs = ringRefs.current;
    const pos = simPosRef.current;
    const quat = simQuatRef.current;
    for (let i = 0; i < TOTAL_RINGS; i++) {
      const g = refs[i];
      if (!g) continue;
      const p = pos[i];
      g.position.set(p[0], p[1], p[2] + RING_SURFACE_BIAS_Z);
      g.quaternion.copy(quat[i]);
    }
  });
  return (
    <>
      {Array.from({ length: TOTAL_RINGS }, (_, i) => (
        <group key={`ring-${i}`} ref={(el) => { ringRefs.current[i] = el; }}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[RING_MAJOR_RADIUS, RING_TUBE_RADIUS, 16, 32]} />
            <meshStandardMaterial
              color={transferred[i] ? RING_COLOR_TRANSFERRED : RING_COLOR_DEFAULT}
              metalness={0.32}
              roughness={0.48}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function GhostRingLive({
  previewPegRef,
  ghostActiveRef,
}: {
  previewPegRef: React.MutableRefObject<[number, number, number] | null>;
  ghostActiveRef: React.MutableRefObject<boolean>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    const peg = previewPegRef.current;
    const on = ghostActiveRef.current && peg;
    m.visible = !!on;
    if (on && peg) {
      m.position.set(peg[0], peg[1], peg[2] + RING_SURFACE_BIAS_Z);
    }
  });
  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <torusGeometry args={[RING_MAJOR_RADIUS * 0.99, RING_TUBE_RADIUS, 16, 32]} />
      <meshStandardMaterial color="#93c5fd" transparent opacity={0.38} depthWrite={false} metalness={0.2} roughness={0.5} />
    </mesh>
  );
}

type PegTransferSceneProps = {
  onAllRingsTransferred?: () => void;
  onFirstMovement?: () => void;
  onRingSidesChange?: (sides: ('left' | 'right')[]) => void;
  onDebugUpdate?: (state: DebugOverlayState) => void;
  onCameraModeChange?: (active: boolean) => void;
  metricsRef: React.MutableRefObject<SimMetrics>;
  previewPegRef: React.MutableRefObject<[number, number, number] | null>;
  ghostActiveRef: React.MutableRefObject<boolean>;
};

function PegTransferScene({
  onAllRingsTransferred,
  onFirstMovement,
  onRingSidesChange,
  onDebugUpdate,
  onCameraModeChange,
  metricsRef,
  previewPegRef,
  ghostActiveRef,
}: PegTransferSceneProps) {
  const initialPos = useMemo(() => copyRingPositions(getInitialRingPositions()), []);

  const [ringCurrentSides, setRingCurrentSides] = useState<('left' | 'right')[]>(() => [...INITIAL_RING_CURRENT_SIDES]);
  const [ringHeldByState, setRingHeldByState] = useState<(ArmSide | null)[]>(() => Array(TOTAL_RINGS).fill(null));

  const ringRefs = useRef<(THREE.Group | null)[]>([]);
  const simPosRef = useRef(copyRingPositions(initialPos));
  const simQuatRef = useRef(
    Array.from({ length: TOTAL_RINGS }, () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)))
  );

  const ringHeldByRef = useRef<(ArmSide | null)[]>(Array(TOTAL_RINGS).fill(null));
  const ringCurrentSidesRef = useRef(ringCurrentSides);

  const holdingByArmRef = useRef<RingHoldMeta | null>(null);
  const settleRef = useRef<{
    ringIndex: number;
    snapTo: [number, number, number];
    startPos: [number, number, number];
    qualifiesGreen: boolean;
    t: number;
  } | null>(null);

  const startedMovementRef = useRef(false);
  const neutralMmRef = useRef<[number, number, number] | null>(null);
  const clutchAnchorRef = useRef<{ ins: number; py: number; pp: number } | null>(null);
  const previousButtonsRef = useRef({ button1: false, button2: false });
  const latestRawRef = useRef<TouchStateMessage | null>(null);

  const insertionRef = useRef(RCM_INSERTION_DEFAULT);
  const shaftPitchRef = useRef(0);
  const shaftYawRef = useRef(0);

  const tipWorldRef = useRef(new THREE.Vector3(...DEFAULT_RIGHT_ARM_POS));
  const tipFilteredRef = useRef(new THREE.Vector3(...DEFAULT_RIGHT_ARM_POS));
  const tipVelRef = useRef(0);
  const prevTipForVelRef = useRef(new THREE.Vector3(...DEFAULT_RIGHT_ARM_POS));

  const rightArmRef = useRef<ArmRuntimeState>(makeDefaultArmRuntime(DEFAULT_RIGHT_ARM_POS));
  const gripClosureRef = useRef(0);

  const sceneRotRef = useRef({ x: PT_CAM_INIT_PITCH, y: PT_CAM_INIT_YAW });
  const sceneRotTargetRef = useRef({ x: PT_CAM_INIT_PITCH, y: PT_CAM_INIT_YAW });
  const fovRef = useRef(FOV_INITIAL);
  const fovTargetRef = useRef(FOV_INITIAL);
  const previousPosRef = useRef<[number, number, number] | null>(null);
  const previousCameraModeRef = useRef(false);

  const toolWorldFrameRef = useRef<PortedToolWorldFrame | null>(null);
  const orientationRef = useRef({ yaw: 0, pitch: 0, roll: 0 });

  const lastDebugEmitRef = useRef(0);

  const transferredBools = useMemo(
    () => ringCurrentSides.map((side, i) => getOriginSide(i) !== side),
    [ringCurrentSides]
  );

  useEffect(() => {
    ringCurrentSidesRef.current = ringCurrentSides;
  }, [ringCurrentSides]);

  useEffect(() => {
    ringHeldByRef.current = ringHeldByState;
  }, [ringHeldByState]);

  useEffect(() => {
    if (allRingsTransferred(ringCurrentSides)) onAllRingsTransferred?.();
  }, [ringCurrentSides, onAllRingsTransferred]);

  useEffect(() => {
    onRingSidesChange?.(ringCurrentSides);
  }, [ringCurrentSides, onRingSidesChange]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as TouchStateMessage;
        if (msg.type !== 'state' || !msg.deviceId || !msg.position || !msg.gimbal || !msg.buttons) return;
        if (msg.deviceId !== 'touch-2') return;
        latestRawRef.current = msg;
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  const tryPickupRing = useCallback(
    (tip: THREE.Vector3, orientation: { yaw: number; pitch: number; roll: number }, probe: PortedToolWorldFrame) => {
      if (holdingByArmRef.current) return;
      let bestIdx: number | null = null;
      let bestD = PICKUP_REACH;
      const px = probe.biteMid.x;
      const py = probe.biteMid.y;
      const pz = probe.biteMid.z;
      const lx = probe.leftJaw.x;
      const ly = probe.leftJaw.y;
      const lz = probe.leftJaw.z;
      const rx = probe.rightJaw.x;
      const ry = probe.rightJaw.y;
      const rz = probe.rightJaw.z;

      for (let i = 0; i < TOTAL_RINGS; i++) {
        if (ringHeldByRef.current[i] !== null) continue;
        const p = simPosRef.current[i];
        const dmid = Math.hypot(p[0] - px, p[1] - py, p[2] - pz);
        if (dmid > PICKUP_REACH) continue;
        const dSeg = distPointToSegment(p[0], p[1], p[2], lx, ly, lz, rx, ry, rz);
        if (dSeg > JAW_BITE_HALF_WIDTH) continue;
        orientationToQuat(orientation, _qTool);
        _qRing.copy(simQuatRef.current[i]);
        const align = Math.abs(new THREE.Vector3(0, 0, 1).applyQuaternion(_qRing).dot(_pegAxis));
        if (align < GRASP_ALIGN_DOT) continue;
        if (dmid < bestD) {
          bestD = dmid;
          bestIdx = i;
        }
      }

      if (bestIdx === null) {
        metricsRef.current.failedGrasps += 1;
        return;
      }

      const ringIdx = bestIdx;
      ringHeldByRef.current[ringIdx] = 'right';
      setRingHeldByState([...ringHeldByRef.current]);

      const p = simPosRef.current[ringIdx];
      const pegGuess = findNearestPegForPreview(p);
      const sourcePeg: [number, number, number] | null =
        pegGuess && Math.hypot(p[0] - pegGuess[0], p[1] - pegGuess[1]) < 0.12 ? pegGuess : null;

      orientationToQuat(orientation, _qTool);
      _v0.set(p[0] - tip.x, p[1] - tip.y, p[2] - tip.z);
      _v0.applyQuaternion(_qTool.clone().invert());

      holdingByArmRef.current = {
        ringIndex: ringIdx,
        sourcePeg,
        clearedPeg: false,
        holdLocal: _v0.clone(),
      };

      gripClosureRef.current = Math.max(gripClosureRef.current, 0.55);
    },
    [metricsRef]
  );

  const beginReleaseFromArm = useCallback(
    (speed: number) => {
      const holdMeta = holdingByArmRef.current;
      if (!holdMeta) return;

      const ringId = holdMeta.ringIndex;
      const pos = simPosRef.current[ringId];
      const quat = simQuatRef.current[ringId];
      ringHeldByRef.current[ringId] = null;
      setRingHeldByState([...ringHeldByRef.current]);
      holdingByArmRef.current = null;

      const tooFast = speed > RELEASE_SPEED_MAX;
      const snap = tooFast ? null : findNearestSnapTargetStrict(pos, quat);

      if (tooFast || snap === null) {
        if (tooFast) metricsRef.current.drops += 1;
        return;
      }

      const destinationSide = getSideOfPosition(snap.snapTo);
      const origin = getOriginSide(ringId);
      const qualifiesGreen = origin !== destinationSide;

      settleRef.current = {
        ringIndex: ringId,
        snapTo: snap.snapTo,
        startPos: [...pos] as [number, number, number],
        qualifiesGreen,
        t: 0,
      };
    },
    []
  );

  // priority 0: runs after camera (-2) and PegScreenFixedPortedNeedleDriver (-1); subscribers sort ascending
  useFrame((_, dt) => {
    const raw = latestRawRef.current;
    const clampedDt = Math.min(0.05, dt);

    if (raw?.position && raw?.buttons && raw?.gimbal) {
      const cameraChord = !!(raw.buttons.button1 && raw.buttons.button2);
      onCameraModeChange?.(cameraChord);

      if (!neutralMmRef.current) {
        neutralMmRef.current = [raw.position.x, raw.position.y, raw.position.z];
      }
      const n = neutralMmRef.current;
      const dx = raw.position.x - n[0];
      const dy = raw.position.y - n[1];
      const dz = raw.position.z - n[2];

      if (!startedMovementRef.current) {
        const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (delta >= MOVEMENT_START_MM_THRESHOLD) {
          startedMovementRef.current = true;
          onFirstMovement?.();
        }
      }

      const prevB = previousButtonsRef.current;
      const isClutched = raw.buttons.button2 && !cameraChord;
      if (isClutched) {
        if (!prevB.button2 && raw.buttons.button2) {
          clutchAnchorRef.current = {
            ins: insertionRef.current,
            py: shaftYawRef.current,
            pp: shaftPitchRef.current,
          };
          metricsRef.current.clutchCount += 1;
        }
      } else {
        clutchAnchorRef.current = null;
      }

      let targetIns = THREE.MathUtils.clamp(
        RCM_INSERTION_DEFAULT + dz * MM_TO_SCENE_INSERT,
        RCM_INSERTION_MIN,
        RCM_INSERTION_MAX
      );
      let targetYaw = dx * MM_TO_SCENE_PIVOT;
      let targetPitch = dy * MM_TO_SCENE_PIVOT_Y;
      targetPitch = THREE.MathUtils.clamp(targetPitch, -0.95, 0.95);
      targetYaw = THREE.MathUtils.clamp(targetYaw, -1.05, 1.05);

      if (isClutched && clutchAnchorRef.current) {
        insertionRef.current = clutchAnchorRef.current.ins;
        shaftYawRef.current = clutchAnchorRef.current.py;
        shaftPitchRef.current = clutchAnchorRef.current.pp;
      } else if (!isClutched) {
        insertionRef.current = exponentialSmooth(insertionRef.current, targetIns, 18, clampedDt);
        shaftYawRef.current = exponentialSmooth(shaftYawRef.current, targetYaw, 18, clampedDt);
        shaftPitchRef.current = exponentialSmooth(shaftPitchRef.current, targetPitch, 18, clampedDt);
      }

      const tipRaw = computeTipFromRcm(
        RCM_FULCRUM,
        RCM_BASE_SHAFT_DIR,
        insertionRef.current,
        shaftPitchRef.current,
        shaftYawRef.current,
        _tmpTip
      );

      tipFilteredRef.current.lerp(tipRaw, 1 - Math.exp(-TIP_VEL_SMOOTH * clampedDt * 0.08));
      tipWorldRef.current.copy(tipFilteredRef.current);

      const pathStep = prevTipForVelRef.current.distanceTo(tipWorldRef.current);
      metricsRef.current.pathLength += pathStep;
      tipVelRef.current = pathStep / Math.max(clampedDt, 1e-4);
      prevTipForVelRef.current.copy(tipWorldRef.current);

      const orientation = {
        yaw: raw.gimbal.z ?? 0,
        pitch: raw.gimbal.y ?? 0,
        roll: raw.gimbal.x ?? 0,
      };
      orientationRef.current = orientation;

      const gripTarget = raw.buttons.button1 && !cameraChord ? 1 : 0;
      gripClosureRef.current = exponentialSmooth(gripClosureRef.current, gripTarget, GRIP_LERP_SPEED, clampedDt);

      if (!cameraChord) {
        const probe = toolWorldFrameRef.current;
        if (raw.buttons.button1 && !prevB.button1 && probe) {
          tryPickupRing(tipWorldRef.current, orientation, probe);
        }
        if (!raw.buttons.button1 && prevB.button1) {
          beginReleaseFromArm(tipVelRef.current);
        }
      }

      previousButtonsRef.current = {
        button1: cameraChord ? prevB.button1 : raw.buttons.button1,
        button2: raw.buttons.button2,
      };

      const rightHold = holdingByArmRef.current;
      if (rightHold) {
        const tipv = tipWorldRef.current;
        orientationToQuat(orientation, _qTool);
        const target = _v1.copy(rightHold.holdLocal).applyQuaternion(_qTool).add(tipv);
        const idx = rightHold.ringIndex;
        const source = rightHold.sourcePeg;
        let px = target.x;
        let py = target.y;
        let pz = target.z;

        if (source && !rightHold.clearedPeg) {
          const clearanceZ = source[2] + PEG_CLEARANCE_Z;
          if (target.z <= clearanceZ) {
            px = source[0];
            py = source[1];
            pz = Math.min(clearanceZ, target.z);
            const tClear = THREE.MathUtils.clamp((tipv.z - source[2]) / PEG_CLEARANCE_Z, 0, 1);
            const qPeg = simQuatRef.current[idx];
            _eTool.set(Math.PI / 2 * (1 - tClear * 0.35), 0, 0);
            _qRing.setFromEuler(_eTool);
            qPeg.slerp(_qRing, 0.14);
          } else {
            rightHold.clearedPeg = true;
          }
        }

        simPosRef.current[idx][0] = px;
        simPosRef.current[idx][1] = py;
        simPosRef.current[idx][2] = pz;

        const qRingHeld = simQuatRef.current[idx];
        orientationToQuat(orientation, _qTool);
        qRingHeld.slerp(_qTool, 0.42);
      }

      const s = settleRef.current;
      if (s) {
        s.t += clampedDt / SETTLE_DURATION_SEC;
        const k = THREE.MathUtils.clamp(s.t, 0, 1);
        const idx = s.ringIndex;
        const e = 1 - (1 - k) ** 3;
        const st = s.startPos;
        simPosRef.current[idx][0] = st[0] + (s.snapTo[0] - st[0]) * e;
        simPosRef.current[idx][1] = st[1] + (s.snapTo[1] - st[1]) * e;
        simPosRef.current[idx][2] = st[2] + (s.snapTo[2] - st[2]) * e;
        _eTool.set(Math.PI / 2, 0, 0);
        _qRing.setFromEuler(_eTool);
        simQuatRef.current[idx].slerp(_qRing, 0.28 * e);
        if (s.t >= 1) {
          simPosRef.current[idx] = [...s.snapTo] as [number, number, number];
          simQuatRef.current[idx].setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
          if (s.qualifiesGreen) {
            setRingCurrentSides((prev) => {
              const next = [...prev];
              next[idx] = getSideOfPosition(s.snapTo);
              return next;
            });
          }
          settleRef.current = null;
        }
      }

      const tipArr: [number, number, number] = [tipWorldRef.current.x, tipWorldRef.current.y, tipWorldRef.current.z];
      rightArmRef.current = {
        connected: true,
        position: tipArr,
        orientation,
        button1: raw.buttons.button1,
        button2: raw.buttons.button2,
      };

      const now = performance.now();
      if (now - lastDebugEmitRef.current > 70) {
        lastDebugEmitRef.current = now;
        onDebugUpdate?.({
          connected: true,
          right: { ...rightArmRef.current },
        });
      }

      const enteredCameraMode = cameraChord && !previousCameraModeRef.current;
      previousCameraModeRef.current = cameraChord;
      if (enteredCameraMode) metricsRef.current.cameraAdjustCount += 1;
      if (enteredCameraMode || !cameraChord || isClutched) {
        previousPosRef.current = [raw.position.x, raw.position.y, raw.position.z];
      }

      if (cameraChord && previousPosRef.current) {
        const prev = previousPosRef.current;
        const cdx = raw.position.x - prev[0];
        const cdy = raw.position.y - prev[1];
        const cdz = raw.position.z - prev[2];
        const mag = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        if (mag >= CAMERA_DEADZONE_MM) {
          previousPosRef.current = [raw.position.x, raw.position.y, raw.position.z];
          sceneRotTargetRef.current.y -= cdx * CAMERA_YAW_SENSITIVITY;
          sceneRotTargetRef.current.x = THREE.MathUtils.clamp(
            sceneRotTargetRef.current.x + cdy * CAMERA_PITCH_SENSITIVITY,
            -ROT_X_MAX,
            ROT_X_MAX
          );
          fovTargetRef.current = THREE.MathUtils.clamp(
            fovTargetRef.current + cdz * CAMERA_ZOOM_SENSITIVITY,
            FOV_MIN,
            FOV_MAX
          );
        }
      }
    }

    const hold = holdingByArmRef.current;
    const tipForPreview: [number, number, number] = [
      tipWorldRef.current.x,
      tipWorldRef.current.y,
      tipWorldRef.current.z,
    ];
    if (hold && toolWorldFrameRef.current) {
      const cand = findNearestSnapTargetStrict(
        simPosRef.current[hold.ringIndex],
        simQuatRef.current[hold.ringIndex]
      );
      if (cand) {
        previewPegRef.current = cand.snapTo;
        ghostActiveRef.current = true;
      } else {
        const near = findNearestPegForPreview(tipForPreview);
        previewPegRef.current = near;
        ghostActiveRef.current = false;
      }
    } else {
      previewPegRef.current = null;
      ghostActiveRef.current = false;
    }
  });

  return (
    <>
      <PegCameraMount
        rotRef={sceneRotRef}
        fovRef={fovRef}
        rotTargetRef={sceneRotTargetRef}
        fovTargetRef={fovTargetRef}
      />

      <color attach="background" args={['#1E2733']} />
      {/* Match shell (#1E2733); fog tinted to same family so distance reads natural */}
      <fog attach="fog" args={['#232d3a', 14, 90]} />

      <ambientLight intensity={1} />
      <spotLight
        position={[0.2, 2.2, 1.4]}
        angle={0.55}
        penumbra={0.45}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2, 4, 2.5]} intensity={0.35} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0.05} />
      </mesh>

      <mesh position={[0, GRID_CENTER_Y, WALL_Z_BACK - 0.02]} receiveShadow castShadow>
        <boxGeometry args={[3.4, 1.35, 0.06]} />
        <meshStandardMaterial color="#8b6914" metalness={0.12} roughness={0.82} />
      </mesh>

      {LEFT_PEG_POSITIONS.map((pos, i) => (
        <group key={`peg-left-${i}`} position={[pos[0], pos[1], WALL_Z_BACK + 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh rotation={[0, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[PEG_RADIUS * 0.98, PEG_RADIUS, 0.2, 20]} />
            <meshStandardMaterial color="#5c4a3a" roughness={0.65} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.11, 0]} castShadow>
            <sphereGeometry args={[PEG_RADIUS * 0.55, 16, 12]} />
            <meshStandardMaterial color="#a68b65" roughness={0.45} metalness={0.25} />
          </mesh>
        </group>
      ))}

      {RIGHT_PEG_POSITIONS.map((pos, i) => (
        <group key={`peg-right-${i}`} position={[pos[0], pos[1], WALL_Z_BACK + 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PEG_RADIUS * 0.98, PEG_RADIUS, 0.2, 20]} />
            <meshStandardMaterial color="#5c4a3a" roughness={0.65} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.11, 0]} castShadow>
            <sphereGeometry args={[PEG_RADIUS * 0.55, 16, 12]} />
            <meshStandardMaterial color="#a68b65" roughness={0.45} metalness={0.25} />
          </mesh>
        </group>
      ))}

      <PegRingsUpdater
        ringRefs={ringRefs}
        simPosRef={simPosRef}
        simQuatRef={simQuatRef}
        transferred={transferredBools}
      />

      <GhostRingLive previewPegRef={previewPegRef} ghostActiveRef={ghostActiveRef} />

      <PegScreenFixedPortedNeedleDriver
        tipWorldRef={tipWorldRef}
        orientationRef={orientationRef}
        gripClosureRef={gripClosureRef}
        worldFrameRef={toolWorldFrameRef}
      />

      <HighlightPegs previewRef={previewPegRef} ghostActiveRef={ghostActiveRef} />
    </>
  );
}

function HighlightPegs({
  previewRef,
  ghostActiveRef,
}: {
  previewRef: React.MutableRefObject<[number, number, number] | null>;
  ghostActiveRef: React.MutableRefObject<boolean>;
}) {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(() => {
    const target = previewRef.current;
    const active = ghostActiveRef.current;
    for (let i = 0; i < mats.current.length; i++) {
      const m = mats.current[i];
      if (!m) continue;
      const peg = ALL_SNAP_TARGETS[i];
      const on = active && target && peg[0] === target[0] && peg[1] === target[1];
      m.emissive.set(on ? '#2e5818' : '#000000');
      m.emissiveIntensity = on ? 0.45 : 0;
    }
  });
  return (
    <>
      {ALL_SNAP_TARGETS.map((pos, i) => (
        <mesh
          key={`hi-${i}`}
          position={[pos[0], pos[1], pos[2] + 0.006]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[PEG_RADIUS * 1.35, PEG_RADIUS * 1.55, 32]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#3d4a38"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

const COMPLETION_NAV_DELAY_MS = 450;
const MODULE3_PASS_THRESHOLD = 80;

function getGreenCount(ringCurrentSides: ('left' | 'right')[]): number {
  if (ringCurrentSides.length !== TOTAL_RINGS) return 0;
  return ringCurrentSides.filter((side, i) => getOriginSide(i) !== side).length;
}

function computeScorePercent(greenCount: number): number {
  if (greenCount >= TOTAL_RINGS) return 100;
  if (greenCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((100 * greenCount) / TOTAL_RINGS)));
}

const defaultMetrics = (): SimMetrics => ({
  drops: 0,
  failedGrasps: 0,
  clutchCount: 0,
  cameraAdjustCount: 0,
  pathLength: 0,
});

const PegTransfer = () => {
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);
  const latestRingCurrentSidesRef = useRef<('left' | 'right')[]>([...INITIAL_RING_CURRENT_SIDES]);
  const metricsRef = useRef<SimMetrics>(defaultMetrics());
  const previewPegRef = useRef<[number, number, number] | null>(null);
  const ghostActiveRef = useRef(false);
  const [, hudTick] = useState(0);

  const [cameraModeActive, setCameraModeActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_INITIAL_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [completionTriggered, setCompletionTriggered] = useState(false);
  const [debug, setDebug] = useState<DebugOverlayState>({
    connected: false,
    right: makeDefaultArmRuntime(DEFAULT_RIGHT_ARM_POS),
  });

  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  useEffect(() => {
    const id = window.setInterval(() => hudTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  const onFirstMovement = useCallback(() => {
    setTimerStarted(true);
  }, []);

  const onRingSidesChange = useCallback((sides: ('left' | 'right')[]) => {
    latestRingCurrentSidesRef.current = sides;
  }, []);

  const onAllRingsTransferred = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setCompletionTriggered(true);
    const m = { ...metricsRef.current };
    const scorePercent = 100;
    setTimeout(() => {
      const elapsed = TIMER_INITIAL_SECONDS - timeRemainingRef.current;
      navigate('/module/3/completed', {
        state: {
          ringsTransferred: TOTAL_RINGS,
          elapsedSeconds: elapsed,
          score: scorePercent,
          pegMetrics: m,
        },
      });
    }, COMPLETION_NAV_DELAY_MS);
  }, [navigate]);

  useEffect(() => {
    if (!timerStarted || timeRemaining <= 0 || completionTriggered) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerStarted, timeRemaining, completionTriggered]);

  const onCameraModeChange = useCallback((active: boolean) => {
    setCameraModeActive((prev) => (prev === active ? prev : active));
  }, []);

  useEffect(() => {
    if (timeRemaining !== 0 || !timerStarted || completionTriggered) return;
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setCompletionTriggered(true);
    const sides = latestRingCurrentSidesRef.current;
    const greenCount = getGreenCount(sides);
    const scorePercent = computeScorePercent(greenCount);
    const m = { ...metricsRef.current };
    const path = scorePercent >= MODULE3_PASS_THRESHOLD ? '/module/3/completed' : '/module/3/incomplete';
    setTimeout(() => {
      navigate(path, {
        state: {
          ringsTransferred: greenCount,
          elapsedSeconds: TIMER_INITIAL_SECONDS,
          score: scorePercent,
          pegMetrics: m,
        },
      });
    }, COMPLETION_NAV_DELAY_MS);
  }, [timeRemaining, timerStarted, completionTriggered, navigate]);

  const m = metricsRef.current;
  const greenLive = getGreenCount(latestRingCurrentSidesRef.current);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh', backgroundColor: '#26313E', padding: '8px 8px 24px 8px', boxSizing: 'border-box' }}>
      <header
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ backgroundColor: '#1E2733', borderRadius: '6px', marginBottom: '8px' }}
      >
        <button
          type="button"
          onClick={() => navigate('/modules')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-sm font-medium"
          style={{ color: '#ffffff' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L8 10l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Modules
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'white' }}>Peg Transfer</h1>
        <p className="text-sm" style={{ color: '#9CA3AF', maxWidth: '280px', textAlign: 'right' }}>
          Hold button1+button2 on right handle for camera mode
        </p>
      </header>
      <div
        className="flex-1 rounded-lg overflow-hidden min-h-0 relative"
        style={{
          width: '100%',
          minHeight: 'clamp(260px, 42vh, 920px)',
          backgroundColor: '#1E2733',
        }}
      >
        <div
          className="absolute top-3 left-3 z-10 rounded-lg px-3 py-2 font-mono text-sm font-semibold"
          style={{
            backgroundColor: '#1E2733',
            color: '#fff',
            border: '1px solid #374151',
            pointerEvents: 'none',
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontSize: 17, marginBottom: 4 }}>{formatTimer(timeRemaining)}</div>
          <div>Transferred: {greenLive} / {TOTAL_RINGS}</div>
          <div>Drops: {m.drops}</div>
          <div>Failed grasps: {m.failedGrasps}</div>
          <div>Clutch: {m.clutchCount} · Camera adj: {m.cameraAdjustCount}</div>
          <div style={{ opacity: 0.85 }}>Path: {(m.pathLength * 10).toFixed(0)}</div>
        </div>
        <div
          className="absolute top-3 right-3 z-10 rounded-lg px-3 py-2 font-mono text-xs"
          style={{
            backgroundColor: '#1E2733',
            color: '#fff',
            border: '1px solid #374151',
            pointerEvents: 'none',
            minWidth: '260px',
          }}
        >
          <div style={{ marginBottom: 6 }}>Connection: {debug.connected ? 'Connected' : 'Disconnected'}</div>
          <div style={{ marginBottom: 4 }}>Right device (touch-2 only)</div>
          <div>x:{debug.right.position[0].toFixed(3)} y:{debug.right.position[1].toFixed(3)} z:{debug.right.position[2].toFixed(3)}</div>
          <div>yaw:{(debug.right.orientation.yaw * 180 / Math.PI).toFixed(1)} pitch:{(debug.right.orientation.pitch * 180 / Math.PI).toFixed(1)} roll:{(debug.right.orientation.roll * 180 / Math.PI).toFixed(1)}</div>
          <div>b1:{debug.right.button1 ? '1' : '0'} b2:{debug.right.button2 ? '1' : '0'}</div>
        </div>
        {cameraModeActive && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #22c55e',
              background: 'rgba(22, 101, 52, 0.9)',
              color: '#dcfce7',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.7,
              zIndex: 11,
              pointerEvents: 'none',
            }}
          >
            CAMERA MODE
          </div>
        )}
        <Canvas
          shadows
          gl={(defaults) => {
            const canvas = defaults.canvas;
            if (!(canvas instanceof HTMLCanvasElement)) {
              throw new Error('Peg Transfer requires a DOM canvas');
            }
            return createPegTransferGl({
              canvas,
              antialias: defaults.antialias,
              alpha: defaults.alpha,
              powerPreference: defaults.powerPreference as WebGLPowerPreference | undefined,
            });
          }}
          camera={{
            position: [PT_CAM_INITIAL_POS.x, PT_CAM_INITIAL_POS.y, PT_CAM_INITIAL_POS.z],
            quaternion: PT_CAM_INIT_QUAT,
            fov: FOV_INITIAL,
            near: CAMERA_NEAR,
            far: 100,
          }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <PegTransferScene
            onAllRingsTransferred={onAllRingsTransferred}
            onFirstMovement={onFirstMovement}
            onRingSidesChange={onRingSidesChange}
            onDebugUpdate={setDebug}
            onCameraModeChange={onCameraModeChange}
            metricsRef={metricsRef}
            previewPegRef={previewPegRef}
            ghostActiveRef={ghostActiveRef}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default PegTransfer;
