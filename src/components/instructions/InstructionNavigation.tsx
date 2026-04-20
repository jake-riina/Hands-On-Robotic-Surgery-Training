import styles from './ModuleInstructionFlow.module.css';

type InstructionNavigationProps = {
  showBack: boolean;
  onBack: () => void;
  isLastStep: boolean;
  onNext: () => void;
  onFinal: () => void;
  labels: {
    back: string;
    next: string;
    finalCta: string;
  };
  finalBusy?: boolean;
};

export function InstructionNavigation({
  showBack,
  onBack,
  isLastStep,
  onNext,
  onFinal,
  labels,
  finalBusy = false,
}: InstructionNavigationProps) {
  return (
    <div className={styles.navRow}>
      <button
        type="button"
        className={styles.navButtonSecondary}
        onClick={onBack}
        disabled={!showBack}
        aria-disabled={!showBack}
      >
        {labels.back}
      </button>
      <div className={styles.navSpacer} />
      {isLastStep ? (
        <button
          type="button"
          className={styles.navButtonCta}
          onClick={onFinal}
          disabled={finalBusy}
        >
          {finalBusy ? 'Starting…' : labels.finalCta}
        </button>
      ) : (
        <button type="button" className={styles.navButtonPrimary} onClick={onNext}>
          {labels.next}
        </button>
      )}
    </div>
  );
}
