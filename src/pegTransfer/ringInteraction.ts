import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';
import type { RingHomePoseMap, RingStateMap } from './ringState';
import type { ToolArmSide, ToolKinematicsRef, WorldFrameArm, WorldFrameRef } from './toolFrameTypes';
import type { PegLayoutEntry } from './pegFieldLayout';
import { PEGBOARD_LOCAL_QUATERNION, pegLocalToWorld, worldToPegLocal } from './pegFieldLayout';

type InteractionState = 'IDLE' | 'HELD_BY_ORIGIN' | 'HELD_BY_DESTINATION' | 'VALID_COMPLETE';

type SnapProgress = {
  active: boolean;
  elapsedMs: number;
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  targetPosition: THREE.Vector3;
  targetQuaternion: THREE.Quaternion;
};

export type RingInteractionController = {
  stateByRingId: Record<string, InteractionState>;
  lastInteractedSideByRingId: Record<string, ToolArmSide | null>;
  attachedPegIdByRingId: Record<string, string | null>;
  homePoseByRingId: RingHomePoseMap;
  snapByRingId: Record<string, SnapProgress>;
  pegLayoutById: Record<string, PegLayoutEntry>;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const getGripFlags = (toolKinematicsRef: ToolKinematicsRef) => {
  const g = pegTransferReferenceValues.interactionDefaults;
  return {
    leftCanGrab: toolKinematicsRef.left.gripClosure > g.graspClosureThreshold,
    rightCanGrab: toolKinematicsRef.right.gripClosure > g.graspClosureThreshold,
    leftReleased: toolKinematicsRef.left.gripClosure < g.releaseClosureThreshold,
    rightReleased: toolKinematicsRef.right.gripClosure < g.releaseClosureThreshold,
  };
};

/** Pickup / handoff: closest of pinch midpoint and each jaw-tip anchor (pincer-style, not open-jaw midpoint air gap). */
function pickupDistanceRingToArm(arm: WorldFrameArm, ringPosition: THREE.Vector3): number {
  const dMid = arm.biteMid.distanceTo(ringPosition);
  const dL = arm.leftJaw.distanceTo(ringPosition);
  const dR = arm.rightJaw.distanceTo(ringPosition);
  return Math.min(dMid, dL, dR);
}

export function initRingInteractionController(
  ringStateRef: MutableRefObject<RingStateMap>,
  homePoseByRingId: RingHomePoseMap,
  pegLayout: PegLayoutEntry[]
): RingInteractionController {
  const stateByRingId: Record<string, InteractionState> = {};
  const lastInteractedSideByRingId: Record<string, ToolArmSide | null> = {};
  const attachedPegIdByRingId: Record<string, string | null> = {};
  const snapByRingId: Record<string, SnapProgress> = {};
  const pegLayoutById: Record<string, PegLayoutEntry> = {};
  for (const p of pegLayout) pegLayoutById[p.id] = p;

  for (const ring of Object.values(ringStateRef.current)) {
    stateByRingId[ring.id] = 'IDLE';
    lastInteractedSideByRingId[ring.id] = null;
    attachedPegIdByRingId[ring.id] = homePoseByRingId[ring.id]?.pegId ?? null;
    snapByRingId[ring.id] = {
      active: false,
      elapsedMs: 0,
      startPosition: new THREE.Vector3(),
      startQuaternion: new THREE.Quaternion(),
      targetPosition: new THREE.Vector3(),
      targetQuaternion: new THREE.Quaternion(),
    };
  }

  return {
    stateByRingId,
    lastInteractedSideByRingId,
    attachedPegIdByRingId,
    homePoseByRingId,
    snapByRingId,
    pegLayoutById,
  };
}

export function updateRingInteractions({
  ringStateRef,
  controller,
  worldFrameRef,
  toolKinematicsRef,
  boardCenterWorld,
  deltaSec,
}: {
  ringStateRef: MutableRefObject<RingStateMap>;
  controller: RingInteractionController;
  worldFrameRef: WorldFrameRef;
  toolKinematicsRef: ToolKinematicsRef;
  boardCenterWorld: THREE.Vector3;
  deltaSec: number;
}) {
  const settings = pegTransferReferenceValues.interactionDefaults;
  const grip = getGripFlags(toolKinematicsRef);

  const startSnap = (ringId: string, targetPegId: string) => {
    const ring = ringStateRef.current[ringId];
    if (!ring) return;
    const peg = controller.pegLayoutById[targetPegId];
    if (!peg) return;

    const snap = controller.snapByRingId[ringId];
    snap.active = true;
    snap.elapsedMs = 0;
    snap.startPosition.copy(ring.position);
    snap.startQuaternion.copy(ring.quaternion);

    const topLocal = peg.localCenter.clone();
    topLocal.z += pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM / 2;
    const hangLocal = topLocal.clone();
    hangLocal.z -= pegTransferReferenceValues.ringDefaults.hangOffsetFromPegTopM;
    snap.targetPosition.copy(pegLocalToWorld(hangLocal, boardCenterWorld));
    snap.targetQuaternion.copy(PEGBOARD_LOCAL_QUATERNION);
  };

  const applyHeldPose = (ringId: string, side: ToolArmSide) => {
    const ring = ringStateRef.current[ringId];
    const biteMid = worldFrameRef[side].biteMid;
    const biteQuat = worldFrameRef[side].biteQuatWorld;

    ring.position.copy(ring.holdOffsetPosition).applyQuaternion(biteQuat).add(biteMid);
    ring.quaternion.copy(biteQuat).multiply(ring.holdOffsetQuaternion);

    // First-pass anti-phase rule: ring must be lifted above current peg before lateral translation.
    const attachedPegId = controller.attachedPegIdByRingId[ringId];
    if (!attachedPegId) return;
    const peg = controller.pegLayoutById[attachedPegId];
    if (!peg) return;

    const local = worldToPegLocal(ring.position, boardCenterWorld);
    const topLocalZ =
      peg.localCenter.z + pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM / 2;
    const mustClearZ = topLocalZ + settings.pegClearanceLiftM;
    if (local.z >= mustClearZ) {
      controller.attachedPegIdByRingId[ringId] = null;
      return;
    }

    local.x = peg.localCenter.x;
    local.y = peg.localCenter.y;
    ring.position.copy(pegLocalToWorld(local, boardCenterWorld));
  };

  for (const ring of Object.values(ringStateRef.current)) {
    const ringId = ring.id;
    const state = controller.stateByRingId[ringId];
    const snap = controller.snapByRingId[ringId];

    if (snap.active) {
      snap.elapsedMs += deltaSec * 1000;
      const tNorm = Math.min(snap.elapsedMs / settings.snapDurationMs, 1);
      const t = easeOutCubic(tNorm);
      ring.position.lerpVectors(snap.startPosition, snap.targetPosition, t);
      ring.quaternion.slerpQuaternions(snap.startQuaternion, snap.targetQuaternion, t);
      if (tNorm >= 1) {
        snap.active = false;
        ring.validComplete = true;
        ring.heldBy = null;
        controller.stateByRingId[ringId] = 'VALID_COMPLETE';
        controller.attachedPegIdByRingId[ringId] = ring.targetPegId;
      }
      continue;
    }

    if (state === 'VALID_COMPLETE' || ring.validComplete) continue;

    const leftDist = pickupDistanceRingToArm(worldFrameRef.left, ring.position);
    const rightDist = pickupDistanceRingToArm(worldFrameRef.right, ring.position);
    const leftCanPickup = grip.leftCanGrab && leftDist < settings.pickupRadiusM;
    const rightCanPickup = grip.rightCanGrab && rightDist < settings.pickupRadiusM;

    if (ring.heldBy === null) {
      const expectedOriginSide = ring.originSide;
      const leftEligible = expectedOriginSide === 'left' && leftCanPickup;
      const rightEligible = expectedOriginSide === 'right' && rightCanPickup;
      let chosen: ToolArmSide | null = null;

      if (leftEligible && rightEligible) {
        const last = controller.lastInteractedSideByRingId[ringId];
        if (last === 'left' || last === 'right') {
          chosen = last;
        } else {
          chosen = leftDist <= rightDist ? 'left' : 'right';
        }
      } else if (leftEligible) {
        chosen = 'left';
      } else if (rightEligible) {
        chosen = 'right';
      }

      if (chosen) {
        const biteMid = worldFrameRef[chosen].biteMid;
        const biteQuat = worldFrameRef[chosen].biteQuatWorld;
        const invBiteQuat = biteQuat.clone().invert();
        ring.holdOffsetPosition.copy(ring.position).sub(biteMid).applyQuaternion(invBiteQuat);
        ring.holdOffsetQuaternion.copy(invBiteQuat).multiply(ring.quaternion);
        ring.heldBy = chosen;
        controller.lastInteractedSideByRingId[ringId] = chosen;
        controller.stateByRingId[ringId] = 'HELD_BY_ORIGIN';
      }
      continue;
    }

    if (state === 'HELD_BY_ORIGIN') {
      const holder = ring.heldBy;
      if (!holder) continue;
      const receiver: ToolArmSide = holder === 'left' ? 'right' : 'left';
      const holderReleased = holder === 'left' ? grip.leftReleased : grip.rightReleased;
      const receiverGrab = receiver === 'left' ? grip.leftCanGrab : grip.rightCanGrab;

      if (
        receiverGrab &&
        holderReleased &&
        pickupDistanceRingToArm(worldFrameRef[receiver], ring.position) < settings.pickupRadiusM
      ) {
        const biteMid = worldFrameRef[receiver].biteMid;
        const biteQuat = worldFrameRef[receiver].biteQuatWorld;
        const invBiteQuat = biteQuat.clone().invert();
        ring.holdOffsetPosition.copy(ring.position).sub(biteMid).applyQuaternion(invBiteQuat);
        ring.holdOffsetQuaternion.copy(invBiteQuat).multiply(ring.quaternion);
        ring.heldBy = receiver;
        ring.hasTransferredHands = true;
        controller.lastInteractedSideByRingId[ringId] = receiver;
        controller.stateByRingId[ringId] = 'HELD_BY_DESTINATION';
        continue;
      }

      if (holderReleased) {
        ring.heldBy = null;
        controller.stateByRingId[ringId] = 'IDLE';
        continue;
      }

      applyHeldPose(ringId, holder);
      continue;
    }

    if (state === 'HELD_BY_DESTINATION') {
      const holder = ring.heldBy;
      if (!holder) continue;
      const other: ToolArmSide = holder === 'left' ? 'right' : 'left';
      const holderReleased = holder === 'left' ? grip.leftReleased : grip.rightReleased;
      const otherGrab = other === 'left' ? grip.leftCanGrab : grip.rightCanGrab;

      if (
        otherGrab &&
        holderReleased &&
        pickupDistanceRingToArm(worldFrameRef[other], ring.position) < settings.pickupRadiusM
      ) {
        const biteMid = worldFrameRef[other].biteMid;
        const biteQuat = worldFrameRef[other].biteQuatWorld;
        const invBiteQuat = biteQuat.clone().invert();
        ring.holdOffsetPosition.copy(ring.position).sub(biteMid).applyQuaternion(invBiteQuat);
        ring.holdOffsetQuaternion.copy(invBiteQuat).multiply(ring.quaternion);
        ring.heldBy = other;
        controller.lastInteractedSideByRingId[ringId] = other;
        controller.stateByRingId[ringId] = 'HELD_BY_ORIGIN';
        continue;
      }

      if (holderReleased) {
        ring.heldBy = null;
        const targetPeg = controller.pegLayoutById[ring.targetPegId];
        if (targetPeg) {
          const local = worldToPegLocal(ring.position, boardCenterWorld);
          const dx = local.x - targetPeg.localCenter.x;
          const dy = local.y - targetPeg.localCenter.y;
          const withinSnap = Math.sqrt(dx * dx + dy * dy) <= settings.snapRadiusM;
          if (withinSnap) {
            startSnap(ringId, ring.targetPegId);
            continue;
          }
        }

        // Invalid release: return to spawn pose.
        const home = controller.homePoseByRingId[ringId];
        if (home) {
          ring.position.copy(home.position);
          ring.quaternion.copy(home.quaternion);
          controller.attachedPegIdByRingId[ringId] = home.pegId;
        }
        controller.stateByRingId[ringId] = 'IDLE';
        continue;
      }

      applyHeldPose(ringId, holder);
      continue;
    }
  }
}

