import type { TouchStateMessage } from '../types/geomagicBridge';
import * as THREE from 'three';
import { setPerspectiveCameraFromFulcrum } from '../utils/fulcrumCamera';

export const CAMERA_FOV_DEFAULT = 35;
export const CAMERA_DEADZONE_MM = 0.4;

export const CAMERA_YAW_SENSITIVITY = 0.013;
export const CAMERA_PITCH_SENSITIVITY = 0.013;
/** Reserved for a future product-safe zoom path; device-Z does not drive FOV in peg transfer for now. */
export const CAMERA_ZOOM_SENSITIVITY = 0.08;

/** Legacy wide pitch cap (radians); peg transfer uses tighter `CAMERA_PITCH_LIMIT_RAD` below. */
export const ROT_X_MAX = Math.PI / 2 - 0.15;

/** Half-width yaw range around the rig seed heading (radians). */
export const CAMERA_YAW_MAX_RAD = THREE.MathUtils.degToRad(12);

/** Half-width pitch range around the rig seed attitude (radians), narrower than legacy `ROT_X_MAX`. */
export const CAMERA_PITCH_LIMIT_RAD = THREE.MathUtils.degToRad(14);

/**
 * Higher lambda = snappier follow. Time-based via `THREE.MathUtils.damp`.
 */
export const CAMERA_ROT_DAMP_LAMBDA = 8;

/** Phase C: translation-first camera; set false to restore rotation-only driving (translation stays at zero). */
export const PEG_TRANSFER_CAMERA_TRANSLATION_FIRST = true;

/** Device mm (averaged per frame) → lateral offset along seed +X (meters). */
export const CAMERA_PAN_LATERAL_PER_DEVICE_MM = 0.000045;

/** Device mm → vertical offset along seed +Y (meters). */
export const CAMERA_PAN_VERTICAL_PER_DEVICE_MM = 0.000042;

/** Device mm → dolly along seed look axis (meters); +z = toward scene along view. */
export const CAMERA_DOLLY_PER_DEVICE_MM = 0.000028;

/** Half-width lateral pan (meters). */
export const CAMERA_PAN_MAX_LATERAL_M = 0.02;

/** Half-width vertical pan (meters). */
export const CAMERA_PAN_MAX_VERTICAL_M = 0.015;

/** Half-width dolly (meters). */
export const CAMERA_PAN_MAX_DOLLY_M = 0.01;

export const CAMERA_TRANS_DAMP_LAMBDA = 9;

/** Yaw/pitch scale when translation-first is on (rotation stays secondary). */
export const CAMERA_ROTATION_SECONDARY_SCALE = 0.26;

const _vSeedRight = new THREE.Vector3();
const _vSeedUp = new THREE.Vector3();
const _vSeedLook = new THREE.Vector3();
const _vTransWorld = new THREE.Vector3();

export type CameraRotRef = { x: number; y: number };
export type CameraTranslationRef = { x: number; y: number; z: number };
export type CameraModePrevPosRef = {
  left: [number, number, number] | null;
  right: [number, number, number] | null;
};

export type CameraRigCalibration = {
  // Fixed world-space endoscope trocar/fulcrum.
  cameraTrocarWorld: THREE.Vector3;
  // Fixed arm length so start camera pose remains stable.
  armLength: number;
};

export function resetCameraModePrevPos(
  prevPosRef: CameraModePrevPosRef,
  leftRaw: TouchStateMessage | null | undefined,
  rightRaw: TouchStateMessage | null | undefined
) {
  if (leftRaw?.position) prevPosRef.left = [leftRaw.position.x, leftRaw.position.y, leftRaw.position.z];
  if (rightRaw?.position) prevPosRef.right = [rightRaw.position.x, rightRaw.position.y, rightRaw.position.z];
}

function clampCameraTargetRotation(target: CameraRotRef, seed: CameraRotRef) {
  target.y = THREE.MathUtils.clamp(target.y, seed.y - CAMERA_YAW_MAX_RAD, seed.y + CAMERA_YAW_MAX_RAD);
  target.x = THREE.MathUtils.clamp(target.x, seed.x - CAMERA_PITCH_LIMIT_RAD, seed.x + CAMERA_PITCH_LIMIT_RAD);
}

function clampCameraTranslationTarget(target: CameraTranslationRef) {
  target.x = THREE.MathUtils.clamp(target.x, -CAMERA_PAN_MAX_LATERAL_M, CAMERA_PAN_MAX_LATERAL_M);
  target.y = THREE.MathUtils.clamp(target.y, -CAMERA_PAN_MAX_VERTICAL_M, CAMERA_PAN_MAX_VERTICAL_M);
  target.z = THREE.MathUtils.clamp(target.z, -CAMERA_PAN_MAX_DOLLY_M, CAMERA_PAN_MAX_DOLLY_M);
}

/**
 * Smooths `smoothRot` toward `targetRot` for apply this frame. Call after `updateCameraRigFromDevice`.
 */
export function dampPegTransferCameraRotation(
  smoothRot: CameraRotRef,
  targetRot: CameraRotRef,
  deltaSec: number
) {
  smoothRot.x = THREE.MathUtils.damp(smoothRot.x, targetRot.x, CAMERA_ROT_DAMP_LAMBDA, deltaSec);
  smoothRot.y = THREE.MathUtils.damp(smoothRot.y, targetRot.y, CAMERA_ROT_DAMP_LAMBDA, deltaSec);
}

export function dampPegTransferCameraTranslation(
  smoothTrans: CameraTranslationRef,
  targetTrans: CameraTranslationRef,
  deltaSec: number
) {
  smoothTrans.x = THREE.MathUtils.damp(smoothTrans.x, targetTrans.x, CAMERA_TRANS_DAMP_LAMBDA, deltaSec);
  smoothTrans.y = THREE.MathUtils.damp(smoothTrans.y, targetTrans.y, CAMERA_TRANS_DAMP_LAMBDA, deltaSec);
  smoothTrans.z = THREE.MathUtils.damp(smoothTrans.z, targetTrans.z, CAMERA_TRANS_DAMP_LAMBDA, deltaSec);
}

/**
 * Integrates device motion into rotation/translation targets when cameraModeActive is true.
 * Does not change FOV. Call damp helpers afterward for the pose applied to the camera.
 *
 * Rule alignment:
 * - cameraModeActive is `left.button1 && right.button1`
 * - clutch (both button2) should NOT block camera motion (precedence: continue_move)
 */
export function updateCameraRigFromDevice({
  cameraModeActive,
  cameraRotTargetRef,
  cameraRotSeedRef,
  cameraTransTargetRef,
  prevPosRef,
  wasCameraModeActiveRef,
  leftRaw,
  rightRaw,
}: {
  cameraModeActive: boolean;
  cameraRotTargetRef: CameraRotRef;
  /** Rig-calibration seed pitch/yaw; limits are symmetric around this (does not change at runtime). */
  cameraRotSeedRef: CameraRotRef;
  /** Seed-local translation target: +X right, +Y up, +Z along view (Three.js look = −Z). */
  cameraTransTargetRef: CameraTranslationRef;
  prevPosRef: CameraModePrevPosRef;
  wasCameraModeActiveRef: { current: boolean };
  leftRaw: TouchStateMessage | null;
  rightRaw: TouchStateMessage | null;
}) {
  const wasActive = wasCameraModeActiveRef.current;

  if (!cameraModeActive) {
    // Keep prev positions in sync so we don't jump on the next entry.
    resetCameraModePrevPos(prevPosRef, leftRaw, rightRaw);
    wasCameraModeActiveRef.current = false;
    return;
  }

  if (!wasActive) {
    // Entering camera mode: seed previous positions and do not apply delta yet.
    resetCameraModePrevPos(prevPosRef, leftRaw, rightRaw);
    wasCameraModeActiveRef.current = true;
    return;
  }

  let contributorCount = 0;
  let dxSum = 0;
  let dySum = 0;
  let dzSum = 0;

  const processArm = (arm: 'left' | 'right', raw: TouchStateMessage | null) => {
    if (!raw?.position) return;
    const prev = prevPosRef[arm];
    if (!prev) return;

    const dx = raw.position.x - prev[0];
    const dy = raw.position.y - prev[1];
    const dz = raw.position.z - prev[2];

    const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (mag < CAMERA_DEADZONE_MM) {
      prevPosRef[arm] = [raw.position.x, raw.position.y, raw.position.z];
      return;
    }

    dxSum += dx;
    dySum += dy;
    dzSum += dz;
    contributorCount += 1;

    prevPosRef[arm] = [raw.position.x, raw.position.y, raw.position.z];
  };

  processArm('left', leftRaw);
  processArm('right', rightRaw);

  if (contributorCount === 0) return;

  const avgDx = dxSum / contributorCount;
  const avgDy = dySum / contributorCount;
  const avgDz = dzSum / contributorCount;

  if (PEG_TRANSFER_CAMERA_TRANSLATION_FIRST) {
    cameraTransTargetRef.x -= avgDx * CAMERA_PAN_LATERAL_PER_DEVICE_MM;
    cameraTransTargetRef.y += avgDy * CAMERA_PAN_VERTICAL_PER_DEVICE_MM;
    cameraTransTargetRef.z -= avgDz * CAMERA_DOLLY_PER_DEVICE_MM;
    clampCameraTranslationTarget(cameraTransTargetRef);

    cameraRotTargetRef.y -= avgDx * CAMERA_YAW_SENSITIVITY * CAMERA_ROTATION_SECONDARY_SCALE;
    cameraRotTargetRef.x += avgDy * CAMERA_PITCH_SENSITIVITY * CAMERA_ROTATION_SECONDARY_SCALE;
  } else {
    cameraRotTargetRef.y -= avgDx * CAMERA_YAW_SENSITIVITY;
    cameraRotTargetRef.x += avgDy * CAMERA_PITCH_SENSITIVITY;
  }
  clampCameraTargetRotation(cameraRotTargetRef, cameraRotSeedRef);
}

/**
 * Applies the constrained camera transform for this frame (peg path: single writer for position/quaternion).
 * After fulcrum solve, optional seed-frame translation is added to position only (quaternion unchanged).
 */
export function applyConstrainedCameraPose({
  camera,
  calibration,
  cameraRotRef,
  fovRef,
  seedBasisQuat,
  translationOffsetSmooth,
}: {
  camera: THREE.PerspectiveCamera;
  calibration: CameraRigCalibration;
  cameraRotRef: CameraRotRef;
  fovRef: { current: number };
  /** Same orientation as `cameraBasisQuatWorldFixed` at calibration (read-only). */
  seedBasisQuat?: THREE.Quaternion;
  /** Damped offsets in seed camera frame (meters). */
  translationOffsetSmooth?: CameraTranslationRef;
}) {
  setPerspectiveCameraFromFulcrum(
    camera,
    calibration.cameraTrocarWorld,
    calibration.armLength,
    cameraRotRef.x,
    cameraRotRef.y
  );
  if (seedBasisQuat && translationOffsetSmooth) {
    _vSeedRight.set(1, 0, 0).applyQuaternion(seedBasisQuat);
    _vSeedUp.set(0, 1, 0).applyQuaternion(seedBasisQuat);
    _vSeedLook.set(0, 0, -1).applyQuaternion(seedBasisQuat);
    _vTransWorld
      .set(0, 0, 0)
      .addScaledVector(_vSeedRight, translationOffsetSmooth.x)
      .addScaledVector(_vSeedUp, translationOffsetSmooth.y)
      .addScaledVector(_vSeedLook, translationOffsetSmooth.z);
    camera.position.add(_vTransWorld);
  }
  camera.fov = fovRef.current;
  camera.updateProjectionMatrix();
}
