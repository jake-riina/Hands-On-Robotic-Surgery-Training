import type { MutableRefObject } from 'react';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODULE1_GAUGE_PSI_MAX } from '../../lib/module1PressureGauge';
import { PegWorldTool } from '../../pegTransfer/PegWorldTool';
import { createWorldFrameRef } from '../../pegTransfer/toolFrameTypes';
import type { ToolKinematicsArm } from '../../pegTransfer/toolFrameTypes';
import { getCameraControlWorldRig } from '../cameraControl/cameraControlWorldRig';

const PORT_DURATION_S = 1.35;
/** Fully advanced along port axis (meters), similar to a tool advanced for peg work. */
export const MODULE1_PRESSURE_INSTRUMENT_MAX_INSERT_M = 0.48;
const MAX_INSERT_M = MODULE1_PRESSURE_INSTRUMENT_MAX_INSERT_M;
const GRIP_LERP = 0.14;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Right-side peg-transfer instrument: full tool mesh, slides in along the port axis, jaw closure
 * driven by glove PSI (0…{@link MODULE1_GAUGE_PSI_MAX} → open…closed).
 */
export function Module1PressureInstrument({
  pressurePsiRef,
}: {
  pressurePsiRef: MutableRefObject<number>;
}) {
  const rig = useMemo(() => getCameraControlWorldRig(), []);
  const trocarWorld = useMemo(() => rig.rightTrocarWorld.clone(), [rig]);
  const dirInto = useMemo(() => {
    const d = rig.taskCenterWorld.clone().sub(trocarWorld);
    d.normalize();
    return d;
  }, [rig, trocarWorld]);

  const worldFrameRef = useMemo(() => createWorldFrameRef(), []);
  const kinematicsArm = useMemo<ToolKinematicsArm>(
    () => ({
      tipWorld: new THREE.Vector3(),
      orientation: { pitch: -0.38, yaw: 0.11, roll: 0 },
      gripClosure: 0,
    }),
    [],
  );

  const gripSmoothedRef = useRef(0);

  useFrame(({ clock }) => {
    const portT = Math.min(1, clock.elapsedTime / PORT_DURATION_S);
    const portU = easeInOutCubic(portT);
    const insertion = MAX_INSERT_M * portU;
    kinematicsArm.tipWorld.copy(trocarWorld).addScaledVector(dirInto, insertion);

    const psi = Math.max(0, pressurePsiRef.current);
    const targetGrip = THREE.MathUtils.clamp(psi / MODULE1_GAUGE_PSI_MAX, 0, 1);
    gripSmoothedRef.current = THREE.MathUtils.lerp(gripSmoothedRef.current, targetGrip, GRIP_LERP);
    kinematicsArm.gripClosure = gripSmoothedRef.current;
  });

  return (
    <PegWorldTool
      trocarWorld={trocarWorld}
      kinematicsArm={kinematicsArm}
      worldFrameArm={worldFrameRef.right}
    />
  );
}
