import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, FlyControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useGeomagicLatestRef } from '../hooks/useGeomagicLatestRef';
import { PegTransferScene } from '../pegTransfer/PegTransferScene';
import { canCalibrateDevices } from '../pegTransfer/pegTransferDeviceCalibration';
import { CAMERA_FOV_DEFAULT } from '../pegTransfer/pegTransferCameraRig';
import { pegTransferBoardCenterWorld } from '../pegTransfer/pegTransferWorldRig';

/** WebGL + R3F scene background (plan Step 7) */
const SCENE_CLEAR_HEX = '#1b1d22';
const CLEAR_HEX = '#0a0c12';
/**
 * Production: always constrained surgical camera (`PegTransferScene`).
 * Dev (`npm run dev`): optional FlyControls + toggle for layout/debug only.
 */
const DEBUG_FREE_NAV = import.meta.env.DEV;

export default function PegTransfer() {
  const [freeNavEnabled, setFreeNavEnabled] = useState(false);
  const [devicesCalibrated, setDevicesCalibrated] = useState(false);
  const [toolMotionEpoch, setToolMotionEpoch] = useState(0);
  const [inkwellReady, setInkwellReady] = useState(false);

  const geomagicLatestRef = useGeomagicLatestRef();
  const pendingCalibrateRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setInkwellReady(canCalibrateDevices(geomagicLatestRef.current));
    }, 120);
    return () => window.clearInterval(id);
  }, [geomagicLatestRef]);

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
          }}
          toolMotionEpoch={toolMotionEpoch}
        />
      </Canvas>
    </div>
  );
}
