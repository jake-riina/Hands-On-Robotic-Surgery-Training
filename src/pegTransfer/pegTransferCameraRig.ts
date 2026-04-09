import type { TouchStateMessage } from '../types/geomagicBridge';
import * as THREE from 'three';
import { setPerspectiveCameraFromFulcrum } from '../utils/fulcrumCamera';

export const CAMERA_FOV_DEFAULT = 35;
/** Degrees; aligned with camera-control module for consistent zoom range. */
export const CAMERA_FOV_MIN = 12;
export const CAMERA_FOV_MAX = 50;
export const CAMERA_DEADZONE_MM = 0.4;

export const CAMERA_YAW_SENSITIVITY = 0.013;
export const CAMERA_PITCH_SENSITIVITY = 0.013;
/** Averaged device Z delta (mm per tick) → FOV change (degrees); same sign convention as camera control. */
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

/**
 * Symmetric bounds for camera mode around the rig seed (rotation half-widths in rad, pan half-maxes in m).
 * Peg transfer uses {@link PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS}; Camera Control passes a wider preset.
 */
export type EndoscopeCameraModeLimits = {
  yawHalfWidthRad: number;
  pitchHalfWidthRad: number;
  panMaxLateralM: number;
  panMaxVerticalM: number;
  panMaxDollyM: number;
};

/** Unchanged peg-transfer exercise tuning. */
export const PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS: EndoscopeCameraModeLimits = {
  yawHalfWidthRad: CAMERA_YAW_MAX_RAD,
  pitchHalfWidthRad: CAMERA_PITCH_LIMIT_RAD,
  panMaxLateralM: CAMERA_PAN_MAX_LATERAL_M,
  panMaxVerticalM: CAMERA_PAN_MAX_VERTICAL_M,
  panMaxDollyM: CAMERA_PAN_MAX_DOLLY_M,
};

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

function clampCameraTargetRotation(
  target: CameraRotRef,
  seed: CameraRotRef,
  limits: EndoscopeCameraModeLimits
) {
  target.y = THREE.MathUtils.clamp(
    target.y,
    seed.y - limits.yawHalfWidthRad,
    seed.y + limits.yawHalfWidthRad
  );
  target.x = THREE.MathUtils.clamp(
    target.x,
    seed.x - limits.pitchHalfWidthRad,
    seed.x + limits.pitchHalfWidthRad
  );
}

function clampCameraTranslationTarget(target: CameraTranslationRef, limits: EndoscopeCameraModeLimits) {
  target.x = THREE.MathUtils.clamp(target.x, -limits.panMaxLateralM, limits.panMaxLateralM);
  target.y = THREE.MathUtils.clamp(target.y, -limits.panMaxVerticalM, limits.panMaxVerticalM);
  target.z = THREE.MathUtils.clamp(target.z, -limits.panMaxDollyM, limits.panMaxDollyM);
}

function clampCameraFov(fovRef: { current: number }) {
  fovRef.current = THREE.MathUtils.clamp(fovRef.current, CAMERA_FOV_MIN, CAMERA_FOV_MAX);
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
 * Averaged stylus Z drives FOV (zoom); XY drive pan/tilt (translation-first) or yaw/pitch.
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
  fovRef,
  prevPosRef,
  wasCameraModeActiveRef,
  leftRaw,
  rightRaw,
  cameraModeLimits = PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS,
}: {
  cameraModeActive: boolean;
  cameraRotTargetRef: CameraRotRef;
  /** Rig-calibration seed pitch/yaw; limits are symmetric around this (does not change at runtime). */
  cameraRotSeedRef: CameraRotRef;
  /** Seed-local translation target: +X right, +Y up, +Z along view (Three.js look = −Z). */
  cameraTransTargetRef: CameraTranslationRef;
  /** Field of view in degrees; updated from averaged device Z in camera mode. */
  fovRef: { current: number };
  prevPosRef: CameraModePrevPosRef;
  wasCameraModeActiveRef: { current: boolean };
  leftRaw: TouchStateMessage | null;
  rightRaw: TouchStateMessage | null;
  /** Defaults to peg-transfer bounds; pass a wider preset for Camera Control. */
  cameraModeLimits?: EndoscopeCameraModeLimits;
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

  fovRef.current += avgDz * CAMERA_ZOOM_SENSITIVITY;
  clampCameraFov(fovRef);

  if (PEG_TRANSFER_CAMERA_TRANSLATION_FIRST) {
    cameraTransTargetRef.x -= avgDx * CAMERA_PAN_LATERAL_PER_DEVICE_MM;
    cameraTransTargetRef.y += avgDy * CAMERA_PAN_VERTICAL_PER_DEVICE_MM;
    clampCameraTranslationTarget(cameraTransTargetRef, cameraModeLimits);

    cameraRotTargetRef.y -= avgDx * CAMERA_YAW_SENSITIVITY * CAMERA_ROTATION_SECONDARY_SCALE;
    cameraRotTargetRef.x += avgDy * CAMERA_PITCH_SENSITIVITY * CAMERA_ROTATION_SECONDARY_SCALE;
  } else {
    cameraRotTargetRef.y -= avgDx * CAMERA_YAW_SENSITIVITY;
    cameraRotTargetRef.x += avgDy * CAMERA_PITCH_SENSITIVITY;
  }
  clampCameraTargetRotation(cameraRotTargetRef, cameraRotSeedRef, cameraModeLimits);
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
