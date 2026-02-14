import AppLayout from '../components/AppLayout';

const ForceSensorGraph = () => {
  const width = 400;
  const height = 250;
  const chartPadding = 50;
  const data = [0, 2, 10, 8, 24, 12, 20, 5, 0, 2];
  const threshold = 20;
  const maxValue = 50;
  
  // Calculate points for the blue line
  const points = data
    .map((value, index) => {
      const x = chartPadding + (index / (data.length - 1)) * (width - chartPadding * 2);
      const y = height - chartPadding - (value / maxValue) * (height - chartPadding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const timeLabels = ['14', '16', '18', '20', '22'];
  const yAxisLabels = ['0', '10', '20', '30', '40', '50'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="relative mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Force Sensor Data</h3>
        {/* Legend positioned at top-right inside the white card */}
        <div className="absolute top-0 right-0 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500" />
            Force Sensor
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500" />
            Threshold (20 PSI)
          </span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid lines */}
          {yAxisLabels.slice(1).map((_, index) => {
            const y = chartPadding + (index / (yAxisLabels.length - 2)) * (height - chartPadding * 2);
            return (
              <line
                key={`grid-${index}`}
                x1={chartPadding}
                y1={height - y}
                x2={width - chartPadding}
                y2={height - y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* X-axis */}
          <line
            x1={chartPadding}
            y1={height - chartPadding}
            x2={width - chartPadding}
            y2={height - chartPadding}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Y-axis */}
          <line
            x1={chartPadding}
            y1={chartPadding}
            x2={chartPadding}
            y2={height - chartPadding}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Threshold line (red dashed) */}
          <line
            x1={chartPadding}
            y1={height - chartPadding - (threshold / maxValue) * (height - chartPadding * 2)}
            x2={width - chartPadding}
            y2={height - chartPadding - (threshold / maxValue) * (height - chartPadding * 2)}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="6 6"
          />

          {/* Force Sensor line (blue) */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />

          {/* Data points */}
          {data.map((value, index) => {
            const x = chartPadding + (index / (data.length - 1)) * (width - chartPadding * 2);
            const y = height - chartPadding - (value / maxValue) * (height - chartPadding * 2);
            return <circle key={index} cx={x} cy={y} r="3" fill="#3b82f6" />;
          })}

          {/* Y-axis label (left) */}
          <text
            x="15"
            y={height / 2}
            fill="#6b7280"
            fontSize="12"
            transform={`rotate(-90 15 ${height / 2})`}
            textAnchor="middle"
          >
            Force (PSI)
          </text>

          {/* Y-axis label (right) */}
          <text
            x={width - 15}
            y={height / 2}
            fill="#6b7280"
            fontSize="12"
            transform={`rotate(-90 ${width - 15} ${height / 2})`}
            textAnchor="middle"
          >
            Analog Reading
          </text>

          {/* Y-axis values */}
          {yAxisLabels.map((label, index) => {
            const y = height - chartPadding - (index / (yAxisLabels.length - 1)) * (height - chartPadding * 2);
            return (
              <text
                key={label}
                x={chartPadding - 10}
                y={y + 4}
                fill="#6b7280"
                fontSize="10"
                textAnchor="end"
              >
                {label}
              </text>
            );
          })}

          {/* X-axis label */}
          <text
            x={width / 2}
            y={height - 10}
            fill="#6b7280"
            fontSize="12"
            textAnchor="middle"
          >
            Time (s)
          </text>

          {/* X-axis values */}
          {timeLabels.map((label, index) => {
            const x = chartPadding + (index / (timeLabels.length - 1)) * (width - chartPadding * 2);
            return (
              <text
                key={label}
                x={x}
                y={height - chartPadding + 20}
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const Module1Exercise2Start = () => {
  return (
    <AppLayout>
      {/* Main content area */}
      <div
        className="py-10 pr-12"
        style={{ color: 'white', paddingLeft: '40px' }}
      >
        {/* Two-column layout: LEFT = text + graph, RIGHT = image */}
        <div className="grid grid-cols-2 gap-10 items-center">
          
          {/* LEFT COLUMN: title + text + graph */}
          <section className="flex flex-col ml-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-white">
              Exercise 2: Follow the Graph
            </h1>

            <div className="text-lg leading-relaxed mb-8 space-y-2 text-white">
              <p>Apply pressure to the control handles and watch the graph respond.</p>
              <p>Follow the red line!</p>
            </div>

            <p className="text-center text-lg font-semibold mb-8 text-white">
              Apply Pressure To Begin!
            </p>

            <div className="flex justify-center">
              <ForceSensorGraph />
            </div>
          </section>

          {/* RIGHT COLUMN: grasper image fills right half */}
          <section className="flex items-center justify-center h-full">
            <img
              src="/grasper.png"
              alt="Robotic surgical grasper"
              className="w-full h-full max-h-[600px] object-contain"
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Module1Exercise2Start;
