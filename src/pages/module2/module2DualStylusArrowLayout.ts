/**
 * "Move the Camera" step: two stylus grip photos with inward-pointing arrows.
 *
 * Edit `topPct`, `leftPct`, and `rotateDeg` to aim each arrow at the finger loops.
 * Positions are relative to each column (0–100%), with the tip anchored at the
 * arrow graphic’s center via translate(-50%, -50%).
 */
export const MODULE2_DUAL_STYLUS_GRIP_SRC = '/module2-instruction-stylus-grip.png';

export type DualStylusArrowSpec = {
  topPct: number;
  leftPct: number;
  rotateDeg: number;
};

export const module2DualStylusArrowLayout: {
  leftColumn: [DualStylusArrowSpec, DualStylusArrowSpec];
  rightColumn: [DualStylusArrowSpec, DualStylusArrowSpec];
} = {
  leftColumn: [
    { topPct: 40, leftPct: 20, rotateDeg: 0 },
    { topPct: 40, leftPct: 115, rotateDeg: 0 },
  ],
  rightColumn: [
    { topPct: 40, leftPct: -20, rotateDeg: 180 },
    { topPct: 40, leftPct: 90, rotateDeg: 180 },
  ],
};
