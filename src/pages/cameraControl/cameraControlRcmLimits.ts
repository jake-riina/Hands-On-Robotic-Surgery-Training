import type { RcmKinematicsLimits } from '../../pegTransfer/rcmKinematics';
import { PEG_TRANSFER_DEFAULT_RCM_LIMITS } from '../../pegTransfer/rcmKinematics';

/**
 * Wider instrument workspace for Module 2 OR vs peg transfer defaults.
 * Tune here without affecting PegTransferScene.
 */
export const CAMERA_CONTROL_RCM_MOTION_LIMITS: RcmKinematicsLimits = {
  ...PEG_TRANSFER_DEFAULT_RCM_LIMITS,
  mmToViewX: 0.0052,
  mmToViewY: 0.0052,
  mmToViewZ: 0.0032,
  tipSpaceMaxDelta: 0.032,
  maxViewOffsetM: 0.36,
  maxWristRotRad: 0.62,
  insertionMin: 0.22,
  insertionMax: 2,
};
