import styles from './ChevronNavButtons.module.css';

/* Same chevron SVGs as Analytics pages (Module1/2/3 Analytics) - icon-only, no text */
const ArrowLeftIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type Props = {
  onPrev: () => void;
  onNext: () => void;
  ariaLabelPrev?: string;
  ariaLabelNext?: string;
};

const ChevronNavButtons = ({ onPrev, onNext, ariaLabelPrev = 'Previous', ariaLabelNext = 'Next' }: Props) => (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={onPrev}
      className={styles.navButton}
      aria-label={ariaLabelPrev}
    >
      <span className={styles.iconWrap}>
        <ArrowLeftIcon />
      </span>
    </button>
    <button
      type="button"
      onClick={onNext}
      className={styles.navButton}
      aria-label={ariaLabelNext}
    >
      <span className={styles.iconWrap}>
        <ArrowRightIcon />
      </span>
    </button>
  </div>
);

export default ChevronNavButtons;
