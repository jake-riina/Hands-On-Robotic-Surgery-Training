import { useState, type ReactNode } from 'react';
import styles from './Module3InstructionVisuals.module.css';

/** `public/two hands.jpg` — spaces encoded for URL safety. */
const MODULE3_TWO_HANDS_IMG = encodeURI('/two hands.jpg');
const MODULE3_PUBLIC_IMG_FALLBACK = '/orb%20collection.png';
const MODULE3_TRANSFER_FINAL_GIF = '/transfer-final.gif';

function WhyPegTransferVisual() {
  const [src, setSrc] = useState(MODULE3_TWO_HANDS_IMG);
  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <img
          className={styles.stageImg}
          src={src}
          alt="Two hands each holding a Geomagic Touch haptic stylus for bimanual robotic training"
          onError={() => setSrc((s) => (s === MODULE3_PUBLIC_IMG_FALLBACK ? s : MODULE3_PUBLIC_IMG_FALLBACK))}
        />
      </div>
      <p className={styles.caption}>
        Bimanual drills mirror the coordination you need when exchanging tools, handing off suture, or working across the operative field.
      </p>
    </div>
  );
}

/** Top-down schematic: rings 1·3·5 start left, 2·4 start right; each moves to the opposite peg. */
function CompleteTransferDiagramVisual() {
  const rows = [0, 1, 2, 3, 4].map((i) => ({
    y: 78 + i * 22,
    /** 1-based ring index */
    ring: i + 1,
    /** Odd rings start left; even start right */
    startLeft: i % 2 === 0,
  }));

  return (
    <div className={styles.wrap}>
      <svg className={styles.diagram} viewBox="0 0 360 210" fill="none" aria-hidden>
        <rect x="8" y="8" width="344" height="194" rx="12" fill="rgba(30,39,51,0.5)" stroke="rgba(148,163,184,0.25)" />
        <text x="180" y="34" fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="middle">
          1 minute · move each ring to the opposite peg
        </text>
        <text x="72" y="58" fill="#e2e8f0" fontSize="10" fontWeight="600" textAnchor="middle">
          Left pegs
        </text>
        <text x="288" y="58" fill="#e2e8f0" fontSize="10" fontWeight="600" textAnchor="middle">
          Right pegs
        </text>
        {rows.map(({ y, ring, startLeft }) => (
          <g key={ring}>
            <rect x="44" y={y - 10} width="8" height="20" rx="2" fill="#64748b" />
            <rect x="308" y={y - 10} width="8" height="20" rx="2" fill="#64748b" />
            {startLeft ? (
              <>
                <circle cx="72" cy={y} r="10" fill="rgba(29,165,255,0.2)" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="288" cy={y} r="7" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
                <path
                  d={`M86 ${y} H248`}
                  stroke="#1da5ff"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.85"
                />
                <path d={`M236 ${y - 4}l8 4-8 4`} fill="#1da5ff" />
              </>
            ) : (
              <>
                <circle cx="72" cy={y} r="7" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="288" cy={y} r="10" fill="rgba(167,139,250,0.2)" stroke="#a78bfa" strokeWidth="2" />
                <path
                  d={`M274 ${y} H112`}
                  stroke="#1da5ff"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.85"
                />
                <path d={`M124 ${y - 4}l-8 4 8 4`} fill="#1da5ff" />
              </>
            )}
            <text x="22" y={y + 4} fill="#64748b" fontSize="8" fontWeight="600" textAnchor="start">
              {ring}
            </text>
          </g>
        ))}
      </svg>
      <p className={styles.caption}>
        Pick up, cross, hand off, then seat on the matching peg.
      </p>
    </div>
  );
}

/** Transfer handoff GIF (can be replaced with a richer animation later). */
function RingHandoffVisual() {
  const [src, setSrc] = useState(MODULE3_TRANSFER_FINAL_GIF);
  return (
    <div className={styles.wrap}>
      <div className={styles.handoffAnimHost}>
        <img
          className={styles.handoffAnimImg}
          src={src}
          alt="Peg transfer handoff sequence between both instruments"
          onError={() => setSrc((s) => (s === MODULE3_PUBLIC_IMG_FALLBACK ? s : MODULE3_PUBLIC_IMG_FALLBACK))}
        />
      </div>
    </div>
  );
}

function ScoringVisual() {
  return (
    <div className={styles.wrap}>
      <div className={styles.formulaRow}>
        <span style={{ color: '#86efac' }}>completed transfers</span>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ color: '#e2e8f0' }}>total attempted</span>
        <span style={{ color: '#94a3b8' }}>=</span>
        <strong style={{ color: '#38bdf8' }}>Score</strong>
      </div>
      <p className={styles.caption}>
        Numerator stops at 10 successful transfers; drops add attempts and widen the denominator.
      </p>
    </div>
  );
}

const VISUALS: Record<string, ReactNode> = {
  'why-peg-transfer': <WhyPegTransferVisual />,
  'complete-transfer': <CompleteTransferDiagramVisual />,
  'ring-handoff': <RingHandoffVisual />,
  scoring: <ScoringVisual />,
};

export function module3InstructionVisualForStepId(stepId: string): ReactNode {
  return VISUALS[stepId] ?? null;
}
