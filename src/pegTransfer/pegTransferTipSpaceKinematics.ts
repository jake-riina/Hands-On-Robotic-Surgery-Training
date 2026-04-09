import * as THREE from 'three';

/**
 * Peg Transfer — absolute tip-space mapping (no per-frame integration).
 *
 * Contract:
 * - `neutralTipWorld` is a calibration- or clutch-release anchor: the tip pose that corresponds
 *   to device neutrals (dx = dy = 0). It is not accumulated inside this function.
 * - Each call applies a one-shot offset in the **seed camera basis** (`cameraBasisQuatWorldFixed`):
 *   tipDesired = neutralTipWorld + (dx * scaleX) * camRight + (dy * scaleY) * camUp.
 * - The result fixes **shaft direction** from (tipDesired - trocar); insertion length is either
 *   ‖tipDesired - trocar‖ (clamped) or an explicit `insertionAlongShaft` after XY is established.
 *
 * Epsilon guard (required):
 * - If ‖tipDesired - trocar‖ < 1e-4, the tip is at or inside the fulcrum; `normalize()` would be
 *   unstable or NaN and can break downstream shaft geometry. This function returns **null** so the
 *   caller keeps the previous `tipWorld` and does not propagate null.
 *
 * Optional `insertionAlongShaft`: after XY establishes `dir`, shaft length uses this value only
 * (e.g. dz → insertion). When omitted, length follows ‖tipDesired − trocar‖ (clamped).
 *
 * Optional `maxDeltaWorld`: clamps the world-space XY offset magnitude per call (per-frame cap).
 */
export type ComputeTipWorldFromDeviceDeltaOptions = {
  maxDeltaWorld?: number;
  /** When set, use this insertion along the XY ray (dz), not distance to tipDesired. */
  insertionAlongShaft?: number;
};

export function computeTipWorldFromDeviceDelta(
  neutralTipWorld: THREE.Vector3,
  dx: number,
  dy: number,
  cameraBasisQuatWorldFixed: THREE.Quaternion,
  trocar: THREE.Vector3,
  scaleX: number,
  scaleY: number,
  insertionMin: number,
  insertionMax: number,
  options?: ComputeTipWorldFromDeviceDeltaOptions
): THREE.Vector3 | null {
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraBasisQuatWorldFixed);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraBasisQuatWorldFixed);

  const offset = new THREE.Vector3()
    .copy(camRight)
    .multiplyScalar(dx * scaleX)
    .addScaledVector(camUp, dy * scaleY);

  const maxD = options?.maxDeltaWorld;
  if (maxD !== undefined && maxD > 0) {
    const len = offset.length();
    if (len > maxD) offset.multiplyScalar(maxD / len);
  }

  const tipDesired = neutralTipWorld.clone().add(offset);

  const w = tipDesired.clone().sub(trocar);
  const dist = w.length();

  if (dist < 1e-4) return null;

  const dir = w.divideScalar(dist);
  const L =
    options?.insertionAlongShaft !== undefined
      ? THREE.MathUtils.clamp(options.insertionAlongShaft, insertionMin, insertionMax)
      : THREE.MathUtils.clamp(dist, insertionMin, insertionMax);
  return trocar.clone().addScaledVector(dir, L);
}
