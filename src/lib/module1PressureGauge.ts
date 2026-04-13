/** Full-scale PSI for the Module 1 horizontal bar (triangle + labels use the same scale). */
export const MODULE1_GAUGE_PSI_MAX = 35;

/** Optimal band for scoring and green zone on the bar. */
export const MODULE1_TARGET_PSI_MIN = 15;
export const MODULE1_TARGET_PSI_MAX = 20;

/** Countdown length for Module 1 exercises; score uses this as total time denominator. */
export const MODULE1_EXERCISE_DURATION_SECONDS = 20;
export const MODULE1_EXERCISE_DURATION_MS =
  MODULE1_EXERCISE_DURATION_SECONDS * 1000;

/** Score = (ms in green) / (full exercise duration) × 100, clamped to [0, 100]. */
export function module1ScorePercent(timeInGreenMs: number): number {
  if (MODULE1_EXERCISE_DURATION_MS <= 0) return 0;
  const pct = (timeInGreenMs / MODULE1_EXERCISE_DURATION_MS) * 100;
  return Math.min(100, Math.max(0, pct));
}

const clamp = (psi: number) =>
  Math.max(0, Math.min(MODULE1_GAUGE_PSI_MAX, psi));

/** Horizontal position % (0–100) for the indicator; matches linear 0 … GAUGE_PSI_MAX PSI. */
export function psiToBarPercent(psi: number): number {
  return (clamp(psi) / MODULE1_GAUGE_PSI_MAX) * 100;
}

const p = (psi: number) => (clamp(psi) / MODULE1_GAUGE_PSI_MAX) * 100;

/**
 * Gradient aligned to PSI: green only where 15–20 PSI maps on a 0–35 bar,
 * so the marker and colors agree with the numeric readout.
 */
export function module1PressureBarGradient(): string {
  return [
    'linear-gradient(90deg,',
    '#ef4444 0%,',
    `#f97316 ${p(10)}%,`,
    `#22c55e ${p(MODULE1_TARGET_PSI_MIN)}%,`,
    `#22c55e ${p(MODULE1_TARGET_PSI_MAX)}%,`,
    `#f97316 ${p(25)}%,`,
    '#ef4444 100%)',
  ].join(' ');
}
