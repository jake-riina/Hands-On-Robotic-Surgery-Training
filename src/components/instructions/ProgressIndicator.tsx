import styles from './ModuleInstructionFlow.module.css';

type ProgressIndicatorProps = {
  current: number;
  total: number;
  className?: string;
};

/**
 * Dot progress for instruction steps (1-based label in parent).
 */
export function ProgressIndicator({ current, total, className }: ProgressIndicatorProps) {
  return (
    <div className={`${styles.dots} ${className ?? ''}`} role="list" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          role="listitem"
          className={i <= current ? styles.dotFilled : styles.dot}
        />
      ))}
    </div>
  );
}
