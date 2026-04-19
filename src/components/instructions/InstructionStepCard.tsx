import type { InstructionStep } from './instructionFlowTypes';
import styles from './ModuleInstructionFlow.module.css';

type InstructionStepCardProps = {
  step: InstructionStep;
};

export function InstructionStepCard({ step }: InstructionStepCardProps) {
  return (
    <article className={styles.card} aria-labelledby={`instruction-step-${step.id}`}>
      <div className={styles.cardBody}>
        <h2 id={`instruction-step-${step.id}`} className={styles.title}>
          {step.title}
        </h2>
        <ul className={styles.paragraphList}>
          {step.paragraphs.map((block, i) => (
            <li key={i}>
              <p className={styles.paragraph}>{block}</p>
            </li>
          ))}
        </ul>
        {step.visual ? <div className={styles.visualRegion}>{step.visual}</div> : null}
        {step.keyTakeaway ? (
          <p className={styles.takeaway}>
            <span className={styles.takeawayLabel}>Key takeaway</span>
            {step.keyTakeaway}
          </p>
        ) : null}
      </div>
    </article>
  );
}
