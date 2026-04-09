import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ToolKinematicsArm, WorldFrameArm } from './toolFrameTypes';
import {
  pegTransferReferenceValues,
  RING_INNER_CLEAR_M,
  RING_OUTER_M,
} from './pegTransferReferenceValues';

const SHAFT_DIAMETER =
  pegTransferReferenceValues.instrumentToRing.shaftDiameterToRingOuterDiameter.defaultValue *
  RING_OUTER_M;
const SHAFT_RADIUS = SHAFT_DIAMETER / 2;

const JAW_WIDTH =
  pegTransferReferenceValues.instrumentToRing.jawWidthToRingOuterDiameter.defaultValue *
  RING_OUTER_M;

const TIP_SMOOTH_ALPHA =
  pegTransferReferenceValues.motionDampeningDefaults.tipPositionLerpAlphaPerFrame;

const JAW_LERP_ALPHA = 0.35;
const WRIST_LERP_ALPHA = 0.18;

const WRIST_HOUSING_LENGTH_M = 1.55 * SHAFT_DIAMETER;
const WRIST_HOUSING_RADIUS = SHAFT_RADIUS * 1.02;
const WRIST_COLLAR_LENGTH = 0.0075;
const WRIST_NOSE_LENGTH = 0.006;

const JAW_HINGE_OFFSET_X = JAW_WIDTH * 0.28;
const JAW_HINGE_BLOCK_W = JAW_WIDTH * 0.16;
const JAW_HINGE_BLOCK_H = JAW_WIDTH * 0.12;
const JAW_HINGE_BLOCK_D = SHAFT_RADIUS * 0.65;

const JAW_ARM_LENGTH = WRIST_HOUSING_LENGTH_M * 1.45;
const JAW_ARM_H = JAW_WIDTH * 0.055;
const JAW_ARM_D = SHAFT_RADIUS * 0.34;

const JAW_TIP_LENGTH = JAW_ARM_LENGTH * 0.34;
const JAW_TIP_H = JAW_ARM_H * 0.82;
const JAW_TIP_D = JAW_ARM_D * 0.92;

const JAW_PIN_RADIUS = SHAFT_RADIUS * 0.12;
const JAW_PIN_LENGTH = JAW_WIDTH * 1.5;

const REQUIRED_OPEN_SPAN = RING_INNER_CLEAR_M * 1.05;
/** World-space grasp anchors at distal tips (pinch line). Slight inset from geometric tip length for pad contact. */
const PIVOT_TO_BITE = JAW_ARM_LENGTH + JAW_TIP_LENGTH * 0.98;

function computeMaxJawOpenAngleRad(
  hingeOffset: number,
  pivotToBite: number,
  requiredSpan: number
): number {
  const usable = Math.max(1e-6, pivotToBite);
  const x = THREE.MathUtils.clamp(
    (requiredSpan * 0.5 - hingeOffset) / usable,
    0,
    Math.sin(THREE.MathUtils.degToRad(28))
  );
  return Math.asin(x);
}

const MAX_JAW_ANGLE = THREE.MathUtils.clamp(
  computeMaxJawOpenAngleRad(JAW_HINGE_OFFSET_X, PIVOT_TO_BITE, REQUIRED_OPEN_SPAN),
  THREE.MathUtils.degToRad(85),
  THREE.MathUtils.degToRad(90)
);

const TOOL_SHAFT_MATERIAL_PROPS = {
  color: '#0d0f13',
  metalness: 0.05,
  roughness: 0.88,
} as const;

const TOOL_COLLAR_PHYSICAL_PROPS = {
  color: '#cfd5dc',
  metalness: 0.98,
  roughness: 0.14,
  clearcoat: 0.28,
  clearcoatRoughness: 0.18,
} as const;

const TOOL_WRIST_PHYSICAL_PROPS = {
  color: '#8f98a4',
  metalness: 0.94,
  roughness: 0.28,
  clearcoat: 0.14,
  clearcoatRoughness: 0.22,
} as const;

/** Silver jaws */
const TOOL_JAW_PHYSICAL_PROPS = {
  color: '#a8b0ba',
  metalness: 0.9,
  roughness: 0.3,
  clearcoat: 0.12,
  clearcoatRoughness: 0.34,
} as const;

const TOOL_PIN_PHYSICAL_PROPS = {
  color: '#e1e6ed',
  metalness: 1.0,
  roughness: 0.1,
} as const;

const yAxis = new THREE.Vector3(0, 1, 0);

function createTaperedJawTipGeometry(
  length: number,
  baseHeight: number,
  tipHeight: number,
  depth: number
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -baseHeight / 2);
  shape.lineTo(0, baseHeight / 2);
  shape.lineTo(length, tipHeight / 2);
  shape.lineTo(length, -tipHeight / 2);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.12,
    bevelSize: depth * 0.12,
    bevelSegments: 2,
  });

  geom.translate(0, 0, -depth / 2);
  geom.computeVertexNormals();
  return geom;
}

export function PegWorldTool({
  trocarWorld,
  kinematicsArm,
  worldFrameArm,
  motionEpoch = 0,
}: {
  trocarWorld: THREE.Vector3;
  kinematicsArm: ToolKinematicsArm;
  worldFrameArm: WorldFrameArm;
  motionEpoch?: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const shaftMeshRef = useRef<THREE.Mesh>(null);
  const wristBendGroupRef = useRef<THREE.Group>(null);
  const rollGroupRef = useRef<THREE.Group>(null);

  const leftJawPivotRef = useRef<THREE.Group>(null);
  const rightJawPivotRef = useRef<THREE.Group>(null);

  const leftJawAnchorRef = useRef<THREE.Group>(null);
  const rightJawAnchorRef = useRef<THREE.Group>(null);

  const jawAngleRef = useRef(0);
  const wristPitchRef = useRef(0);
  const wristYawRef = useRef(0);
  const wristRollRef = useRef(0);

  const hasSmoothedTipRef = useRef(false);
  const wristSmoothedInitializedRef = useRef(false);
  const smoothedTipRef = useRef(new THREE.Vector3());

  const tmpLeft = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const tmpMid = useMemo(() => new THREE.Vector3(), []);
  const tmpBiteQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpWork = useMemo(() => new THREE.Vector3(), []);

  const shaftGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(SHAFT_RADIUS * 0.86, SHAFT_RADIUS, 1, 64, 1, false);
    g.computeVertexNormals();
    return g;
  }, []);

  const collarGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      SHAFT_RADIUS * 1.04,
      SHAFT_RADIUS * 0.97,
      WRIST_COLLAR_LENGTH,
      48
    );
    g.computeVertexNormals();
    return g;
  }, []);

  const wristBodyGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      WRIST_HOUSING_RADIUS * 0.96,
      WRIST_HOUSING_RADIUS,
      WRIST_HOUSING_LENGTH_M,
      36
    );
    g.computeVertexNormals();
    return g;
  }, []);

  const wristNoseGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      WRIST_HOUSING_RADIUS * 0.58,
      WRIST_HOUSING_RADIUS * 0.86,
      WRIST_NOSE_LENGTH,
      28
    );
    g.computeVertexNormals();
    return g;
  }, []);

  const hingePinGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(JAW_PIN_RADIUS, JAW_PIN_RADIUS, JAW_PIN_LENGTH, 20);
    g.computeVertexNormals();
    return g;
  }, []);

  const leftTipGeom = useMemo(
    () => createTaperedJawTipGeometry(JAW_TIP_LENGTH, JAW_TIP_H, JAW_TIP_H * 0.45, JAW_TIP_D),
    []
  );

  const rightTipGeom = useMemo(() => {
    const g = createTaperedJawTipGeometry(JAW_TIP_LENGTH, JAW_TIP_H, JAW_TIP_H * 0.45, JAW_TIP_D);
    g.scale(-1, 1, 1);
    g.computeVertexNormals();
    return g;
  }, []);

  const jawMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: TOOL_JAW_PHYSICAL_PROPS.color,
        metalness: TOOL_JAW_PHYSICAL_PROPS.metalness,
        roughness: TOOL_JAW_PHYSICAL_PROPS.roughness,
        clearcoat: TOOL_JAW_PHYSICAL_PROPS.clearcoat,
        clearcoatRoughness: TOOL_JAW_PHYSICAL_PROPS.clearcoatRoughness,
      }),
    []
  );

  useEffect(
    () => () => {
      jawMaterial.dispose();
    },
    [jawMaterial]
  );

  useEffect(() => {
    hasSmoothedTipRef.current = false;
    wristSmoothedInitializedRef.current = false;
    const grip = THREE.MathUtils.clamp(kinematicsArm.gripClosure, 0, 1);
    jawAngleRef.current = THREE.MathUtils.lerp(MAX_JAW_ANGLE, 0, grip);
    wristPitchRef.current = kinematicsArm.orientation.pitch;
    wristYawRef.current = kinematicsArm.orientation.yaw;
    wristRollRef.current = kinematicsArm.orientation.roll;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- epoch-only reset; read kinematics at bump time
  }, [motionEpoch]);

  useFrame(() => {
    const root = rootRef.current;
    const shaftMesh = shaftMeshRef.current;
    const wrist = wristBendGroupRef.current;
    const rollGroup = rollGroupRef.current;
    const leftJawPivot = leftJawPivotRef.current;
    const rightJawPivot = rightJawPivotRef.current;
    const leftAnchor = leftJawAnchorRef.current;
    const rightAnchor = rightJawAnchorRef.current;

    if (
      !root ||
      !shaftMesh ||
      !wrist ||
      !rollGroup ||
      !leftJawPivot ||
      !rightJawPivot ||
      !leftAnchor ||
      !rightAnchor
    ) {
      return;
    }

    const tipWorld = kinematicsArm.tipWorld;

    tmpDir.copy(tipWorld).sub(trocarWorld);
    const insertion = tmpDir.length();
    if (!Number.isFinite(insertion) || insertion < 1e-5) return;
    tmpDir.normalize();

    root.position.copy(trocarWorld);
    tmpWork.copy(tmpDir);
    tmpQuat.setFromUnitVectors(yAxis, tmpWork);
    root.quaternion.copy(tmpQuat);

    shaftMesh.scale.set(1, insertion, 1);
    shaftMesh.position.set(0, insertion / 2, 0);

    wrist.position.set(0, insertion, 0);

    if (!wristSmoothedInitializedRef.current) {
      wristPitchRef.current = kinematicsArm.orientation.pitch;
      wristYawRef.current = kinematicsArm.orientation.yaw;
      wristRollRef.current = kinematicsArm.orientation.roll;
      wristSmoothedInitializedRef.current = true;
    }

    wristPitchRef.current = THREE.MathUtils.lerp(
      wristPitchRef.current,
      kinematicsArm.orientation.pitch,
      WRIST_LERP_ALPHA
    );
    wristYawRef.current = THREE.MathUtils.lerp(
      wristYawRef.current,
      kinematicsArm.orientation.yaw,
      WRIST_LERP_ALPHA
    );
    wristRollRef.current = THREE.MathUtils.lerp(
      wristRollRef.current,
      kinematicsArm.orientation.roll,
      WRIST_LERP_ALPHA
    );

    wrist.rotation.order = 'YXZ';
    wrist.rotation.set(wristPitchRef.current, wristYawRef.current, 0);
    rollGroup.rotation.set(0, 0, wristRollRef.current);

    const grip = THREE.MathUtils.clamp(kinematicsArm.gripClosure, 0, 1);
    const targetJawAngle = THREE.MathUtils.lerp(MAX_JAW_ANGLE, 1.7, grip);
    jawAngleRef.current = THREE.MathUtils.lerp(
      jawAngleRef.current,
      targetJawAngle,
      JAW_LERP_ALPHA
    );

    leftJawPivot.rotation.z = jawAngleRef.current;
    rightJawPivot.rotation.z = -jawAngleRef.current;

    if (!hasSmoothedTipRef.current) {
      smoothedTipRef.current.copy(tipWorld);
      hasSmoothedTipRef.current = true;
    } else {
      smoothedTipRef.current.lerp(tipWorld, TIP_SMOOTH_ALPHA);
    }

    worldFrameArm.tip.copy(smoothedTipRef.current);
    leftAnchor.getWorldPosition(tmpLeft);
    rightAnchor.getWorldPosition(tmpRight);
    tmpMid.copy(tmpLeft).add(tmpRight).multiplyScalar(0.5);
    rollGroup.getWorldQuaternion(tmpBiteQuat);
    worldFrameArm.biteMid.copy(tmpMid);
    worldFrameArm.leftJaw.copy(tmpLeft);
    worldFrameArm.rightJaw.copy(tmpRight);
    worldFrameArm.biteQuatWorld.copy(tmpBiteQuat);
  });

  return (
    <group ref={rootRef}>
      <mesh ref={shaftMeshRef} geometry={shaftGeom} castShadow>
        <meshStandardMaterial {...TOOL_SHAFT_MATERIAL_PROPS} />
      </mesh>

      <group ref={wristBendGroupRef}>
        <mesh position={[0, -WRIST_COLLAR_LENGTH * 0.5, 0]} geometry={collarGeom} castShadow>
          <meshPhysicalMaterial {...TOOL_COLLAR_PHYSICAL_PROPS} />
        </mesh>

        <mesh
          position={[0, WRIST_HOUSING_LENGTH_M * 0.5, 0]}
          geometry={wristBodyGeom}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <meshPhysicalMaterial {...TOOL_WRIST_PHYSICAL_PROPS} />
        </mesh>

        <mesh
          position={[0, WRIST_HOUSING_LENGTH_M + WRIST_NOSE_LENGTH * 0.5, 0]}
          geometry={wristNoseGeom}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <meshPhysicalMaterial {...TOOL_COLLAR_PHYSICAL_PROPS} />
        </mesh>

        <mesh
          position={[0, WRIST_HOUSING_LENGTH_M + WRIST_NOSE_LENGTH + JAW_ARM_H * 0.25, 0]}
          geometry={hingePinGeom}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <meshPhysicalMaterial {...TOOL_PIN_PHYSICAL_PROPS} />
        </mesh>

        <group ref={rollGroupRef} position={[0, WRIST_HOUSING_LENGTH_M + WRIST_NOSE_LENGTH, 0]}>
          <group ref={leftJawPivotRef} position={[JAW_HINGE_OFFSET_X, 0, 0]}>
            <mesh castShadow material={jawMaterial}>
              <boxGeometry args={[JAW_HINGE_BLOCK_W, JAW_HINGE_BLOCK_H, JAW_HINGE_BLOCK_D]} />
            </mesh>

            <mesh
              position={[JAW_ARM_LENGTH * 0.5, 0, 0]}
              castShadow
              material={jawMaterial}
            >
              <boxGeometry args={[JAW_ARM_LENGTH, JAW_ARM_H, JAW_ARM_D]} />
            </mesh>

            <mesh
              position={[JAW_ARM_LENGTH, 0, 0]}
              geometry={leftTipGeom}
              castShadow
              material={jawMaterial}
            />

            <group ref={leftJawAnchorRef} position={[PIVOT_TO_BITE, 0, 0]} />
          </group>

          <group ref={rightJawPivotRef} position={[-JAW_HINGE_OFFSET_X, 0, 0]}>
            <mesh castShadow material={jawMaterial}>
              <boxGeometry args={[JAW_HINGE_BLOCK_W, JAW_HINGE_BLOCK_H, JAW_HINGE_BLOCK_D]} />
            </mesh>

            <mesh
              position={[-JAW_ARM_LENGTH * 0.5, 0, 0]}
              castShadow
              material={jawMaterial}
            >
              <boxGeometry args={[JAW_ARM_LENGTH, JAW_ARM_H, JAW_ARM_D]} />
            </mesh>

            <mesh
              position={[-JAW_ARM_LENGTH, 0, 0]}
              geometry={rightTipGeom}
              castShadow
              material={jawMaterial}
            />

            <group ref={rightJawAnchorRef} position={[-PIVOT_TO_BITE, 0, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}
