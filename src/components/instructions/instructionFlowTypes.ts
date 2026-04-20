import type { ReactNode } from 'react';

/**
 * Shared shape for paginated module onboarding. Keep copy in config arrays;
 * attach visuals via `visual` or `visualVariant` + `renderVisual` in the flow.
 */
export type InstructionStep = {
  id: string;
  title: string;
  /** Each block is one paragraph; use strings or JSX (e.g. inline <strong>). */
  paragraphs: ReactNode[];
  /** Short highlighted summary at the bottom of the card */
  keyTakeaway?: string;
  /** Optional pre-built illustration (e.g. from a module-specific file) */
  visual?: ReactNode;
};

export type InstructionFlowLabels = {
  back: string;
  next: string;
  finalCta: string;
};
