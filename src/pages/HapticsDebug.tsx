import { useEffect, useMemo, useState } from 'react';

type GimbalPayload = {
  x: number;
  y: number;
  z: number;
  xDeg?: number;
  yDeg?: number;
  zDeg?: number;
};

type TouchStateMessage = {
  type: string;
  deviceId: string;
  timestampMs?: number;
  position?: { x: number; y: number; z: number };
  gimbal?: GimbalPayload;
  buttons?: { button1: boolean; button2: boolean };
};

function fmt(n: number | undefined, decimals: number): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 8,
        fontSize: 13,
        padding: '4px 0',
        borderBottom: '1px solid #2a2a2a',
      }}
    >
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value}</span>
    </div>
  );
}

function DevicePanel({
  title,
  msg,
}: {
  title: string;
  msg: TouchStateMessage | undefined;
}) {
  if (!msg) {
    return (
      <div style={{ background: '#161616', padding: 12, borderRadius: 8 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>{title}</h2>
        <p style={{ margin: 0, color: '#888' }}>No messages yet</p>
      </div>
    );
  }

  const p = msg.position;
  const g = msg.gimbal;
  const b = msg.buttons;

  return (
    <div style={{ background: '#161616', padding: 12, borderRadius: 8 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{title}</h2>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06, color: '#666', marginBottom: 6 }}>
          Message
        </div>
        <Row label="type" value={msg.type} />
        <Row label="deviceId" value={msg.deviceId} />
        <Row label="timestampMs" value={msg.timestampMs !== undefined ? String(msg.timestampMs) : '—'} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06, color: '#666', marginBottom: 6 }}>
          Position (mm)
        </div>
        <Row label="x" value={fmt(p?.x, 4)} />
        <Row label="y" value={fmt(p?.y, 4)} />
        <Row label="z" value={fmt(p?.z, 4)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06, color: '#666', marginBottom: 6 }}>
          Gimbal (roll / pitch / yaw)
        </div>
        <Row label="x (rad)" value={fmt(g?.x, 6)} />
        <Row label="y (rad)" value={fmt(g?.y, 6)} />
        <Row label="z (rad)" value={fmt(g?.z, 6)} />
        <Row label="xDeg" value={fmt(g?.xDeg, 3)} />
        <Row label="yDeg" value={fmt(g?.yDeg, 3)} />
        <Row label="zDeg" value={fmt(g?.zDeg, 3)} />
        {!g && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c9a227' }}>
            No gimbal object in payload — C++ server may be an older build.
          </p>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06, color: '#666', marginBottom: 6 }}>
          Buttons
        </div>
        <Row label="button1" value={b ? (b.button1 ? 'true' : 'false') : '—'} />
        <Row label="button2" value={b ? (b.button2 ? 'true' : 'false') : '—'} />
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
          Raw JSON (full bridge payload)
        </summary>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            margin: '8px 0 0',
            fontSize: 11,
            padding: 8,
            background: '#0d0d0d',
            borderRadius: 4,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(msg, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function HapticsDebug() {
  const WS_URL = useMemo(() => 'ws://localhost:4000', []);

  const [connected, setConnected] = useState(false);
  const [lastByDeviceId, setLastByDeviceId] = useState<Record<string, TouchStateMessage>>({});
  const [messageCount, setMessageCount] = useState(0);

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
          setMessageCount((c) => c + 1);
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
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline' }}>
        <div>
          WebSocket: <strong>{connected ? 'Connected' : 'Disconnected'}</strong>
        </div>
        <div style={{ color: '#888', fontSize: 14 }}>
          State messages received: <strong style={{ color: '#ccc' }}>{messageCount}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <DevicePanel title="touch-1" msg={touch1} />
        <DevicePanel title="touch-2" msg={touch2} />
      </div>
    </div>
  );
}
