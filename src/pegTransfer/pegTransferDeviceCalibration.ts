import type { GeomagicArm, TouchStateMessage } from '../types/geomagicBridge';

/** Touch Diagnostics inkwell pose (device position units, same as WebSocket payload). */
const INKWELL_CENTER_MM = { x: 0, y: -65.11, z: -88.11 } as const;
const INKWELL_TOLERANCE = 1;

function isDevicePositionInInkwell(p: { x: number; y: number; z: number }): boolean {
  return (
    Math.abs(p.x - INKWELL_CENTER_MM.x) <= INKWELL_TOLERANCE &&
    Math.abs(p.y - INKWELL_CENTER_MM.y) <= INKWELL_TOLERANCE &&
    Math.abs(p.z - INKWELL_CENTER_MM.z) <= INKWELL_TOLERANCE
  );
}

/** Both arms connected with full state, and each stylus inside the inkwell volume. */
export function canCalibrateDevices(latest: Record<GeomagicArm, TouchStateMessage | null>): boolean {
  const L = latest.left;
  const R = latest.right;
  if (!L || !R) return false;
  if (L.type !== 'state' || R.type !== 'state') return false;
  if (!L.position || !R.position || !L.gimbal || !R.gimbal) return false;
  if (!L.buttons || !R.buttons) return false;
  return isDevicePositionInInkwell(L.position) && isDevicePositionInInkwell(R.position);
}
