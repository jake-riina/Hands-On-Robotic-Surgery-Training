import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Mesh, PerspectiveCamera } from 'three';
import * as THREE from 'three';

/**
 * Camera-local port anchors (meters in view space). Intentionally **not** scaled by FOV so that when
 * zoom = projection-only (FOV change), ports, tools, and the scene share one coherent optical model.
 */
export const VIEWPORT_PORT_X = 0.54;
export const VIEWPORT_PORT_Y = -0.4;
export const VIEWPORT_PORT_Z = -0.64;
export const VIEWPORT_VIEWMODEL_SCALE = 1.12;

/** Camera-local instrument pose. Offset in meters; roll=x, pitch=y, yaw=z vs neutral (rad). */
export type ViewportInstrumentPose = {
  offset: [number, number, number];
  pitch: number;
  yaw: number;
  roll: number;
};

export type ViewportInstrumentPosePair = {
  left: ViewportInstrumentPose;
  right: ViewportInstrumentPose;
};

/** Slightly diverge inward yaw so tips stay separated at rest (avoids crossed needle drivers on start). */
const BASE_LEFT_ROT = { pitch: 0.03, yaw: 0.19, roll: 0 } as const;
const BASE_RIGHT_ROT = { pitch: 0.03, yaw: -0.19, roll: 0 } as const;

/**
 * Compact needle driver for viewport (procedural). Smaller footprint to reduce orb occlusion.
 */
export function ViewportNeedleDriver({ mirror = false }: { mirror?: boolean }) {
  const sx = mirror ? -1 : 1;

  const carbon = useMemo(
    () => ({ color: '#141416', metalness: 0.06, roughness: 0.88 }),
    []
  );
  const carbonBand = useMemo(
    () => ({ color: '#1c1c20', metalness: 0.1, roughness: 0.75 }),
    []
  );
  const metal = useMemo(
    () => ({ color: '#c4ccd6', metalness: 0.92, roughness: 0.16 }),
    []
  );
  const metalMatte = useMemo(
    () => ({ color: '#8e95a0', metalness: 0.55, roughness: 0.38 }),
    []
  );

  const sc = 0.82;
  return (
    <group scale={[sx * sc, sc, sc]}>
      <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.034, 0.03, 0.52, 24]} />
        <meshStandardMaterial {...carbon} />
      </mesh>
      <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.027, 0.1, 22]} />
        <meshStandardMaterial {...carbonBand} />
      </mesh>
      <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.027, 0.024, 0.13, 20]} />
        <meshStandardMaterial {...carbon} />
      </mesh>
      <mesh position={[0.102, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.022, 0.02, 18]} />
        <meshStandardMaterial {...metalMatte} />
      </mesh>
      <mesh position={[0.128, 0, 0]}>
        <sphereGeometry args={[0.024, 22, 18]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0.152, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.017, 0.015, 0.04, 14]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <group position={[0.178, 0, 0]}>
        <mesh position={[0.018, 0.0075, 0]} rotation={[0, 0, 0.28]}>
          <boxGeometry args={[0.044, 0.0032, 0.012]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh position={[0.018, -0.0075, 0]} rotation={[0, 0, -0.28]}>
          <boxGeometry args={[0.044, 0.0032, 0.012]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh position={[0.032, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.0035, 0.002, 0.016, 8]} />
          <meshStandardMaterial {...metalMatte} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Camera-rigged instruments at fixed camera-local ports. Zoom (FOV) changes apparent size with the
 * rest of the field—no separate HUD scaling.
 */
export function CameraSpaceViewportControllers({
  poseRef,
}: {
  poseRef: MutableRefObject<ViewportInstrumentPosePair>;
}) {
  const { camera } = useThree();
  const rootRef = useRef<Group>(null);
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);

  useFrame(() => {
    const g = rootRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!g || !left || !right) return;

    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    const pl = poseRef.current.left;
    const pr = poseRef.current.right;

    left.position.set(-VIEWPORT_PORT_X + pl.offset[0], VIEWPORT_PORT_Y + pl.offset[1], VIEWPORT_PORT_Z + pl.offset[2]);
    right.position.set(VIEWPORT_PORT_X + pr.offset[0], VIEWPORT_PORT_Y + pr.offset[1], VIEWPORT_PORT_Z + pr.offset[2]);

    const s = VIEWPORT_VIEWMODEL_SCALE;
    const stretchL = 1 + THREE.MathUtils.clamp(pl.offset[2] * 0.2, -0.11, 0.26);
    const stretchR = 1 + THREE.MathUtils.clamp(pr.offset[2] * 0.2, -0.11, 0.26);
    left.scale.set(s * stretchL, s, s);
    right.scale.set(s * stretchR, s, s);

    left.rotation.order = 'YXZ';
    right.rotation.order = 'YXZ';
    left.rotation.set(BASE_LEFT_ROT.pitch + pl.pitch, BASE_LEFT_ROT.yaw + pl.yaw, BASE_LEFT_ROT.roll + pl.roll);
    right.rotation.set(
      BASE_RIGHT_ROT.pitch + pr.pitch,
      BASE_RIGHT_ROT.yaw + pr.yaw,
      BASE_RIGHT_ROT.roll + pr.roll
    );
  });

  return (
    <group ref={rootRef}>
      <group ref={leftRef} position={[-VIEWPORT_PORT_X, VIEWPORT_PORT_Y, VIEWPORT_PORT_Z]} rotation={[0.02, 0.02, 0]}>
        <ViewportNeedleDriver mirror />
      </group>
      <group ref={rightRef} position={[VIEWPORT_PORT_X, VIEWPORT_PORT_Y, VIEWPORT_PORT_Z]} rotation={[0.02, -0.02, 0]}>
        <ViewportNeedleDriver />
      </group>
    </group>
  );
}

const PORTED_JAW_MATERIAL = { color: '#4a4a4a', metalness: 0.28, roughness: 0.6 } as const;
const PORTED_SHAFT_MATERIAL = { color: '#141416', metalness: 0.06, roughness: 0.88 } as const;
/** Unscaled length from shaft end to instrument tip (wrist + jaws), same units as ViewportNeedleDriver. */
const PORTED_TIP_REAR_UNSCALED = 0.11;
const JAW_OPEN_ANGLE = 0.22;
const JAW_CLOSED_ANGLE = 0.05;
const JAW_OPEN_OFFSET = 0.011;
const JAW_CLOSED_OFFSET = 0.005;

/**
 * Port + shaft + tip in one camera-local space (optical zoom via FOV only). Port uses fixed
 * camera-local coords; tip is world space → camera space—the segment stays coherent when zooming.
 */
export function ScreenFixedPortedNeedleDriver({
  tipWorld,
  orientation,
  gripping,
  mirror = false,
}: {
  tipWorld: [number, number, number];
  orientation: { yaw: number; pitch: number; roll: number };
  gripping: boolean;
  mirror?: boolean;
}) {
  const { camera } = useThree();
  const camRootRef = useRef<Group>(null);
  const shaftRef = useRef<Group>(null);
  const shaftMeshRef = useRef<Mesh>(null);
  const wristRef = useRef<Group>(null);
  const leftJawRef = useRef<Mesh>(null);
  const rightJawRef = useRef<Mesh>(null);

  const tipCam = useMemo(() => new THREE.Vector3(), []);
  const portCam = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const quatShaft = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const camRoot = camRootRef.current;
    const shaft = shaftRef.current;
    const shaftMesh = shaftMeshRef.current;
    const wrist = wristRef.current;
    const lj = leftJawRef.current;
    const rj = rightJawRef.current;
    if (!camRoot || !shaft || !shaftMesh || !wrist || !lj || !rj) return;

    camRoot.position.copy(camera.position);
    camRoot.quaternion.copy(camera.quaternion);

    const sign = mirror ? -1 : 1;
    portCam.set(sign * VIEWPORT_PORT_X, VIEWPORT_PORT_Y, VIEWPORT_PORT_Z);
    tipCam.set(tipWorld[0], tipWorld[1], tipWorld[2]);
    tipCam.applyMatrix4(camera.matrixWorldInverse);

    const dist = THREE.MathUtils.clamp(portCam.distanceTo(tipCam), 0.18, 2.8);
    dir.copy(tipCam).sub(portCam).normalize();
    quatShaft.setFromUnitVectors(xAxis, dir);

    const s = VIEWPORT_VIEWMODEL_SCALE;
    shaft.position.copy(portCam);
    shaft.quaternion.copy(quatShaft);
    shaft.scale.set(s, s, s);

    const shaftLenUnscaled = Math.max(0.07, dist / s - PORTED_TIP_REAR_UNSCALED);
    shaftMesh.scale.set(1, shaftLenUnscaled, 1);
    shaftMesh.position.set(shaftLenUnscaled / 2, 0, 0);

    const sxJaw = mirror ? -1 : 1;
    wrist.position.set(shaftLenUnscaled, 0, 0);
    wrist.scale.set(sxJaw, 1, 1);
    wrist.rotation.order = 'YXZ';
    wrist.rotation.set(orientation.pitch, orientation.yaw, orientation.roll);

    const targetAngle = gripping ? JAW_CLOSED_ANGLE : JAW_OPEN_ANGLE;
    const targetOffset = gripping ? JAW_CLOSED_OFFSET : JAW_OPEN_OFFSET;
    lj.rotation.z = -targetAngle;
    rj.rotation.z = targetAngle;
    lj.position.x = targetOffset;
    rj.position.x = -targetOffset;
  });

  return (
    <group ref={camRootRef}>
      <group ref={shaftRef}>
        <mesh ref={shaftMeshRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.026, 1, 18]} />
          <meshStandardMaterial {...PORTED_SHAFT_MATERIAL} />
        </mesh>
        <group ref={wristRef}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.01, 0.034, 12]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
          <mesh ref={leftJawRef} position={[-0.011, 0.016, 0]} rotation={[0, 0, 0.22]}>
            <boxGeometry args={[0.012, 0.058, 0.012]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
          <mesh ref={rightJawRef} position={[0.011, 0.016, 0]} rotation={[0, 0, -0.22]}>
            <boxGeometry args={[0.012, 0.058, 0.012]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** World-space jaw snapshot for grasp geometry (updated each frame). */
export type PortedToolWorldFrame = {
  tip: THREE.Vector3;
  leftJaw: THREE.Vector3;
  rightJaw: THREE.Vector3;
  /** Midpoint between jaw tips in world space. */
  biteMid: THREE.Vector3;
};

/** Same clamp window as `ScreenFixedPortedNeedleDriver` shaft reach (camera-local space, meters). */
const PEG_SCREEN_SHAFT_DIST_MIN = 0.18;
const PEG_SCREEN_SHAFT_DIST_MAX = 2.8;

/**
 * Peg Transfer: same port + shaft math as `ScreenFixedPortedNeedleDriver`, ref-driven; world RCM tip is
 * transformed into camera space each frame so the tool stays on screen when the fulcrum camera moves.
 * `useFrame` priority -1: R3F runs lower first — pair with `PegCameraMount` at -2 and sim at 0 in PegTransfer.
 */
export function PegScreenFixedPortedNeedleDriver({
  tipWorldRef,
  orientationRef,
  gripClosureRef,
  worldFrameRef,
  mirror = false,
}: {
  tipWorldRef: MutableRefObject<THREE.Vector3>;
  orientationRef: MutableRefObject<{ yaw: number; pitch: number; roll: number }>;
  gripClosureRef: MutableRefObject<number>;
  worldFrameRef?: MutableRefObject<PortedToolWorldFrame | null>;
  mirror?: boolean;
}) {
  const { camera } = useThree();
  const camRootRef = useRef<Group>(null);
  const shaftRef = useRef<Group>(null);
  const shaftMeshRef = useRef<Mesh>(null);
  const wristRef = useRef<Group>(null);
  const leftJawRef = useRef<Mesh>(null);
  const rightJawRef = useRef<Mesh>(null);

  const tipCam = useMemo(() => new THREE.Vector3(), []);
  const tipScratch = useMemo(() => new THREE.Vector3(), []);
  const portCam = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const quatShaft = useMemo(() => new THREE.Quaternion(), []);
  const fallbackDirRef = useRef(new THREE.Vector3(-0.887, 0, 0.463).normalize());

  useFrame(() => {
    const camRoot = camRootRef.current;
    const shaft = shaftRef.current;
    const shaftMesh = shaftMeshRef.current;
    const wrist = wristRef.current;
    const lj = leftJawRef.current;
    const rj = rightJawRef.current;
    const persp = camera as PerspectiveCamera;
    if (!camRoot || !shaft || !shaftMesh || !wrist || !lj || !rj) return;

    camRoot.position.copy(camera.position);
    camRoot.quaternion.copy(camera.quaternion);

    const sign = mirror ? -1 : 1;
    portCam.set(sign * VIEWPORT_PORT_X, VIEWPORT_PORT_Y, VIEWPORT_PORT_Z);
    tipCam.copy(tipWorldRef.current);
    tipCam.applyMatrix4(persp.matrixWorldInverse);

    const rawDist = portCam.distanceTo(tipCam);
    const dist = THREE.MathUtils.clamp(rawDist, PEG_SCREEN_SHAFT_DIST_MIN, PEG_SCREEN_SHAFT_DIST_MAX);
    dir.copy(tipCam).sub(portCam);
    if (dir.lengthSq() < 1e-12) {
      dir.copy(fallbackDirRef.current);
    } else {
      dir.normalize();
      fallbackDirRef.current.copy(dir);
    }
    quatShaft.setFromUnitVectors(xAxis, dir);

    const s = VIEWPORT_VIEWMODEL_SCALE;
    shaft.position.copy(portCam);
    shaft.quaternion.copy(quatShaft);
    shaft.scale.set(s, s, s);

    const shaftLenUnscaled = Math.max(0.07, dist / s - PORTED_TIP_REAR_UNSCALED);
    shaftMesh.scale.set(1, shaftLenUnscaled, 1);
    shaftMesh.position.set(shaftLenUnscaled / 2, 0, 0);

    const sxJaw = mirror ? -1 : 1;
    wrist.position.set(shaftLenUnscaled, 0, 0);
    wrist.scale.set(sxJaw, 1, 1);
    wrist.rotation.order = 'YXZ';
    const o = orientationRef.current;
    wrist.rotation.set(o.pitch, o.yaw, o.roll);

    const g = THREE.MathUtils.clamp(gripClosureRef.current, 0, 1);
    const targetAngle = THREE.MathUtils.lerp(JAW_OPEN_ANGLE, JAW_CLOSED_ANGLE, g);
    const targetOffset = THREE.MathUtils.lerp(JAW_OPEN_OFFSET, JAW_CLOSED_OFFSET, g);
    lj.rotation.z = -targetAngle;
    rj.rotation.z = targetAngle;
    lj.position.x = targetOffset;
    rj.position.x = -targetOffset;

    if (worldFrameRef) {
      let probe = worldFrameRef.current;
      if (!probe) {
        probe = {
          tip: new THREE.Vector3(),
          leftJaw: new THREE.Vector3(),
          rightJaw: new THREE.Vector3(),
          biteMid: new THREE.Vector3(),
        };
        worldFrameRef.current = probe;
      }
      tipScratch.copy(tipWorldRef.current);
      lj.getWorldPosition(probe.leftJaw);
      rj.getWorldPosition(probe.rightJaw);
      probe.tip.copy(tipScratch);
      probe.biteMid.lerpVectors(probe.leftJaw, probe.rightJaw, 0.5);
    }
  }, -1);

  return (
    <group ref={camRootRef}>
      <group ref={shaftRef}>
        <mesh ref={shaftMeshRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.026, 1, 18]} />
          <meshStandardMaterial {...PORTED_SHAFT_MATERIAL} />
        </mesh>
        <group ref={wristRef}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.01, 0.034, 12]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
          <mesh ref={leftJawRef} position={[-0.011, 0.016, 0]} rotation={[0, 0, 0.22]}>
            <boxGeometry args={[0.012, 0.058, 0.012]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
          <mesh ref={rightJawRef} position={[0.011, 0.016, 0]} rotation={[0, 0, -0.22]}>
            <boxGeometry args={[0.012, 0.058, 0.012]} />
            <meshStandardMaterial {...PORTED_JAW_MATERIAL} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Legacy export for any external reference; camera module uses ViewportNeedleDriver. */
export function SurgicalControllerInstrument(props: { mirror?: boolean }) {
  return <ViewportNeedleDriver mirror={props.mirror} />;
}
