import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import organsImage from '../contexts/Organs.png';
import whiteboardImage from '../contexts/Whteboard.png';

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

/** Camera mounted on top of table: position never changes, only rotation (look around). Zoom = FOV. */
const CAMERA_POSITION = new THREE.Vector3(0, 0.5, 0);

function CameraMount({ rotX, rotY, fov }: { rotX: number; rotY: number; fov: number }) {
  useFrame(({ camera }) => {
    camera.position.copy(CAMERA_POSITION);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = rotY;
    camera.rotation.x = rotX;
    camera.rotation.z = 0;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** Crosshair / capture: bar only fills when orb is centered AND size matches (not too zoomed in = orb bigger than crosshair, not too zoomed out = orb too small) */
const CAPTURE_DURATION = 1.5;
/** Tighter = must center orb more precisely in crosshair */
const POSITION_TOLERANCE_PX = 16;
/** Orb must be within this much smaller than crosshair (too small = too much space, don't fill). Tighter = more precise zoom. */
const SIZE_MIN_BELOW_PX = 5;
/** Orb must not be bigger than crosshair (too zoomed in = don't fill). */
const SIZE_MAX_ABOVE_PX = 1;

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
  onCapture: () => void;
}) {
  const { camera, size } = useThree();
  const progressRef = useRef(0);
  const lastReportedRef = useRef(-1);
  const center = useRef(new THREE.Vector3(...orbPosition)).current;
  const edge = useRef(new THREE.Vector3()).current;

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
        onCapture();
        progressRef.current = 0;
      }
    } else {
      progressRef.current = 0;
    }
    const p = progressRef.current;
    if (Math.abs(p - lastReportedRef.current) >= 0.02 || p === 0 || p >= 1) {
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
const ORB_SPAWN_POSITIONS_VALID = ORB_SPAWN_POSITIONS.filter(
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
  sceneRotX?: number;
  sceneRotY?: number;
  fov?: number;
  orbPosition?: [number, number, number];
  onOrbProjection?: (data: { progress: number }) => void;
  onCapture?: () => void;
  onOrbHint?: (hint: { x: number; y: number; angle: number } | null, canvasW?: number, canvasH?: number) => void;
}

function CameraControlScene({
  showRedOrb = false,
  sceneRotX = 0,
  sceneRotY = 0,
  fov = 50,
  orbPosition = [1.4, 0.3, 4.05],
  onOrbProjection = () => {},
  onCapture = () => {},
  onOrbHint = () => {},
}: CameraControlSceneProps) {
  const organTexture = useLoader(TextureLoader, organsImage);
  const whiteboardTexture = useLoader(TextureLoader, whiteboardImage);
  const syringesTexture = useMemo(() => createSyringesTexture(), []);
  const gloveTexture = useMemo(() => createGloveTexture(), []);

  return (
    <>
      <CameraMount rotX={sceneRotX} rotY={sceneRotY} fov={fov} />
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
      <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 8, 0]} intensity={1.5} />
      <directionalLight position={[0, 6, 3]} intensity={0.8} />
      <directionalLight position={[3, 5, 2]} intensity={0.3} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#8b95a0" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Ceiling - high, no shadows */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.6, 0]} castShadow={false} receiveShadow={false}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#d4dce3" roughness={0.75} metalness={0.02} side={2} />
      </mesh>

      {/* Walls - OR style: pale surgical blue-green; back wall has 3 cabinet openings */}
      <mesh position={[-2.5, 3, -2.5]}>
        <planeGeometry args={[2, 8]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[2.5, 3, -2.5]}>
        <planeGeometry args={[2, 8]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[0, 4.45, -2.5]}>
        <planeGeometry args={[3, 6.1]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[0, -0.05, -2.5]}>
        <planeGeometry args={[3, 0.9]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[-0.525, 0.9, -2.5]}>
        <planeGeometry args={[0.15, 1.0]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[0.525, 0.9, -2.5]}>
        <planeGeometry args={[0.15, 1.0]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[-3.5, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[3.5, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>
      <mesh position={[0, 3, 5.0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#c8dce5" roughness={0.65} metalness={0.02} side={2} />
      </mesh>

      {/* Whiteboard - front wall (right of door) */}
      <group position={[-0.5, 1.2, 4.98]} rotation={[0, Math.PI, 0]}>
        {/* Frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.95, 0.7, 0.03]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Writing surface - RM/PATIENT/STATUS grid image */}
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.88, 0.58]} />
          <meshStandardMaterial map={whiteboardTexture} roughness={0.85} metalness={0} side={2} />
        </mesh>
      </group>

      {/* Door - front wall */}
      <group position={[-2.5, 0.5, 5.0]}>
        {/* Door frame / jamb */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.0, 2.2, 0.1]} />
          <meshStandardMaterial color="#d1d5db" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Door panel */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.9, 2.1, 0.06]} />
          <meshStandardMaterial color="#f3f4f6" roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Door handle - lever style (inside only) */}
        <mesh position={[0.42, 0, -0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Handle lever arm */}
        <mesh position={[0.42, 0.06, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Door window / window panel (optional - common in OR doors) */}
        <mesh position={[0, 0.4, 0.05]}>
          <boxGeometry args={[0.3, 0.4, 0.02]} />
          <meshStandardMaterial color="#e0e7ff" roughness={0.3} metalness={0.1} opacity={0.6} transparent />
        </mesh>
      </group>

      {/* Hand sanitizer - wall mounted next to door */}
      <group position={[-1.5, 0.65, 4.98]} rotation={[0, Math.PI, 0]}>
        {/* Wall mount plate */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.12, 0.25, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Dispenser body - white */}
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.1, 0.22, 0.08]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.08} />
        </mesh>
        {/* Sensor / front panel */}
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Nozzle / dispenser outlet */}
        <mesh position={[0, -0.14, 0.08]}>
          <boxGeometry args={[0.04, 0.03, 0.04]} />
          <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.2} />
        </mesh>
        {/* Bottle / reservoir (translucent) */}
        <mesh position={[0, 0.06, 0.06]}>
          <boxGeometry args={[0.06, 0.1, 0.04]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.3} metalness={0} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Wall cabinet 1 - recessed in back wall */}
      <group position={[-1.05, 0.9, -2.66]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 1.0, 0.02]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <boxGeometry args={[0.02, 0.96, 0.02]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[-0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Glove boxes on bottom shelf - left side of door only, stacked, with glove image on each */}
        <group position={[-0.2, -0.28, 0.06]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.06, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
        </group>
        <group position={[-0.1, -0.28, 0.06]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.06, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
        </group>
        <group position={[-0.2, -0.28, 0.02]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.06, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
        </group>
        <group position={[-0.1, -0.28, 0.02]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.06, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
        </group>
        <group position={[-0.3, -0.28, 0.04]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.09]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.06, 0.046]}>
            <planeGeometry args={[0.065, 0.035]} />
            <meshStandardMaterial map={gloveTexture} side={2} />
          </mesh>
        </group>
      </group>

      {/* Wall cabinet 2 - recessed in back wall */}
      <group position={[0, 0.9, -2.66]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 1.0, 0.02]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <boxGeometry args={[0.02, 0.96, 0.02]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[-0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Spray bottle on middle shelf (left side) */}
        <group position={[-0.12, 0.02, 0.06]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.1, 16]} />
            <meshStandardMaterial color="#e0e7ff" roughness={0.4} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.015, 0.018, 0.03, 12]} />
            <meshStandardMaterial color="#c7d2fe" roughness={0.4} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.125, 0.012]}>
            <boxGeometry args={[0.025, 0.02, 0.015]} />
            <meshStandardMaterial color="#6366f1" roughness={0.5} metalness={0.1} />
          </mesh>
        </group>
        {/* One big syringe box with syringes image on front - top shelf (right side) */}
        <group position={[0.16, 0.32, 0.035]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.18, 0.08, 0.1]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[0, 0.04, 0.051]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.16, 0.072]} />
            <meshStandardMaterial map={syringesTexture} side={2} />
          </mesh>
        </group>
      </group>

      {/* Wall cabinet 3 - recessed in back wall */}
      <group position={[1.05, 0.9, -2.66]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 1.0, 0.02]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <boxGeometry args={[0.02, 0.96, 0.02]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, -0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.21, 0.3, 0.08]}>
          <boxGeometry args={[0.4, 0.02, 0.12]} />
          <meshStandardMaterial color="#8b95a0" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[0.21, 0, 0.16]}>
          <boxGeometry args={[0.42, 0.96, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0} transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[-0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0.21, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Sterile saline bottles on middle shelf (left side) */}
        <group position={[-0.15, 0.02, 0.06]}>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.025, 0.028, 0.09, 16]} />
            <meshStandardMaterial color="#e8f4f8" roughness={0.3} metalness={0} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.012, 0.014, 0.02, 12]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0} />
          </mesh>
        </group>
        <group position={[-0.05, 0.02, 0.06]}>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.025, 0.028, 0.09, 16]} />
            <meshStandardMaterial color="#e8f4f8" roughness={0.3} metalness={0} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.012, 0.014, 0.02, 12]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0} />
          </mesh>
        </group>
        <group position={[-0.15, 0.02, 0.02]}>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.025, 0.028, 0.09, 16]} />
            <meshStandardMaterial color="#e8f4f8" roughness={0.3} metalness={0} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.012, 0.014, 0.02, 12]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0} />
          </mesh>
        </group>
      </group>

      {/* Anesthesia machine (Mindray A5 style) - 3D, back-right corner */}
      <group position={[3.15, -0.5, -2.25]} rotation={[0, 0, 0]}>
        {/* Four black caster wheels - on floor (y=0.04 so bottom touches floor) */}
        <mesh position={[0.2, 0.04, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.15} />
        </mesh>
        <mesh position={[-0.2, 0.04, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.15} />
        </mesh>
        <mesh position={[0.2, 0.04, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.15} />
        </mesh>
        <mesh position={[-0.2, 0.04, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.15} />
        </mesh>
        {/* Dark grey base - sits on wheels */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.5]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Main unit - white/light grey tower (just above base to avoid z-fight; base top y=0.13) */}
        <mesh position={[0.15, 0.682, 0]}>
          <boxGeometry args={[0.32, 1.1, 0.28]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Left side: monitor arm (tower to screen) + screen */}
        <mesh position={[-0.135, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 12]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.26, 0.82, 0]}>
          <boxGeometry args={[0.22, 0.28, 0.04]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.05} />
        </mesh>
        <mesh position={[-0.26, 0.82, 0.03]}>
          <boxGeometry args={[0.18, 0.24, 0.01]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0} />
        </mesh>
        {/* Vaporizer shelf - slightly in front of tower face to avoid z-fight */}
        <mesh position={[0.15, 0.71, 0.17]}>
          <boxGeometry args={[0.28, 0.04, 0.2]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Two vaporizers - cylinders with purple and yellow tops (on shelf) */}
        <mesh position={[0.15, 0.78, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, 0.84, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, 0.68, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, 0.74, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Upper control panel - in front of tower face */}
        <mesh position={[0.15, 0.92, 0.17]}>
          <boxGeometry args={[0.28, 0.08, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, 0.92, 0.2]}>
          <boxGeometry args={[0.2, 0.05, 0.01]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0} />
        </mesh>
        {/* Gas flow meters - in front of tower face */}
        <mesh position={[0.15, 0.86, 0.17]}>
          <boxGeometry args={[0.22, 0.03, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0.08, 0.86, 0.18]}><cylinderGeometry args={[0.012, 0.012, 0.01, 12]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        <mesh position={[0.15, 0.86, 0.18]}><cylinderGeometry args={[0.012, 0.012, 0.01, 12]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        <mesh position={[0.22, 0.86, 0.18]}><cylinderGeometry args={[0.012, 0.012, 0.01, 12]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        {/* Four horizontal drawers - in front of tower face */}
        <mesh position={[0.15, 0.52, 0.17]}><boxGeometry args={[0.26, 0.12, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.55} metalness={0.05} /></mesh>
        <mesh position={[0.15, 0.52, 0.2]}><boxGeometry args={[0.2, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        <mesh position={[0.15, 0.38, 0.17]}><boxGeometry args={[0.26, 0.12, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.55} metalness={0.05} /></mesh>
        <mesh position={[0.15, 0.38, 0.2]}><boxGeometry args={[0.2, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        <mesh position={[0.15, 0.24, 0.17]}><boxGeometry args={[0.26, 0.12, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.55} metalness={0.05} /></mesh>
        <mesh position={[0.15, 0.24, 0.2]}><boxGeometry args={[0.2, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        <mesh position={[0.15, 0.1, 0.17]}><boxGeometry args={[0.26, 0.12, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.55} metalness={0.05} /></mesh>
        <mesh position={[0.15, 0.1, 0.2]}><boxGeometry args={[0.2, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} /></mesh>
        {/* Handle bar on right side */}
        <mesh position={[0.15, 0.5, -0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.25, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.3} />
        </mesh>
      </group>

      {/* Ventilator (MAQUET-style) - 3D, in front of whiteboard */}
      <group position={[0.9, -0.5, 4.65]} rotation={[0, Math.PI, 0]}>
        {/* Four caster wheels - on floor */}
        <mesh position={[0.18, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.025, 24]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.025, 24]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.18, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.025, 24]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.025, 24]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Four-pronged base (X shape) */}
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.02, 0.06, 0.52]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.02, 0.06, 0.52]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Central column */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.7, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Main ventilator unit - white/grey block */}
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[0.38, 0.5, 0.28]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0.08} />
        </mesh>
        {/* Dark control panel face */}
        <mesh position={[0, 0.95, 0.15]}>
          <boxGeometry args={[0.34, 0.42, 0.03]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Simple tubing suggestion - left side (blue/grey cylinders) */}
        <mesh position={[-0.22, 0.88, 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.6} metalness={0} />
        </mesh>
        <mesh position={[-0.22, 0.78, 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.12, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0} />
        </mesh>
        {/* Monitor arm - vertical then horizontal */}
        <mesh position={[0, 1.28, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.028, 0.35, 12]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Monitor - dark screen with light bezel (screen slightly in front to avoid z-fight) */}
        <mesh position={[0, 1.45, 0.28]}>
          <boxGeometry args={[0.28, 0.2, 0.04]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.45, 0.32]}>
          <planeGeometry args={[0.24, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0} side={2} />
        </mesh>
        {/* Right-side articulated arm - first segment */}
        <mesh position={[0.2, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.02, 0.2, 12]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Arm end - clamp/holder */}
        <mesh position={[0.38, 1.0, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.04]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.1} />
        </mesh>
      </group>

      {/* IV pole (Invacare-style) - 3D, next to wall-mounted cabinets */}
      <group position={[2.1, -0.5, -2.28]}>
        {/* Four caster wheels */}
        <mesh position={[0.15, 0.04, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.02, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[-0.15, 0.04, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.02, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.15, 0.04, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.02, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[-0.15, 0.04, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.02, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Four-pronged base (X shape) - metallic */}
        <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.018, 0.05, 0.38]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.018, 0.05, 0.38]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Main vertical pole - chrome/metallic */}
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.022, 0.025, 1.55, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Height clamp */}
        <mesh position={[0, 1.1, 0.03]}>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Two C-shaped hooks at top - left and right */}
        <mesh position={[-0.08, 1.58, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0.08, 1.58, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* IV bag - hanging from right hook (translucent) */}
        <mesh position={[0.12, 1.48, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.04]} />
          <meshStandardMaterial color="#f0f9ff" roughness={0.2} metalness={0} transparent opacity={0.75} />
        </mesh>
        {/* IV tubing - from bag down */}
        <mesh position={[0.12, 1.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.3} metalness={0} transparent opacity={0.8} />
        </mesh>
        {/* Drip chamber */}
        <mesh position={[0.12, 1.32, 0]}>
          <boxGeometry args={[0.02, 0.05, 0.02]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.3} metalness={0} transparent opacity={0.85} />
        </mesh>
        {/* Tubing below drip chamber */}
        <mesh position={[0.12, 1.22, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.25, 8]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.3} metalness={0} transparent opacity={0.8} />
        </mesh>
        {/* Roller clamp */}
        <mesh position={[0.12, 1.15, 0.02]}>
          <boxGeometry args={[0.025, 0.02, 0.015]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* Back table (stainless steel utility table) - 3D, against right wall under screen */}
      <group position={[3.15, -0.5, -1.05]} rotation={[0, Math.PI / 2, 0]} scale={[0.72, 0.72, 0.72]}>
        {/* Four caster wheels - grey with dark tread */}
        <mesh position={[0.35, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.022, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.35, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.022, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.35, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.022, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.35, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.022, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Four square-profile legs */}
        <mesh position={[0.35, 0.48, 0.18]}>
          <boxGeometry args={[0.04, 0.88, 0.04]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-0.35, 0.48, 0.18]}>
          <boxGeometry args={[0.04, 0.88, 0.04]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0.35, 0.48, -0.18]}>
          <boxGeometry args={[0.04, 0.88, 0.04]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-0.35, 0.48, -0.18]}>
          <boxGeometry args={[0.04, 0.88, 0.04]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Lower shelf - stainless */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.72, 0.02, 0.36]} />
          <meshStandardMaterial color="#b4bcc6" roughness={0.35} metalness={0.55} />
        </mesh>
        {/* Top surface - stainless */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.76, 0.025, 0.4]} />
          <meshStandardMaterial color="#b4bcc6" roughness={0.35} metalness={0.55} />
        </mesh>
        {/* Front label strip (optional) */}
        <mesh position={[0, 0.935, 0.21]}>
          <boxGeometry args={[0.2, 0.015, 0.02]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.1} />
        </mesh>
      </group>

      {/* Defibrillator on cart - 3D, against right wall */}
      <group position={[3.25, -0.5, 0.55]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Cart: four casters */}
        <mesh position={[0.15, 0.03, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.15, 0.03, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.15, 0.03, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.15, 0.03, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Cart legs */}
        <mesh position={[0.15, 0.24, 0.13]}>
          <boxGeometry args={[0.035, 0.42, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.15, 0.24, 0.13]}>
          <boxGeometry args={[0.035, 0.42, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.15, 0.24, -0.13]}>
          <boxGeometry args={[0.035, 0.42, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.15, 0.24, -0.13]}>
          <boxGeometry args={[0.035, 0.42, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Cart top shelf */}
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.34, 0.02, 0.28]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.55} metalness={0.08} />
        </mesh>
        {/* Main unit body - white/gray */}
        <mesh position={[0, 0.72, 0.02]}>
          <boxGeometry args={[0.3, 0.4, 0.24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Screen bezel - dark */}
        <mesh position={[0, 0.88, 0.145]}>
          <boxGeometry args={[0.26, 0.18, 0.025]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Screen display - ECG trace suggestion */}
        <mesh position={[0, 0.88, 0.158]}>
          <planeGeometry args={[0.22, 0.14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0} side={2} />
        </mesh>
        {/* Control panel below screen - Charge / Shock buttons area */}
        <mesh position={[0, 0.72, 0.145]}>
          <boxGeometry args={[0.24, 0.1, 0.02]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Charge button - yellow/orange */}
        <mesh position={[-0.06, 0.72, 0.157]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.015, 12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Shock button - red */}
        <mesh position={[0.06, 0.72, 0.157]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.015, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Paddles holder / cable coil on top */}
        <mesh position={[0, 1.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.05, 0.018, 8, 16]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.15} />
        </mesh>
      </group>

      {/* Bovie / electrosurgical generator - 3D, against right wall on cart, next to back table */}
      <group position={[3.25, -0.5, -0.25]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Cart: four casters */}
        <mesh position={[0.14, 0.03, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.14, 0.03, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.14, 0.03, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.14, 0.03, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Cart legs / base */}
        <mesh position={[0.14, 0.2, 0.12]}>
          <boxGeometry args={[0.035, 0.34, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.14, 0.2, 0.12]}>
          <boxGeometry args={[0.035, 0.34, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.14, 0.2, -0.12]}>
          <boxGeometry args={[0.035, 0.34, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.14, 0.2, -0.12]}>
          <boxGeometry args={[0.035, 0.34, 0.035]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Cart top shelf */}
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.32, 0.02, 0.26]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.55} metalness={0.08} />
        </mesh>
        {/* Main generator body - gray/beige box */}
        <mesh position={[0, 0.55, 0.02]}>
          <boxGeometry args={[0.28, 0.22, 0.22]} />
          <meshStandardMaterial color="#d1d5db" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Front panel - dark (display + controls) */}
        <mesh position={[0, 0.55, 0.135]}>
          <boxGeometry args={[0.24, 0.18, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Screen / display area */}
        <mesh position={[0, 0.58, 0.146]}>
          <boxGeometry args={[0.16, 0.08, 0.01]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0} side={2} />
        </mesh>
        {/* Cut / Coag buttons */}
        <mesh position={[-0.06, 0.52, 0.146]}>
          <boxGeometry args={[0.04, 0.025, 0.01]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.06, 0.52, 0.146]}>
          <boxGeometry args={[0.04, 0.025, 0.01]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Power level knob */}
        <mesh position={[0.1, 0.52, 0.146]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.012, 12]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Cable port / handpiece connector - front */}
        <mesh position={[0, 0.48, 0.135]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Cable coil suggestion */}
        <mesh position={[0, 0.42, 0.14]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.15} />
        </mesh>
      </group>

      {/* Waste bucket (kick bucket) - 3D, by the door, just out from corner, slightly out from wall */}
      <group position={[-3.2, -0.5, 4.5]}>
        {/* Base ring / foot */}
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.015, 12, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Bucket body - tapered cylinder (wider at top) */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.13, 0.11, 0.38, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.45} metalness={0.4} />
        </mesh>
        {/* Rim */}
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.135, 0.012, 12, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      {/* Operating table (Scandia 35 Prime / Merivaara style) - 3D, center of OR, on floor */}
      <group position={[0, -0.5, 0.5]}>
        {/* Base - light gray, bottom on floor (y=0.07 so bottom at 0), slightly bigger */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.82, 0.14, 0.58]} />
          <meshStandardMaterial color="#b8c4d0" roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Four wheels - light gray, on floor (y=0.03 so bottom touches floor) */}
        <mesh position={[0.32, 0.03, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.026, 24]} />
          <meshStandardMaterial color="#9ca8b8" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.32, 0.03, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.026, 24]} />
          <meshStandardMaterial color="#9ca8b8" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.32, 0.03, -0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.026, 24]} />
          <meshStandardMaterial color="#9ca8b8" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.32, 0.03, -0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.026, 24]} />
          <meshStandardMaterial color="#9ca8b8" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* U-shaped handle / bar at front of base */}
        <mesh position={[0, 0.11, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.23, 0.02, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#8b95a5" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.23, 0.11, 0.3]}>
          <boxGeometry args={[0.045, 0.045, 0.09]} />
          <meshStandardMaterial color="#8b95a5" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.23, 0.11, 0.3]}>
          <boxGeometry args={[0.045, 0.045, 0.09]} />
          <meshStandardMaterial color="#8b95a5" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Control panel on base */}
        <mesh position={[0.26, 0.09, 0]}>
          <boxGeometry args={[0.14, 0.06, 0.02]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Central support column - light gray (short, table low to floor), slightly bigger */}
        <mesh position={[0, 0.29, 0]}>
          <boxGeometry args={[0.23, 0.12, 0.21]} />
          <meshStandardMaterial color="#b8c4d0" roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Scandia 35 Prime branding panel on column */}
        <mesh position={[0, 0.29, 0.11]}>
          <boxGeometry args={[0.2, 0.1, 0.015]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.08} />
        </mesh>
        {/* Articulation / mechanism below tabletop */}
        <mesh position={[0, 0.37, 0]}>
          <boxGeometry args={[0.26, 0.06, 0.23]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Metal frame / rails under tabletop - bigger */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.2, 0.04, 0.5]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Six padded segments - dark gray (head to foot), bigger */}
        <mesh position={[-0.46, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
        <mesh position={[-0.23, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
        <mesh position={[0.23, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
        <mesh position={[0.46, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
        {/* Head segment with U-shaped cutout (right end) */}
        <mesh position={[0.69, 0.46, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.46]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.02} />
        </mesh>
      </group>

      {/* EKG machine (GE Healthcare style) - 3D, against left wall */}
      <group position={[-3.25, -0.5, -1.0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Four caster wheels - black with gray tread */}
        <mesh position={[0.2, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.2, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.2, 0.04, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Silver-gray legs (four prongs from column to wheels) */}
        <mesh position={[0.2, 0.12, 0.18]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.08, 0.35]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.2, 0.12, 0.18]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.08, 0.35]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.2, 0.12, -0.18]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.08, 0.35]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.2, 0.12, -0.18]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.08, 0.35]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Main white column (slightly tapered - wider at base) */}
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.42, 0.85, 0.32]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} metalness={0.05} />
        </mesh>
        {/* GE logo panel (dark front panel) */}
        <mesh position={[0, 0.5, 0.165]}>
          <boxGeometry args={[0.32, 0.25, 0.02]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Horizontal seam line above logo */}
        <mesh position={[0, 0.68, 0.17]}>
          <boxGeometry args={[0.38, 0.008, 0.015]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* U-shaped handle - silver-gray */}
        <mesh position={[0, 0.88, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.38, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[-0.19, 0.88, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.12, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.19, 0.88, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.12, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Storage bin - right side, dark gray */}
        <mesh position={[0.24, 0.52, 0]}>
          <boxGeometry args={[0.12, 0.35, 0.28]} />
          <meshStandardMaterial color="#475569" roughness={0.55} metalness={0.08} />
        </mesh>
        {/* Control console - white, wide shallow inclined */}
        <mesh position={[0, 1.08, 0.05]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.5, 0.12, 0.35]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} metalness={0.05} />
        </mesh>
        {/* Keyboard area - recessed grid of buttons */}
        <mesh position={[0, 1.1, 0.2]}>
          <boxGeometry args={[0.36, 0.06, 0.22]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Right-side control buttons + indicators */}
        <mesh position={[0.18, 1.1, 0.2]}>
          <boxGeometry args={[0.1, 0.05, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.18, 1.1, 0.14]}>
          <boxGeometry args={[0.1, 0.05, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Green indicator lights */}
        <mesh position={[0.14, 1.12, 0.2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.005, 12]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.2, 1.12, 0.2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.005, 12]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
        </mesh>
        {/* Monitor arm - silver, from back of console */}
        <mesh position={[0, 1.22, -0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.03, 0.25, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Monitor - black frame */}
        <mesh position={[0, 1.38, -0.28]}>
          <boxGeometry args={[0.38, 0.28, 0.04]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Monitor screen - dark (EKG display), slightly in front to avoid z-fight */}
        <mesh position={[0, 1.38, -0.255]}>
          <planeGeometry args={[0.34, 0.24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0} side={2} />
        </mesh>
        {/* Patient cable module arm - left of monitor */}
        <mesh position={[-0.28, 1.38, -0.28]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.02, 0.15, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Patient cable module - white with lead receptacles */}
        <mesh position={[-0.38, 1.38, -0.28]}>
          <boxGeometry args={[0.14, 0.2, 0.06]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Lead receptacles - colored dots (simplified) */}
        <mesh position={[-0.38, 1.35, -0.25]}>
          <boxGeometry args={[0.1, 0.12, 0.02]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0} />
        </mesh>
        {/* Cable bundle from module */}
        <mesh position={[-0.38, 1.28, -0.28]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.025, 0.15, 10]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {/* Ultrasound machine on cart - 3D, by back wall near wall-mounted cabinet */}
      <group position={[-2.15, -0.5, -2.22]} rotation={[0, 0, 0]}>
        {/* Cart: four casters */}
        <mesh position={[0.16, 0.03, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.022, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.16, 0.03, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.022, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.16, 0.03, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.022, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.16, 0.03, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.022, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Cart legs */}
        <mesh position={[0.16, 0.28, 0.14]}>
          <boxGeometry args={[0.038, 0.5, 0.038]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.16, 0.28, 0.14]}>
          <boxGeometry args={[0.038, 0.5, 0.038]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.16, 0.28, -0.14]}>
          <boxGeometry args={[0.038, 0.5, 0.038]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[-0.16, 0.28, -0.14]}>
          <boxGeometry args={[0.038, 0.5, 0.038]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Cart top shelf */}
        <mesh position={[0, 0.56, 0]}>
          <boxGeometry args={[0.36, 0.025, 0.3]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.55} metalness={0.08} />
        </mesh>
        {/* Main unit body - white/gray */}
        <mesh position={[0, 0.82, 0.02]}>
          <boxGeometry args={[0.32, 0.38, 0.26]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Screen bezel - dark */}
        <mesh position={[0, 1.02, 0.155]}>
          <boxGeometry args={[0.28, 0.22, 0.03]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Screen display */}
        <mesh position={[0, 1.02, 0.17]}>
          <planeGeometry args={[0.24, 0.18]} />
          <meshStandardMaterial color="#0c1222" roughness={0.8} metalness={0} side={2} />
        </mesh>
        {/* Keyboard / control strip below screen */}
        <mesh position={[0, 0.88, 0.155]}>
          <boxGeometry args={[0.26, 0.06, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Trackball area */}
        <mesh position={[0.12, 0.88, 0.165]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.015, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.2} />
        </mesh>
        {/* Probe holder - right side of unit */}
        <mesh position={[0.18, 0.78, 0.02]}>
          <boxGeometry args={[0.06, 0.12, 0.1]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Probe cable coil */}
        <mesh position={[0.18, 0.68, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.035, 0.014, 8, 16]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.15} />
        </mesh>
      </group>

      {/* Medical cart - back-left corner, like Med Cart (white 3-tier, wheels) */}
      <group position={[-3.15, -0.5, -2.25]}>
        {/* Four corner uprights (rounded posts) */}
        <mesh position={[0.22, 0.52, 0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.22, 0.52, 0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[0.22, 0.52, -0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.22, 0.52, -0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Four caster wheels - on floor (center y=0.04 so bottom touches) */}
        <mesh position={[0.22, 0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[-0.22, 0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0.22, 0.04, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[-0.22, 0.04, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Bottom shelf */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.42, 0.025, 0.32]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Middle shelf */}
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.42, 0.025, 0.32]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Top tier - tray with raised edge (left, back, right) */}
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[0.44, 0.03, 0.34]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.2, 0.81, 0]}><boxGeometry args={[0.04, 0.04, 0.34]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        <mesh position={[0.2, 0.81, 0]}><boxGeometry args={[0.04, 0.04, 0.34]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        <mesh position={[0, 0.81, -0.15]}><boxGeometry args={[0.44, 0.04, 0.04]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        {/* Push handle at back */}
        <mesh position={[0, 0.88, -0.17]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.38, 12]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Small drawer under top tier */}
        <mesh position={[0, 0.7, 0.06]}>
          <boxGeometry args={[0.28, 0.12, 0.2]} />
          <meshStandardMaterial color="#e0e2e6" roughness={0.65} metalness={0.05} />
        </mesh>
      </group>

      {/* Second medical cart - under whiteboard (wider) */}
      <group position={[-0.5, -0.5, 4.65]}>
        {/* Four corner uprights (rounded posts) */}
        <mesh position={[0.28, 0.52, 0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.28, 0.52, 0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[0.28, 0.52, -0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.28, 0.52, -0.17]}>
          <cylinderGeometry args={[0.022, 0.022, 0.95, 16]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Four caster wheels - on floor */}
        <mesh position={[0.28, 0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[-0.28, 0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0.28, 0.04, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[-0.28, 0.04, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Bottom shelf */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.52, 0.025, 0.32]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Middle shelf */}
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.52, 0.025, 0.32]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Top tier - tray with raised edge */}
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[0.54, 0.03, 0.34]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh position={[-0.26, 0.81, 0]}><boxGeometry args={[0.04, 0.04, 0.34]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        <mesh position={[0.26, 0.81, 0]}><boxGeometry args={[0.04, 0.04, 0.34]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        <mesh position={[0, 0.81, -0.15]}><boxGeometry args={[0.54, 0.04, 0.04]} /><meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} /></mesh>
        {/* Push handle at back */}
        <mesh position={[0, 0.88, -0.17]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.46, 12]} />
          <meshStandardMaterial color="#e8eaed" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Small drawer under top tier */}
        <mesh position={[0, 0.7, 0.06]}>
          <boxGeometry args={[0.34, 0.12, 0.2]} />
          <meshStandardMaterial color="#e0e2e6" roughness={0.65} metalness={0.05} />
        </mesh>
      </group>

      {/* Screen 1 - left wall (patient organs), centered */}
      <group position={[-3.35, 1.3, 1.25]}>
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 1.0]} />
          <meshStandardMaterial color="#1a1f26" roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[0.02, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.36, 0.92]} />
          <meshStandardMaterial map={organTexture} emissive="#0a0e12" emissiveIntensity={0.35} side={2} />
        </mesh>
      </group>

      {/* Screen 2 - right wall (patient organs), centered */}
      <group position={[3.35, 1.3, 1.25]}>
        <mesh position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 1.0]} />
          <meshStandardMaterial color="#1a1f26" roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[-0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.36, 0.92]} />
          <meshStandardMaterial map={organTexture} emissive="#0a0e12" emissiveIntensity={0.35} side={2} />
        </mesh>
      </group>

      {/* Floor cabinet - right wall, toward front (front faces into room) */}
      <group position={[3.15, -0.5, 3.0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Base / plinth - lighter gray so it reads like the other cabinet */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.26]} />
          <meshStandardMaterial color="#5c6575" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Main body */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.5, 1.6, 0.22]} />
          <meshStandardMaterial color="#7d8590" roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Left door - light gray like standing cabinet */}
        <mesh position={[-0.125, 0.9, 0.115]}>
          <boxGeometry args={[0.23, 1.52, 0.02]} />
          <meshStandardMaterial color="#b0b8c4" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Right door */}
        <mesh position={[0.125, 0.9, 0.115]}>
          <boxGeometry args={[0.23, 1.52, 0.02]} />
          <meshStandardMaterial color="#b0b8c4" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Door handles */}
        <mesh position={[-0.125, 0.9, 0.128]}>
          <boxGeometry args={[0.02, 0.12, 0.012]} />
          <meshStandardMaterial color="#5c6575" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0.125, 0.9, 0.128]}>
          <boxGeometry args={[0.02, 0.12, 0.012]} />
          <meshStandardMaterial color="#5c6575" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Top cap */}
        <mesh position={[0, 1.72, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.24]} />
          <meshStandardMaterial color="#5c6575" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* Standing cabinet - front of room (slim depth, less protruding) */}
      <group position={[1.85, -0.5, 4.6]} rotation={[0, Math.PI, 0]}>
        {/* Base / plinth */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.26]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Main body */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.5, 1.6, 0.22]} />
          <meshStandardMaterial color="#6b7280" roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Left door */}
        <mesh position={[-0.125, 0.9, 0.115]}>
          <boxGeometry args={[0.23, 1.52, 0.02]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Right door */}
        <mesh position={[0.125, 0.9, 0.115]}>
          <boxGeometry args={[0.23, 1.52, 0.02]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Door handles */}
        <mesh position={[-0.125, 0.9, 0.128]}>
          <boxGeometry args={[0.02, 0.12, 0.012]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0.125, 0.9, 0.128]}>
          <boxGeometry args={[0.02, 0.12, 0.012]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Top cap */}
        <mesh position={[0, 1.72, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.24]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

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

      {/* Mobile screen on wheels - at front wall, right side */}
      <group position={[2.7, -0.5, 4.5]} rotation={[0, Math.PI, 0]}>
        {/* Base plate */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.5, 0.04, 0.35]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Four caster wheels */}
        <mesh position={[0.2, 0.04, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.2, 0.04, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.04, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-0.2, 0.04, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Vertical pole - taller */}
        <mesh position={[0, 0.61, 0]}>
          <cylinderGeometry args={[0.025, 0.028, 1.1, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Screen mount / arm */}
        <mesh position={[0, 1.14, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.2, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Screen - dark frame */}
        <mesh position={[0, 1.14, 0.22]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.52, 0.36, 0.04]} />
          <meshStandardMaterial color="#1a1f26" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Screen display - blank (no image) */}
        <mesh position={[0, 1.14, 0.24]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.44, 0.28]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.05} side={2} />
        </mesh>
      </group>

      </group>
    </>
  );
}

const ROT_SENSITIVITY = 0.004;
const ZOOM_SENSITIVITY = 0.4;
const FOV_MIN = 12;
const FOV_MAX = 50;
const ROT_X_MAX = Math.PI / 2 - 0.15;

/** Camera fixed on table: rotate only (no movement). Zoom = FOV (narrower = zoom in). */

function pickNewOrbPosition(current: [number, number, number]): [number, number, number] {
  const others = ORB_SPAWN_POSITIONS_VALID.filter(
    (p) => p[0] !== current[0] || p[1] !== current[1] || p[2] !== current[2]
  );
  const pool = others.length > 0 ? others : ORB_SPAWN_POSITIONS_VALID;
  return pool[Math.floor(Math.random() * pool.length)] ?? ORB_SPAWN_POSITIONS[0];
}

const CameraControl = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | 'GO!' | null>(null);
  const [showRedOrb, setShowRedOrb] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  /** Start facing the back wall (wall cabinets): horizontal toward -Z with slight tilt down at cabinet height */
  const [sceneRotX, setSceneRotX] = useState(-0.28);
  const [sceneRotY, setSceneRotY] = useState(0);
  const [fov, setFov] = useState(FOV_MAX);
  const [orbPosition, setOrbPosition] = useState<[number, number, number]>(
    ORB_SPAWN_POSITIONS_VALID[0] ?? ORB_SPAWN_POSITIONS[0]
  );
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [flyingOrb, setFlyingOrb] = useState<{
    targetIndex: number;
    startX?: number;
    startY?: number;
    targetX?: number;
    targetY?: number;
  } | null>(null);
  const dragRef = useRef({ lastX: 0, lastY: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [orbHintState, setOrbHintState] = useState<{
    hint: { x: number; y: number; angle: number } | null;
    canvasW: number;
    canvasH: number;
  }>({ hint: null, canvasW: 1, canvasH: 1 });

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
    const delay = 550;
    const id = setTimeout(() => setShowCongratulations(true), delay);
    return () => clearTimeout(id);
  }, [orbsCollected]);

  useEffect(() => {
    if (!showRedOrb) setOrbHintState((prev) => ({ ...prev, hint: null }));
  }, [showRedOrb]);

  const onOrbProjection = useCallback((data: { progress: number }) => {
    setCaptureProgress(data.progress);
  }, []);
  const onCapture = useCallback(() => {
    const targetIndex = orbsCollected;
    setFlyingOrb({ targetIndex });
    setOrbsCollected((c) => Math.min(5, c + 1));
    setOrbPosition((p) => pickNewOrbPosition(p));
    setCaptureProgress(0);
  }, [orbsCollected]);

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

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFov((f) => Math.max(FOV_MIN, Math.min(FOV_MAX, f - e.deltaY * ZOOM_SENSITIVITY)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    setIsDragging(true);
    dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    setSceneRotY((y) => y + dx * ROT_SENSITIVITY);
    setSceneRotX((x) => Math.max(-ROT_X_MAX, Math.min(ROT_X_MAX, x - dy * ROT_SENSITIVITY)));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Start countdown shortly after mount (avoids Strict Mode double-mount reset)
  useEffect(() => {
    const startId = setTimeout(() => setCountdown(5), 100);
    return () => clearTimeout(startId);
  }, []);

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
          onClick={() => navigate('/modules')}
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
          Camera fixed on table · Drag to look around · Scroll to zoom
        </p>
      </header>
      <div
        className="flex-1 rounded-lg overflow-hidden min-h-0 relative"
        style={{ width: '100%', backgroundColor: '#1E2733' }}
      >
        {/* Canvas: camera mounted on table (position fixed); drag to look around, scroll to zoom (FOV) */}
        <div
          ref={canvasContainerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, cursor: isDragging ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          role="application"
          tabIndex={0}
        >
          <Canvas camera={{ position: [0, 0.5, 0], fov: 50 }} dpr={[1, 2]} style={{ width: '100%', height: '100%', display: 'block' }}>
            <Suspense fallback={null}>
              <CameraControlScene
                showRedOrb={showRedOrb}
                sceneRotX={sceneRotX}
                sceneRotY={sceneRotY}
                fov={fov}
                orbPosition={orbPosition}
                onOrbProjection={onOrbProjection}
                onCapture={onCapture}
                onOrbHint={onOrbHint}
              />
            </Suspense>
          </Canvas>
        </div>
        {/* Robotic arms overlay: symmetric, from off-screen, tips short of crosshair, no overlap */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {/* Left: stick extends to x=-120 so segment -120→-60 is clipped and stick emerges from off-screen. */}
          <svg
            viewBox="-60 0 360 400"
            preserveAspectRatio="xMaxYMax meet"
            style={{
              position: 'absolute',
              left: '-8%',
              bottom: '-5%',
              width: '48%',
              height: '75%',
              transform: 'perspective(900px) rotateY(-12deg) rotateX(2deg)',
              transformOrigin: 'left bottom',
            }}
          >
            <defs>
              <linearGradient id="arm2DarkL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="arm2ProngL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e5e7eb" />
                <stop offset="40%" stopColor="#fafafa" />
                <stop offset="100%" stopColor="#a1a1aa" />
              </linearGradient>
            </defs>
            <path
              d="M -120 277 L 100 173 L 100 187 L -120 293 Z"
              fill="url(#arm2DarkL)"
              stroke="#171717"
              strokeWidth="0.4"
            />
            <path d="M 98 172 L 128 155 L 132 162 L 102 178 Z" fill="url(#arm2ProngL)" stroke="#e5e7eb" strokeWidth="0.4" />
            <path d="M 98 188 L 128 205 L 132 198 L 102 182 Z" fill="url(#arm2ProngL)" stroke="#e5e7eb" strokeWidth="0.4" />
          </svg>
          {/* Right: stick extends to x=420 so segment 360→420 is clipped and stick goes off-screen. */}
          <svg
            viewBox="0 0 360 400"
            preserveAspectRatio="xMinYMax meet"
            style={{
              position: 'absolute',
              right: '-8%',
              bottom: '-5%',
              width: '48%',
              height: '75%',
              transform: 'perspective(900px) rotateY(12deg) rotateX(2deg)',
              transformOrigin: 'right bottom',
            }}
          >
            <defs>
              <linearGradient id="arm2DarkR" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="arm2ProngR" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e5e7eb" />
                <stop offset="40%" stopColor="#fafafa" />
                <stop offset="100%" stopColor="#a1a1aa" />
              </linearGradient>
            </defs>
            <path
              d="M 420 277 L 200 173 L 200 187 L 420 293 Z"
              fill="url(#arm2DarkR)"
              stroke="#171717"
              strokeWidth="0.4"
            />
            <path d="M 198 172 L 168 155 L 164 162 L 194 178 Z" fill="url(#arm2ProngR)" stroke="#e5e7eb" strokeWidth="0.4" />
            <path d="M 198 188 L 168 205 L 164 198 L 194 182 Z" fill="url(#arm2ProngR)" stroke="#e5e7eb" strokeWidth="0.4" />
          </svg>
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
        {/* Congratulations popup when 5 orbs collected */}
        {showCongratulations && (
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
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 110,
            }}
          >
            <div
              style={{
                backgroundColor: '#1E2733',
                borderRadius: 12,
                padding: '32px 40px',
                maxWidth: 360,
                textAlign: 'center',
                border: '1px solid #374151',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <p className="text-2xl font-bold" style={{ color: '#22c55e', marginBottom: 8 }}>
                Congratulations!
              </p>
              <p className="text-base" style={{ color: '#e5e7eb', marginBottom: 24 }}>
                You collected all 5 orbs. Great camera control!
              </p>
              <button
                type="button"
                onClick={() => setShowCongratulations(false)}
                className="px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#374151', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraControl;
