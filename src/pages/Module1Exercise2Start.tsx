import AppLayout from '../components/AppLayout';
import { useEffect, useRef, useState } from 'react';
import { useBLE } from '../contexts/BLEContext';

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

const TARGET_MIN = 15;
const TARGET_MAX = 20;
const TOTAL_DURATION_SECONDS = 20;
const PASSING_SCORE = 80;

const Module1Exercise2Start = () => {
  const { pressure } = useBLE();

  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_DURATION_SECONDS);
  const [score, setScore] = useState<number | null>(null);
  const [hasPassed, setHasPassed] = useState<boolean | null>(null);

  // Spacebar testing / cheat pressure (same pattern as Exercise 1)
  const [cheatPressure, setCheatPressure] = useState<number | null>(null);
  const effectivePressure = cheatPressure !== null ? cheatPressure : pressure;

  const cheatPressureRef = useRef<number>(0);
  const rampUpIdRef = useRef<number | null>(null);
  const rampDownIdRef = useRef<number | null>(null);
  const RAMP_DURATION_MS = 2000;
  const RAMP_INTERVAL_MS = 50;
  const CHEAT_MAX_PSI = 35;

  // Keep ref in sync with cheat pressure
  useEffect(() => {
    if (cheatPressure !== null) cheatPressureRef.current = cheatPressure;
  }, [cheatPressure]);

  // Spacebar handlers to ramp pressure up/down for testing
  useEffect(() => {
    const stopRampUp = () => {
      if (rampUpIdRef.current !== null) {
        clearInterval(rampUpIdRef.current);
        rampUpIdRef.current = null;
      }
    };

    const stopRampDown = () => {
      if (rampDownIdRef.current !== null) {
        clearInterval(rampDownIdRef.current);
        rampDownIdRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        stopRampDown();
        if (rampUpIdRef.current !== null) return;

        const startPsi = cheatPressureRef.current;
        const startTime = Date.now();

        rampUpIdRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const ratio = Math.min(elapsed / RAMP_DURATION_MS, 1);
          const psi = startPsi + ratio * (CHEAT_MAX_PSI - startPsi);
          cheatPressureRef.current = psi;
          setCheatPressure(psi);
          if (ratio >= 1) {
            stopRampUp();
          }
        }, RAMP_INTERVAL_MS);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        stopRampUp();
        if (rampDownIdRef.current !== null) return;

        const startPsi = cheatPressureRef.current;
        const startTime = Date.now();
        setCheatPressure(startPsi);

        rampDownIdRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const ratio = Math.min(elapsed / RAMP_DURATION_MS, 1);
          const psi = Math.max(0, startPsi * (1 - ratio));
          cheatPressureRef.current = psi;
          setCheatPressure(psi);
          if (ratio >= 1 || psi <= 0) {
            stopRampDown();
            setCheatPressure(null);
            cheatPressureRef.current = 0;
          }
        }, RAMP_INTERVAL_MS);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stopRampUp();
      stopRampDown();
    };
  }, []);

  const startTimeRef = useRef<number | null>(null);
  const timeOnTargetRef = useRef<number>(0);
  const lastCheckTimeRef = useRef<number | null>(null);
  const thresholdIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Start the exercise when we first see non-zero pressure
  useEffect(() => {
    if (!exerciseStarted && effectivePressure > 0) {
      setExerciseStarted(true);
      setIsExerciseActive(true);
      startTimeRef.current = Date.now();
      lastCheckTimeRef.current = Date.now();
      console.log('Exercise 2 started, initial pressure:', effectivePressure);
    }
  }, [effectivePressure, exerciseStarted]);

  // Track time spent in the target pressure range (15–20 PSI)
  useEffect(() => {
    if (!isExerciseActive || !exerciseStarted) {
      return;
    }

    thresholdIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const last = lastCheckTimeRef.current ?? now;
      const delta = now - last;

      if (effectivePressure >= TARGET_MIN && effectivePressure <= TARGET_MAX) {
        timeOnTargetRef.current += delta;
      }

      lastCheckTimeRef.current = now;
    }, 100);

    return () => {
      if (thresholdIntervalRef.current !== null) {
        clearInterval(thresholdIntervalRef.current);
        thresholdIntervalRef.current = null;
      }
    };
  }, [isExerciseActive, exerciseStarted, effectivePressure]);

  // 20-second countdown timer
  useEffect(() => {
    if (!isExerciseActive || timeRemaining <= 0) {
      return;
    }

    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExerciseActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isExerciseActive, timeRemaining]);

  // Calculate score once the exercise finishes
  useEffect(() => {
    if (!exerciseStarted || timeRemaining !== 0 || startTimeRef.current === null) {
      return;
    }

    const durationMs = Date.now() - startTimeRef.current;
    const timeOnTargetMs = timeOnTargetRef.current;

    // Score is percentage of time spent in 15–20 PSI over the whole exercise
    const rawScore = durationMs > 0 ? (timeOnTargetMs / durationMs) * 100 : 0;
    const clampedScore = Math.max(0, Math.min(100, rawScore));

    setScore(clampedScore);
    setHasPassed(clampedScore >= PASSING_SCORE);

    console.log(
      '[Exercise 2] duration(ms):',
      durationMs,
      'timeOnTarget(ms):',
      timeOnTargetMs,
      'score(%):',
      clampedScore.toFixed(1),
    );
  }, [exerciseStarted, timeRemaining]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (thresholdIntervalRef.current !== null) {
        clearInterval(thresholdIntervalRef.current);
      }
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

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

            <p className="text-center text-lg font-semibold mb-2 text-white">
              {!exerciseStarted
                ? 'Apply pressure to begin!'
                : timeRemaining > 0
                ? `${timeRemaining}s remaining`
                : 'Exercise complete'}
            </p>

            <p className="text-center text-sm mb-2" style={{ color: '#D1D5DB' }}>
              Target range: {TARGET_MIN}–{TARGET_MAX} PSI over {TOTAL_DURATION_SECONDS} seconds.
              Passing score: {PASSING_SCORE}%.
            </p>

            <p className="text-center text-sm mb-6" style={{ color: '#D1D5DB' }}>
              Current pressure:{' '}
              <span className="font-semibold">
                {effectivePressure.toFixed(1)} PSI
              </span>
            </p>

            {score !== null && (
              <p
                className="text-center text-xl font-semibold mb-6"
                style={{ color: hasPassed ? '#22c55e' : '#f97316' }}
              >
                Score: {score.toFixed(1)}% — {hasPassed ? 'Pass' : 'Try again'}
              </p>
            )}

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
