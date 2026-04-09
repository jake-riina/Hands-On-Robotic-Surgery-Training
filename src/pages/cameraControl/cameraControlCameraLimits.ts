import * as THREE from 'three';
import type { EndoscopeCameraModeLimits } from '../../pegTransfer/pegTransferCameraRig';

/**
 * Camera mode bounds for Module 2 OR scene: wider pan and rotation than peg transfer
 * (see `PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS` in pegTransferCameraRig).
 */
export const CAMERA_CONTROL_CAMERA_MODE_LIMITS: EndoscopeCameraModeLimits = {
  yawHalfWidthRad: THREE.MathUtils.degToRad(40),
  pitchHalfWidthRad: THREE.MathUtils.degToRad(35),
  panMaxLateralM: 0.06,
  panMaxVerticalM: 0.045,
  panMaxDollyM: 0.028,
};
