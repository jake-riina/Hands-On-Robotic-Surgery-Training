import { createPortal } from 'react-dom';
import dashboardStyles from '../pages/AdminDashboard.module.css';

const traineePrimaryBtnClass = `${dashboardStyles.traineeDashboardButtonChrome} ${dashboardStyles.traineeDashboardFlatPrimary}`;

const RING_R = 54;
const RING_STROKE = 11;
const VIEW = 120;
const CX = VIEW / 2;
const CY = VIEW / 2;
const CIRC = 2 * Math.PI * RING_R;

/** Horizontal space between the two footer buttons (pixels). */
const MODAL_ACTION_BUTTON_GAP_PX = 32;

export type ModuleScoreCompletionModalProps = {
  open: boolean;
  /** Raw score 0–100 */
  score: number;
  /** e.g. "Module 2: Camera Control" */
  moduleSubtitle: string;
  onGoHome: () => void;
  onGoModules: () => void;
};

/**
 * Trainee end-of-module overlay: radial score, pass/fail at 80%, dashboard CTAs.
 */
export function ModuleScoreCompletionModal({
  open,
  score,
  moduleSubtitle,
  onGoHome,
  onGoModules,
}: ModuleScoreCompletionModalProps) {
  if (!open || typeof document === 'undefined') return null;

  const pct = Math.min(100, Math.max(0, Math.round(Number.isFinite(score) ? score : 0)));
  const passed = pct >= 80;
  const headline = passed ? 'Congratulations' : 'Try Again';
  const arcLen = (pct / 100) * CIRC;

  const donutPx = 260;

  const modal = (
    <div
      className="flex items-center justify-center p-6"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        minHeight: '100dvh',
        margin: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(15, 20, 28, 0.78)',
        boxSizing: 'border-box',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainee-module-score-modal-title"
    >
      <div
        className="w-full max-w-[520px] flex flex-col items-center text-center"
        style={{
          backgroundColor: '#1E2733',
          borderRadius: 14,
          padding: '40px 36px 36px',
          border: '1px solid rgba(55, 65, 81, 0.9)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
        }}
      >
        <h2
          id="trainee-module-score-modal-title"
          className="m-0 text-[28px] font-semibold leading-tight tracking-tight"
          style={{ color: '#ffffff' }}
        >
          {headline}
        </h2>
        <p className="m-0 mt-3 text-base" style={{ color: '#9CA3AF' }}>
          {moduleSubtitle}
        </p>

        <div
          className="relative mt-8 flex items-center justify-center"
          style={{ width: donutPx, height: donutPx }}
        >
          <svg
            width={donutPx}
            height={donutPx}
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            aria-hidden
            style={{ display: 'block' }}
          >
            <g transform={`rotate(-90 ${CX} ${CY})`}>
              <circle
                cx={CX}
                cy={CY}
                r={RING_R}
                fill="none"
                stroke="#2a3544"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={CX}
                cy={CY}
                r={RING_R}
                fill="none"
                stroke="#0096D6"
                strokeWidth={RING_STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${arcLen} ${CIRC}`}
              />
            </g>
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
            style={{
              color: '#ffffff',
              pointerEvents: 'none',
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            }}
          >
            {pct}%
          </span>
        </div>

        <div
          className="mt-14 flex w-[88%] max-w-full flex-row items-stretch self-center"
          style={{ gap: `${MODAL_ACTION_BUTTON_GAP_PX}px` }}
        >
          <button
            type="button"
            className={`min-w-0 flex-1 basis-0 ${traineePrimaryBtnClass}`}
            style={{ fontSize: 15, padding: '10px 18px' }}
            onClick={onGoHome}
          >
            Go to Home
          </button>
          <button
            type="button"
            className={`min-w-0 flex-1 basis-0 ${traineePrimaryBtnClass}`}
            style={{ fontSize: 15, padding: '10px 18px' }}
            onClick={onGoModules}
          >
            Go to Modules
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
