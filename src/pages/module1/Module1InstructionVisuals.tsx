import type { CSSProperties, ReactNode } from 'react';
import { module1PressureBarGradientForBand, psiToBarPercent } from '../../lib/module1PressureGauge';
import flowStyles from '../../components/instructions/ModuleInstructionFlow.module.css';
import visStyles from './Module1InstructionVisuals.module.css';

/** Place `module1-instruction-glove.png` in `public/` (your glove photo with sensor on index finger). */
const MODULE1_INSTRUCTION_GLOVE_SRC = '/module1-instruction-glove.png';
/** In-app Module 1 screenshot (instrument + PSI gauge) for instruction step 2. */
const MODULE1_INSTRUCTION_LIVE_MODULE_SRC = '/module1-instruction-live-module.png';

const visualWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
};

const caption: CSSProperties = {
  fontSize: '0.8125rem',
  color: '#94a3b8',
  textAlign: 'center',
  maxWidth: 420,
  lineHeight: 1.5,
  margin: 0,
};

/**
 * Step 1: glove photo with blinking blue highlight (#1DA5FF) on index fingertip.
 * Overlay viewBox 0–100 ≈ percentages with preserveAspectRatio="none".
 */
function SensorVisual() {
  return (
    <div style={visualWrap}>
      <div className={visStyles.sensorStage}>
        <img
          className={visStyles.sensorImage}
          src={MODULE1_INSTRUCTION_GLOVE_SRC}
          alt="Training glove with a pressure sensor on the index fingertip"
        />
        <svg
          className={visStyles.sensorOverlay}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <circle cx="57" cy="24" r="5.2" className={visStyles.sensorPulseHalo} />
          <circle cx="57" cy="24" r="4" className={visStyles.sensorPulseDot} />
        </svg>
      </div>
      <p className={visStyles.sensorCaption}>
        Pressure on your index finger is read as PSI through the{' '}
        <strong className={visStyles.sensorCaptionBold}>glove with a pressure sensor</strong> and drives the simulation.
      </p>
    </div>
  );
}

/** Step 2: real in-module screenshot (3D instrument + bottom PSI gauge). */
function LiveModuleVisual() {
  return (
    <div style={visualWrap}>
      <div className={visStyles.liveModuleStage}>
        <img
          className={visStyles.sensorImage}
          src={MODULE1_INSTRUCTION_LIVE_MODULE_SRC}
          alt="Module 1 training view showing the robotic instrument and PSI gauge at 0.0 PSI"
        />
      </div>
      <p className={visStyles.sensorCaption}>
        Jaws and gauge update together so you always see cause and effect.
      </p>
    </div>
  );
}

/** Timeline + pulsing next zone on bar */
function IntervalsVisual() {
  const currentBand = module1PressureBarGradientForBand(5, 10);
  return (
    <div style={visualWrap}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['0–5s', '5–10s', '10–15s', '15–20s'].map((label, i) => (
          <div
            key={label}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: i === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(51,65,85,0.4)',
              border: i === 0 ? '1px solid rgba(74,222,128,0.5)' : '1px solid rgba(71,85,105,0.5)',
              color: '#e2e8f0',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {label}
            {i === 0 ? (
              <span style={{ display: 'block', fontWeight: 500, color: '#86efac', marginTop: 4 }}>Active target</span>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ ...caption, marginBottom: 10 }}>Example: current green target + pulsing preview of the next range</p>
        <div className="relative w-full" style={{ position: 'relative' }}>
          <div
            className="w-full rounded-[12px]"
            style={{
              height: 44,
              backgroundColor: '#dc2626',
              backgroundImage: currentBand,
              border: '1px solid #cbd5e1',
            }}
          />
          <div
            className={flowStyles.pulseGreen}
            style={{
              position: 'absolute',
              top: 0,
              height: '100%',
              borderRadius: 10,
              left: `${psiToBarPercent(12)}%`,
              width: `${Math.max(0.5, psiToBarPercent(17) - psiToBarPercent(12))}%`,
              background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Score formula — one horizontal line: (fraction) × 100 → Score % */
function ScoringVisual() {
  const formulaRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: '0.35em',
    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
    fontWeight: 700,
    color: '#f8fafc',
    textAlign: 'center',
    lineHeight: 1.4,
    maxWidth: '100%',
    overflowX: 'auto',
  };
  return (
    <div style={visualWrap}>
      <div style={formulaRow}>
        <span style={{ color: '#cbd5e1' }}>(</span>
        <span style={{ color: '#86efac' }}>Time in green</span>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ color: '#e2e8f0' }}>20 seconds</span>
        <span style={{ color: '#cbd5e1' }}>)</span>
        <span style={{ color: '#94a3b8' }}>*</span>
        <span style={{ color: '#e2e8f0' }}>100</span>
        <span style={{ color: '#94a3b8' }}>→</span>
        <strong style={{ color: '#38bdf8' }}>Score %</strong>
      </div>
      <p style={caption}>Staying in range longer raises your score; smooth adjustments beat chasing the bar.</p>
    </div>
  );
}

const VISUALS: Record<string, ReactNode> = {
  sensor: <SensorVisual />,
  'live-view': <LiveModuleVisual />,
  intervals: <IntervalsVisual />,
  scoring: <ScoringVisual />,
};

export function module1InstructionVisualForStepId(stepId: string): ReactNode {
  return VISUALS[stepId] ?? null;
}
