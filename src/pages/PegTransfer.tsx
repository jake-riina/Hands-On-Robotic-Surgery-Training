import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { Vector3, Vector2, Plane, Raycaster, Group, Mesh, type Camera } from 'three';
import { useFrame } from '@react-three/fiber';

const PEG_ROWS = 2;
const PEG_COLS = 4;
const TABLE_Y = 0.19;
const GRID_SPACING_X = 0.4;
const GRID_SPACING_Z = 0.4;
const LEFT_GRID_CENTER_X = -1.05;
const LEFT_GRID_CENTER_Z = 0;
const RIGHT_GRID_CENTER_X = 1.05;
const RIGHT_GRID_CENTER_Z = 0;

function makeGridPositions(options: {
  rows: number;
  cols: number;
  spacingX: number;
  spacingZ: number;
  centerX: number;
  centerZ: number;
  y: number;
}): [number, number, number][] {
  const { rows, cols, spacingX, spacingZ, centerX, centerZ, y } = options;
  const positions: [number, number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = centerX + (row - (rows - 1) / 2) * spacingX;
      const z = centerZ + (col - (cols - 1) / 2) * spacingZ;
      positions.push([x, y, z]);
    }
  }
  return positions;
}

const LEFT_PEG_POSITIONS = makeGridPositions({
  rows: PEG_ROWS,
  cols: PEG_COLS,
  spacingX: GRID_SPACING_X,
  spacingZ: GRID_SPACING_Z,
  centerX: LEFT_GRID_CENTER_X,
  centerZ: LEFT_GRID_CENTER_Z,
  y: TABLE_Y,
});

const RIGHT_PEG_POSITIONS = makeGridPositions({
  rows: PEG_ROWS,
  cols: PEG_COLS,
  spacingX: GRID_SPACING_X,
  spacingZ: GRID_SPACING_Z,
  centerX: RIGHT_GRID_CENTER_X,
  centerZ: RIGHT_GRID_CENTER_Z,
  y: TABLE_Y,
});

/** Midpoint Z per group (from actual peg positions). Used to decide upper/back vs lower/front row by z. */
const LEFT_MID_Z =
  (Math.min(...LEFT_PEG_POSITIONS.map((p) => p[2])) + Math.max(...LEFT_PEG_POSITIONS.map((p) => p[2]))) / 2;
const RIGHT_MID_Z =
  (Math.min(...RIGHT_PEG_POSITIONS.map((p) => p[2])) + Math.max(...RIGHT_PEG_POSITIONS.map((p) => p[2]))) / 2;

/**
 * Ring placement by peg z relative to group midpoint (no row indices).
 * Left: ring on "upper/back" row → peg z on the higher-z side of left midpoint.
 * Right: ring on "lower/front" row → peg z on the lower-z side of right midpoint.
 */
function getHasRing(side: 'left' | 'right', pegZ: number): boolean {
  if (side === 'left') return pegZ >= LEFT_MID_Z;
  return pegZ <= RIGHT_MID_Z;
}

/** Build initial ring positions: left pegs with z >= leftMidZ, then right pegs with z <= rightMidZ. */
function getInitialRingPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (const pos of LEFT_PEG_POSITIONS) {
    if (getHasRing('left', pos[2])) positions.push([...pos] as [number, number, number]);
  }
  for (const pos of RIGHT_PEG_POSITIONS) {
    if (getHasRing('right', pos[2])) positions.push([...pos] as [number, number, number]);
  }
  return positions;
}

const SNAP_RADIUS = 0.18;

/** All peg sockets (left + right) as snap targets so snapping works both directions. */
const ALL_SNAP_TARGETS: [number, number, number][] = [
  ...LEFT_PEG_POSITIONS.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
  ...RIGHT_PEG_POSITIONS.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
];

/**
 * Find nearest snap target within SNAP_RADIUS (world-space xz distance).
 * Direction-agnostic: same logic for left→right and right→left.
 */
function findNearestSnapTarget(
  releasePos: [number, number, number]
): { snapTo: [number, number, number]; distance: number } | null {
  const [x, , z] = releasePos;
  let bestDist = SNAP_RADIUS;
  let snapTo: [number, number, number] | null = null;
  for (const peg of ALL_SNAP_TARGETS) {
    const dx = x - peg[0];
    const dz = z - peg[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestDist) {
      bestDist = d;
      snapTo = [peg[0], peg[1], peg[2]];
    }
  }
  return snapTo ? { snapTo, distance: bestDist } : null;
}

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

const PEG_RADIUS = 0.04;
const RING_MAJOR_RADIUS = PEG_RADIUS * 2.1;  /* ~2.0–2.2× peg radius for wider ring */
const RING_TUBE_RADIUS = PEG_RADIUS * 0.4;    /* ~0.4× peg radius for bolder thickness */
const RING_Y_OFFSET = 0.002;
const RING_COLOR_DEFAULT = '#1DA5FF';
const RING_COLOR_TRANSFERRED = '#22c55e';

function PegRing({ position, transferred }: { position: [number, number, number]; transferred: boolean }) {
  const ringY = TABLE_Y + RING_Y_OFFSET;
  const color = transferred ? RING_COLOR_TRANSFERRED : RING_COLOR_DEFAULT;
  return (
    <mesh
      position={[position[0], ringY, position[2]]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[RING_MAJOR_RADIUS, RING_TUBE_RADIUS, 16, 32]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
    </mesh>
  );
}

/** Ring 0..3 origin left, 4..7 origin right (matches getInitialRingPositions order). */
function getOriginSide(ringIndex: number): 'left' | 'right' {
  return ringIndex < 4 ? 'left' : 'right';
}

/** Side of a peg position: x < 0 = left, x >= 0 = right. */
function getSideOfPosition(position: [number, number, number]): 'left' | 'right' {
  return position[0] < 0 ? 'left' : 'right';
}

const INITIAL_RING_CURRENT_SIDES: ('left' | 'right')[] = [
  'left',
  'left',
  'left',
  'left',
  'right',
  'right',
  'right',
  'right',
];

const TIMER_INITIAL_SECONDS = 60;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** All rings are "green" (transferred) when each ring's committed side !== its origin side. */
function allRingsTransferred(ringCurrentSides: ('left' | 'right')[]): boolean {
  return ringCurrentSides.length === 8 && ringCurrentSides.every((side, i) => getOriginSide(i) !== side);
}

function PegTransferScene({
  onAllRingsTransferred,
  onFirstRingPickup,
  onRingSidesChange,
}: {
  onAllRingsTransferred?: () => void;
  onFirstRingPickup?: () => void;
  onRingSidesChange?: (sides: ('left' | 'right')[]) => void;
}) {
  const [ringPositions, setRingPositions] = useState<[number, number, number][]>(getInitialRingPositions);
  const [ringCurrentSides, setRingCurrentSides] = useState<('left' | 'right')[]>(() => [...INITIAL_RING_CURRENT_SIDES]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [instrumentPosition, setInstrumentPosition] = useState<[number, number, number]>([0, TABLE_Y, 0]);
  const hasFiredFirstPickupRef = useRef(false);
  const { camera, size, gl } = useThree();

  useEffect(() => {
    if (allRingsTransferred(ringCurrentSides)) onAllRingsTransferred?.();
  }, [ringCurrentSides, onAllRingsTransferred]);

  useEffect(() => {
    onRingSidesChange?.(ringCurrentSides);
  }, [ringCurrentSides, onRingSidesChange]);

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
      setRingPositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[draggingIndex!] = [point.x, TABLE_Y, point.z];
        return next;
      });
    },
    [draggingIndex, camera]
  );

  const onPointerUp = useCallback(() => {
    if (draggingIndex === null) return;
    const ringId = draggingIndex;
    const pos = ringPositions[ringId];
    const result = findNearestSnapTarget(pos);
    const snapSuccess = result !== null;
    const destinationSide = snapSuccess ? getSideOfPosition(result.snapTo) : null;

    if (snapSuccess) {
      setRingPositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[ringId] = result!.snapTo;
        return next;
      });
      setRingCurrentSides((prev) => {
        const next = [...prev];
        next[ringId] = destinationSide!;
        return next;
      });
    }
    setDraggingIndex(null);
  }, [draggingIndex, ringPositions]);

  useEffect(() => {
    if (draggingIndex === null) return;
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const point = pointerToTablePoint({ x: ndcX, y: ndcY }, camera);
      setRingPositions((prev) => {
        const next = prev.map((p) => [...p] as [number, number, number]);
        next[draggingIndex!] = [point.x, TABLE_Y, point.z];
        return next;
      });
    };
    const onUp = () => {
      const ringId = draggingIndex!;
      setRingPositions((prev) => {
        const pos = prev[ringId];
        const result = findNearestSnapTarget(pos);
        const snapSuccess = result !== null;
        const destinationSide = snapSuccess ? getSideOfPosition(result.snapTo) : null;

        if (snapSuccess) {
          setRingCurrentSides((sides) => {
            const next = [...sides];
            next[ringId] = destinationSide!;
            return next;
          });
          const next = prev.map((p) => [...p] as [number, number, number]);
          next[ringId] = result.snapTo;
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

      {LEFT_PEG_POSITIONS.map((pos, i) => (
        <mesh key={`peg-left-${i}`} position={[pos[0], 0.29, pos[2]]}>
          <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.2, 16]} />
          <meshStandardMaterial color="#8b7355" />
        </mesh>
      ))}
      {ringPositions.map((pos, i) => (
        <group
          key={`ring-${i}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!hasFiredFirstPickupRef.current) {
              hasFiredFirstPickupRef.current = true;
              onFirstRingPickup?.();
            }
            setDraggingIndex(i);
          }}
        >
          <PegRing
            position={pos}
            transferred={getOriginSide(i) !== ringCurrentSides[i]}
          />
        </group>
      ))}

      {RIGHT_PEG_POSITIONS.map((pos, i) => (
        <mesh key={`peg-right-${i}`} position={[pos[0], 0.29, pos[2]]}>
          <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.2, 16]} />
          <meshStandardMaterial color="#8b7355" />
        </mesh>
      ))}

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

const COMPLETION_NAV_DELAY_MS = 450;
const TOTAL_RINGS = 8;
const MODULE3_PASS_THRESHOLD = 80;

/** Compute green (transferred) count from snap-committed ring sides. */
function getGreenCount(ringCurrentSides: ('left' | 'right')[]): number {
  if (ringCurrentSides.length !== TOTAL_RINGS) return 0;
  return ringCurrentSides.filter((side, i) => getOriginSide(i) !== side).length;
}

/**
 * Score when timer ends: percent of rings transferred (green).
 * greenCount / totalRings * 100, with blueCount = total - green.
 * Edge cases: all green → 100%, none green → 0%.
 */
function computeScorePercent(greenCount: number): number {
  if (greenCount >= TOTAL_RINGS) return 100;
  if (greenCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((100 * greenCount) / TOTAL_RINGS)));
}

const PegTransfer = () => {
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);
  const latestRingCurrentSidesRef = useRef<('left' | 'right')[]>([...INITIAL_RING_CURRENT_SIDES]);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_INITIAL_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [completionTriggered, setCompletionTriggered] = useState(false);
  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  const onFirstRingPickup = useCallback(() => {
    setTimerStarted(true);
  }, []);

  const onRingSidesChange = useCallback((sides: ('left' | 'right')[]) => {
    latestRingCurrentSidesRef.current = sides;
  }, []);

  const onAllRingsTransferred = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setCompletionTriggered(true);
    const scorePercent = 100;
    const path = scorePercent >= MODULE3_PASS_THRESHOLD ? '/module/3/completed' : '/module/3/incomplete';
    setTimeout(() => {
      const elapsed = TIMER_INITIAL_SECONDS - timeRemainingRef.current;
      navigate(path, {
        state: { ringsTransferred: TOTAL_RINGS, elapsedSeconds: elapsed, score: scorePercent },
      });
    }, COMPLETION_NAV_DELAY_MS);
  }, [navigate]);

  useEffect(() => {
    if (!timerStarted || timeRemaining <= 0 || completionTriggered) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerStarted, timeRemaining, completionTriggered]);

  useEffect(() => {
    if (timeRemaining !== 0 || !timerStarted || completionTriggered) return;
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setCompletionTriggered(true);
    const sides = latestRingCurrentSidesRef.current;
    const greenCount = getGreenCount(sides);
    const scorePercent = computeScorePercent(greenCount);
    const path = scorePercent >= MODULE3_PASS_THRESHOLD ? '/module/3/completed' : '/module/3/incomplete';
    setTimeout(() => {
      navigate(path, {
        state: {
          ringsTransferred: greenCount,
          elapsedSeconds: TIMER_INITIAL_SECONDS,
          score: scorePercent,
        },
      });
    }, COMPLETION_NAV_DELAY_MS);
  }, [timeRemaining, timerStarted, completionTriggered, navigate]);

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
        className="flex-1 rounded-lg overflow-hidden min-h-0 relative"
        style={{
          width: '100%',
          backgroundColor: '#1E2733',
        }}
      >
        <div
          className="absolute top-3 left-3 z-10 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold"
          style={{
            backgroundColor: '#1E2733',
            color: '#fff',
            border: '1px solid #374151',
            pointerEvents: 'none',
          }}
        >
          {formatTimer(timeRemaining)}
        </div>
        <Canvas
          camera={{ position: [0, 2, 2], fov: 50, near: CAMERA_NEAR, far: 100 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <PegTransferScene
          onAllRingsTransferred={onAllRingsTransferred}
          onFirstRingPickup={onFirstRingPickup}
          onRingSidesChange={onRingSidesChange}
        />
        </Canvas>
      </div>
    </div>
  );
};

export default PegTransfer;
