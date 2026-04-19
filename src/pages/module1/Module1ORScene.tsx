import type { MutableRefObject } from 'react';
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import organsImage from '../../contexts/Organs.png';
import whiteboardImage from '../../contexts/Whteboard.png';
import { applyConstrainedCameraPose, CAMERA_FOV_MAX } from '../../pegTransfer/pegTransferCameraRig';
import { pegTransferReferenceValues } from '../../pegTransfer/pegTransferReferenceValues';
import { OrRoomBody } from '../cameraControl/OrRoomBody';
import { resolveCameraControlSurgicalRig } from '../cameraControl/cameraControlWorldRig';
import {
  Module1PressureInstrument,
  MODULE1_PRESSURE_INSTRUMENT_MAX_INSERT_M,
} from './Module1PressureInstrument';

const ENDOSCOPE = pegTransferReferenceValues.lightingDefaults.endoscopePointLight;

/**
 * Module 2–style fulcrum pose, then re-aim at the pressure instrument’s advanced tip so the tool
 * stays in frame (Module 2’s default heading centers the cavity, not the right port).
 */
function StaticOrViewCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const { rig, cameraRotSeed, cameraBasisQuatWorldFixed } = resolveCameraControlSurgicalRig();
    const cameraRotRef = { x: cameraRotSeed.x, y: cameraRotSeed.y };
    const fovRef = { current: CAMERA_FOV_MAX };
    const translationOffsetSmooth = { x: 0, y: 0, z: 0 };

    camera.near = 0.08;
    camera.far = 100;

    applyConstrainedCameraPose({
      camera: camera as THREE.PerspectiveCamera,
      calibration: {
        cameraTrocarWorld: rig.cameraTrocarWorld,
        armLength: rig.cameraArmLengthM,
      },
      cameraRotRef,
      fovRef,
      seedBasisQuat: cameraBasisQuatWorldFixed,
      translationOffsetSmooth,
    });

    const towardInstrument = rig.taskCenterWorld
      .clone()
      .sub(rig.rightTrocarWorld)
      .normalize();
    const instrumentFocus = rig.rightTrocarWorld
      .clone()
      .addScaledVector(towardInstrument, MODULE1_PRESSURE_INSTRUMENT_MAX_INSERT_M * 0.82);
    camera.lookAt(instrumentFocus);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function OrEndoscopeHeadlamp() {
  const { camera } = useThree();
  const lightRef = useRef<THREE.PointLight>(null);
  const tmpForward = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    camera.getWorldDirection(tmpForward);
    light.position.copy(camera.position).addScaledVector(tmpForward, ENDOSCOPE.forwardOffsetM);
    light.updateMatrixWorld();
  });

  return (
    <pointLight
      ref={lightRef}
      intensity={ENDOSCOPE.intensity}
      distance={ENDOSCOPE.distance}
      decay={ENDOSCOPE.decay}
      color={ENDOSCOPE.colorHex}
    />
  );
}

function createSyringesTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-cy, -cx);
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(cx - 70, cy - 35, 100, 70);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.rect(cx - 78, cy - 45, 18, 90);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.rect(cx + 32, cy - 8, 45, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 62, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createGloveTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 55, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - 35, cy - 50, 12, 28, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - 18, cy - 58, 10, 22, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 62, 10, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 18, cy - 56, 10, 22, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 34, cy - 48, 12, 26, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Module 2 OR room geometry + pressure-driven right instrument (`Module1PressureInstrument`).
 */
export function Module1ORScene({
  pressurePsiRef,
}: {
  pressurePsiRef: MutableRefObject<number>;
}) {
  const organTexture = useLoader(TextureLoader, organsImage);
  const whiteboardTexture = useLoader(TextureLoader, whiteboardImage);
  const syringesTexture = useMemo(() => createSyringesTexture(), []);
  const gloveTexture = useMemo(() => createGloveTexture(), []);

  return (
    <>
      <color attach="background" args={['#1a222c']} />
      <StaticOrViewCamera />
      <OrEndoscopeHeadlamp />
      <OrRoomBody
        organTexture={organTexture}
        whiteboardTexture={whiteboardTexture}
        syringesTexture={syringesTexture}
        gloveTexture={gloveTexture}
      />
      <Module1PressureInstrument pressurePsiRef={pressurePsiRef} />
    </>
  );
}
