import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

function CameraControlScene() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 8, 0]} intensity={1.5} />
      <directionalLight position={[0, 6, 3]} intensity={0.8} />
      <directionalLight position={[3, 5, 2]} intensity={0.3} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#8b95a0" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Walls - all 4 same color (#b8c4d0) */}
      <mesh position={[0, 3, -4.68]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color="#b8c4d0" roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[-6.12, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color="#b8c4d0" roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[6.12, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color="#b8c4d0" roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, 3, 9]} rotation={[0, 0, 0]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color="#b8c4d0" roughness={0.9} metalness={0} side={2} />
      </mesh>

      {/* Monitor on stand (screen on wheels) - left wall */}
      <group position={[-5.94, -0.1, 1.98]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.08, 0.6, 0.4]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.35, 0.02]}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshStandardMaterial color="#2d3748" roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.5, 12]} />
          <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.04, 24]} />
          <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Wheels on base */}
        {[[0.15, 0.12], [-0.15, 0.12], [0.15, -0.12], [-0.15, -0.12]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.4, z]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* IV pole - back wall left of TV */}
      <group position={[-2.7, 0.5, -4.63]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.2, 12]} />
          <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.04, 24]} />
          <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.15, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* Mayo Stand with tools */}
      <group position={[-1.5, -0.475, -4.6]}>
        {/* Base plate - on floor */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.05, 0.35]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Casters */}
        <mesh position={[0.15, 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.15, 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.15, 0.02, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.15, 0.02, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Central pole */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.8, 12]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Top tray / table */}
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[0.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Tools on top */}
        <mesh position={[0.08, 0.86, 0.05]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.18, 0.025, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.12, 0.86, -0.02]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.14, 0.02, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.86, -0.08]}>
          <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.05, 0.86, 0.12]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.1, 0.03, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0.15, 0.86, -0.1]}>
          <cylinderGeometry args={[0.02, 0.02, 0.05, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0.86, 0.08]} rotation={[0, 0, -Math.PI / 12]}>
          <boxGeometry args={[0.12, 0.02, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* Exchange Cart - mobile with shelves, rotated 90°, right side */}
      <group position={[5.95, -0.52, 1]} rotation={[0, Math.PI / 2, 0]}>
        {/* Base plate - bottom at local -0.025 = floor */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.05, 0.5]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Casters - bottom at same level as base bottom (local -0.025) */}
        <mesh position={[0.25, 0.02, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.25, 0.02, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.25, 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.25, 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Vertical frame / posts */}
        <mesh position={[0.22, 0.5, 0]}>
          <boxGeometry args={[0.04, 1.0, 0.04]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.22, 0.5, 0]}>
          <boxGeometry args={[0.04, 1.0, 0.04]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Shelves */}
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.44]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.44]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.44]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.44]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Items on bottom shelf */}
        <mesh position={[-0.12, 0.32, 0.08]}>
          <boxGeometry args={[0.12, 0.06, 0.1]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[0.1, 0.32, -0.06]}>
          <boxGeometry args={[0.1, 0.05, 0.08]} />
          <meshStandardMaterial color="#ef4444" roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[0, 0.31, 0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Items on second shelf */}
        <mesh position={[-0.15, 0.56, 0]}>
          <boxGeometry args={[0.14, 0.05, 0.12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0.12, 0.55, 0.1]}>
          <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0} />
        </mesh>
        <mesh position={[0.08, 0.55, -0.12]}>
          <cylinderGeometry args={[0.03, 0.03, 0.07, 12]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Items on third shelf */}
        <mesh position={[0, 0.8, 0.05]}>
          <boxGeometry args={[0.2, 0.04, 0.15]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0} />
        </mesh>
        <mesh position={[-0.18, 0.79, -0.08]}>
          <boxGeometry args={[0.08, 0.06, 0.06]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0.15, 0.79, -0.1]}>
          <boxGeometry args={[0.06, 0.05, 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Items on top shelf */}
        <mesh position={[-0.1, 1.04, 0.08]}>
          <boxGeometry args={[0.1, 0.04, 0.06]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.12, 1.04, -0.05]}>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.04, -0.12]}>
          <boxGeometry args={[0.08, 0.03, 0.05]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Top lip / rail */}
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[0.52, 0.04, 0.46]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.15} />
        </mesh>
      </group>

      {/* Supply cart - right wall */}
      <group position={[5.9, -0.28, 2.52]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.35, 0.65, 0.6]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.38, 0.04, 0.62]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.4, 0.06, 0.65]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {[[0.18, 0.25], [-0.18, 0.25], [0.18, -0.25], [-0.18, -0.25]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.15, z]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Small shelf unit - left wall */}
      <group position={[-5.9, -0.075, -1.53]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.85, 0.5]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.7} metalness={0.05} />
        </mesh>
        {[0.25, 0, -0.25].map((y, i) => (
          <mesh key={i} position={[0.02, y, 0]}>
            <boxGeometry args={[0.12, 0.03, 0.48]} />
            <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
          </mesh>
        ))}
      </group>

      {/* Anesthesia machine - right wall */}
      <group position={[5.95, 0.25, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.45, 1.5, 0.85]} />
          <meshStandardMaterial color="#e0e4e8" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.02, 0.88, 0]}>
          <boxGeometry args={[0.2, 0.35, 0.75]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[-0.12, 0.88, 0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          <meshStandardMaterial color="#2d3748" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[-0.12, 0.88, -0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          <meshStandardMaterial color="#2d3748" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0.02, 0.42, 0]}>
          <boxGeometry args={[0.15, 0.04, 0.7]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {/* Anesthesia machine - left wall */}
      <group position={[-5.95, 0.25, 0]} scale={[-1, 1, 1]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.45, 1.5, 0.85]} />
          <meshStandardMaterial color="#e0e4e8" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.02, 0.88, 0]}>
          <boxGeometry args={[0.2, 0.35, 0.75]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[-0.12, 0.88, 0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          <meshStandardMaterial color="#2d3748" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[-0.12, 0.88, -0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          <meshStandardMaterial color="#2d3748" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0.02, 0.42, 0]}>
          <boxGeometry args={[0.15, 0.04, 0.7]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {/* Cabinet on wheels - back-right */}
      <group position={[4.77, 0.4, -4.46]}>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[1.1, 1.6, 0.5]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.85, 0.26]}>
          <boxGeometry args={[1.15, 0.06, 0.52]} />
          <meshStandardMaterial color="#a8b0b8" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.35, 0.26]}>
          <boxGeometry args={[1.05, 0.04, 0.48]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.2, 0.26]}>
          <boxGeometry args={[1.05, 0.04, 0.48]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.81, 0]}>
          <boxGeometry args={[1.05, 0.05, 0.52]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {[[0.4, 0.2], [-0.4, 0.2], [0.4, -0.2], [-0.4, -0.2]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.88, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Cabinet - back-left */}
      <group position={[-4.77, 0.3, -4.46]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.1, 1.6, 0.5]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.85, 0.26]}>
          <boxGeometry args={[1.15, 0.06, 0.52]} />
          <meshStandardMaterial color="#a8b0b8" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.35, 0.26]}>
          <boxGeometry args={[1.05, 0.04, 0.48]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.2, 0.26]}>
          <boxGeometry args={[1.05, 0.04, 0.48]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {/* Medical Cabinetry - big, right wall */}
      <group position={[4.2, 0.47, 8.65]} rotation={[0, Math.PI, 0]} scale={[0.88, 0.88, 0.88]}>
        {/* Main body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.7, 2.2, 0.7]} />
          <meshStandardMaterial color="#c8d0d8" roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Top counter */}
        <mesh position={[0, 1.15, 0.36]}>
          <boxGeometry args={[1.75, 0.08, 0.72]} />
          <meshStandardMaterial color="#a8b0b8" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Shelves */}
        <mesh position={[0, 0.75, 0.36]}>
          <boxGeometry args={[1.65, 0.04, 0.66]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.35, 0.36]}>
          <boxGeometry args={[1.65, 0.04, 0.66]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.05, 0.36]}>
          <boxGeometry args={[1.65, 0.04, 0.66]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.45, 0.36]}>
          <boxGeometry args={[1.65, 0.04, 0.66]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Base / toe kick */}
        <mesh position={[0, -1.05, 0]}>
          <boxGeometry args={[1.7, 0.1, 0.72]} />
          <meshStandardMaterial color="#9ca4ac" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Cabinet doors (visual) - left */}
        <mesh position={[-0.4, 0.2, 0.36]}>
          <boxGeometry args={[0.35, 0.9, 0.02]} />
          <meshStandardMaterial color="#b8c0c8" roughness={0.6} metalness={0.08} />
        </mesh>
        {/* Cabinet doors - right */}
        <mesh position={[0.4, 0.2, 0.36]}>
          <boxGeometry args={[0.35, 0.9, 0.02]} />
          <meshStandardMaterial color="#b8c0c8" roughness={0.6} metalness={0.08} />
        </mesh>
        {/* Tools on middle shelves - bigger */}
        <mesh position={[0.5, 0.77, 0.38]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.28, 0.04, 0.04]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.45, 0.77, 0.38]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.22, 0.045, 0.04]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0.2, 0.77, 0.38]}>
          <cylinderGeometry args={[0.028, 0.028, 0.14, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.2, 0.37, 0.38]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.07, 0.055]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.37, 0.38]}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0.35, 0.37, 0.38]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.2, 0.035, 0.035]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* Rolling stool */}
      <group position={[-3.83, -0.14, -4.37]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.05, 24]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
          <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.33, 0.03, 24]} />
          <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        {[[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.31, z]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Vital Signs Monitor - left wall with vitals */}
      <group position={[-5.87, 1.35, -1.35]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.85, 0.7, 0.06]} />
          <meshStandardMaterial color="#2d3748" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.28, 0.028]}>
          <boxGeometry args={[0.7, 0.04, 0.01]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.6} metalness={0.1} />
        </mesh>
        <Html position={[0, 0, 0.034]} transform scale={0.15}>
          <div
            style={{
              width: '320px',
              background: '#0a0f1a',
              color: '#22c55e',
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ marginBottom: '6px', color: '#64748b', fontSize: '10px' }}>ECG</div>
            <div style={{ height: '32px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'space-between' }}>
              <span><span style={{ color: '#64748b' }}>HR</span> 72</span>
              <span><span style={{ color: '#64748b' }}>SpO₂</span> 98%</span>
              <span><span style={{ color: '#64748b' }}>NIBP</span> 120/80</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>mmHg</div>
          </div>
        </Html>
      </group>

      {/* Anesthesia monitor - right wall */}
      <group position={[5.87, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.9, 0.65, 0.05]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.75, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* EKG Machine - floor-standing with base and stand */}
      <group position={[2.61, 0.25, -4.5]}>
        {/* Base plate on floor */}
        <mesh position={[0, -0.72, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.4]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Vertical stand from base up to body */}
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[0.22, 0.38, 0.14]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main body / housing (sits on stand) */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.82, 0.68, 0.12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Bezel around screen */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.78, 0.64, 0.04]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[0.6, 0.45]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Paper strip / channel output */}
        <mesh position={[0, -0.32, 0.03]}>
          <boxGeometry args={[0.5, 0.08, 0.06]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0} />
        </mesh>
        {/* Control strip below screen */}
        <mesh position={[0, -0.26, 0.05]}>
          <boxGeometry args={[0.65, 0.03, 0.01]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {/* Ultrasound Machine - floor-standing, against front wall */}
      <group position={[-2.52, 0.25, 8.55]} rotation={[0, Math.PI, 0]}>
        {/* Base plate on floor */}
        <mesh position={[0, -0.72, 0]}>
          <boxGeometry args={[0.55, 0.06, 0.45]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Vertical stand from base up to body */}
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[0.24, 0.38, 0.16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main body / housing */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.9, 0.72, 0.14]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Bezel around screen */}
        <mesh position={[0, 0.02, 0.04]}>
          <boxGeometry args={[0.84, 0.66, 0.04]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Screen (larger for ultrasound display) */}
        <mesh position={[0, 0.02, 0.055]}>
          <planeGeometry args={[0.68, 0.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Control panel / keyboard area below screen */}
        <mesh position={[0, -0.28, 0.05]}>
          <boxGeometry args={[0.7, 0.08, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Probe holder / cable tray */}
        <mesh position={[0.28, -0.1, 0.04]}>
          <boxGeometry args={[0.08, 0.15, 0.1]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0} />
        </mesh>
      </group>

      {/* Endoscopy Tower - floor-standing, front wall */}
      <group position={[-3.6, 0.33, 8.55]} rotation={[0, Math.PI, 0]}>
        {/* Base plate on floor */}
        <mesh position={[0, -0.8, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Vertical pole / stand (taller) */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.12, 0.7, 0.12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Lower shelf / light source / processor unit */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.45, 0.12, 0.35]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main monitor housing */}
        <mesh position={[0, 0.38, 0.02]}>
          <boxGeometry args={[0.5, 0.4, 0.1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main screen */}
        <mesh position={[0, 0.38, 0.055]}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Top secondary monitor / scope view */}
        <mesh position={[0, 0.68, 0.02]}>
          <boxGeometry args={[0.38, 0.22, 0.06]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.68, 0.045]}>
          <planeGeometry args={[0.32, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Endoscopy Tower - floor-standing, right wall */}
      <group position={[5.9, 0.33, 4.5]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Base plate on floor */}
        <mesh position={[0, -0.8, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Vertical pole / stand (taller) */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.12, 0.7, 0.12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Lower shelf / light source / processor unit */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.45, 0.12, 0.35]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main monitor housing */}
        <mesh position={[0, 0.38, 0.02]}>
          <boxGeometry args={[0.5, 0.4, 0.1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Main screen */}
        <mesh position={[0, 0.38, 0.055]}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Top secondary monitor / scope view */}
        <mesh position={[0, 0.68, 0.02]}>
          <boxGeometry args={[0.38, 0.22, 0.06]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.68, 0.045]}>
          <planeGeometry args={[0.32, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Desk / Computer - left side of room */}
      <group position={[-5.99, -0.5, 4.5]} rotation={[0, Math.PI / 2, 0]}>
        {/* Desk pedestal / legs */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.7, 1.2, 0.4]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Desk top */}
        <mesh position={[0, 1.225, 0]}>
          <boxGeometry args={[1.0, 0.05, 0.55]} />
          <meshStandardMaterial color="#6b7280" roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Monitor stand */}
        <mesh position={[0, 1.32, 0.08]}>
          <boxGeometry args={[0.12, 0.12, 0.08]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Monitor housing */}
        <mesh position={[0, 1.52, 0.1]}>
          <boxGeometry args={[0.5, 0.32, 0.06]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Monitor screen */}
        <mesh position={[0, 1.52, 0.125]}>
          <planeGeometry args={[0.42, 0.26]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Keyboard */}
        <mesh position={[0.2, 1.265, 0.2]}>
          <boxGeometry args={[0.38, 0.02, 0.14]} />
          <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Mouse */}
        <mesh position={[0.35, 1.265, 0.25]}>
          <boxGeometry args={[0.06, 0.03, 0.1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.1} />
        </mesh>
      </group>

      {/* Medical equipment cart - bigger, wheels on bottom */}
      <group position={[1.8, -0.39, 8.28]}>
        {/* Wheels at bottom (sit on floor) */}
        <mesh position={[0.32, -0.04, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.32, -0.04, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.32, -0.04, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.32, -0.04, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Base plate (above wheels) */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.85, 0.06, 0.7]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Vertical pole */}
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Lower shelf */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[0.72, 0.04, 0.58]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Upper shelf */}
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[0.65, 0.04, 0.5]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Tray on lower shelf */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.025, 0.38]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0} />
        </mesh>
        {/* Instrument / supply boxes on lower shelf */}
        <mesh position={[-0.2, 0.47, 0.12]}>
          <boxGeometry args={[0.14, 0.08, 0.12]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[0.18, 0.47, -0.1]}>
          <boxGeometry args={[0.12, 0.07, 0.14]} />
          <meshStandardMaterial color="#ef4444" roughness={0.8} metalness={0} />
        </mesh>
        {/* Equipment on upper shelf - small monitor/device */}
        <mesh position={[0, 0.86, 0.02]}>
          <boxGeometry args={[0.28, 0.16, 0.1]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.86, 0.07]}>
          <planeGeometry args={[0.22, 0.12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0} />
        </mesh>
        {/* Tools on middle shelf (tray) - bigger */}
        <group position={[0.18, 0.47, 0]}>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.22, 0.035, 0.035]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0.14, 0.035, 0]} rotation={[0, 0, -Math.PI / 8]}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 8]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[-0.14, 0.035, 0]} rotation={[0, 0, Math.PI / 8]}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 8]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
        <mesh position={[-0.18, 0.47, 0.02]} rotation={[0, 0, -Math.PI / 12]}>
          <boxGeometry args={[0.15, 0.028, 0.028]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.2, 0.47, -0.02]}>
          <cylinderGeometry args={[0.022, 0.022, 0.09, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* IV pole / hook */}
        <mesh position={[0.28, 1.02, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
          <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* TV - back wall */}
      <group position={[0, 2, -4.64]}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.2, 1.3, 0.06]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[1.9, 1.1]} />
          <meshStandardMaterial color="#2d3748" roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

const CameraControl = () => {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        backgroundColor: '#26313E',
        padding: '8px 8px 24px 8px',
        boxSizing: 'border-box',
      }}
    >
      <header
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{
          backgroundColor: '#1E2733',
          borderRadius: '6px',
          marginBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/modules')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-sm font-medium"
          style={{ color: '#ffffff' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L8 10l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Modules
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'white' }}>Camera Control</h1>
        <p className="text-sm" style={{ color: '#9CA3AF', maxWidth: '200px' }}>
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </p>
      </header>
      <div
        className="flex-1 rounded-lg overflow-hidden min-h-0 relative"
        style={{ width: '100%', backgroundColor: '#1E2733' }}
      >
        <div
          className="absolute top-3 right-3 z-10 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold"
          style={{ backgroundColor: '#1E2733', color: '#fff', border: '1px solid #374151' }}
        >
          1:00
        </div>
        <Canvas camera={{ position: [0, 2, 2.5], fov: 50 }} style={{ width: '100%', height: '100%', display: 'block' }}>
          <CameraControlScene />
        </Canvas>
      </div>
    </div>
  );
};

export default CameraControl;
