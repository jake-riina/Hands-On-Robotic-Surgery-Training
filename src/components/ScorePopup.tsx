import React from 'react';
import Button from './Button';

interface ScorePopupProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  maxScore: number;
  title?: string;
  onContinue?: () => void;
  onRetry?: () => void;
}

const ScorePopup: React.FC<ScorePopupProps> = ({
  isOpen,
  onClose,
  score,
  maxScore,
  title = 'Exercise Score',
  onContinue,
  onRetry,
}) => {
  if (!isOpen) return null;

  const percentage = Math.round((score / maxScore) * 100);
  const isPassing = percentage >= 70; // Assuming 70% is passing

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        
        <div className="text-center mb-6">
          <div className="text-6xl font-bold mb-2">
            <span className={isPassing ? 'text-green-600' : 'text-red-600'}>
              {score}
            </span>
            <span className="text-gray-400">/{maxScore}</span>
          </div>
          <div className="text-lg text-gray-600">
            {percentage}% {isPassing ? '✓ Passed' : '✗ Failed'}
          </div>
        </div>

        <div className="flex gap-4">
          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="flex-1"
            >
              Retry
            </Button>
          )}
          {onContinue && (
            <Button
              variant="primary"
              onClick={onContinue}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {!onContinue && !onRetry && (
            <Button
              variant="primary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScorePopup;

