import { useEffect, useRef, type MutableRefObject } from 'react';
import { BRIDGE_WS_URL, type GeomagicArm, type TouchStateMessage } from '../types/geomagicBridge';

export type LatestByArmRef = MutableRefObject<Record<GeomagicArm, TouchStateMessage | null>>;

/** Optional bridge behavior (e.g. Module 2: abandon on disconnect, disable reconnect). */
export type GeomagicBridgeEvents = {
  /** When false, the socket will not auto-reconnect after a close. Default: reconnect. */
  reconnectAfterClose?: boolean;
  /** Called when the socket closes for any reason other than hook cleanup. */
  onUnexpectedClose?: () => void;
};

/**
 * Subscribes to haptics-bridge WebSocket and writes latest left/right state into refs only
 * (no React state on the hot path).
 */
export function useGeomagicLatestRef(
  eventsRef?: MutableRefObject<GeomagicBridgeEvents>
): LatestByArmRef {
  const latestRef = useRef<Record<GeomagicArm, TouchStateMessage | null>>({
    left: null,
    right: null,
  });

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const attachHandlers = (ws: WebSocket) => {
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as TouchStateMessage;
          if (msg.type !== 'state' || !msg.deviceId || !msg.position) return;
          const side: GeomagicArm | null =
            msg.deviceId === 'touch-1' ? 'left' : msg.deviceId === 'touch-2' ? 'right' : null;
          if (!side) return;
          latestRef.current[side] = msg;
        } catch {
          // ignore malformed bridge frames
        }
      };
      ws.onclose = () => {
        socket = null;
        if (cancelled) return;
        const ev = eventsRef?.current;
        ev?.onUnexpectedClose?.();
        if (ev?.reconnectAfterClose === false) return;
        reconnectTimer = setTimeout(connect, 1500);
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(BRIDGE_WS_URL);
      attachHandlers(socket);
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return latestRef;
}
