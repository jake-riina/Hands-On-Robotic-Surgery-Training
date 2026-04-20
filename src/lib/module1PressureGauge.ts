/** Full-scale PSI for the Module 1 horizontal bar (triangle + labels use the same scale). */
export const MODULE1_GAUGE_PSI_MAX = 35;

/** Default / final-segment band; used for static previews and `module1PressureBarGradient()`. */
export const MODULE1_TARGET_PSI_MIN = 15;
export const MODULE1_TARGET_PSI_MAX = 20;

/** Each leg of the variable target schedule (ms). Full exercise = 4 × this value. */
export const MODULE1_TARGET_SEGMENT_DURATION_MS = 5000;

/** Last N ms of each segment: show a low-contrast preview of the *next* green band on the bar. */
export const MODULE1_NEXT_BAND_PREVIEW_MS = 2000;

/**
 * Target PSI band per 5s slice of the 20s exercise. Scoring uses total ms in the
 * active band ÷ full exercise duration (same formula as before).
 */
export const MODULE1_TARGET_SCHEDULE: ReadonlyArray<{ min: number; max: number }> = [
  { min: 5, max: 10 },
  { min: 12, max: 17 },
  { min: 3, max: 8 },
  { min: 15, max: 20 },
];

/** Elapsed time since exercise start → active target band for that moment. */
export function module1TargetBandAtElapsedMs(elapsedMs: number): { min: number; max: number } {
  const idx = Math.min(
    MODULE1_TARGET_SCHEDULE.length - 1,
    Math.max(0, Math.floor(elapsedMs / MODULE1_TARGET_SEGMENT_DURATION_MS)),
  );
  return MODULE1_TARGET_SCHEDULE[idx];
}

/** Milliseconds remaining until the current 5s segment rolls over (0 at an exact boundary). */
export function module1MsUntilSegmentBoundary(elapsedMs: number): number {
  const seg = MODULE1_TARGET_SEGMENT_DURATION_MS;
  const into = elapsedMs % seg;
  return seg - into;
}

/** Target band for the segment *after* the one containing `elapsedMs`, or `null` on the final segment. */
export function module1NextTargetBandAfterCurrentSegment(
  elapsedMs: number,
): { min: number; max: number } | null {
  const idx = Math.min(
    MODULE1_TARGET_SCHEDULE.length - 1,
    Math.max(0, Math.floor(elapsedMs / MODULE1_TARGET_SEGMENT_DURATION_MS)),
  );
  if (idx >= MODULE1_TARGET_SCHEDULE.length - 1) return null;
  return MODULE1_TARGET_SCHEDULE[idx + 1]!;
}

/** Whether to show the upcoming green-zone hint on the gauge (last 2s of each non-final segment). */
export function module1ShouldPreviewNextBand(elapsedMs: number): boolean {
  if (elapsedMs < 0) return false;
  if (module1NextTargetBandAfterCurrentSegment(elapsedMs) == null) return false;
  const msLeft = module1MsUntilSegmentBoundary(elapsedMs);
  return msLeft > 0 && msLeft <= MODULE1_NEXT_BAND_PREVIEW_MS;
}

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
 * Gradient aligned to PSI: green between targetMin…targetMax on a 0–35 bar.
 */
export function module1PressureBarGradientForBand(targetMin: number, targetMax: number): string {
  const lo = Math.min(targetMin, targetMax);
  const hi = Math.max(targetMin, targetMax);
  const orangeLow = Math.max(0, lo - 5);
  const orangeHigh = Math.min(MODULE1_GAUGE_PSI_MAX, hi + 5);
  return [
    'linear-gradient(90deg,',
    '#ef4444 0%,',
    `#f97316 ${p(orangeLow)}%,`,
    `#22c55e ${p(lo)}%,`,
    `#22c55e ${p(hi)}%,`,
    `#f97316 ${p(orangeHigh)}%,`,
    '#ef4444 100%)',
  ].join(' ');
}

/** Static gradient for pages that show a fixed 15–20 PSI band. */
export function module1PressureBarGradient(): string {
  return module1PressureBarGradientForBand(MODULE1_TARGET_PSI_MIN, MODULE1_TARGET_PSI_MAX);
}
