import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LatestByArmRef } from '../../hooks/useGeomagicLatestRef';
import type { TouchStateMessage } from '../../types/geomagicBridge';
import {
  applyConstrainedCameraPose,
  dampPegTransferCameraRotation,
  dampPegTransferCameraTranslation,
  updateCameraRigFromDevice,
} from '../../pegTransfer/pegTransferCameraRig';
import { resolveCameraControlSurgicalRig } from './cameraControlWorldRig';
import { CAMERA_CONTROL_CAMERA_MODE_LIMITS } from './cameraControlCameraLimits';

/**
 * Peg-transfer-style constrained endoscope camera: dual-button1 camera mode, damped pan/tilt, FOV zoom.
 */
export function CameraControlRig({
  geomagicLatestRef,
  fovRef,
  onCameraModeActiveChange,
}: {
  geomagicLatestRef: LatestByArmRef;
  fovRef: MutableRefObject<number>;
  onCameraModeActiveChange?: (active: boolean) => void;
}) {
  const { camera } = useThree();
  const cameraTrocarWorldRef = useRef(new THREE.Vector3());
  const armLengthRef = useRef(0.92);
  const rigCalibratedRef = useRef(false);

  const cameraRotSeedRef = useRef({ x: 0, y: 0 });
  const cameraRotTargetRef = useRef({ x: 0, y: 0 });
  const cameraRotRef = useRef({ x: 0, y: 0 });
  const cameraTransTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const cameraTransSmoothRef = useRef({ x: 0, y: 0, z: 0 });
  const prevPosRef = useRef({
    left: null as [number, number, number] | null,
    right: null as [number, number, number] | null,
  });
  const wasCameraModeActiveRef = useRef(false);
  const cameraBasisQuatWorldFixedRef = useRef(new THREE.Quaternion());
  const prevCameraModeUiRef = useRef(false);

  useEffect(() => {
    if (rigCalibratedRef.current) return;
    camera.updateMatrixWorld(true);

    const { rig, cameraRotSeed, cameraBasisQuatWorldFixed } = resolveCameraControlSurgicalRig();
    armLengthRef.current = rig.cameraArmLengthM;
    cameraTrocarWorldRef.current.copy(rig.cameraTrocarWorld);

    cameraRotSeedRef.current.x = cameraRotSeed.x;
    cameraRotSeedRef.current.y = cameraRotSeed.y;
    cameraRotTargetRef.current.x = cameraRotSeed.x;
    cameraRotTargetRef.current.y = cameraRotSeed.y;
    cameraRotRef.current.x = cameraRotSeed.x;
    cameraRotRef.current.y = cameraRotSeed.y;

    cameraBasisQuatWorldFixedRef.current.copy(cameraBasisQuatWorldFixed);

    applyConstrainedCameraPose({
      camera: camera as THREE.PerspectiveCamera,
      calibration: {
        cameraTrocarWorld: cameraTrocarWorldRef.current,
        armLength: armLengthRef.current,
      },
      cameraRotRef: cameraRotRef.current,
      fovRef,
      seedBasisQuat: cameraBasisQuatWorldFixedRef.current,
      translationOffsetSmooth: cameraTransSmoothRef.current,
    });

    rigCalibratedRef.current = true;
  }, [camera, fovRef]);

  useFrame((_, delta) => {
    if (!rigCalibratedRef.current) return;

    const leftRaw = geomagicLatestRef.current.left as TouchStateMessage | null;
    const rightRaw = geomagicLatestRef.current.right as TouchStateMessage | null;

    const inputValid =
      !!leftRaw &&
      !!rightRaw &&
      !!leftRaw.position &&
      !!rightRaw.position &&
      !!leftRaw.buttons &&
      !!rightRaw.buttons;
    const cameraModeActive = inputValid && !!(leftRaw.buttons!.button1 && rightRaw.buttons!.button1);

    if (prevCameraModeUiRef.current !== cameraModeActive) {
      prevCameraModeUiRef.current = cameraModeActive;
      onCameraModeActiveChange?.(cameraModeActive);
    }

    if (!inputValid) {
      return;
    }

    updateCameraRigFromDevice({
      cameraModeActive,
      cameraRotTargetRef: cameraRotTargetRef.current,
      cameraRotSeedRef: cameraRotSeedRef.current,
      cameraTransTargetRef: cameraTransTargetRef.current,
      fovRef,
      prevPosRef: prevPosRef.current,
      wasCameraModeActiveRef,
      leftRaw,
      rightRaw,
      cameraModeLimits: CAMERA_CONTROL_CAMERA_MODE_LIMITS,
    });

    if (!cameraModeActive) {
      cameraRotTargetRef.current.x = cameraRotRef.current.x;
      cameraRotTargetRef.current.y = cameraRotRef.current.y;
      cameraTransTargetRef.current.x = cameraTransSmoothRef.current.x;
      cameraTransTargetRef.current.y = cameraTransSmoothRef.current.y;
      cameraTransTargetRef.current.z = cameraTransSmoothRef.current.z;
    }

    dampPegTransferCameraRotation(cameraRotRef.current, cameraRotTargetRef.current, delta);
    dampPegTransferCameraTranslation(cameraTransSmoothRef.current, cameraTransTargetRef.current, delta);
    applyConstrainedCameraPose({
      camera: camera as THREE.PerspectiveCamera,
      calibration: {
        cameraTrocarWorld: cameraTrocarWorldRef.current,
        armLength: armLengthRef.current,
      },
      cameraRotRef: cameraRotRef.current,
      fovRef,
      seedBasisQuat: cameraBasisQuatWorldFixedRef.current,
      translationOffsetSmooth: cameraTransSmoothRef.current,
    });
  });

  return null;
}
