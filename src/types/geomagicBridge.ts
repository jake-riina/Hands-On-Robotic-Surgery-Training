/** Geomagic / OpenHaptics state line streamed from haptics-bridge (NDJSON over WebSocket). */

export const BRIDGE_WS_URL = 'ws://localhost:4000';

export type GimbalPayload = {
  x: number;
  y: number;
  z: number;
  xDeg?: number;
  yDeg?: number;
  zDeg?: number;
};

export type TouchStateMessage = {
  type: string;
  deviceId: string;
  timestampMs?: number;
  position?: { x: number; y: number; z: number };
  gimbal?: GimbalPayload;
  buttons?: { button1: boolean; button2: boolean };
};

export type GeomagicArm = 'left' | 'right';
