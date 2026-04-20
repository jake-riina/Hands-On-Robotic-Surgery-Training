import { useState, type ReactNode } from 'react';
import styles from './Module2InstructionVisuals.module.css';
import {
  MODULE2_DUAL_STYLUS_GRIP_SRC,
  module2DualStylusArrowLayout,
  type DualStylusArrowSpec,
} from './module2DualStylusArrowLayout';

/** Primary: `public/sit at console.png` (surgeon at da Vinci Xi console). Spaces encoded for URL safety. */
const MODULE2_INSTRUCTION_STEP1_CONSOLE = encodeURI('/sit at console.png');
/** Step 4: `public/orb collection.png` (sim screenshot with orb + crosshair). */
const MODULE2_ORB_COLLECTION_IMG = encodeURI('/orb collection.png');
/** Generic product art if a `public/` image is missing. */
const MODULE2_PUBLIC_IMG_FALLBACK = '/orb%20collection.png';

function WhyCameraVisual() {
  const [imgSrc, setImgSrc] = useState(MODULE2_INSTRUCTION_STEP1_CONSOLE);
  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <img
          className={styles.stageImg}
          src={imgSrc}
          alt="Surgeon at a da Vinci Xi surgical system console, viewing the operative field and controlling the robotic system"
          onError={() =>
            setImgSrc((s) => (s === MODULE2_PUBLIC_IMG_FALLBACK ? s : MODULE2_PUBLIC_IMG_FALLBACK))
          }
        />
      </div>
      <p className={styles.caption}>
        Framing the operative field is as important as moving the instruments—both depend on deliberate control.
      </p>
    </div>
  );
}

/** Step 2: text-only (no visual). */
function StylusInstrumentsVisual() {
  return null;
}

const MODULE2_CAMERA_DIAGRAM = '/module2-instruction-stylus-camera-diagram.png';

const DUAL_STYLUS_GRIP_ALT =
  'Haptic stylus grip with spring-loaded finger loops; squeeze both together to activate camera mode and steer the view';

/** Default points right (toward the center gap); `rotateDeg` aims the arrow. */
function DualStylusInwardArrow({ spec }: { spec: DualStylusArrowSpec }) {
  return (
    <svg
      className={styles.dualStylusArrow}
      style={{
        top: `${spec.topPct}%`,
        left: `${spec.leftPct}%`,
        transform: `translate(-50%, -50%) rotate(${spec.rotateDeg}deg)`,
      }}
      viewBox="0 0 40 22"
      fill="none"
      aria-hidden
    >
      <line x1="2" y1="11" x2="24" y2="11" stroke="#1da5ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 4 L36 11 L22 18 Z" fill="#1da5ff" />
    </svg>
  );
}

/** Step 3: two grip photos side by side; inward arrows (positions in `module2DualStylusArrowLayout.ts`). */
function CameraBothHandsVisual() {
  const [src, setSrc] = useState(MODULE2_DUAL_STYLUS_GRIP_SRC);
  const onImgError = () =>
    setSrc((s) => {
      if (s === MODULE2_DUAL_STYLUS_GRIP_SRC) return MODULE2_CAMERA_DIAGRAM;
      if (s === MODULE2_CAMERA_DIAGRAM) return MODULE2_PUBLIC_IMG_FALLBACK;
      return s;
    });

  const { leftColumn, rightColumn } = module2DualStylusArrowLayout;

  return (
    <div className={styles.wrap}>
      <div className={styles.dualStylusStage}>
        <div className={styles.dualStylusCol}>
          <img
            className={styles.dualStylusImg}
            src={src}
            alt={DUAL_STYLUS_GRIP_ALT}
            onError={onImgError}
          />
          {leftColumn.map((spec, i) => (
            <DualStylusInwardArrow key={`L${i}`} spec={spec} />
          ))}
        </div>
        <div className={styles.dualStylusCol}>
          <img
            className={styles.dualStylusImg}
            src={src}
            alt=""
            aria-hidden
            onError={onImgError}
          />
          {rightColumn.map((spec, i) => (
            <DualStylusInwardArrow key={`R${i}`} spec={spec} />
          ))}
        </div>
      </div>
      <p className={styles.caption}>
        Use both controllers at once to activate camera mode—then move in sync to steer what you see.
      </p>
    </div>
  );
}

/** Step 4: orb collection screenshot + headline (no “next orb” diagram). */
function OrbsVisual() {
  const [imgSrc, setImgSrc] = useState(MODULE2_ORB_COLLECTION_IMG);
  return (
    <div className={styles.wrap}>
      <div className={styles.orbsStage}>
        <p className={styles.orbsHeadline}>You have 1 minute to collect 5 orbs</p>
        <img
          className={styles.orbsStageImg}
          src={imgSrc}
          alt="Simulation view: red collection orb with crosshair and hold progress ring; camera mode badge at top"
          onError={() =>
            setImgSrc((s) => (s === MODULE2_PUBLIC_IMG_FALLBACK ? s : MODULE2_PUBLIC_IMG_FALLBACK))
          }
        />
      </div>
      <p className={styles.caption}>
        Align the crosshair on an orb and hold steady for five seconds to collect it.
      </p>
    </div>
  );
}

function ScoringVisual() {
  return (
    <div className={styles.wrap}>
      <div className={styles.formulaRow}>
        <span style={{ color: '#86efac' }}>orbs collected</span>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ color: '#e2e8f0' }}>5</span>
        <span style={{ color: '#94a3b8' }}>=</span>
        <strong style={{ color: '#38bdf8' }}>Score</strong>
      </div>
      <p className={styles.caption}>
        While not depicted in the score, efficiency matters and will be tracked.
      </p>
    </div>
  );
}

const VISUALS: Record<string, ReactNode> = {
  'why-camera': <WhyCameraVisual />,
  'stylus-instruments': <StylusInstrumentsVisual />,
  'camera-both-hands': <CameraBothHandsVisual />,
  orbs: <OrbsVisual />,
  scoring: <ScoringVisual />,
};

export function module2InstructionVisualForStepId(stepId: string): ReactNode {
  return VISUALS[stepId] ?? null;
}
