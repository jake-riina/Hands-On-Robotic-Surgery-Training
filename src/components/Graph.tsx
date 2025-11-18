import React, { useState, useEffect } from 'react';

interface GraphProps {
  data?: number[];
  width?: number;
  height?: number;
  label?: string;
  isActive?: boolean;
}

const Graph: React.FC<GraphProps> = ({
  data,
  width = 400,
  height = 200,
  label = 'Pressure Over Time',
  isActive = false,
}) => {
  const [mockData, setMockData] = useState<number[]>(
    data || Array.from({ length: 50 }, () => Math.random() * 100)
  );

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        // Simulate new data point
        setMockData((prev) => {
          const newData = [...prev.slice(1), Math.random() * 100];
          return newData;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const graphData = data || mockData;
  const maxValue = Math.max(...graphData, 100);
  const minValue = Math.min(...graphData, 0);
  const range = maxValue - minValue || 1;

  // Calculate points for SVG path
  const points = graphData.map((value, index) => {
    const x = (index / (graphData.length - 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">{label}</h3>
      <div className="flex items-center justify-center">
        <svg
          width={width}
          height={height}
          className="border border-gray-200 rounded"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              y1={height * ratio}
              x2={width}
              y2={height * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          {/* Graph line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          {/* Data points */}
          {graphData.map((value, index) => {
            const x = (index / (graphData.length - 1)) * width;
            const y = height - ((value - minValue) / range) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>Min: {minValue.toFixed(1)}</span>
        <span>Max: {maxValue.toFixed(1)}</span>
        <span>Current: {graphData[graphData.length - 1].toFixed(1)}</span>
      </div>
    </div>
  );
};

export default Graph;

