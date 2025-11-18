import React from 'react';
import { Link } from 'react-router-dom';

interface ModuleCardProps {
  id: number;
  title: string;
  description?: string;
  progress?: number; // 0-100
  completed?: boolean;
  locked?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  id,
  title,
  description,
  progress = 0,
  completed = false,
  locked = false,
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
        locked
          ? 'border-gray-200 opacity-50 cursor-not-allowed'
          : 'border-transparent hover:border-blue-300 hover:shadow-lg cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {completed && (
          <span className="text-green-600 font-medium">✓ Completed</span>
        )}
        {locked && (
          <span className="text-gray-400 font-medium">🔒 Locked</span>
        )}
      </div>
      {description && (
        <p className="text-gray-600 text-sm mb-4">{description}</p>
      )}
      {!locked && !completed && progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {!locked && (
        <Link
          to={`/module/${id}/instructions`}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {completed ? 'Review Module' : 'Start Module'} →
        </Link>
      )}
    </div>
  );
};

export default ModuleCard;

