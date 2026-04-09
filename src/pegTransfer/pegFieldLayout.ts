import * as THREE from 'three';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';

export type PegSide = 'left' | 'right';

export type PegLayoutEntry = {
  id: string;
  side: PegSide;
  rowIndex1: number;
  localCenter: THREE.Vector3;
};

export const PEGBOARD_LOCAL_ROTATION = new THREE.Euler(1, 0, 0);
export const PEGBOARD_LOCAL_QUATERNION = new THREE.Quaternion().setFromEuler(PEGBOARD_LOCAL_ROTATION);

export function getPegboardDimensions() {
  const boardBaseWidthM = pegTransferReferenceValues.pegboardDefaults.boardBaseWorldWidthM;
  const boardWidthM =
    pegTransferReferenceValues.viewportComposition.pegboardWidthToViewportWidth.defaultValue * boardBaseWidthM;
  const boardHeightM = boardWidthM * pegTransferReferenceValues.pegboardDefaults.boardHeightToWidth;
  const boardThicknessM = boardWidthM * pegTransferReferenceValues.pegboardDefaults.boardThicknessToWidth;
  return { boardWidthM, boardHeightM, boardThicknessM };
}

export function createPegLayoutEntries(): PegLayoutEntry[] {
  const { boardThicknessM } = getPegboardDimensions();
  const pegField = pegTransferReferenceValues.pegboardDefaults.pegField;
  const halfColumn = pegField.columnDistanceM / 2;
  const totalSpan = (pegField.rowsPerColumn - 1) * pegField.rowSpacingM;
  const startY = pegField.centerYOffsetM + totalSpan / 2;
  const pegCenterZ = boardThicknessM / 2 + pegField.pegHeightM / 2;

  const out: PegLayoutEntry[] = [];
  for (let i = 0; i < pegField.rowsPerColumn; i += 1) {
    const rowIndex1 = i + 1;
    const y = startY - i * pegField.rowSpacingM - pegField.translateDownM;
    out.push({
      id: `L${rowIndex1}`,
      side: 'left',
      rowIndex1,
      localCenter: new THREE.Vector3(-halfColumn, y, pegCenterZ),
    });
    out.push({
      id: `R${rowIndex1}`,
      side: 'right',
      rowIndex1,
      localCenter: new THREE.Vector3(halfColumn, y, pegCenterZ),
    });
  }
  return out;
}

export function pegLocalToWorld(local: THREE.Vector3, boardCenterWorld: THREE.Vector3): THREE.Vector3 {
  return local.clone().applyQuaternion(PEGBOARD_LOCAL_QUATERNION).add(boardCenterWorld);
}

export function worldToPegLocal(world: THREE.Vector3, boardCenterWorld: THREE.Vector3): THREE.Vector3 {
  const inv = PEGBOARD_LOCAL_QUATERNION.clone().invert();
  return world.clone().sub(boardCenterWorld).applyQuaternion(inv);
}

