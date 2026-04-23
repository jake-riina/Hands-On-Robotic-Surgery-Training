import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { LatestByArmRef } from '../hooks/useGeomagicLatestRef';
import { initPegRings, type PegRingRow } from '../lib/module3PegSessionService';
import type { TouchStateMessage } from '../types/geomagicBridge';
import { canCalibrateDevices } from './pegTransferDeviceCalibration';
import {
  applyConstrainedCameraPose,
  CAMERA_FOV_DEFAULT,
  dampPegTransferCameraRotation,
  dampPegTransferCameraTranslation,
  PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS,
  updateCameraRigFromDevice,
} from './pegTransferCameraRig';
import {
  applyExplicitDeviceCalibration,
  initRcmKinematicsController,
  PEG_TRANSFER_DEFAULT_RCM_LIMITS,
  resyncNeutralTipWorldAnchors,
  seedGeometricToolRestPose,
  updateRcmKinematics,
} from './rcmKinematics';
import { createWorldFrameRef } from './toolFrameTypes';
import { PegWorldTool } from './PegWorldTool';
import { Pegboard } from './Pegboard';
import {
  createPegLayoutEntries,
  PEGBOARD_LOCAL_QUATERNION,
  pegLocalToWorld,
  worldToPegLocal,
} from './pegFieldLayout';
import { createInitialRingState, createRingHomePoseMap, type RingStateMap } from './ringState';
import { PegRings } from './PegRings';
import {
  initRingInteractionController,
  type RingInteractionEvent,
  updateRingInteractions,
} from './ringInteraction';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';
import { pegTransferBoardCenterWorld, resolvePegTransferWorldRig } from './pegTransferWorldRig';

const ENDOSCOPE = pegTransferReferenceValues.lightingDefaults.endoscopePointLight;

function EndoscopeHeadlamp() {
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

const MOUSE_JAW_DEBUG = import.meta.env.DEV;

function buildModule3PegRingInsertConfigs(ringMap: RingStateMap): { ring_index: number; target_peg_label: string }[] {
  const configs: { ring_index: number; target_peg_label: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const r = ringMap[`ring-${i}`];
    if (r) configs.push({ ring_index: i, target_peg_label: r.targetPegId });
  }
  return configs;
}

function sceneRingIdsFromPegRingRows(rings: PegRingRow[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const row of rings) {
    m[`ring-${row.ring_index}`] = row.ring_id;
  }
  return m;
}

/** One in-flight or completed insert per session (avoids duplicate rows under React StrictMode remounts). */
const module3PegRingsInitBySession = new Map<string, Promise<PegRingRow[] | null>>();

function RingInteractionDriver({
  ringStateRef,
  interactionController,
  worldFrameRef,
  toolKinematicsRef,
  pauseRef,
  onEvent,
}: {
  ringStateRef: MutableRefObject<RingStateMap>;
  interactionController: ReturnType<typeof initRingInteractionController>;
  worldFrameRef: ReturnType<typeof createWorldFrameRef>;
  toolKinematicsRef: ReturnType<typeof initRcmKinematicsController>['toolKinematicsRef'];
  pauseRef: MutableRefObject<boolean>;
  onEvent?: (event: RingInteractionEvent) => void;
}) {
  useFrame((_, delta) => {
    if (pauseRef.current) return;
    updateRingInteractions({
      ringStateRef,
      controller: interactionController,
      worldFrameRef,
      toolKinematicsRef,
      boardCenterWorld: pegTransferBoardCenterWorld,
      deltaSec: delta,
      onEvent,
    });
  });
  return null;
}

// TEMP TEST HARNESS: mouse as "jaw" to drag rings and drop/snap.
function TempMouseJawDriver({
  enabled,
  ringStateRef,
  pegLayout,
  onRingPointerDownRef,
  pauseInteractionRef,
}: {
  enabled: boolean;
  ringStateRef: MutableRefObject<RingStateMap>;
  pegLayout: ReturnType<typeof createPegLayoutEntries>;
  onRingPointerDownRef: MutableRefObject<((ringId: string, event: ThreeEvent<PointerEvent>) => void) | null>;
  pauseInteractionRef: MutableRefObject<boolean>;
}) {
  const { camera, gl } = useThree();
  const dragRef = useRef<{ ringId: string | null; dragging: boolean }>({ ringId: null, dragging: false });
  const ndcRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const boardPlaneRef = useRef(new THREE.Plane());
  const hitRef = useRef(new THREE.Vector3());
  const boardNormalRef = useRef(new THREE.Vector3(0, 0, 1));

  useEffect(() => {
    if (!enabled) return;
    const onPointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onPointerUp = () => {
      const drag = dragRef.current;
      if (!drag.dragging || !drag.ringId) return;
      const ring = ringStateRef.current[drag.ringId];
      if (ring && !ring.validComplete) {
        const local = worldToPegLocal(ring.position, pegTransferBoardCenterWorld);
        let best: { id: string; dxy: number } | null = null;
        for (const peg of pegLayout) {
          const dx = local.x - peg.localCenter.x;
          const dy = local.y - peg.localCenter.y;
          const dxy = Math.sqrt(dx * dx + dy * dy);
          if (!best || dxy < best.dxy) best = { id: peg.id, dxy };
        }
        const snapRadius = pegTransferReferenceValues.interactionDefaults.snapRadiusM;
        if (best && best.dxy <= snapRadius) {
          const peg = pegLayout.find((p) => p.id === best!.id);
          if (peg) {
            const topLocal = peg.localCenter.clone();
            topLocal.z += pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM / 2;
            const ringLocal = topLocal.clone();
            ringLocal.z -= pegTransferReferenceValues.ringDefaults.hangOffsetFromPegTopM;
            ring.position.copy(pegLocalToWorld(ringLocal, pegTransferBoardCenterWorld));
            ring.quaternion.copy(PEGBOARD_LOCAL_QUATERNION);
          }
        }
      }
      drag.dragging = false;
      drag.ringId = null;
      pauseInteractionRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled, gl, pegLayout, pauseInteractionRef, ringStateRef]);

  useEffect(() => {
    if (!enabled) {
      onRingPointerDownRef.current = null;
      return;
    }
    onRingPointerDownRef.current = (ringId, event) => {
      event.stopPropagation();
      const ring = ringStateRef.current[ringId];
      if (!ring || ring.validComplete) return;
      dragRef.current.dragging = true;
      dragRef.current.ringId = ringId;
      pauseInteractionRef.current = true;
    };
    return () => {
      onRingPointerDownRef.current = null;
    };
  }, [enabled, onRingPointerDownRef, pauseInteractionRef, ringStateRef]);

  useFrame(() => {
    if (!enabled) return;
    const drag = dragRef.current;
    if (!drag.dragging || !drag.ringId) return;
    const ring = ringStateRef.current[drag.ringId];
    if (!ring || ring.validComplete) return;

    boardNormalRef.current.set(0, 0, 1).applyQuaternion(PEGBOARD_LOCAL_QUATERNION).normalize();
    boardPlaneRef.current.setFromNormalAndCoplanarPoint(boardNormalRef.current, pegTransferBoardCenterWorld);
    raycasterRef.current.setFromCamera(ndcRef.current, camera);
    if (!raycasterRef.current.ray.intersectPlane(boardPlaneRef.current, hitRef.current)) return;

    const local = worldToPegLocal(hitRef.current, pegTransferBoardCenterWorld);
    local.z =
      pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM / 2 +
      pegTransferReferenceValues.pegboardDefaults.pegField.pegRadiusM;
    ring.position.copy(pegLocalToWorld(local, pegTransferBoardCenterWorld));
  });

  return null;
}

export function PegTransferScene({
  disableConstrainedCamera = false,
  geomagicLatestRef,
  simulationEnabled,
  pendingCalibrateRef,
  onDeviceCalibrationApplied,
  toolMotionEpoch = 0,
  module3SessionId = null,
  onModule3PegRingsInserted,
  onRingInteractionEvent,
  controlInputs,
}: {
  disableConstrainedCamera?: boolean;
  geomagicLatestRef: LatestByArmRef;
  simulationEnabled: boolean;
  pendingCalibrateRef: MutableRefObject<boolean>;
  onDeviceCalibrationApplied?: () => void;
  toolMotionEpoch?: number;
  /** When set, inserts `peg_rings` after calibration (`simulationEnabled`) once. */
  module3SessionId?: string | null;
  onModule3PegRingsInserted?: (sceneRingIdToDbRingId: Record<string, string>) => void;
  onRingInteractionEvent?: (event: RingInteractionEvent) => void;
  controlInputs?: {
    cameraModeActive: boolean;
    clutchActive: boolean;
    leftGripClosed: boolean;
    rightGripClosed: boolean;
  };
}) {
  const { camera } = useThree();
  const simulationEnabledRef = useRef(simulationEnabled);

  useEffect(() => {
    simulationEnabledRef.current = simulationEnabled;
  }, [simulationEnabled]);

  const controller = useMemo(() => initRcmKinematicsController(), []);
  const worldFrameRef = useMemo(() => createWorldFrameRef(), []);
  const pegLayout = useMemo(() => createPegLayoutEntries(), []);
  const ringStateRef = useRef(createInitialRingState(pegLayout, pegTransferBoardCenterWorld));
  const ringInteractionController = useMemo(
    () => initRingInteractionController(ringStateRef, createRingHomePoseMap(ringStateRef.current), pegLayout),
    [pegLayout]
  );
  const pauseRingInteractionRef = useRef(false);
  const tempRingPointerDownRef = useRef<((ringId: string, event: ThreeEvent<PointerEvent>) => void) | null>(null);
  const onModule3PegRingsInsertedRef = useRef(onModule3PegRingsInserted);
  onModule3PegRingsInsertedRef.current = onModule3PegRingsInserted;

  // Fixed world trocars and camera basis calibration.
  const leftTrocarWorldRef = useRef(new THREE.Vector3());
  const rightTrocarWorldRef = useRef(new THREE.Vector3());
  const cameraTrocarWorldRef = useRef(new THREE.Vector3());
  const cameraBasisQuatWorldFixedRef = useRef(new THREE.Quaternion());
  const rigCalibratedRef = useRef(false);
  const [rigVisualReady, setRigVisualReady] = useState(false);

  // Camera-mode controls (ref-only hot path): seed → device target → damped pose for apply.
  const cameraRotSeedRef = useRef({ x: 0, y: 0 });
  const cameraRotTargetRef = useRef({ x: 0, y: 0 });
  const cameraRotRef = useRef({ x: 0, y: 0 });
  const cameraTransTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const cameraTransSmoothRef = useRef({ x: 0, y: 0, z: 0 });
  const fovRef = useRef(CAMERA_FOV_DEFAULT);
  const prevPosRef = useRef({
    left: null as [number, number, number] | null,
    right: null as [number, number, number] | null,
  });
  const wasCameraModeActiveRef = useRef(false);

  // Keep the same trocar/fulcrum distance so camera starts stable.
  const armLengthRef = useRef<number>(pegTransferReferenceValues.worldRig.cameraConstrainedArmLengthM);

  useEffect(() => {
    if (rigCalibratedRef.current) return;

    camera.updateMatrixWorld(true);

    const rig = resolvePegTransferWorldRig();
    armLengthRef.current = rig.cameraArmLengthM;

    cameraTrocarWorldRef.current.copy(rig.cameraTrocarWorld);
    leftTrocarWorldRef.current.copy(rig.leftTrocarWorld);
    rightTrocarWorldRef.current.copy(rig.rightTrocarWorld);

    // Seed pitch/yaw so camera axis initially points toward the task / board center.
    const toTarget = rig.taskCenterWorld.clone().sub(cameraTrocarWorldRef.current).normalize();
    const seedQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), toTarget);
    const seedEuler = new THREE.Euler().setFromQuaternion(seedQuat, 'YXZ');

    cameraRotSeedRef.current.x = seedEuler.x;
    cameraRotSeedRef.current.y = seedEuler.y;
    cameraRotTargetRef.current.x = seedEuler.x;
    cameraRotTargetRef.current.y = seedEuler.y;
    cameraRotRef.current.x = seedEuler.x;
    cameraRotRef.current.y = seedEuler.y;

    const camWorldQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(cameraRotRef.current.x, cameraRotRef.current.y, 0, 'YXZ')
    );
    cameraBasisQuatWorldFixedRef.current.copy(camWorldQuat);

    fovRef.current = CAMERA_FOV_DEFAULT;

    // Apply once so scene initializes with intended framing before first interactive update.
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

    seedGeometricToolRestPose(
      controller,
      leftTrocarWorldRef.current,
      rightTrocarWorldRef.current,
      cameraBasisQuatWorldFixedRef.current,
      pegTransferBoardCenterWorld,
      PEG_TRANSFER_DEFAULT_RCM_LIMITS
    );

    rigCalibratedRef.current = true;
    setRigVisualReady(true);
  }, [camera, controller]);

  useEffect(() => {
    if (!module3SessionId || !simulationEnabled) return;

    const configs = buildModule3PegRingInsertConfigs(ringStateRef.current);
    let p = module3PegRingsInitBySession.get(module3SessionId);

    if (!p) {
      p = initPegRings(module3SessionId, configs).then((res) => {
        if (!res.ok) {
          console.error('initPegRings', res.error);
          module3PegRingsInitBySession.delete(module3SessionId);
          return null;
        }
        return res.rings;
      });
      module3PegRingsInitBySession.set(module3SessionId, p);
      void p.then((rings) => {
        if (rings) {
          onModule3PegRingsInsertedRef.current?.(sceneRingIdsFromPegRingRows(rings));
        }
      });
    }
  }, [module3SessionId, simulationEnabled]);

  useFrame((_, delta) => {
    if (!rigCalibratedRef.current) return;

    if (pendingCalibrateRef.current && canCalibrateDevices(geomagicLatestRef.current)) {
      const L = geomagicLatestRef.current.left!;
      const R = geomagicLatestRef.current.right!;
      applyExplicitDeviceCalibration(controller, L, R);
      resyncNeutralTipWorldAnchors(
        controller,
        leftTrocarWorldRef.current,
        rightTrocarWorldRef.current,
        cameraBasisQuatWorldFixedRef.current,
        pegTransferBoardCenterWorld,
        PEG_TRANSFER_DEFAULT_RCM_LIMITS
      );
      updateRcmKinematics({
        controller,
        leftRaw: L,
        rightRaw: R,
        leftTrocarWorld: leftTrocarWorldRef.current,
        rightTrocarWorld: rightTrocarWorldRef.current,
        cameraBasisQuatWorldFixed: cameraBasisQuatWorldFixedRef.current,
        boardCenterWorld: pegTransferBoardCenterWorld,
        useTipSpaceMapping: pegTransferReferenceValues.worldRig.useTipSpaceMapping,
        motionLimits: PEG_TRANSFER_DEFAULT_RCM_LIMITS,
      });
      pendingCalibrateRef.current = false;
      onDeviceCalibrationApplied?.();
    }

    if (!simulationEnabledRef.current) {
      if (!disableConstrainedCamera) {
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
      }
      return;
    }

    const leftRaw = geomagicLatestRef.current.left as TouchStateMessage | null;
    const rightRaw = geomagicLatestRef.current.right as TouchStateMessage | null;

    if (!leftRaw || !rightRaw || !leftRaw.position || !rightRaw.position || !leftRaw.buttons || !rightRaw.buttons) {
      return;
    }

    const cameraModeActive = controlInputs?.cameraModeActive ?? !!(leftRaw.buttons.button1 && rightRaw.buttons.button1);

    if (!disableConstrainedCamera) {
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
        cameraModeLimits: PEG_TRANSFER_DEFAULT_CAMERA_MODE_LIMITS,
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
    }

    updateRcmKinematics({
      controller,
      leftRaw,
      rightRaw,
      leftTrocarWorld: leftTrocarWorldRef.current,
      rightTrocarWorld: rightTrocarWorldRef.current,
      cameraBasisQuatWorldFixed: cameraBasisQuatWorldFixedRef.current,
      boardCenterWorld: pegTransferBoardCenterWorld,
      useTipSpaceMapping: pegTransferReferenceValues.worldRig.useTipSpaceMapping,
      motionLimits: PEG_TRANSFER_DEFAULT_RCM_LIMITS,
        controlInputs,
    });
  });

  return (
    <>
      <EndoscopeHeadlamp />
      <Pegboard centerWorld={pegTransferBoardCenterWorld} />
      {rigVisualReady && (
        <>
          <PegWorldTool
            trocarWorld={leftTrocarWorldRef.current}
            kinematicsArm={controller.toolKinematicsRef.left}
            worldFrameArm={worldFrameRef.left}
            motionEpoch={toolMotionEpoch}
          />
          <PegWorldTool
            trocarWorld={rightTrocarWorldRef.current}
            kinematicsArm={controller.toolKinematicsRef.right}
            worldFrameArm={worldFrameRef.right}
            motionEpoch={toolMotionEpoch}
          />
          <RingInteractionDriver
            ringStateRef={ringStateRef}
            interactionController={ringInteractionController}
            worldFrameRef={worldFrameRef}
            toolKinematicsRef={controller.toolKinematicsRef}
            pauseRef={pauseRingInteractionRef}
            onEvent={onRingInteractionEvent}
          />
          {MOUSE_JAW_DEBUG && (
            <TempMouseJawDriver
              enabled={MOUSE_JAW_DEBUG}
              ringStateRef={ringStateRef}
              pegLayout={pegLayout}
              onRingPointerDownRef={tempRingPointerDownRef}
              pauseInteractionRef={pauseRingInteractionRef}
            />
          )}
          <PegRings
            ringStateRef={ringStateRef}
            onRingPointerDown={(ringId, event) => tempRingPointerDownRef.current?.(ringId, event)}
          />
        </>
      )}
    </>
  );
}

