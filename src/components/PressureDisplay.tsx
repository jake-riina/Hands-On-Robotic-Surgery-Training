import React, { useState, useEffect } from 'react';

interface PressureDisplayProps {
  pressure?: number; // 0-100
  isActive?: boolean;
  label?: string;
}

const PressureDisplay: React.FC<PressureDisplayProps> = ({
  pressure = 0,
  isActive = false,
  label = 'Pressure',
}) => {
  // Mock data for demonstration
  const [mockPressure, setMockPressure] = useState(pressure);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        // Simulate pressure changes
        setMockPressure(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const displayPressure = isActive ? mockPressure : pressure;
  const normalizedPressure = Math.min(100, Math.max(0, displayPressure));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">{label}</h3>
      <div className="relative">
        {/* Pressure bar */}
        <div className="w-full bg-gray-200 rounded-full h-8 mb-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              normalizedPressure > 80
                ? 'bg-red-500'
                : normalizedPressure > 50
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${normalizedPressure}%` }}
          />
        </div>
        {/* Pressure value */}
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-800">
            {normalizedPressure.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default PressureDisplay;

