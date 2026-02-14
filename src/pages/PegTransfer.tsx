import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { Shape, Path, ExtrudeGeometry, Vector3, Vector2, Plane, Raycaster, Group, Mesh, type Camera } from 'three';
import { useFrame } from '@react-three/fiber';

const LEFT_PEG_POSITIONS: [number, number, number][] = [];
[-1.25, -0.85].forEach((x) => [0.4, 0, -0.4].forEach((z) => LEFT_PEG_POSITIONS.push([x, 0.19, z])));

const RIGHT_PEG_POSITIONS: [number, number, number][] = [];
[1.25, 0.85].forEach((x) => [0.4, 0, -0.4].forEach((z) => RIGHT_PEG_POSITIONS.push([x, 0.19, z])));

const SNAP_RADIUS = 0.18;
const TABLE_Y = 0.19;

const tablePlane = new Plane(new Vector3(0, 1, 0), 0);
tablePlane.constant = -TABLE_Y;
const raycaster = new Raycaster();
const mouseNDC = new Vector2();
const intersectTarget = new Vector3();

function pointerToTablePoint(pointer: { x: number; y: number }, camera: Camera): Vector3 {
  mouseNDC.set(pointer.x, pointer.y);
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(tablePlane, intersectTarget);
  return intersectTarget.clone();
}

/** Dark shaft like reference; tip stays silver */
const INSTRUMENT_SHAFT_COLOR = '#3d4045';
const INSTRUMENT_TIP_COLOR = '#b8c0c8';
/** Fixed instrument length; it slides in from the left as the mouse moves */
const INSTRUMENT_LENGTH = 0.9;
const CAMERA_NEAR = 0.52;
const Y_UP = new Vector3(0, 1, 0);
const tempTip = new Vector3();
const leftEdgeNDC = new Vector2(-1, 0);
const leftRaycaster = new Raycaster();
const leftPoint = new Vector3();

function Instrument({ tipPosition }: { tipPosition: [number, number, number] }) {
  const groupRef = useRef<Group>(null);
  const shaftRef = useRef<Mesh>(null);
  const jawBaseRef = useRef<Mesh>(null);
  const jawsRef = useRef<Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current || !shaftRef.current || !jawBaseRef.current || !jawsRef.current) return;
    tempTip.set(tipPosition[0], tipPosition[1], tipPosition[2]);
    leftRaycaster.setFromCamera(leftEdgeNDC, camera);
    const leftDir = leftRaycaster.ray.direction;
    const tipToCam = tempTip.clone().sub(camera.position);
    const t = tipToCam.dot(leftDir);
    leftPoint.copy(camera.position).addScaledVector(leftDir, t);
    const toHandle = leftPoint.clone().sub(tempTip);
    if (toHandle.lengthSq() < 0.0001) return;
    toHandle.normalize();

    groupRef.current.position.copy(tempTip);
    groupRef.current.quaternion.setFromUnitVectors(Y_UP, toHandle);

    shaftRef.current.scale.set(1, INSTRUMENT_LENGTH, 1);
    shaftRef.current.position.y = INSTRUMENT_LENGTH / 2;

    jawBaseRef.current.position.y = 0;
    jawsRef.current.position.y = 0;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={shaftRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.024, 1, 16]} />
        <meshStandardMaterial color={INSTRUMENT_SHAFT_COLOR} metalness={0.35} roughness={0.65} />
      </mesh>
      <mesh ref={jawBaseRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.018, 0.05, 12]} />
        <meshStandardMaterial color={INSTRUMENT_TIP_COLOR} metalness={0.6} roughness={0.35} />
      </mesh>
      <group ref={jawsRef} position={[0, 0, 0]}>
        <mesh position={[-0.028, 0, 0]}>
          <boxGeometry args={[0.028, 0.14, 0.028]} />
          <meshStandardMaterial color={INSTRUMENT_TIP_COLOR} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0.028, 0, 0]}>
          <boxGeometry args={[0.028, 0.14, 0.028]} />
          <meshStandardMaterial color={INSTRUMENT_TIP_COLOR} metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

function TriangleRing({ position }: { position: [number, number, number] }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    const r = 0.13;
    shape.moveTo(r * Math.cos(0), r * Math.sin(0));
    shape.lineTo(r * Math.cos((2 * Math.PI) / 3), r * Math.sin((2 * Math.PI) / 3));
    shape.lineTo(r * Math.cos((4 * Math.PI) / 3), r * Math.sin((4 * Math.PI) / 3));
    shape.closePath();
    const hole = new Path();
    const rh = 0.085;
    hole.moveTo(rh * Math.cos(0), rh * Math.sin(0));
    hole.lineTo(rh * Math.cos((4 * Math.PI) / 3), rh * Math.sin((4 * Math.PI) / 3));
    hole.lineTo(rh * Math.cos((2 * Math.PI) / 3), rh * Math.sin((2 * Math.PI) / 3));
    hole.closePath();
    shape.holes.push(hole);
    return new ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  }, []);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
      <meshStandardMaterial color="#1DA5FF" />
    </mesh>
  );
}

function PegTransferScene() {
  const [trianglePositions, setTrianglePositions] = useState<[number, number, number][]>(() =>
    LEFT_PEG_POSITIONS.map((p) => [...p] as [number, number, number])
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [instrumentPosition, setInstrumentPosition] = useState<[number, number, number]>([0, TABLE_Y, 0]);
  const { camera, size, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const point = pointerToTablePoint({ x: ndcX, y: ndcY }, camera);
      setInstrumentPosition([point.x, TABLE_Y, point.z]);
    };
    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, [camera, gl]);

  const onPointerMove = useCallback(
    (e: { pointer: { x: number; y: number } }) => {
      if (draggingIndex === null) return;
      const point = pointerToTablePoint(e.pointer, camera);
      setTrianglePositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[draggingIndex!] = [point.x, TABLE_Y, point.z];
        return next;
      });
    },
    [draggingIndex, camera]
  );

  const onPointerUp = useCallback(() => {
    if (draggingIndex === null) return;
    const pos = trianglePositions[draggingIndex];
    let bestDist = SNAP_RADIUS;
    let snapTo: [number, number, number] | null = null;
    for (const peg of RIGHT_PEG_POSITIONS) {
      const dx = pos[0] - peg[0];
      const dz = pos[2] - peg[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestDist) {
        bestDist = d;
        snapTo = [peg[0], peg[1], peg[2]];
      }
    }
    if (snapTo) {
      setTrianglePositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[draggingIndex] = snapTo!;
        return next;
      });
    }
    setDraggingIndex(null);
  }, [draggingIndex, trianglePositions]);

  useEffect(() => {
    if (draggingIndex === null) return;
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const point = pointerToTablePoint({ x: ndcX, y: ndcY }, camera);
      setTrianglePositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[draggingIndex!] = [point.x, TABLE_Y, point.z];
        return next;
      });
    };
    const onUp = () => {
      setTrianglePositions((prev) => {
        const pos = prev[draggingIndex!];
        let bestDist = SNAP_RADIUS;
        let snapTo: [number, number, number] | null = null;
        for (const peg of RIGHT_PEG_POSITIONS) {
          const d = Math.sqrt((pos[0] - peg[0]) ** 2 + (pos[2] - peg[2]) ** 2);
          if (d < bestDist) {
            bestDist = d;
            snapTo = [peg[0], peg[1], peg[2]];
          }
        }
        if (snapTo) {
          const next = prev.map((p) => [...p] as [number, number, number]);
          next[draggingIndex!] = snapTo;
          return next;
        }
        return prev;
      });
      setDraggingIndex(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [draggingIndex, camera, gl, size]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 8, 0]} intensity={1.5} />
      <directionalLight position={[0, 6, 3]} intensity={0.8} />
      <directionalLight position={[3, 5, 2]} intensity={0.3} />

      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.15, 32]} />
        <meshStandardMaterial color="#e8ecf0" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshStandardMaterial color="#d0d8e0" metalness={0.3} roughness={0.6} side={2} />
      </mesh>

      <mesh
        position={[0, TABLE_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial visible={false} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#8b95a0" roughness={0.8} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[3.2, 0.08, 1.6]} />
        <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[2.8, 0.2, 1.3]} />
        <meshStandardMaterial color="#a0a8b0" metalness={0.25} roughness={0.6} />
      </mesh>

      {[-1.25, -0.85].map((x, row) =>
        [0.4, 0, -0.4].map((z, col) => (
          <mesh key={`peg-left-${row}-${col}`} position={[x, 0.29, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 16]} />
            <meshStandardMaterial color="#8b7355" />
          </mesh>
        ))
      )}
      {trianglePositions.map((pos, i) => (
        <group
          key={`triangle-${i}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingIndex(i);
          }}
        >
          <TriangleRing position={pos} />
        </group>
      ))}

      {[1.25, 0.85].map((x, row) =>
        [0.4, 0, -0.4].map((z, col) => (
          <mesh key={`peg-right-${row}-${col}`} position={[x, 0.29, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 16]} />
            <meshStandardMaterial color="#8b7355" />
          </mesh>
        ))
      )}

      <Instrument tipPosition={instrumentPosition} />

      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[24, 8]} />
        <meshStandardMaterial color="#b8c4d0" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-8, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[24, 8]} />
        <meshStandardMaterial color="#a8b4c0" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[8, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[24, 8]} />
        <meshStandardMaterial color="#a8b4c0" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 4, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color="#c0ccd8" roughness={0.95} metalness={0} />
      </mesh>
    </>
  );
}

const PegTransfer = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh', backgroundColor: '#26313E', padding: '8px 8px 24px 8px', boxSizing: 'border-box' }}>
      <header
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ backgroundColor: '#1E2733', borderRadius: '6px', marginBottom: '8px' }}
      >
        <button
          type="button"
          onClick={() => navigate('/modules')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-sm font-medium"
          style={{ color: '#ffffff' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L8 10l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Modules
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'white' }}>Peg Transfer</h1>
        <div style={{ width: '100px' }} />
      </header>
      <div
        className="flex-1 rounded-lg overflow-hidden min-h-0"
        style={{
          width: '100%',
          backgroundColor: '#1E2733',
        }}
      >
        <Canvas
          camera={{ position: [0, 2, 2], fov: 50, near: CAMERA_NEAR, far: 100 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <PegTransferScene />
        </Canvas>
      </div>
    </div>
  );
};

export default PegTransfer;
