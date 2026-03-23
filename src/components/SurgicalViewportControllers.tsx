import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, PerspectiveCamera } from 'three';

/** Slightly lighter matte-metal finish with subtle reflections */
const shaftMat = { color: '#4a4a4a', metalness: 0.28, roughness: 0.6 };
const jointMat = { color: '#4a4a4a', metalness: 0.28, roughness: 0.6 };
const neckMat = { color: '#4a4a4a', metalness: 0.28, roughness: 0.6 };
const gripperMat = { color: '#4a4a4a', metalness: 0.28, roughness: 0.6 };

/**
 * Simplified articulated surgical instrument:
 * base cylinder -> round elbow joint -> angled upper cylinder -> wrist joint -> two-prong gripper.
 */
export function SurgicalControllerInstrument({ mirror = false }: { mirror?: boolean }) {
  const sx = mirror ? -1 : 1;

  // Guaranteed-visible placeholder proportions: short inner + long outward forearm.
  const innerLen = 0.085;
  const innerRadius = 0.008;
  const outerLen = 0.15;
  const outerRadius = 0.007;
  const elbowRadius = 0.014;
  const wristRadius = 0.009;
  const innerTilt = (-4 * Math.PI) / 180;
  const elbowOpen = (56 * Math.PI) / 180;
  const baseDrop = (24 * Math.PI) / 180;

  return (
    <group scale={[sx * 1.18, 1.18, 1.18]} rotation={[0, 0, 0]}>
      {/* Short inner segment near horizontal */}
      <group rotation={[0, 0, innerTilt]}>
        {/* Rotate only the lower/base segment downward around the elbow pivot */}
        <group position={[innerLen, 0, 0]} rotation={[0, 0, baseDrop]}>
          <mesh position={[-innerLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[innerRadius, innerRadius, innerLen, 20]} />
            <meshStandardMaterial {...shaftMat} />
          </mesh>
        </group>

        {/* Elbow joint */}
        <mesh position={[innerLen, 0, 0]}>
          <sphereGeometry args={[elbowRadius, 20, 16]} />
          <meshStandardMaterial {...jointMat} />
        </mesh>

        {/* Longer outer segment angled outward/upward */}
        <group position={[innerLen, 0, 0]} rotation={[0, 0, elbowOpen]}>
          <mesh position={[outerLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[outerRadius, outerRadius, outerLen, 20]} />
            <meshStandardMaterial {...shaftMat} />
          </mesh>

          <mesh position={[outerLen, 0, 0]}>
            <sphereGeometry args={[wristRadius, 16, 14]} />
            <meshStandardMaterial {...jointMat} />
          </mesh>

          {/* Keep claw/end-effector at tip */}
          <group position={[outerLen + 0.013, 0, 0]} rotation={[0, 0, 0.02]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.005, 0.0047, 0.02, 12]} />
              <meshStandardMaterial {...neckMat} />
            </mesh>
            <mesh position={[0.013, 0.005, 0]} rotation={[0, 0, 0.25]}>
              <boxGeometry args={[0.022, 0.003, 0.006]} />
              <meshStandardMaterial {...gripperMat} />
            </mesh>
            <mesh position={[0.013, -0.005, 0]} rotation={[0, 0, -0.25]}>
              <boxGeometry args={[0.022, 0.003, 0.006]} />
              <meshStandardMaterial {...gripperMat} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Viewport-fixed instruments (follows camera only).
 */
export function CameraSpaceViewportControllers() {
  const { camera } = useThree();
  const rootRef = useRef<Group>(null);
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);

  // Baseline is the current camera setup in CameraControl.tsx.
  const BASE_FOV_DEG = 50;
  const BASE_X = 0.25;
  const BASE_Y = -0.26;
  const BASE_Z = -0.62;

  useFrame(() => {
    const g = rootRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!g || !left || !right) return;

    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    // Keep viewmodel screen size/placement stable as gameplay FOV changes.
    const perspectiveCamera = camera as PerspectiveCamera;
    const fovDeg = perspectiveCamera.fov ?? BASE_FOV_DEG;
    const fovFactor =
      Math.tan((fovDeg * Math.PI) / 360) / Math.tan((BASE_FOV_DEG * Math.PI) / 360);

    left.position.set(-BASE_X * fovFactor, BASE_Y * fovFactor, BASE_Z);
    right.position.set(BASE_X * fovFactor, BASE_Y * fovFactor, BASE_Z);
    left.scale.setScalar(fovFactor);
    right.scale.setScalar(fovFactor);
  });

  return (
    <group ref={rootRef}>
      <group ref={leftRef} position={[-0.25, -0.26, -0.62]} rotation={[0.02, 0.02, 0]}>
        <SurgicalControllerInstrument mirror />
      </group>
      <group ref={rightRef} position={[0.25, -0.26, -0.62]} rotation={[0.02, -0.02, 0]}>
        <SurgicalControllerInstrument />
      </group>
    </group>
  );
}
