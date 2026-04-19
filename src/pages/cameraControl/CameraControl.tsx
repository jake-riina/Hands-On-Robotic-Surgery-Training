import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import organsImage from '../../contexts/Organs.png';
import whiteboardImage from '../../contexts/Whteboard.png';
import {
  useGeomagicLatestRef,
  type GeomagicBridgeEvents,
  type LatestByArmRef,
} from '../../hooks/useGeomagicLatestRef';
import {
  type CameraTelemetrySample,
  type CameraOrbCaptureMetrics,
  insertCameraTelemetryBatch,
  insertCameraOrbRow,
  markCameraOrbCollected,
  invokeModule2AbandonSession,
  invokeModule2CompleteSession,
} from '../../lib/module2SessionService';
import { canCalibrateDevices } from '../../pegTransfer/pegTransferDeviceCalibration';
import { CAMERA_FOV_MAX } from '../../pegTransfer/pegTransferCameraRig';
import { pegTransferReferenceValues } from '../../pegTransfer/pegTransferReferenceValues';
import { CameraControlInstruments } from './CameraControlInstruments';
import { CameraControlRig } from './CameraControlRig';

const ENDOSCOPE = pegTransferReferenceValues.lightingDefaults.endoscopePointLight;

function OrEndoscopeHeadlamp() {
  const { camera } = useThree();
  const lightRef = useRef<THREE.PointLight>(null);
  const tmpForward = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    camera.getWorldDirection(tmpForward);
    light.position.copy(camera.position).addScaledVector(tmpForward, ENDOSCOPE.forwardOffsetM);
    light.updateMatrixWorld();
  });

  return (
    <pointLight
      ref={lightRef}
      intensity={ENDOSCOPE.intensity}
      distance={ENDOSCOPE.distance}
      decay={ENDOSCOPE.decay}
      color={ENDOSCOPE.colorHex}
    />
  );
}

const MODULE_2_ID = 2;

function Module2CameraTelemetrySampler({
  sessionId,
  recording,
  telemetryApiRef,
}: {
  sessionId: string | null;
  recording: boolean;
  telemetryApiRef: MutableRefObject<{ push: (s: CameraTelemetrySample) => void }>;
}) {
  const { camera } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);
  const accum = useRef(0);
  useFrame((_, delta) => {
    if (!sessionId || !recording) return;
    accum.current += delta;
    if (accum.current < 0.1) return;
    accum.current = 0;
    camera.getWorldPosition(vec);
    telemetryApiRef.current.push({
      x: vec.x,
      y: vec.y,
      z: vec.z,
      recorded_at: new Date().toISOString(),
    });
  });
  return null;
}

function createSyringesTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-cy, -cx);
  // One big syringe sideways: barrel (long horizontal), plunger end (left), needle + cap (right)
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(cx - 70, cy - 35, 100, 70);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.rect(cx - 78, cy - 45, 18, 90);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.rect(cx + 32, cy - 8, 45, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 62, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createGloveTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 55, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - 35, cy - 50, 12, 28, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - 18, cy - 58, 10, 22, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 62, 10, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 18, cy - 56, 10, 22, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 34, cy - 48, 12, 26, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Crosshair / capture: bar only fills when orb is centered AND size matches (not too zoomed in = orb bigger than crosshair, not too zoomed out = orb too small) */
const CAPTURE_DURATION = 1.5;
/** Tighter = must center orb more precisely in crosshair */
const POSITION_TOLERANCE_PX = 16;
/** Orb must be within this much smaller than crosshair (too small = too much space, don't fill). Tighter = more precise zoom. */
const SIZE_MIN_BELOW_PX = 5;
/** Orb must not be bigger than crosshair (too zoomed in = don't fill). */
const SIZE_MAX_ABOVE_PX = 5;

function ProjectOrb({
  orbPosition,
  orbRadius,
  crosshairRadiusPx,
  onOrbProjection,
  onCapture,
}: {
  orbPosition: [number, number, number];
  orbRadius: number;
  crosshairRadiusPx: number;
  onOrbProjection: (data: { progress: number }) => void;
  onCapture: (metrics: CameraOrbCaptureMetrics) => void;
}) {
  const { camera, size } = useThree();
  const progressRef = useRef(0);
  const lastReportedRef = useRef(-1);
  const center = useRef(new THREE.Vector3(...orbPosition)).current;
  const edge = useRef(new THREE.Vector3()).current;
  const camWorldPos = useRef(new THREE.Vector3());
  const camWorldDir = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    center.set(orbPosition[0], orbPosition[1], orbPosition[2]);
    center.project(camera);
    const screenX = (center.x * 0.5 + 0.5) * size.width;
    const screenY = (1 - (center.y * 0.5 + 0.5)) * size.height;
    const toScreen = (wx: number, wy: number, wz: number) => {
      edge.set(wx, wy, wz);
      edge.project(camera);
      const sx = (edge.x * 0.5 + 0.5) * size.width;
      const sy = (1 - (edge.y * 0.5 + 0.5)) * size.height;
      return Math.hypot(sx - screenX, sy - screenY);
    };
    const screenRadius = Math.max(
      toScreen(orbPosition[0] + orbRadius, orbPosition[1], orbPosition[2]),
      toScreen(orbPosition[0] - orbRadius, orbPosition[1], orbPosition[2]),
      toScreen(orbPosition[0], orbPosition[1] + orbRadius, orbPosition[2]),
      toScreen(orbPosition[0], orbPosition[1] - orbRadius, orbPosition[2]),
      toScreen(orbPosition[0], orbPosition[1], orbPosition[2] + orbRadius),
      toScreen(orbPosition[0], orbPosition[1], orbPosition[2] - orbRadius)
    );
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const dist = Math.hypot(screenX - centerX, screenY - centerY);
    const inCenter = dist < POSITION_TOLERANCE_PX;
    const minRadius = crosshairRadiusPx - SIZE_MIN_BELOW_PX;
    const maxRadius = crosshairRadiusPx + SIZE_MAX_ABOVE_PX;
    const rightSize = screenRadius >= minRadius && screenRadius <= maxRadius;
    if (inCenter && rightSize) {
      progressRef.current = Math.min(1, progressRef.current + delta / CAPTURE_DURATION);
      if (progressRef.current >= 1) {
        camera.getWorldPosition(camWorldPos.current);
        camera.getWorldDirection(camWorldDir.current);
        onCapture({
          capture_cam_x: camWorldPos.current.x,
          capture_cam_y: camWorldPos.current.y,
          capture_cam_z: camWorldPos.current.z,
          capture_forward_x: camWorldDir.current.x,
          capture_forward_y: camWorldDir.current.y,
          capture_forward_z: camWorldDir.current.z,
          capture_screen_dist_px: dist,
          capture_screen_radius_px: screenRadius,
        });
        progressRef.current = 0;
      }
    } else {
      progressRef.current = 0;
    }
    const p = progressRef.current;
    if (Math.abs(p - lastReportedRef.current) >= 0.06 || p === 0 || p >= 1) {
      lastReportedRef.current = p;
      onOrbProjection({ progress: p });
    }
  });

  return null;
}

const ORB_RADIUS = 0.12;
const CROSSHAIR_RADIUS_PX = 40;

/** Spawn positions for the red orb (scattered around the OR) */
const ORB_SPAWN_POSITIONS: [number, number, number][] = [
  [1.4, 0.3, 4.05],
  [-1.2, 0.35, 3.8],
  [0.8, 0.25, -1.5],
  [-0.9, 0.4, 2.2],
  [1.6, 0.3, 0.5],
  [-1.5, 0.28, 0.8],
  [0, 0.32, 3.2],
  [2.0, 0.3, 2.0],
  /* Near back wall / wall cabinets */
  [-1.35, 0.32, -2.05],
  [1.35, 0.3, -2.05],
  [-0.5, 0.38, -2.08],
  [0.55, 0.33, -2.06],
];

/**
 * Transform candidates into a "front cavity" using Z only (no x/y changes):
 * - always negative Z (never behind the user at spawn time)
 * - compress into a far-wall-ish band so targets are closer together.
 *
 * Target band: z' in [-2.4, -1.3]
 * Derived from:
 *   z' = -(Z_OFFSET + abs(z) * Z_SCALE)
 *   abs(z)=0.5  -> ~-1.3
 *   abs(z)=4.05 -> ~-2.4
 */
const TASK_Z_OFFSET = 1.145;
const TASK_Z_SCALE = 0.310;
function toFrontCavityZOnly([x, y, z]: [number, number, number]): [number, number, number] {
  return [x, y, -(TASK_Z_OFFSET + Math.abs(z) * TASK_Z_SCALE)];
}

const ORB_SPAWN_POSITIONS_FRONT = ORB_SPAWN_POSITIONS.map(toFrontCavityZOnly);

/** Invisible bubble: orbs cannot spawn inside this sphere (center = above table, radius in world units) */
const EXCLUSION_CENTER: [number, number, number] = [0, 0.35, 0];
const EXCLUSION_RADIUS = 1.0;

/** Min distance from camera (0, 0.5, 0): at max zoom out (FOV 50°), no orb appears bigger than the crosshair */
const MIN_CAMERA_DISTANCE = 1.9;

function isOutsideExclusionBubble(pos: [number, number, number]): boolean {
  const [x, y, z] = pos;
  const [cx, cy, cz] = EXCLUSION_CENTER;
  const distSq = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
  return distSq > EXCLUSION_RADIUS * EXCLUSION_RADIUS;
}

function isFarEnoughFromCamera(pos: [number, number, number]): boolean {
  const [x, y, z] = pos;
  const distSq = x * x + (y - 0.5) ** 2 + z * z;
  return distSq >= MIN_CAMERA_DISTANCE * MIN_CAMERA_DISTANCE;
}

/** Spawn positions: outside exclusion bubble and far enough from camera so max zoom out never shows orb bigger than crosshair */
const ORB_SPAWN_POSITIONS_VALID = ORB_SPAWN_POSITIONS_FRONT.filter(
  (p) => isOutsideExclusionBubble(p) && isFarEnoughFromCamera(p)
);

/** Arrow fixed inset from left/right so it never goes off screen */
const ORB_HINT_INSET = 40;

/** Returns true if orb is off-screen (outside inset). */
function orbIsOffScreen(sx: number, sy: number, w: number, h: number, inset: number): boolean {
  return sx < inset || sx > w - inset || sy < inset || sy > h - inset;
}

function OrbHintUpdater({
  orbPosition,
  onOrbHint,
}: {
  orbPosition: [number, number, number];
  onOrbHint: (hint: { x: number; y: number; angle: number } | null, canvasW?: number, canvasH?: number) => void;
}) {
  const { camera, size } = useThree();
  const center = useRef(new THREE.Vector3(...orbPosition)).current;
  const dirToOrb = useRef(new THREE.Vector3()).current;
  const cameraRight = useRef(new THREE.Vector3()).current;
  const lastHintRef = useRef<{ x: number; y: number; angle: number } | null>(null);
  const lastWRef = useRef(0);
  const lastHRef = useRef(0);

  useFrame(() => {
    const w = size.width;
    const h = size.height;
    const cx = w / 2;
    const cy = h / 2;
    const inset = 2;

    center.set(orbPosition[0], orbPosition[1], orbPosition[2]);
    center.project(camera);
    let sx = (center.x * 0.5 + 0.5) * w;
    let sy = (1 - (center.y * 0.5 + 0.5)) * h;

    if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
      sx = cx + w;
      sy = cy;
    }

    const behindCamera = center.z > 1;
    const offScreen2D = orbIsOffScreen(sx, sy, w, h, inset);
    if (!behindCamera && !offScreen2D) {
      if (lastHintRef.current !== null || lastWRef.current !== w || lastHRef.current !== h) {
        lastHintRef.current = null;
        lastWRef.current = w;
        lastHRef.current = h;
        onOrbHint(null, w, h);
      }
      return;
    }

    dirToOrb.set(orbPosition[0], orbPosition[1] - 0.5, orbPosition[2]);
    camera.getWorldDirection(cameraRight.set(0, 0, -1));
    cameraRight.crossVectors(camera.up, cameraRight).normalize();
    const orbIsToRight = dirToOrb.dot(cameraRight) < 0;

    const useLeft = !orbIsToRight;
    const arrowX = useLeft ? ORB_HINT_INSET : w - ORB_HINT_INSET;
    const arrowY = cy;
    const angle = useLeft ? Math.PI : 0;
    const prev = lastHintRef.current;
    const same =
      prev !== null &&
      prev.x === arrowX &&
      prev.y === arrowY &&
      prev.angle === angle &&
      lastWRef.current === w &&
      lastHRef.current === h;
    if (!same) {
      lastHintRef.current = { x: arrowX, y: arrowY, angle };
      lastWRef.current = w;
      lastHRef.current = h;
      onOrbHint({ x: arrowX, y: arrowY, angle }, w, h);
    }
  });
  return null;
}

interface CameraControlSceneProps {
  showRedOrb?: boolean;
  geomagicLatestRef: LatestByArmRef;
  fovRef?: React.MutableRefObject<number>;
  simulationEnabled: boolean;
  pendingCalibrateRef: React.MutableRefObject<boolean>;
  onDeviceCalibrationApplied?: () => void;
  toolMotionEpoch: number;
  onCameraModeActiveChange?: (active: boolean) => void;
  orbPosition?: [number, number, number];
  onOrbProjection?: (data: { progress: number }) => void;
  onCapture?: (metrics: CameraOrbCaptureMetrics) => void;
  onOrbHint?: (hint: { x: number; y: number; angle: number } | null, canvasW?: number, canvasH?: number) => void;
  module2SessionId?: string | null;
  module2TelemetryRecording?: boolean;
  module2TelemetryApiRef?: MutableRefObject<{ push: (s: CameraTelemetrySample) => void }>;
}

function CameraControlScene({
  showRedOrb = false,
  geomagicLatestRef,
  fovRef,
  simulationEnabled,
  pendingCalibrateRef,
  onDeviceCalibrationApplied,
  toolMotionEpoch,
  onCameraModeActiveChange,
  orbPosition = [1.4, 0.3, 4.05],
  onOrbProjection = () => {},
  onCapture = (_metrics: CameraOrbCaptureMetrics) => {},
  onOrbHint = () => {},
  module2SessionId = null,
  module2TelemetryRecording = false,
  module2TelemetryApiRef,
}: CameraControlSceneProps) {
  const organTexture = useLoader(TextureLoader, organsImage);
  const whiteboardTexture = useLoader(TextureLoader, whiteboardImage);
  const syringesTexture = useMemo(() => createSyringesTexture(), []);
  const gloveTexture = useMemo(() => createGloveTexture(), []);

  const defaultFovRef = useRef(CAMERA_FOV_MAX);
  const fov = fovRef ?? defaultFovRef;

  return (
    <>
      <OrEndoscopeHeadlamp />
      {module2TelemetryApiRef != null && (
        <Module2CameraTelemetrySampler
          sessionId={module2SessionId}
          recording={module2TelemetryRecording}
          telemetryApiRef={module2TelemetryApiRef}
        />
      )}
      <CameraControlRig
        geomagicLatestRef={geomagicLatestRef}
        fovRef={fov}
        onCameraModeActiveChange={onCameraModeActiveChange}
      />
      <CameraControlInstruments
        geomagicLatestRef={geomagicLatestRef}
        simulationEnabled={simulationEnabled}
        pendingCalibrateRef={pendingCalibrateRef}
        onDeviceCalibrationApplied={onDeviceCalibrationApplied}
        toolMotionEpoch={toolMotionEpoch}
      />
      {showRedOrb && (
        <ProjectOrb
          orbPosition={orbPosition}
          orbRadius={ORB_RADIUS}
          crosshairRadiusPx={CROSSHAIR_RADIUS_PX}
          onOrbProjection={onOrbProjection}
          onCapture={onCapture}
        />
      )}
      {showRedOrb && <OrbHintUpdater orbPosition={orbPosition} onOrbHint={onOrbHint} />}
      <OrRoomBody
        organTexture={organTexture}
        whiteboardTexture={whiteboardTexture}
        syringesTexture={syringesTexture}
        gloveTexture={gloveTexture}
      />
      {/* Red orb - position from props; goal: center in crosshair with right zoom to capture */}
      {showRedOrb && (
        <mesh position={orbPosition}>
          <sphereGeometry args={[ORB_RADIUS, 32, 32]} />
          <meshStandardMaterial
            color="#ef4444"
            roughness={0.3}
            metalness={0.1}
            emissive="#ef4444"
            emissiveIntensity={0.15}
          />
        </mesh>
      )}
    </>
  );
}

function pickNewOrbPosition(current: [number, number, number]): [number, number, number] {
  const others = ORB_SPAWN_POSITIONS_VALID.filter(
    (p) => p[0] !== current[0] || p[1] !== current[1] || p[2] !== current[2]
  );
  const pool = others.length > 0 ? others : ORB_SPAWN_POSITIONS_VALID;
  return pool[Math.floor(Math.random() * pool.length)] ?? ORB_SPAWN_POSITIONS_FRONT[0];
}

const CameraControl = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionIdFromState = (location.state as { sessionId?: string } | null)?.sessionId ?? null;

  const [countdown, setCountdown] = useState<number | 'GO!' | null>(null);
  const [showRedOrb, setShowRedOrb] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionDbEnded, setSessionDbEnded] = useState(false);
  const timerSecondsRef = useRef(timerSeconds);
  timerSecondsRef.current = timerSeconds;
  const fovRef = useRef(CAMERA_FOV_MAX);
  const [orbPosition, setOrbPosition] = useState<[number, number, number]>(
    ORB_SPAWN_POSITIONS_VALID[0] ?? ORB_SPAWN_POSITIONS_FRONT[0]
  );
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [flyingOrb, setFlyingOrb] = useState<{
    targetIndex: number;
    startX?: number;
    startY?: number;
    targetX?: number;
    targetY?: number;
  } | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cameraModeActive, setCameraModeActive] = useState(false);
  const [devicesCalibrated, setDevicesCalibrated] = useState(false);
  const [toolMotionEpoch, setToolMotionEpoch] = useState(0);
  const [inkwellReady, setInkwellReady] = useState(false);
  const pendingCalibrateRef = useRef(false);
  const [orbHintState, setOrbHintState] = useState<{
    hint: { x: number; y: number; angle: number } | null;
    canvasW: number;
    canvasH: number;
  }>({ hint: null, canvasW: 1, canvasH: 1 });

  const bridgeEventsRef = useRef<GeomagicBridgeEvents>({ reconnectAfterClose: true });
  /** After GO (timed orb phase); avoids false abandon on StrictMode remount / early WS close. */
  const exerciseLiveForAbandonRef = useRef(false);
  const exerciseEndedRef = useRef(false);
  const abandonOnceRef = useRef(false);
  const incompleteFlowStartedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const telemetryBufferRef = useRef<CameraTelemetrySample[]>([]);
  const telemetrySaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeOrbIdRef = useRef<string | null>(null);
  const lastOrbSpawnKeyRef = useRef('');
  const telemetryApiRef = useRef<{ push: (s: CameraTelemetrySample) => void }>({
    push: () => {},
  });
  const handleAbandonSessionRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    sessionIdRef.current = sessionIdFromState;
  }, [sessionIdFromState]);

  useEffect(() => {
    exerciseLiveForAbandonRef.current = false;
  }, [sessionIdFromState]);

  useEffect(() => {
    if (timerActive && showRedOrb) {
      exerciseLiveForAbandonRef.current = true;
    }
  }, [timerActive, showRedOrb]);

  useEffect(() => {
    if (sessionIdFromState) return;
    navigate('/module/2/instructions', { replace: true });
  }, [sessionIdFromState, navigate]);

  const flushTelemetryBuffer = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const batch = [...telemetryBufferRef.current];
    telemetryBufferRef.current = [];
    await insertCameraTelemetryBatch(sid, MODULE_2_ID, batch);
  }, []);

  useEffect(() => {
    telemetryApiRef.current.push = (sample) => {
      if (sessionDbEnded || !sessionIdRef.current) return;
      if (!timerActive || !showRedOrb) return;
      telemetryBufferRef.current.push(sample);
      if (telemetryBufferRef.current.length >= 10) {
        const sid = sessionIdRef.current;
        const toSave = [...telemetryBufferRef.current];
        telemetryBufferRef.current = [];
        void insertCameraTelemetryBatch(sid, MODULE_2_ID, toSave);
      }
    };
  }, [timerActive, showRedOrb, sessionDbEnded]);

  const handleAbandonSession = useCallback(async () => {
    if (!sessionIdFromState) {
      navigate('/modules');
      return;
    }
    const sid = sessionIdRef.current;
    if (!sid || abandonOnceRef.current) return;
    abandonOnceRef.current = true;
    exerciseEndedRef.current = true;
    setSessionDbEnded(true);
    if (telemetrySaveIntervalRef.current) {
      clearInterval(telemetrySaveIntervalRef.current);
      telemetrySaveIntervalRef.current = null;
    }
    await flushTelemetryBuffer();
    await invokeModule2AbandonSession(sid);
    navigate('/modules');
  }, [navigate, flushTelemetryBuffer, sessionIdFromState]);

  useEffect(() => {
    handleAbandonSessionRef.current = handleAbandonSession;
  }, [handleAbandonSession]);

  if (sessionIdFromState) {
    bridgeEventsRef.current.reconnectAfterClose = false;
    bridgeEventsRef.current.onUnexpectedClose = () => {
      if (exerciseEndedRef.current) return;
      if (!exerciseLiveForAbandonRef.current) return;
      void handleAbandonSessionRef.current();
    };
  } else {
    bridgeEventsRef.current.reconnectAfterClose = true;
    bridgeEventsRef.current.onUnexpectedClose = undefined;
  }

  const geomagicLatestRef = useGeomagicLatestRef(bridgeEventsRef);

  useEffect(() => {
    if (!sessionIdFromState) return;
    telemetrySaveIntervalRef.current = setInterval(() => {
      if (telemetryBufferRef.current.length > 0) {
        void flushTelemetryBuffer();
      }
    }, 1000);
    return () => {
      if (telemetrySaveIntervalRef.current) {
        clearInterval(telemetrySaveIntervalRef.current);
        telemetrySaveIntervalRef.current = null;
      }
    };
  }, [sessionIdFromState, flushTelemetryBuffer]);

  useEffect(() => {
    return () => {
      if (telemetrySaveIntervalRef.current) {
        clearInterval(telemetrySaveIntervalRef.current);
      }
      const sid = sessionIdRef.current;
      const batch = [...telemetryBufferRef.current];
      telemetryBufferRef.current = [];
      if (sid && batch.length > 0) {
        void insertCameraTelemetryBatch(sid, MODULE_2_ID, batch);
      }
      if (!exerciseEndedRef.current && sid && exerciseLiveForAbandonRef.current) {
        exerciseEndedRef.current = true;
        void invokeModule2AbandonSession(sid);
      }
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setInkwellReady(canCalibrateDevices(geomagicLatestRef.current));
    }, 120);
    return () => window.clearInterval(id);
  }, [geomagicLatestRef]);

  const onCameraModeActiveChange = useCallback((active: boolean) => {
    setCameraModeActive(active);
  }, []);

  const onOrbHint = useCallback(
    (hint: { x: number; y: number; angle: number } | null, canvasW?: number, canvasH?: number) => {
      setOrbHintState((prev) => ({
        hint,
        canvasW: canvasW ?? prev.canvasW,
        canvasH: canvasH ?? prev.canvasH,
      }));
    },
    []
  );

  useEffect(() => {
    if (orbsCollected !== 5) return;
    const timeTakenSeconds = 60 - timerSecondsRef.current;
    const delay = 600;
    const id = setTimeout(() => {
      void (async () => {
        const sid = sessionIdRef.current;
        exerciseEndedRef.current = true;
        setSessionDbEnded(true);
        if (telemetrySaveIntervalRef.current) {
          clearInterval(telemetrySaveIntervalRef.current);
          telemetrySaveIntervalRef.current = null;
        }
        await flushTelemetryBuffer();
        if (sid) await invokeModule2CompleteSession(sid);
        navigate('/module/2/complete', {
          state: { orbsCollected: 5, totalOrbs: 5, timeTakenSeconds },
        });
      })();
    }, delay);
    return () => clearTimeout(id);
  }, [orbsCollected, navigate, flushTelemetryBuffer]);

  useEffect(() => {
    if (!showRedOrb) setOrbHintState((prev) => ({ ...prev, hint: null }));
  }, [showRedOrb]);

  const onOrbProjection = useCallback((data: { progress: number }) => {
    setCaptureProgress(data.progress);
  }, []);
  const onCapture = useCallback(async (metrics: CameraOrbCaptureMetrics) => {
    const orbId = activeOrbIdRef.current;
    if (sessionIdFromState && orbId) {
      await markCameraOrbCollected(orbId, metrics);
      activeOrbIdRef.current = null;
    }
    const targetIndex = orbsCollected;
    setFlyingOrb({ targetIndex });
    setOrbsCollected((c) => Math.min(5, c + 1));
    setOrbPosition((p) => pickNewOrbPosition(p));
    setCaptureProgress(0);
  }, [orbsCollected, sessionIdFromState]);

  useEffect(() => {
    if (!sessionIdFromState || !timerActive || !showRedOrb) return;
    const orbIndex = orbsCollected + 1;
    if (orbIndex > 5) return;
    const key = `${orbIndex}|${orbPosition.join(',')}`;
    if (lastOrbSpawnKeyRef.current === key) return;
    lastOrbSpawnKeyRef.current = key;
    void (async () => {
      const id = await insertCameraOrbRow({
        sessionId: sessionIdFromState,
        orbIndex,
        x: orbPosition[0],
        y: orbPosition[1],
        z: orbPosition[2],
      });
      if (id) activeOrbIdRef.current = id;
    })();
  }, [sessionIdFromState, timerActive, showRedOrb, orbsCollected, orbPosition]);

  useEffect(() => {
    if (flyingOrb == null || flyingOrb.targetX != null) return;
    const container = canvasContainerRef.current;
    const cr = container?.getBoundingClientRect();
    const startX = cr ? cr.left + cr.width / 2 : window.innerWidth / 2;
    const startY = cr ? cr.top + cr.height / 2 : window.innerHeight / 2;
    setFlyingOrb((prev) => (prev ? { ...prev, startX, startY } : null));
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = shellRefs.current[flyingOrb.targetIndex];
        if (!el) {
          setFlyingOrb(null);
          return;
        }
        const r = el.getBoundingClientRect();
        setFlyingOrb((prev) =>
          prev ? { ...prev, targetX: r.left + r.width / 2, targetY: r.top + r.height / 2 } : null
        );
      });
    });
    return () => cancelAnimationFrame(id);
  }, [flyingOrb?.targetIndex, flyingOrb?.targetX]);

  // Countdown starts after device calibration (same inkwell flow as Peg Transfer).
  useEffect(() => {
    if (!devicesCalibrated) return;
    const startId = setTimeout(() => setCountdown(5), 100);
    return () => clearTimeout(startId);
  }, [devicesCalibrated]);

  useEffect(() => {
    if (countdown === null) return;
    const t = typeof countdown === 'number' ? 1000 : 800;
    const id = setTimeout(() => {
      if (countdown === 5) setCountdown(4);
      else if (countdown === 4) setCountdown(3);
      else if (countdown === 3) setCountdown(2);
      else if (countdown === 2) setCountdown(1);
      else if (countdown === 1) setCountdown('GO!');
      else if (countdown === 'GO!') {
        setCountdown(null);
        setShowRedOrb(true);
        setTimerActive(true);
        setTimerSeconds(60);
      }
    }, t);
    return () => clearTimeout(id);
  }, [countdown]);

  // 1-minute timer: starts when GO! ends, counts down every second
  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, timerSeconds]);

  // When timer hits zero and not all orbs collected, go to incomplete page
  useEffect(() => {
    if (!timerActive || timerSeconds !== 0 || orbsCollected >= 5) return;
    if (incompleteFlowStartedRef.current) return;
    incompleteFlowStartedRef.current = true;
    exerciseEndedRef.current = true;
    setSessionDbEnded(true);
    if (telemetrySaveIntervalRef.current) {
      clearInterval(telemetrySaveIntervalRef.current);
      telemetrySaveIntervalRef.current = null;
    }
    const sid = sessionIdRef.current;
    const orbsForResult = orbsCollected;
    let cancelled = false;
    void (async () => {
      await flushTelemetryBuffer();
      if (cancelled) return;
      if (sid) await invokeModule2CompleteSession(sid);
      if (cancelled) return;
      navigate('/module/2/incomplete', { state: { orbsCollected: orbsForResult, totalOrbs: 5 } });
    })();
    return () => {
      cancelled = true;
    };
  }, [timerActive, timerSeconds, orbsCollected, navigate, flushTelemetryBuffer]);

  const showCountdownOverlay = countdown !== null;
  const timerDisplay = timerActive
    ? `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`
    : '1:00';

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        backgroundColor: '#26313E',
        padding: '8px 8px 24px 8px',
        boxSizing: 'border-box',
      }}
    >
      {!devicesCalibrated && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 24,
            padding: 24,
            background: 'rgba(10, 12, 18, 0.82)',
            pointerEvents: 'auto',
          }}
        >
          <p className="text-center text-lg leading-relaxed max-w-xl" style={{ color: '#e2e8f0', margin: 0 }}>
            Place both styluses in the inkwell, then calibrate to enable instruments and start the exercise.
          </p>
          <button
            type="button"
            disabled={!inkwellReady}
            onClick={() => {
              pendingCalibrateRef.current = true;
            }}
            className="rounded-xl font-semibold text-2xl transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 px-12 py-4"
            style={{ backgroundColor: '#1DA5FF', color: '#ffffff' }}
          >
            Calibrate devices
          </button>
        </div>
      )}
      <header
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{
          backgroundColor: '#1E2733',
          borderRadius: '6px',
          marginBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => void handleAbandonSession()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-sm font-medium"
          style={{ color: '#ffffff' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L8 10l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Modules
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'white' }}>Camera Control</h1>
        <p className="text-sm" style={{ color: '#9CA3AF', maxWidth: '240px' }}>
          Hold button1 on both handles for camera mode
        </p>
      </header>
      <div
        className="flex-1 rounded-lg overflow-hidden min-h-0 relative"
        style={{ width: '100%', backgroundColor: '#1E2733' }}
      >
        {/* Canvas: endoscope rig + peg-style world instruments (RCM). */}
        <div
          ref={canvasContainerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, cursor: 'default' }}
          role="application"
          tabIndex={0}
        >
          <Canvas camera={{ position: [0, 0.5, 0], fov: 50 }} dpr={1} style={{ width: '100%', height: '100%', display: 'block' }}>
            <Suspense fallback={null}>
              <CameraControlScene
                showRedOrb={showRedOrb}
                geomagicLatestRef={geomagicLatestRef}
                fovRef={fovRef}
                simulationEnabled={devicesCalibrated}
                pendingCalibrateRef={pendingCalibrateRef}
                toolMotionEpoch={toolMotionEpoch}
                onCameraModeActiveChange={onCameraModeActiveChange}
                onDeviceCalibrationApplied={() => {
                  setDevicesCalibrated(true);
                  setToolMotionEpoch((e) => e + 1);
                }}
                orbPosition={orbPosition}
                onOrbProjection={onOrbProjection}
                onCapture={onCapture}
                onOrbHint={onOrbHint}
                module2SessionId={sessionIdFromState}
                module2TelemetryRecording={
                  Boolean(sessionIdFromState && timerActive && showRedOrb && !sessionDbEnded)
                }
                module2TelemetryApiRef={telemetryApiRef}
              />
            </Suspense>
          </Canvas>
        </div>
        {/* Orb hint arrow: points toward orb when off-screen; position as % so it matches canvas coordinates */}
        {showRedOrb && orbHintState.hint != null && orbHintState.canvasW > 0 && orbHintState.canvasH > 0 && (() => {
          const { hint, canvasW, canvasH } = orbHintState;
          const leftPct = (100 * hint.x) / canvasW;
          const topPct = (100 * hint.y) / canvasH;
          const size = 44;
          return (
            <div
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                pointerEvents: 'none',
                zIndex: 4,
                transform: `rotate(${hint.angle}rad)`,
                transformOrigin: 'center center',
              }}
            >
              <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                <path
                  d="M 6 8 L 34 20 L 6 32 L 14 20 Z"
                  fill="#ef4444"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        })()}
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
        {/* Crosshair: center of screen, fixed size; circular progress when orb is centered + right zoom */}
        {showRedOrb && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <svg width={96} height={96} viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0 }}>
                <circle
                  cx={48}
                  cy={48}
                  r={44}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={3}
                />
                <circle
                  cx={48}
                  cy={48}
                  r={44}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={3}
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - captureProgress)}
                  strokeLinecap="round"
                  transform="rotate(-90 48 48)"
                />
                <line x1={48} y1={20} x2={48} y2={36} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
                <line x1={48} y1={60} x2={48} y2={76} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
                <line x1={20} y1={48} x2={36} y2={48} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
                <line x1={60} y1={48} x2={76} y2={48} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
                <circle cx={48} cy={48} r={CROSSHAIR_RADIUS_PX} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
              </svg>
            </div>
          </div>
        )}
        {/* Flying orb: shoots from crosshair center to the next shell when captured, shrinks as it goes */}
        {flyingOrb != null && flyingOrb.startX != null && (
          <div
            role="presentation"
            onTransitionEnd={() => setFlyingOrb(null)}
            style={{
              position: 'fixed',
              left: flyingOrb.targetX != null ? flyingOrb.targetX : flyingOrb.startX,
              top: flyingOrb.targetX != null ? flyingOrb.targetY : flyingOrb.startY,
              width: flyingOrb.targetX != null ? 26 : 48,
              height: flyingOrb.targetX != null ? 26 : 48,
              marginLeft: flyingOrb.targetX != null ? -13 : -24,
              marginTop: flyingOrb.targetX != null ? -13 : -24,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 12px rgba(239,68,68,0.5)',
              pointerEvents: 'none',
              zIndex: 20,
              transition: 'left 0.45s ease-out, top 0.45s ease-out, width 0.45s ease-out, height 0.45s ease-out, margin-left 0.45s ease-out, margin-top 0.45s ease-out',
            }}
          />
        )}
        <style>{`
          @keyframes timerThrob {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            50% { transform: scale(1.06); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4); }
          }
        `}</style>
        <div
          className="absolute top-3 right-3 flex items-center gap-2.5 rounded-lg px-5 py-2.5 font-mono font-semibold"
          style={{
            backgroundColor: timerActive && timerSeconds <= 10 ? '#2a1a1a' : '#1E2733',
            color: timerActive && timerSeconds <= 10 ? '#fca5a5' : '#fff',
            border: timerActive && timerSeconds <= 10 ? '1px solid #ef4444' : '1px solid #374151',
            zIndex: 10,
            fontSize: '1.6rem',
            animation: timerActive && timerSeconds <= 10 ? 'timerThrob 0.7s ease-in-out infinite' : undefined,
          }}
        >
          <span>{timerDisplay}</span>
          <div className="flex items-center gap-2" style={{ marginLeft: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                ref={(el) => { shellRefs.current[i] = el; }}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.5)',
                  backgroundColor: i < orbsCollected ? '#ef4444' : 'transparent',
                }}
                title={`Orb ${i + 1}`}
              />
            ))}
          </div>
        </div>
        {/* Countdown overlay: 5, 4, 3, 2, 1, GO! - above canvas */}
        {showCountdownOverlay && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            <span
              className="font-bold tabular-nums"
              style={{
                fontSize: countdown === 'GO!' ? 'clamp(4rem, 12vw, 8rem)' : 'clamp(6rem, 18vw, 12rem)',
                color: countdown === 'GO!' ? '#22c55e' : '#fff',
                textShadow: '0 0 24px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {countdown}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraControl;
