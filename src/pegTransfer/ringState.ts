import * as THREE from 'three';
import type { PegLayoutEntry } from './pegFieldLayout';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';
import { pegLocalToWorld, PEGBOARD_LOCAL_QUATERNION } from './pegFieldLayout';

export type RingState = {
  id: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  heldBy: 'left' | 'right' | null;
  originSide: 'left' | 'right';
  requiredDestinationSide: 'left' | 'right';
  targetPegId: string;
  hasTransferredHands: boolean;
  validComplete: boolean;
  holdOffsetPosition: THREE.Vector3;
  holdOffsetQuaternion: THREE.Quaternion;
};

export type RingStateMap = Record<string, RingState>;

export type RingHomePoseMap = Record<string, { pegId: string; position: THREE.Vector3; quaternion: THREE.Quaternion }>;

export function createInitialRingState(
  pegLayout: PegLayoutEntry[],
  boardCenterWorld: THREE.Vector3
): RingStateMap {
  const byPegId: Record<string, PegLayoutEntry> = {};
  for (const p of pegLayout) byPegId[p.id] = p;

  // Requested starter pattern:
  // left column: 1,3,5 ; right column: 2,4
  const starterPegIds = ['L1', 'L3', 'L5', 'R2', 'R4'];
  const ringOffsetFromPegTopM = pegTransferReferenceValues.ringDefaults.hangOffsetFromPegTopM;
  const pegHeightM = pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM;

  const boardQuat = PEGBOARD_LOCAL_QUATERNION.clone();

  const out: RingStateMap = {};
  starterPegIds.forEach((pegId, idx) => {
    const peg = byPegId[pegId];
    if (!peg) return;

    const topLocal = peg.localCenter.clone();
    topLocal.z += pegHeightM / 2;
    const ringLocal = topLocal.clone();
    ringLocal.z -= ringOffsetFromPegTopM;

    const originSide = peg.side;
    const requiredDestinationSide = originSide === 'left' ? 'right' : 'left';
    const targetPegId = originSide === 'left' ? `R${peg.rowIndex1}` : `L${peg.rowIndex1}`;

    out[`ring-${idx + 1}`] = {
      id: `ring-${idx + 1}`,
      position: pegLocalToWorld(ringLocal, boardCenterWorld),
      quaternion: boardQuat.clone(),
      heldBy: null,
      originSide,
      requiredDestinationSide,
      targetPegId,
      hasTransferredHands: false,
      validComplete: false,
      holdOffsetPosition: new THREE.Vector3(),
      holdOffsetQuaternion: new THREE.Quaternion(),
    };
  });

  return out;
}

export function createRingHomePoseMap(rings: RingStateMap): RingHomePoseMap {
  const home: RingHomePoseMap = {};
  for (const ring of Object.values(rings)) {
    const rowIndexMatch = ring.targetPegId.match(/[0-9]+$/);
    const rowIndex = rowIndexMatch ? rowIndexMatch[0] : '';
    const homePegId = ring.originSide === 'left' ? `L${rowIndex}` : `R${rowIndex}`;
    home[ring.id] = {
      pegId: homePegId,
      position: ring.position.clone(),
      quaternion: ring.quaternion.clone(),
    };
  }
  return home;
}

