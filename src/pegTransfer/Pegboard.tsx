import { useMemo } from 'react';
import * as THREE from 'three';
import { pegTransferReferenceValues } from './pegTransferReferenceValues';
import { createPegLayoutEntries, getPegboardDimensions, PEGBOARD_LOCAL_ROTATION } from './pegFieldLayout';

const { boardWidthM: BOARD_WIDTH_M, boardHeightM: BOARD_HEIGHT_M, boardThicknessM: BOARD_THICKNESS_M } =
  getPegboardDimensions();

const PEG_RADIUS_M = pegTransferReferenceValues.pegboardDefaults.pegField.pegRadiusM;
const PEG_HEIGHT_M = pegTransferReferenceValues.pegboardDefaults.pegField.pegHeightM;
const PEG_COLOR_HEX = pegTransferReferenceValues.pegboardDefaults.pegField.pegColorHex;

function makeWoodTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  // Base wood tone.
  ctx.fillStyle = '#8e6f4c';
  ctx.fillRect(0, 0, size, size);

  // Horizontal grain streaks.
  for (let i = 0; i < 240; i += 1) {
    const y = (i / 240) * size;
    const alpha = 0.05 + Math.random() * 0.12;
    const shade = 80 + Math.floor(Math.random() * 40);
    ctx.fillStyle = `rgba(${shade}, ${shade - 10}, ${shade - 20}, ${alpha})`;
    ctx.fillRect(0, y, size, 1 + Math.random() * 2);
  }

  // Subtle knot noise.
  for (let i = 0; i < 60; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(55, 38, 24, 0.22)');
    g.addColorStop(1, 'rgba(55, 38, 24, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.6, 1.0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function Pegboard({ centerWorld }: { centerWorld: THREE.Vector3 }) {
  const woodMap = useMemo(() => makeWoodTexture(), []);
  const pegLayout = useMemo(() => createPegLayoutEntries(), []);

  return (
    <group
      position={[centerWorld.x, centerWorld.y, centerWorld.z]}
      rotation={[PEGBOARD_LOCAL_ROTATION.x, PEGBOARD_LOCAL_ROTATION.y, PEGBOARD_LOCAL_ROTATION.z]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BOARD_WIDTH_M, BOARD_HEIGHT_M, BOARD_THICKNESS_M]} />
        <meshStandardMaterial
          map={woodMap}
          roughness={0.72}
          metalness={0.02}
          color="#b48757"
          emissive="#2b1d10"
          emissiveIntensity={0.2}
        />
      </mesh>

      {pegLayout.map((p) => (
        <mesh
          key={p.id}
          position={[p.localCenter.x, p.localCenter.y, p.localCenter.z]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[PEG_RADIUS_M, PEG_RADIUS_M, PEG_HEIGHT_M, 24]} />
          <meshStandardMaterial color={PEG_COLOR_HEX} roughness={0.32} metalness={0.62} />
        </mesh>
      ))}
    </group>
  );
}

