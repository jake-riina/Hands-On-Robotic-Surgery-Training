import * as THREE from 'three';
import type { TouchStateMessage } from '../types/geomagicBridge';
import type { ToolArmSide, ToolKinematicsRef, ToolOrientationYXZ } from './toolFrameTypes';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';
import { computeTipWorldFromDeviceDelta } from './pegTransferTipSpaceKinematics';

const INSTRUMENT_GIMBAL_GAIN = 1.1;

const DEFAULT_INSERTION = 1.4;

/** Device mm → world mapping, cone limits, and insertion bounds for RCM. Peg uses defaults; Camera Control passes a wider preset. */
export type RcmKinematicsLimits = {
  mmToViewX: number;
  mmToViewY: number;
  mmToViewZ: number;
  /** Max world-space XY step per frame (m) when `useTipSpaceMapping` is true. */
  tipSpaceMaxDelta: number;
  /** Clamps ox / oy / oz cone offsets and clutch reindex targets (m). */
  maxViewOffsetM: number;
  maxWristRotRad: number;
  insertionMin: number;
  insertionMax: number;
};

export const PEG_TRANSFER_DEFAULT_RCM_LIMITS: RcmKinematicsLimits = {
  mmToViewX: 0.004,
  mmToViewY: 0.004,
  mmToViewZ: 0.0025,
  tipSpaceMaxDelta: 0.02,
  maxViewOffsetM: 0.2,
  maxWristRotRad: 0.5,
  insertionMin: 0.22,
  insertionMax: 2,
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function insertionBaselineM(arm: ToolArmSide): number {
  const extra =
    arm === 'left' ? pegTransferReferenceValues.worldRig.leftInsertionBaselineOffsetM : 0;
  return DEFAULT_INSERTION + extra;
}

/** Reused temps for board-aim direction (single-threaded frame). */
const _f0 = new THREE.Vector3();
const _rTan = new THREE.Vector3();
const _uTan = new THREE.Vector3();
const _rTanLegacy = new THREE.Vector3();
const _rTanBoard = new THREE.Vector3();
const _boardHorizontalWorld = new THREE.Vector3(1, 0, 0);
const _vView = new THREE.Vector3();
const _vScratch = new THREE.Vector3();
const _shaftDirWorld = new THREE.Vector3();

/**
 * Orthonormal tangent frame at trocar for aiming at board: f0 = toward board, r and u span tilt plane.
 */
function buildBoardAimTangents(
  boardCenter: THREE.Vector3,
  trocarWorld: THREE.Vector3,
  cameraBasisQuatWorldFixed: THREE.Quaternion,
  f0: THREE.Vector3,
  r: THREE.Vector3,
  u: THREE.Vector3
): boolean {
  f0.copy(boardCenter).sub(trocarWorld);
  const len = f0.length();
  if (len < 1e-7) return false;
  f0.multiplyScalar(1 / len);

  const camRight = _vScratch.set(1, 0, 0).applyQuaternion(cameraBasisQuatWorldFixed);
  _rTanLegacy.copy(camRight).sub(_vView.copy(f0).multiplyScalar(camRight.dot(f0)));
  if (_rTanLegacy.lengthSq() < 1e-10) {
    _vScratch.set(0, 1, 0).applyQuaternion(cameraBasisQuatWorldFixed);
    _rTanLegacy.copy(_vScratch).sub(_vView.copy(f0).multiplyScalar(_vScratch.dot(f0)));
  }
  if (_rTanLegacy.lengthSq() < 1e-10) return false;
  _rTanLegacy.normalize();

  // Peg Transfer X-feel remap: steer ox toward board-horizontal while staying in the tangent plane.
  const blend = clamp(pegTransferReferenceValues.worldRig.legacyXBasisBlend ?? 0, 0, 1);
  _rTanBoard
    .copy(_boardHorizontalWorld)
    .sub(_vView.copy(f0).multiplyScalar(_boardHorizontalWorld.dot(f0)));
  const hasBoardHorizontal = _rTanBoard.lengthSq() >= 1e-10;

  if (hasBoardHorizontal && blend > 0) {
    _rTanBoard.normalize();
    r.copy(_rTanLegacy).lerp(_rTanBoard, blend);
    if (r.lengthSq() < 1e-10) {
      r.copy(_rTanLegacy);
    } else {
      r.normalize();
    }
  } else {
    r.copy(_rTanLegacy);
  }

  u.crossVectors(f0, r).normalize();
  return true;
}

function instrumentNeutralAimsAtBoard(): boolean {
  return !!pegTransferReferenceValues.worldRig.instrumentNeutralAimsAtBoardCenter;
}

/** Shaft direction: either camera-basis cone or board-centered cone with tangent tilts oxC/oyC. */
function computeInstrumentShaftDirWorld(
  out: THREE.Vector3,
  trocarWorld: THREE.Vector3,
  boardCenterWorld: THREE.Vector3,
  oxC: number,
  oyC: number,
  cameraBasisQuatWorldFixed: THREE.Quaternion
): void {
  if (instrumentNeutralAimsAtBoard()) {
    if (buildBoardAimTangents(boardCenterWorld, trocarWorld, cameraBasisQuatWorldFixed, _f0, _rTan, _uTan)) {
      out.copy(_f0).addScaledVector(_rTan, oxC).addScaledVector(_uTan, oyC).normalize();
      return;
    }
  }
  _vView.set(oxC, oyC, -1).normalize();
  out.copy(_vView.applyQuaternion(cameraBasisQuatWorldFixed)).normalize();
}

export type NeutralMmRef = Record<ToolArmSide, [number, number, number] | null>;
export type NeutralGimbalRef = Record<ToolArmSide, [number, number, number] | null>;

export type RcmKinematicsController = {
  // Outputs (world-space truths).
  toolKinematicsRef: ToolKinematicsRef;

  // Calibration latches.
  neutralMmRef: NeutralMmRef;
  neutralGimbalRef: NeutralGimbalRef;

  /** Tip-space X/Y anchor (world): device at neutralMm → this tip; seed / cal / clutch resync only. */
  neutralTipWorld: Record<ToolArmSide, THREE.Vector3>;

  // Latching state for clutch.
  clutchWasActiveRef: { current: boolean };
  clutchLatchRef: {
    // Pose snapshot while tools are clutched (fixed in world).
    left: { tipWorld: THREE.Vector3; orientation: ToolOrientationYXZ; gripClosure: number };
    right: { tipWorld: THREE.Vector3; orientation: ToolOrientationYXZ; gripClosure: number };
  };

  // Freeze jaw closure in camera mode (freeze last).
  cameraModeWasActiveRef: { current: boolean };
  lastGripClosureRef: Record<ToolArmSide, number>;
};

function computeNeutralMmFromCalibration(
  rawPos: { x: number; y: number; z: number },
  arm: ToolArmSide
): [number, number, number] {
  const remap = pegTransferReferenceValues.startupCalibrationRemap;
  if (!remap?.enabled) return [rawPos.x, rawPos.y, rawPos.z];

  const [ox, oy, oz] = remap.inkwellToEffectiveNeutralMm;
  // Shared remap for both arms by default; arm arg is kept for future per-arm tuning.
  // This intentionally mirrors the validated manual workflow:
  // inkwell calibrate -> ergonomic working neutral without requiring startup clutching.
  void arm;
  return [rawPos.x + ox, rawPos.y + oy, rawPos.z + oz];
}

/**
 * Snap device neutrals to the current inkwell snapshot. Sole authority for neutralMm /
 * neutralGimbal: no auto-latch in updateRcmKinematics.
 */
export function applyExplicitDeviceCalibration(
  controller: RcmKinematicsController,
  leftRaw: TouchStateMessage,
  rightRaw: TouchStateMessage
): void {
  const lp = leftRaw.position;
  const rp = rightRaw.position;
  const lg = leftRaw.gimbal;
  const rg = rightRaw.gimbal;
  if (!lp || !rp || !lg || !rg) return;

  // Position neutral can be remapped for startup ergonomics; gimbal neutral remains a direct snapshot.
  controller.neutralMmRef.left = computeNeutralMmFromCalibration(lp, 'left');
  controller.neutralMmRef.right = computeNeutralMmFromCalibration(rp, 'right');
  controller.neutralGimbalRef.left = [lg.x, lg.y, lg.z];
  controller.neutralGimbalRef.right = [rg.x, rg.y, rg.z];
}

/** Pre-calibration visual: tips at geometric rest (zero delta vs defaults) for fixed trocars. */
export function seedGeometricToolRestPose(
  controller: RcmKinematicsController,
  leftTrocarWorld: THREE.Vector3,
  rightTrocarWorld: THREE.Vector3,
  cameraBasisQuatWorldFixed: THREE.Quaternion,
  boardCenterWorld: THREE.Vector3,
  motionLimits: RcmKinematicsLimits = PEG_TRANSFER_DEFAULT_RCM_LIMITS
): void {
  const { insertionMin, insertionMax } = motionLimits;
  const leftInsertion = clamp(insertionBaselineM('left'), insertionMin, insertionMax);
  const rightInsertion = clamp(insertionBaselineM('right'), insertionMin, insertionMax);

  computeInstrumentShaftDirWorld(_shaftDirWorld, leftTrocarWorld, boardCenterWorld, 0, 0, cameraBasisQuatWorldFixed);
  controller.toolKinematicsRef.left.tipWorld.copy(leftTrocarWorld).addScaledVector(_shaftDirWorld, leftInsertion);

  computeInstrumentShaftDirWorld(_shaftDirWorld, rightTrocarWorld, boardCenterWorld, 0, 0, cameraBasisQuatWorldFixed);
  controller.toolKinematicsRef.right.tipWorld.copy(rightTrocarWorld).addScaledVector(_shaftDirWorld, rightInsertion);

  controller.toolKinematicsRef.left.orientation = { pitch: 0, yaw: 0, roll: 0 };
  controller.toolKinematicsRef.right.orientation = { pitch: 0, yaw: 0, roll: 0 };
  controller.toolKinematicsRef.left.gripClosure = 0;
  controller.toolKinematicsRef.right.gripClosure = 0;

  controller.neutralTipWorld.left.copy(controller.toolKinematicsRef.left.tipWorld);
  controller.neutralTipWorld.right.copy(controller.toolKinematicsRef.right.tipWorld);
}

/**
 * World tip pose at dx=dy=dz=0 (ox/oy/oz zero) for each arm. Call after explicit device calibration
 * so tip-space mapping matches the new neutralMm snapshot.
 */
export function resyncNeutralTipWorldAnchors(
  controller: RcmKinematicsController,
  leftTrocarWorld: THREE.Vector3,
  rightTrocarWorld: THREE.Vector3,
  cameraBasisQuatWorldFixed: THREE.Quaternion,
  boardCenterWorld: THREE.Vector3,
  motionLimits: RcmKinematicsLimits = PEG_TRANSFER_DEFAULT_RCM_LIMITS
): void {
  const { insertionMin, insertionMax } = motionLimits;
  computeInstrumentShaftDirWorld(_shaftDirWorld, leftTrocarWorld, boardCenterWorld, 0, 0, cameraBasisQuatWorldFixed);
  const leftIns = clamp(insertionBaselineM('left'), insertionMin, insertionMax);
  controller.neutralTipWorld.left.copy(leftTrocarWorld).addScaledVector(_shaftDirWorld, leftIns);

  computeInstrumentShaftDirWorld(_shaftDirWorld, rightTrocarWorld, boardCenterWorld, 0, 0, cameraBasisQuatWorldFixed);
  const rightIns = clamp(insertionBaselineM('right'), insertionMin, insertionMax);
  controller.neutralTipWorld.right.copy(rightTrocarWorld).addScaledVector(_shaftDirWorld, rightIns);
}

export function initRcmKinematicsController(): RcmKinematicsController {
  const mkPose = () => ({
    tipWorld: new THREE.Vector3(),
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    gripClosure: 0,
  });

  return {
    toolKinematicsRef: {
      left: {
        tipWorld: new THREE.Vector3(),
        orientation: { pitch: 0, yaw: 0, roll: 0 },
        gripClosure: 0,
      },
      right: {
        tipWorld: new THREE.Vector3(),
        orientation: { pitch: 0, yaw: 0, roll: 0 },
        gripClosure: 0,
      },
    },
    neutralMmRef: { left: null, right: null },
    neutralGimbalRef: { left: null, right: null },
    neutralTipWorld: {
      left: new THREE.Vector3(),
      right: new THREE.Vector3(),
    },
    clutchWasActiveRef: { current: false },
    clutchLatchRef: { left: mkPose(), right: mkPose() },
    cameraModeWasActiveRef: { current: false },
    lastGripClosureRef: { left: 0, right: 0 },
  };
}

export function updateRcmKinematics({
  controller,
  leftRaw,
  rightRaw,
  leftTrocarWorld,
  rightTrocarWorld,
  cameraBasisQuatWorldFixed,
  boardCenterWorld,
  useTipSpaceMapping = false,
  motionLimits = PEG_TRANSFER_DEFAULT_RCM_LIMITS,
}: {
  controller: RcmKinematicsController;
  leftRaw: TouchStateMessage | null;
  rightRaw: TouchStateMessage | null;
  leftTrocarWorld: THREE.Vector3;
  rightTrocarWorld: THREE.Vector3;
  // Camera-local axes mapped into world once at mount (keeps mapping stable).
  cameraBasisQuatWorldFixed: THREE.Quaternion;
  /** Pegboard / task center — used when instrumentNeutralAimsAtBoardCenter is true. */
  boardCenterWorld: THREE.Vector3;
  /** Peg Transfer: tip-space X/Y mapping (wired from scene; inert until branch uses it). */
  useTipSpaceMapping?: boolean;
  /** Defaults to peg tuning; Camera Control passes a wider preset. */
  motionLimits?: RcmKinematicsLimits;
}) {
  const L = motionLimits;
  const tipSpaceScaleX = L.mmToViewX;
  const tipSpaceScaleY = -L.mmToViewY;
  const leftButtons = leftRaw?.buttons;
  const rightButtons = rightRaw?.buttons;

  const cameraModeActive = !!(leftButtons?.button1 && rightButtons?.button1);
  const clutchActive = !!(leftButtons?.button2 && rightButtons?.button2);
  const clutchReleasedThisFrame = !clutchActive && controller.clutchWasActiveRef.current;

  // Handle clutch freeze (global tool freeze).
  if (clutchActive) {
    if (!controller.clutchWasActiveRef.current) {
      controller.clutchLatchRef.left.tipWorld.copy(controller.toolKinematicsRef.left.tipWorld);
      controller.clutchLatchRef.right.tipWorld.copy(controller.toolKinematicsRef.right.tipWorld);
      controller.clutchLatchRef.left.orientation = { ...controller.toolKinematicsRef.left.orientation };
      controller.clutchLatchRef.right.orientation = { ...controller.toolKinematicsRef.right.orientation };
      controller.clutchLatchRef.left.gripClosure = controller.toolKinematicsRef.left.gripClosure;
      controller.clutchLatchRef.right.gripClosure = controller.toolKinematicsRef.right.gripClosure;
      controller.clutchWasActiveRef.current = true;
    }

    // While clutched: keep outputs exactly latched (world-space frozen).
    controller.toolKinematicsRef.left.tipWorld.copy(controller.clutchLatchRef.left.tipWorld);
    controller.toolKinematicsRef.right.tipWorld.copy(controller.clutchLatchRef.right.tipWorld);
    controller.toolKinematicsRef.left.orientation = { ...controller.clutchLatchRef.left.orientation };
    controller.toolKinematicsRef.right.orientation = { ...controller.clutchLatchRef.right.orientation };
    controller.toolKinematicsRef.left.gripClosure = controller.clutchLatchRef.left.gripClosure;
    controller.toolKinematicsRef.right.gripClosure = controller.clutchLatchRef.right.gripClosure;
    return;
  }

  // Re-index on clutch release so tool pose stays continuous (no teleport).
  // This path is intentionally independent from startupCalibrationRemap:
  // once running, clutch defines the new neutral from live tool pose.
  if (clutchReleasedThisFrame) {
    const invBasis = cameraBasisQuatWorldFixed.clone().invert();
    const reindexArm = (
      arm: ToolArmSide,
      raw: TouchStateMessage | null,
      trocarWorld: THREE.Vector3,
      latched: typeof controller.clutchLatchRef.left
    ) => {
      const rawPos = raw?.position;
      if (!rawPos) return;

      // Keep the frozen tip pose as target while redefining neutral device coordinates.
      const tipVecWorld = latched.tipWorld.clone().sub(trocarWorld);
      const insertionTarget = tipVecWorld.length();
      if (insertionTarget < 1e-6) return;

      const dirWorld = tipVecWorld.normalize();

      let oxTarget: number;
      let oyTarget: number;

      if (instrumentNeutralAimsAtBoard() && buildBoardAimTangents(boardCenterWorld, trocarWorld, cameraBasisQuatWorldFixed, _f0, _rTan, _uTan)) {
        oxTarget = clamp(dirWorld.dot(_rTan), -L.maxViewOffsetM, L.maxViewOffsetM);
        oyTarget = clamp(dirWorld.dot(_uTan), -L.maxViewOffsetM, L.maxViewOffsetM);
      } else {
        const dirView = _vScratch.copy(dirWorld).applyQuaternion(invBasis);
        const safeZ = Math.abs(dirView.z) < 1e-6 ? -1e-6 : dirView.z;
        oxTarget = clamp(dirView.x / -safeZ, -L.maxViewOffsetM, L.maxViewOffsetM);
        oyTarget = clamp(dirView.y / -safeZ, -L.maxViewOffsetM, L.maxViewOffsetM);
      }

      const ozTarget = clamp(
        insertionTarget - insertionBaselineM(arm),
        -L.maxViewOffsetM,
        L.maxViewOffsetM
      );

      // Invert mapping to find deltas that should map raw -> current frozen pose.
      const dxTarget = oxTarget / L.mmToViewX;
      const dyTarget = -oyTarget / L.mmToViewY;
      const dzTarget = -ozTarget / L.mmToViewZ;

      controller.neutralMmRef[arm] = [rawPos.x - dxTarget, rawPos.y - dyTarget, rawPos.z - dzTarget];

      const gx = raw?.gimbal?.x ?? 0;
      const gy = raw?.gimbal?.y ?? 0;
      const gz = raw?.gimbal?.z ?? 0;
      controller.neutralGimbalRef[arm] = [
        gx - latched.orientation.roll / INSTRUMENT_GIMBAL_GAIN,
        gy - latched.orientation.pitch / INSTRUMENT_GIMBAL_GAIN,
        gz - latched.orientation.yaw / INSTRUMENT_GIMBAL_GAIN,
      ];

      // Keep outputs continuous in the release frame.
      controller.toolKinematicsRef[arm].tipWorld.copy(latched.tipWorld);
      controller.toolKinematicsRef[arm].orientation = { ...latched.orientation };
      controller.toolKinematicsRef[arm].gripClosure = latched.gripClosure;
      controller.neutralTipWorld[arm].copy(latched.tipWorld);
    };

    reindexArm('left', leftRaw, leftTrocarWorld, controller.clutchLatchRef.left);
    reindexArm('right', rightRaw, rightTrocarWorld, controller.clutchLatchRef.right);
  }

  // Reset clutch edge tracking once unclutched.
  controller.clutchWasActiveRef.current = false;

  // Grip closure + camera-mode jaw freeze.
  const computeGripForArm = (arm: ToolArmSide, buttons?: { button1: boolean; button2: boolean }) => {
    if (cameraModeActive) return controller.lastGripClosureRef[arm];
    // Jaw closure driven by per-device button1; camera mode is handled above.
    const closed = !!buttons?.button1;
    return closed ? 1 : 0;
  };

  const leftGrip = computeGripForArm('left', leftButtons);
  const rightGrip = computeGripForArm('right', rightButtons);

  if (!cameraModeActive) {
    controller.lastGripClosureRef.left = leftGrip;
    controller.lastGripClosureRef.right = rightGrip;
  }

  // Compute per-arm kinematics only when we have neutral calibration and positions.
  const computeArm = (
    arm: ToolArmSide,
    raw: TouchStateMessage | null,
    trocarWorld: THREE.Vector3,
    out: typeof controller.toolKinematicsRef.left,
    boardCenter: THREE.Vector3
  ) => {
    const rawPos = raw?.position;
    if (!rawPos) return;

    const nMm = controller.neutralMmRef[arm];
    if (!nMm) return;

    const dx = rawPos.x - nMm[0];
    const dy = rawPos.y - nMm[1];
    const dz = rawPos.z - nMm[2];

    // CameraControl sign conventions (keep consistent with existing device mapping intent).
    const ox = dx * L.mmToViewX;
    /** Inverted vs device Y so physical stylus down matches expected on-screen tilt. */
    const oy = -dy * L.mmToViewY;
    const oz = -dz * L.mmToViewZ;

    const oxC = clamp(ox, -L.maxViewOffsetM, L.maxViewOffsetM);
    const oyC = clamp(oy, -L.maxViewOffsetM, L.maxViewOffsetM);
    const ozC = clamp(oz, -L.maxViewOffsetM, L.maxViewOffsetM);

    // Insertion from depth component (depth maps to "sliding along" the shaft).
    const insertion = clamp(insertionBaselineM(arm) + ozC, L.insertionMin, L.insertionMax);

    if (useTipSpaceMapping) {
      const dxTask = dx;
      const projected = computeTipWorldFromDeviceDelta(
        controller.neutralTipWorld[arm],
        dxTask,
        dy,
        cameraBasisQuatWorldFixed,
        trocarWorld,
        tipSpaceScaleX,
        tipSpaceScaleY,
        L.insertionMin,
        L.insertionMax,
        {
          maxDeltaWorld: L.tipSpaceMaxDelta,
          insertionAlongShaft: insertion,
        }
      );
      if (projected) {
        out.tipWorld.copy(projected);
      }
    } else {
      // Build trocar-realistic shaft direction and insertion.
      // Direction comes from the trocar-to-tip axis; we construct it from constrained offsets,
      // then compute insertion along that direction:
      //
      // dir = normalize(tipWorld - trocarWorld)
      // tipWorld = trocarWorld + insertion * dir
      //
      computeInstrumentShaftDirWorld(_shaftDirWorld, trocarWorld, boardCenter, oxC, oyC, cameraBasisQuatWorldFixed);
      out.tipWorld.copy(trocarWorld).addScaledVector(_shaftDirWorld, insertion);
    }
    // Wrist orientation from gimbal (visual placeholder only).
    const g = raw?.gimbal;
    const nG = controller.neutralGimbalRef[arm];
    const gx = g?.x ?? 0;
    const gy = g?.y ?? 0;
    const gz = g?.z ?? 0;
    const ngx = nG?.[0] ?? 0;
    const ngy = nG?.[1] ?? 0;
    const ngz = nG?.[2] ?? 0;

    let roll = (gx - ngx) * INSTRUMENT_GIMBAL_GAIN;
    let pitch = (gy - ngy) * INSTRUMENT_GIMBAL_GAIN;
    let yaw = (gz - ngz) * INSTRUMENT_GIMBAL_GAIN;

    roll = clamp(roll, -L.maxWristRotRad, L.maxWristRotRad);
    pitch = clamp(pitch, -L.maxWristRotRad, L.maxWristRotRad);
    yaw = clamp(yaw, -L.maxWristRotRad, L.maxWristRotRad);

    out.orientation.pitch = pitch;
    out.orientation.yaw = yaw;
    out.orientation.roll = roll;
  };

  computeArm('left', leftRaw, leftTrocarWorld, controller.toolKinematicsRef.left, boardCenterWorld);
  computeArm('right', rightRaw, rightTrocarWorld, controller.toolKinematicsRef.right, boardCenterWorld);

  controller.toolKinematicsRef.left.gripClosure = leftGrip;
  controller.toolKinematicsRef.right.gripClosure = rightGrip;
}

