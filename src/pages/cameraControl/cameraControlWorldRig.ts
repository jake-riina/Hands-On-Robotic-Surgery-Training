import * as THREE from 'three';
import type { SurgicalWorldRigResolved } from '../../pegTransfer/pegTransferWorldRig';
import { makeFulcrumBehindCamera } from '../../utils/fulcrumCamera';

/** Matches legacy Camera Control mount: camera at (0, 0.5, 0), pitch −0.28, yaw 0, arm 0.92 m. */
export const CC_CAM_INITIAL_POS = new THREE.Vector3(0, 0.5, 0);
export const CC_CAM_ARM_LENGTH = 0.92;
export const CC_CAM_INIT_PITCH = -0.28;
export const CC_CAM_INIT_YAW = 0;

/** Fixed world-space endoscope fulcrum (RCM) for the OR scene. */
export function getCameraControlCameraTrocarWorld(target = new THREE.Vector3()): THREE.Vector3 {
  return makeFulcrumBehindCamera(
    CC_CAM_INITIAL_POS,
    CC_CAM_INIT_PITCH,
    CC_CAM_INIT_YAW,
    CC_CAM_ARM_LENGTH,
    target
  );
}

/**
 * Module 2 OR preset: endoscope fulcrum matches legacy mount; lateral instrument ports and task
 * center lie in front / toward the cavity so Phase 4 RCM can share peg-transfer math.
 *
 * Tunables: adjust `taskCenterWorld` and port X/Y/Z together to keep a coherent triangle with
 * `getCameraControlCameraTrocarWorld()`.
 */
export function getCameraControlWorldRig(): SurgicalWorldRigResolved {
  const cameraTrocar = getCameraControlCameraTrocarWorld();
  const taskCenterWorld = new THREE.Vector3(0, 0.28, -1.85);
  const leftTrocarWorld = new THREE.Vector3(-0.38, 0.08, 0.18);
  const rightTrocarWorld = new THREE.Vector3(0.38, 0.08, 0.18);

  return {
    cameraTrocarWorld: cameraTrocar.clone(),
    leftTrocarWorld,
    rightTrocarWorld,
    taskCenterWorld,
    cameraArmLengthM: CC_CAM_ARM_LENGTH,
    useTipSpaceMapping: false,
  };
}

/** Shared camera seed + basis for CameraControlRig and RCM instruments (must stay in sync). */
export function resolveCameraControlSurgicalRig(): {
  rig: SurgicalWorldRigResolved;
  cameraRotSeed: { x: number; y: number };
  cameraBasisQuatWorldFixed: THREE.Quaternion;
} {
  const rig = getCameraControlWorldRig();
  const toTarget = rig.taskCenterWorld.clone().sub(rig.cameraTrocarWorld).normalize();
  const seedQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), toTarget);
  const seedEuler = new THREE.Euler().setFromQuaternion(seedQuat, 'YXZ');
  const cameraBasisQuatWorldFixed = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(seedEuler.x, seedEuler.y, 0, 'YXZ')
  );
  return {
    rig,
    cameraRotSeed: { x: seedEuler.x, y: seedEuler.y },
    cameraBasisQuatWorldFixed,
  };
}
