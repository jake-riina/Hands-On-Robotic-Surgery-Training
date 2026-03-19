import { useEffect, useMemo, useState } from 'react';

type TouchStateMessage = {
  type: string;
  deviceId: string;
  timestampMs?: number;
  position?: { x: number; y: number; z: number };
  buttons?: { button1: boolean; button2: boolean };
};

export default function HapticsDebug() {
  const WS_URL = useMemo(() => 'ws://localhost:4000', []);

  const [connected, setConnected] = useState(false);
  const [lastByDeviceId, setLastByDeviceId] = useState<Record<string, TouchStateMessage>>({});

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as TouchStateMessage;
        if (msg?.type === 'state' && msg.deviceId) {
          setLastByDeviceId((prev) => ({ ...prev, [msg.deviceId]: msg }));
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    return () => ws.close();
  }, [WS_URL]);

  const touch1 = lastByDeviceId['touch-1'];
  const touch2 = lastByDeviceId['touch-2'];

  return (
    <div style={{ padding: 24, color: 'white', background: '#111', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Haptics Debug</h1>
      <div style={{ marginBottom: 16 }}>
        WebSocket: <strong>{connected ? 'Connected' : 'Disconnected'}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#161616', padding: 12, borderRadius: 8 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>touch-1</h2>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {touch1 ? JSON.stringify(touch1, null, 2) : 'No messages yet'}
          </pre>
        </div>

        <div style={{ background: '#161616', padding: 12, borderRadius: 8 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>touch-2</h2>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {touch2 ? JSON.stringify(touch2, null, 2) : 'No messages yet'}
          </pre>
        </div>
      </div>
    </div>
  );
}

