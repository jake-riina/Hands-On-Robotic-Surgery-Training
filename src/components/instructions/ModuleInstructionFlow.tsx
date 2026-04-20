import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { InstructionFlowLabels, InstructionStep } from './instructionFlowTypes';
import { InstructionNavigation } from './InstructionNavigation';
import { InstructionStepCard } from './InstructionStepCard';
import { ProgressIndicator } from './ProgressIndicator';
import styles from './ModuleInstructionFlow.module.css';

type ModuleInstructionFlowProps = {
  steps: InstructionStep[];
  /** Merge visuals into steps by id, or pass steps that already include `visual` */
  decorateStep?: (step: InstructionStep, index: number) => InstructionStep;
  onFinalAction: () => void | Promise<void>;
  labels?: Partial<InstructionFlowLabels>;
  finalBusy?: boolean;
};

const DEFAULT_LABELS: InstructionFlowLabels = {
  back: 'Back',
  next: 'Next',
  finalCta: 'Start Module',
};

export function ModuleInstructionFlow({
  steps,
  decorateStep,
  onFinalAction,
  labels: labelOverrides,
  finalBusy = false,
}: ModuleInstructionFlowProps) {
  const [index, setIndex] = useState(0);
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const total = steps.length;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const rawStep = steps[safeIndex];
  const step = decorateStep ? decorateStep(rawStep, safeIndex) : rawStep;
  const isLast = safeIndex >= total - 1;

  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  const handleFinal = useCallback(() => {
    void onFinalAction();
  }, [onFinalAction]);

  if (total === 0) return null;

  return (
    <div className={styles.flowRoot}>
      <div className={styles.progressRow}>
        <span className={styles.progressLabel}>
          Step {safeIndex + 1} / {total}
        </span>
        <ProgressIndicator current={safeIndex} total={total} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <InstructionStepCard step={step} />
        </motion.div>
      </AnimatePresence>

      <InstructionNavigation
        showBack={safeIndex > 0}
        onBack={goBack}
        isLastStep={isLast}
        onNext={goNext}
        onFinal={handleFinal}
        labels={labels}
        finalBusy={finalBusy}
      />
    </div>
  );
}
