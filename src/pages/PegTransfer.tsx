import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, FlyControls } from '@react-three/drei';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGeomagicLatestRef, type GeomagicBridgeEvents } from '../hooks/useGeomagicLatestRef';
import {
  completeTransfer,
  dropTransfer,
  invokeModule3AbandonSession,
  invokeModule3CompleteSession,
  markRingCompleted,
  startHandToHandTransfer,
  startHandToPegTransfer,
  type Module3PegTransferRouteState,
  type Side,
} from '../lib/module3PegSessionService';
import { PegTransferScene } from '../pegTransfer/PegTransferScene';
import type { RingInteractionEvent } from '../pegTransfer/ringInteraction';
import { canCalibrateDevices } from '../pegTransfer/pegTransferDeviceCalibration';
import { CAMERA_FOV_DEFAULT } from '../pegTransfer/pegTransferCameraRig';
import { pegTransferBoardCenterWorld } from '../pegTransfer/pegTransferWorldRig';

/** WebGL + R3F scene background (plan Step 7) */
const SCENE_CLEAR_HEX = '#1b1d22';
const CLEAR_HEX = '#0a0c12';
const MODULE_3_SECONDS = 60;
/**
 * Production: always constrained surgical camera (`PegTransferScene`).
 * Dev (`npm run dev`): optional FlyControls + toggle for layout/debug only.
 */
const DEBUG_FREE_NAV = import.meta.env.DEV;

type RingTransferRuntime = {
  activeHandToHandTransferId: string | null;
  activeHandToPegTransferId: string | null;
  dbCompleted: boolean;
};

function oppositeSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

export default function PegTransfer() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as Module3PegTransferRouteState | undefined;
  const module3SessionId = routeState?.sessionId ?? null;

  const bridgeEventsRef = useRef<GeomagicBridgeEvents>({ reconnectAfterClose: true });
  const geomagicLatestRef = useGeomagicLatestRef(bridgeEventsRef);

  const sceneRingIdToDbRingIdRef = useRef<Record<string, string>>({});
  const onModule3PegRingsInserted = useCallback((map: Record<string, string>) => {
    sceneRingIdToDbRingIdRef.current = map;
  }, []);
  const transferRuntimeBySceneRingIdRef = useRef<Record<string, RingTransferRuntime>>({});
  const ringEventChainBySceneRingIdRef = useRef<Record<string, Promise<void>>>({});
  const completedDbRingIdsRef = useRef<Set<string>>(new Set());
  const [completedRings, setCompletedRings] = useState(0);

  const [freeNavEnabled, setFreeNavEnabled] = useState(false);
  const [devicesCalibrated, setDevicesCalibrated] = useState(false);
  const [toolMotionEpoch, setToolMotionEpoch] = useState(0);
  const [inkwellReady, setInkwellReady] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(MODULE_3_SECONDS);

  const pendingCalibrateRef = useRef(false);
  const timerSecondsRef = useRef(timerSeconds);
  timerSecondsRef.current = timerSeconds;
  const sessionIdRef = useRef<string | null>(module3SessionId);
  const exerciseLiveForAbandonRef = useRef(false);
  const exerciseEndedRef = useRef(false);
  const abandonOnceRef = useRef(false);
  const finalizeOnceRef = useRef(false);
  const handleAbandonSessionRef = useRef<() => Promise<void>>(async () => {});

  const getDbRingId = useCallback((sceneRingId: string): string | null => {
    const suffix = sceneRingId.replace('ring-', '');
    const idx = Number.parseInt(suffix, 10);
    if (!Number.isFinite(idx) || idx < 1 || idx > 5) return null;
    const id = sceneRingIdToDbRingIdRef.current[`ring-${idx}`];
    return id ?? null;
  }, []);

  const getRuntime = useCallback((sceneRingId: string): RingTransferRuntime => {
    const existing = transferRuntimeBySceneRingIdRef.current[sceneRingId];
    if (existing) return existing;
    const created: RingTransferRuntime = {
      activeHandToHandTransferId: null,
      activeHandToPegTransferId: null,
      dbCompleted: false,
    };
    transferRuntimeBySceneRingIdRef.current[sceneRingId] = created;
    return created;
  }, []);

  const handleCompleteSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || finalizeOnceRef.current || exerciseEndedRef.current) return;
    finalizeOnceRef.current = true;
    exerciseEndedRef.current = true;
    setTimerActive(false);
    await invokeModule3CompleteSession(sid);
    navigate('/dashboard');
  }, [navigate]);

  const handleAbandonSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || abandonOnceRef.current || exerciseEndedRef.current) return;
    abandonOnceRef.current = true;
    exerciseEndedRef.current = true;
    setTimerActive(false);
    await invokeModule3AbandonSession(sid);
    navigate('/dashboard');
  }, [navigate]);

  const handleRingEvent = useCallback(
    (event: RingInteractionEvent) => {
      if (!timerActive || exerciseEndedRef.current) return;
      const chain = ringEventChainBySceneRingIdRef.current[event.ringId] ?? Promise.resolve();
      const next = chain
        .catch(() => {})
        .then(async () => {
        const sid = sessionIdRef.current;
        if (!sid) return;
        const runtime = getRuntime(event.ringId);
        const dbRingId = getDbRingId(event.ringId);
        if (!dbRingId) return;
        if (runtime.dbCompleted) return;

        switch (event.type) {
          case 'hand_to_hand_start': {
            const res = await startHandToHandTransfer(
              sid,
              dbRingId,
              event.fromSide as Side,
              event.toSide as Side
            );
            if (res.ok) {
              runtime.activeHandToHandTransferId = res.transferId;
              runtime.activeHandToPegTransferId = null;
            }
            break;
          }
          case 'hand_to_hand_complete': {
            const h2hId = runtime.activeHandToHandTransferId;
            if (!h2hId) break;
            const completeRes = await completeTransfer(h2hId);
            if (!completeRes.ok) break;
            const startPegRes = await startHandToPegTransfer(
              sid,
              dbRingId,
              event.toSide as Side,
              h2hId
            );
            if (startPegRes.ok) {
              runtime.activeHandToPegTransferId = startPegRes.transferId;
              runtime.activeHandToHandTransferId = null;
            }
            break;
          }
          case 'drop': {
            let transferId = runtime.activeHandToPegTransferId ?? runtime.activeHandToHandTransferId;
            if (!transferId && event.side) {
              // Fallback: ensure the drop is persisted even if event timing raced transfer-id assignment.
              const startRes = await startHandToHandTransfer(
                sid,
                dbRingId,
                event.side as Side,
                oppositeSide(event.side as Side)
              );
              if (startRes.ok) transferId = startRes.transferId;
            }
            if (transferId) await dropTransfer(transferId);
            runtime.activeHandToHandTransferId = null;
            runtime.activeHandToPegTransferId = null;
            break;
          }
          case 'hand_to_peg_complete': {
            const pegTransferId = runtime.activeHandToPegTransferId;
            if (!pegTransferId) break;
            const completeRes = await completeTransfer(pegTransferId);
            if (!completeRes.ok) break;
            const markRes = await markRingCompleted(dbRingId);
            if (!markRes.ok) break;
            runtime.activeHandToPegTransferId = null;
            runtime.activeHandToHandTransferId = null;
            runtime.dbCompleted = true;
            if (!completedDbRingIdsRef.current.has(dbRingId)) {
              completedDbRingIdsRef.current.add(dbRingId);
              const n = completedDbRingIdsRef.current.size;
              setCompletedRings(n);
              if (n >= 5) {
                await handleCompleteSession();
              }
            }
            break;
          }
          case 'hand_to_peg_start':
            break;
        }
      })
        .catch((err) => {
          console.error('handleRingEvent', event.type, event.ringId, err);
        });
      ringEventChainBySceneRingIdRef.current[event.ringId] = next;
    },
    [getDbRingId, getRuntime, handleCompleteSession, timerActive]
  );

  useEffect(() => {
    if (!module3SessionId) {
      navigate('/module/3/instructions', { replace: true });
    }
  }, [module3SessionId, navigate]);

  useEffect(() => {
    sessionIdRef.current = module3SessionId;
  }, [module3SessionId]);

  useEffect(() => {
    exerciseLiveForAbandonRef.current = devicesCalibrated && timerActive;
  }, [devicesCalibrated, timerActive]);

  useEffect(() => {
    handleAbandonSessionRef.current = handleAbandonSession;
  }, [handleAbandonSession]);

  if (module3SessionId) {
    bridgeEventsRef.current.reconnectAfterClose = false;
    bridgeEventsRef.current.onUnexpectedClose = () => {
      if (exerciseEndedRef.current) return;
      if (!exerciseLiveForAbandonRef.current) return;
      void handleAbandonSessionRef.current();
    };
  } else {
    bridgeEventsRef.current.reconnectAfterClose = true;
    bridgeEventsRef.current.onUnexpectedClose = undefined;
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      setInkwellReady(canCalibrateDevices(geomagicLatestRef.current));
    }, 120);
    return () => window.clearInterval(id);
  }, [geomagicLatestRef]);

  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) return;
    const id = window.setInterval(() => {
      setTimerSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    if (!timerActive || timerSeconds !== 0) return;
    if (exerciseEndedRef.current) return;
    void handleCompleteSession();
  }, [handleCompleteSession, timerActive, timerSeconds]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const sid = sessionIdRef.current;
      if (!sid || exerciseEndedRef.current || !exerciseLiveForAbandonRef.current) return;
      void invokeModule3AbandonSession(sid);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      if (exerciseEndedRef.current) return;
      if (!exerciseLiveForAbandonRef.current) return;
      exerciseEndedRef.current = true;
      void invokeModule3AbandonSession(sid);
    };
  }, []);

  if (!module3SessionId) {
    return null;
  }

  const timerText = `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        overflow: 'hidden',
        background: CLEAR_HEX,
      }}
    >
      {!devicesCalibrated && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 24,
            padding: 24,
            background: 'rgba(10, 12, 18, 0.72)',
            pointerEvents: 'auto',
          }}
        >
          <p
            className="text-center text-lg leading-relaxed max-w-xl"
            style={{ color: '#e2e8f0', margin: 0 }}
          >
            Ensure both styluses are in the inkwell.
          </p>
          <button
            type="button"
            disabled={!inkwellReady}
            onClick={() => {
              pendingCalibrateRef.current = true;
            }}
            className="rounded-xl font-semibold text-2xl transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 px-12 py-4"
            style={{ backgroundColor: '#1DA5FF', color: '#ffffff' }}
          >
            Calibrate Devices
          </button>
        </div>
      )}

      {DEBUG_FREE_NAV && (
        <button
          type="button"
          onClick={() => setFreeNavEnabled((v) => !v)}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 40,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.45)',
            background: 'rgba(15,23,42,0.78)',
            color: '#e2e8f0',
            fontSize: 12,
            letterSpacing: 0.2,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {freeNavEnabled ? 'Debug: Free fly' : 'Debug: Surgical camera'}
        </button>
      )}

      <div
        style={{
          position: 'fixed',
          top: 16,
          right: DEBUG_FREE_NAV ? 160 : 16,
          zIndex: 45,
          minWidth: 160,
          padding: '10px 14px',
          borderRadius: 10,
          backgroundColor: timerActive && timerSeconds <= 10 ? '#2a1a1a' : '#1E2733',
          color: timerActive && timerSeconds <= 10 ? '#fca5a5' : '#fff',
          border: timerActive && timerSeconds <= 10 ? '1px solid #ef4444' : '1px solid #374151',
          textAlign: 'center',
          fontWeight: 700,
          letterSpacing: 0.3,
          userSelect: 'none',
          animation: timerActive && timerSeconds <= 10 ? 'timerThrob 0.7s ease-in-out infinite' : undefined,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 2 }}>Time Remaining</div>
        <div style={{ fontSize: 26, lineHeight: 1.1 }}>{timerText}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
          {completedRings}/5 rings completed
        </div>
      </div>

      <style>
        {`@keyframes timerThrob {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }`}
      </style>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: [0, 0.115, 0.345], fov: CAMERA_FOV_DEFAULT, near: 0.02, far: 80 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(SCENE_CLEAR_HEX), 1);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={[SCENE_CLEAR_HEX]} />

        <ambientLight intensity={0.22} />
        <directionalLight
          castShadow
          position={[1.5, 2.0, 1.0]}
          intensity={1.6}
          color="#f3f4f6"
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-1.0, 1.0, -0.5]} intensity={0.4} color="#cfe8ff" />

        <Environment preset="studio" background={false} environmentIntensity={0.52} />

        <ContactShadows
          position={[
            pegTransferBoardCenterWorld.x,
            pegTransferBoardCenterWorld.y - 0.02,
            pegTransferBoardCenterWorld.z,
          ]}
          opacity={0.35}
          scale={12}
          blur={1.5}
          far={4}
        />

        {DEBUG_FREE_NAV && freeNavEnabled && (
          <FlyControls movementSpeed={0.6} rollSpeed={0.45} dragToLook />
        )}
        <PegTransferScene
          disableConstrainedCamera={DEBUG_FREE_NAV && freeNavEnabled}
          geomagicLatestRef={geomagicLatestRef}
          simulationEnabled={devicesCalibrated}
          pendingCalibrateRef={pendingCalibrateRef}
          onDeviceCalibrationApplied={() => {
            setDevicesCalibrated(true);
            setToolMotionEpoch((e) => e + 1);
            if (!exerciseEndedRef.current) {
              setTimerSeconds(MODULE_3_SECONDS);
              setTimerActive(true);
            }
          }}
          toolMotionEpoch={toolMotionEpoch}
          module3SessionId={module3SessionId}
          onModule3PegRingsInserted={onModule3PegRingsInserted}
          onRingInteractionEvent={handleRingEvent}
        />
      </Canvas>
    </div>
  );
}
