import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { RingState } from './ringState';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';

const RING_MAJOR_RADIUS_M = pegTransferReferenceValues.ringDefaults.majorRadiusM;
const RING_TUBE_RADIUS_M = pegTransferReferenceValues.ringDefaults.tubeRadiusM;

function RingMesh({
  ring,
  onRingPointerDown,
}: {
  ring: RingState;
  onRingPointerDown?: (ringId: string, event: ThreeEvent<PointerEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    m.position.copy(ring.position);
    m.quaternion.copy(ring.quaternion);
  });

  const color = ring.originSide === 'left'
    ? pegTransferReferenceValues.ringDefaults.leftOriginColorHex
    : pegTransferReferenceValues.ringDefaults.rightOriginColorHex;

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        onRingPointerDown?.(ring.id, e);
      }}
    >
      <torusGeometry args={[RING_MAJOR_RADIUS_M, RING_TUBE_RADIUS_M, 24, 64]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.12} />
    </mesh>
  );
}

export function PegRings({
  ringStateRef,
  onRingPointerDown,
}: {
  ringStateRef: MutableRefObject<Record<string, RingState>>;
  onRingPointerDown?: (ringId: string, event: ThreeEvent<PointerEvent>) => void;
}) {
  const ringList = useMemo(() => Object.values(ringStateRef.current), [ringStateRef]);
  return (
    <>
      {ringList.map((ring) => (
        <RingMesh key={ring.id} ring={ring} onRingPointerDown={onRingPointerDown} />
      ))}
    </>
  );
}

