import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LatestByArmRef } from '../../hooks/useGeomagicLatestRef';
import type { TouchStateMessage } from '../../types/geomagicBridge';
import { canCalibrateDevices } from '../../pegTransfer/pegTransferDeviceCalibration';
import { PegWorldTool } from '../../pegTransfer/PegWorldTool';
import {
  applyExplicitDeviceCalibration,
  initRcmKinematicsController,
  resyncNeutralTipWorldAnchors,
  seedGeometricToolRestPose,
  updateRcmKinematics,
} from '../../pegTransfer/rcmKinematics';
import { createWorldFrameRef } from '../../pegTransfer/toolFrameTypes';
import { CAMERA_CONTROL_RCM_MOTION_LIMITS } from './cameraControlRcmLimits';
import { resolveCameraControlSurgicalRig } from './cameraControlWorldRig';

type PendingCalibrateRef = MutableRefObject<boolean>;

/**
 * Peg-transfer-style world instruments for the OR: RCM kinematics + PegWorldTool ×2.
 */
export function CameraControlInstruments({
  geomagicLatestRef,
  simulationEnabled,
  pendingCalibrateRef,
  onDeviceCalibrationApplied,
  toolMotionEpoch = 0,
  controlInputs,
}: {
  geomagicLatestRef: LatestByArmRef;
  simulationEnabled: boolean;
  pendingCalibrateRef: PendingCalibrateRef;
  onDeviceCalibrationApplied?: () => void;
  toolMotionEpoch?: number;
  controlInputs?: {
    cameraModeActive: boolean;
    clutchActive: boolean;
    leftGripClosed: boolean;
    rightGripClosed: boolean;
  };
}) {
  const controller = useMemo(() => initRcmKinematicsController(), []);
  const worldFrameRef = useMemo(() => createWorldFrameRef(), []);

  const leftTrocarRef = useRef(new THREE.Vector3());
  const rightTrocarRef = useRef(new THREE.Vector3());
  const taskCenterRef = useRef(new THREE.Vector3());
  const cameraBasisQuatRef = useRef(new THREE.Quaternion());
  const useTipSpaceRef = useRef(false);
  const instrumentRigReadyRef = useRef(false);
  const [rigVisualReady, setRigVisualReady] = useState(false);

  useEffect(() => {
    const { rig, cameraBasisQuatWorldFixed } = resolveCameraControlSurgicalRig();
    leftTrocarRef.current.copy(rig.leftTrocarWorld);
    rightTrocarRef.current.copy(rig.rightTrocarWorld);
    taskCenterRef.current.copy(rig.taskCenterWorld);
    cameraBasisQuatRef.current.copy(cameraBasisQuatWorldFixed);
    useTipSpaceRef.current = rig.useTipSpaceMapping;

    seedGeometricToolRestPose(
      controller,
      leftTrocarRef.current,
      rightTrocarRef.current,
      cameraBasisQuatRef.current,
      taskCenterRef.current,
      CAMERA_CONTROL_RCM_MOTION_LIMITS
    );

    instrumentRigReadyRef.current = true;
    setRigVisualReady(true);
  }, [controller]);

  useFrame(() => {
    if (!instrumentRigReadyRef.current) return;

    if (pendingCalibrateRef.current && canCalibrateDevices(geomagicLatestRef.current)) {
      const L = geomagicLatestRef.current.left!;
      const R = geomagicLatestRef.current.right!;
      applyExplicitDeviceCalibration(controller, L, R);
      resyncNeutralTipWorldAnchors(
        controller,
        leftTrocarRef.current,
        rightTrocarRef.current,
        cameraBasisQuatRef.current,
        taskCenterRef.current,
        CAMERA_CONTROL_RCM_MOTION_LIMITS
      );
      updateRcmKinematics({
        controller,
        leftRaw: L,
        rightRaw: R,
        leftTrocarWorld: leftTrocarRef.current,
        rightTrocarWorld: rightTrocarRef.current,
        cameraBasisQuatWorldFixed: cameraBasisQuatRef.current,
        boardCenterWorld: taskCenterRef.current,
        useTipSpaceMapping: useTipSpaceRef.current,
        motionLimits: CAMERA_CONTROL_RCM_MOTION_LIMITS,
        controlInputs,
      });
      pendingCalibrateRef.current = false;
      onDeviceCalibrationApplied?.();
    }

    if (!simulationEnabled) return;

    const leftRaw = geomagicLatestRef.current.left as TouchStateMessage | null;
    const rightRaw = geomagicLatestRef.current.right as TouchStateMessage | null;

    if (
      !leftRaw ||
      !rightRaw ||
      !leftRaw.position ||
      !rightRaw.position ||
      !leftRaw.buttons ||
      !rightRaw.buttons
    ) {
      return;
    }

    updateRcmKinematics({
      controller,
      leftRaw,
      rightRaw,
      leftTrocarWorld: leftTrocarRef.current,
      rightTrocarWorld: rightTrocarRef.current,
      cameraBasisQuatWorldFixed: cameraBasisQuatRef.current,
      boardCenterWorld: taskCenterRef.current,
      useTipSpaceMapping: useTipSpaceRef.current,
      motionLimits: CAMERA_CONTROL_RCM_MOTION_LIMITS,
      controlInputs,
    });
  });

  if (!rigVisualReady) return null;

  return (
    <>
      <PegWorldTool
        trocarWorld={leftTrocarRef.current}
        kinematicsArm={controller.toolKinematicsRef.left}
        worldFrameArm={worldFrameRef.left}
        motionEpoch={toolMotionEpoch}
      />
      <PegWorldTool
        trocarWorld={rightTrocarRef.current}
        kinematicsArm={controller.toolKinematicsRef.right}
        worldFrameArm={worldFrameRef.right}
        motionEpoch={toolMotionEpoch}
      />
    </>
  );
}
