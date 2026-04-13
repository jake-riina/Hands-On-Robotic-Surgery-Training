/** How much each new sample counts (0–1). Higher = more responsive, more jitter. */
export const BLE_PRESSURE_SMOOTH_ALPHA_RISE = 0.32;
export const BLE_PRESSURE_SMOOTH_ALPHA_FALL = 0.22;

/**
 * Exponential smoothing for BLE force readings. Asymmetric: slightly faster when
 * pressure increases (human squeeze) than when it falls (stabler release).
 */
export function smoothBlePsi(prevSmoothed: number, rawPsi: number): number {
  const raw = Math.max(0, rawPsi);
  const alpha = raw >= prevSmoothed ? BLE_PRESSURE_SMOOTH_ALPHA_RISE : BLE_PRESSURE_SMOOTH_ALPHA_FALL;
  let next = alpha * raw + (1 - alpha) * prevSmoothed;
  if (raw < 0.4 && next < 2) {
    next = 0;
  }
  return next;
}
