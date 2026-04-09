import * as THREE from 'three';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';

/** Resolved fulcra + task focal point for RCM/camera calibration (peg board or OR preset). */
export type SurgicalWorldRigResolved = {
  cameraTrocarWorld: THREE.Vector3;
  leftTrocarWorld: THREE.Vector3;
  rightTrocarWorld: THREE.Vector3;
  /** Aim point for instrument neutrals and camera seed (pegboard center or OR workspace). */
  taskCenterWorld: THREE.Vector3;
  cameraArmLengthM: number;
  useTipSpaceMapping: boolean;
};

function scaleCornerTowardConvergence(
  base: THREE.Vector3,
  convergence: THREE.Vector3,
  scale: number
): THREE.Vector3 {
  return base.clone().sub(convergence).multiplyScalar(scale).add(convergence);
}

/**
 * Resolved world positions for the three trocar fulcra after reconciliation scale,
 * shared slide toward the board, and rigid XYZ translation (see `worldRig`).
 */
export function computeResolvedTrocarWorldPositions(): {
  cameraTrocar: THREE.Vector3;
  leftTrocar: THREE.Vector3;
  rightTrocar: THREE.Vector3;
} {
  const wr = pegTransferReferenceValues.worldRig;
  const convergence = new THREE.Vector3(
    wr.convergenceWorldM[0],
    wr.convergenceWorldM[1],
    wr.convergenceWorldM[2]
  );

  const cameraTrocar = scaleCornerTowardConvergence(
    new THREE.Vector3(
      wr.defaultCameraTrocarWorldM[0],
      wr.defaultCameraTrocarWorldM[1],
      wr.defaultCameraTrocarWorldM[2]
    ),
    convergence,
    wr.reconciliationScaleTowardConvergence
  );
  const leftTrocar = scaleCornerTowardConvergence(
    new THREE.Vector3(
      wr.defaultLeftTrocarWorldM[0],
      wr.defaultLeftTrocarWorldM[1],
      wr.defaultLeftTrocarWorldM[2]
    ),
    convergence,
    wr.reconciliationScaleTowardConvergence
  );
  const rightTrocar = scaleCornerTowardConvergence(
    new THREE.Vector3(
      wr.defaultRightTrocarWorldM[0],
      wr.defaultRightTrocarWorldM[1],
      wr.defaultRightTrocarWorldM[2]
    ),
    convergence,
    wr.reconciliationScaleTowardConvergence
  );

  const towardBoard = convergence.clone().sub(cameraTrocar).normalize();
  const alongM = wr.rigTranslationTowardBoardM + wr.extraTranslationTowardBoardM;
  const rigShift = towardBoard.multiplyScalar(alongM);
  cameraTrocar.add(rigShift);
  leftTrocar.add(rigShift);
  rightTrocar.add(rigShift);

  const rigid = new THREE.Vector3(
    wr.rigidTranslationWorldM[0],
    wr.rigidTranslationWorldM[1],
    wr.rigidTranslationWorldM[2]
  );
  cameraTrocar.add(rigid);
  leftTrocar.add(rigid);
  rightTrocar.add(rigid);

  return { cameraTrocar, leftTrocar, rightTrocar };
}

const wr = pegTransferReferenceValues.worldRig;

/**
 * Pegboard / task center in world space. Do not mutate; pass to helpers that only read.
 * Kept in sync with `pegTransferReferenceValues.worldRig.convergenceWorldM`.
 */
export const pegTransferBoardCenterWorld = new THREE.Vector3(
  wr.convergenceWorldM[0],
  wr.convergenceWorldM[1],
  wr.convergenceWorldM[2]
);

/** Peg-transfer exercise: resolved trocars + board center + camera arm length (existing behavior). */
export function resolvePegTransferWorldRig(): SurgicalWorldRigResolved {
  const { cameraTrocar, leftTrocar, rightTrocar } = computeResolvedTrocarWorldPositions();
  const cfg = pegTransferReferenceValues.worldRig;
  return {
    cameraTrocarWorld: cameraTrocar,
    leftTrocarWorld: leftTrocar,
    rightTrocarWorld: rightTrocar,
    taskCenterWorld: pegTransferBoardCenterWorld.clone(),
    cameraArmLengthM: cfg.cameraConstrainedArmLengthM,
    useTipSpaceMapping: cfg.useTipSpaceMapping,
  };
}
