import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBLE } from '../contexts/BLEContext';
import {
  MODULE1_EXERCISE_DURATION_SECONDS,
  MODULE1_GAUGE_PSI_MAX,
  module1NextTargetBandAfterCurrentSegment,
  module1PressureBarGradientForBand,
  module1ScorePercent,
  module1ShouldPreviewNextBand,
  module1TargetBandAtElapsedMs,
  psiToBarPercent,
} from '../lib/module1PressureGauge';
import {
  insertPressureTelemetryBatch,
  invokeModule1CompleteSession,
  type Module1PressureTelemetrySample,
} from '../lib/module1PressureSessionService';
import { Module1ORScene } from './module1/Module1ORScene';

/**
 * Standalone Module 1 experience: Module 2 OR scene (static camera) + pressure gauge,
 * 20s countdown, and upcoming target-band preview. Wire into your router when ready.
 */
const ThreeDModule1 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = (location.state as { sessionId?: string } | null)?.sessionId;
  const { isConnected: bleConnected, pressure: blePressure } = useBLE();

  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(MODULE1_EXERCISE_DURATION_SECONDS);
  const [score, setScore] = useState<number | null>(null);
  const [, setUiTick] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const timeOnThresholdRef = useRef(0);
  const lastCheckTimeRef = useRef<number | null>(null);
  const exerciseStartedRef = useRef(false);
  const completeOnceRef = useRef(false);
  const navigatedToResultsRef = useRef(false);
  const pressureRef = useRef(blePressure);
  const readingsBufferRef = useRef<Module1PressureTelemetrySample[]>([]);
  const saveIntervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | undefined>(sessionId);

  const saveReadingsToSupabase = async (readings: Module1PressureTelemetrySample[]) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || readings.length === 0) {
      console.warn(
        'Cannot save readings - sessionId:',
        currentSessionId,
        'readings count:',
        readings.length,
      );
      return;
    }
    try {
      console.log(
        `Attempting to save ${readings.length} readings to Supabase for session:`,
        currentSessionId,
      );
      await insertPressureTelemetryBatch(currentSessionId, readings);
      console.log(`Saved ${readings.length} pressure telemetry rows to Supabase.`);
    } catch (err) {
      console.error('Exception saving readings:', err);
    }
  };

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Periodic flush of telemetry buffer (same as legacy Module1Exercise1Start)
  useEffect(() => {
    if (sessionId) {
      saveIntervalRef.current = window.setInterval(() => {
        if (readingsBufferRef.current.length > 0) {
          const readingsToSave = [...readingsBufferRef.current];
          readingsBufferRef.current = [];
          void saveReadingsToSupabase(readingsToSave);
        }
      }, 1000);
    }
    return () => {
      if (saveIntervalRef.current != null) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [sessionId]);

  // Buffer BLE pressure samples; flush every 10 rows (legacy behavior)
  useEffect(() => {
    if (bleConnected && blePressure > 0 && sessionIdRef.current) {
      const recorded_at = new Date().toISOString();
      readingsBufferRef.current.push({
        recorded_at,
        psi_value: blePressure,
      });
      if (readingsBufferRef.current.length >= 10) {
        const readingsToSave = [...readingsBufferRef.current];
        readingsBufferRef.current = [];
        console.log('Saving batch of', readingsToSave.length, 'readings to Supabase');
        void saveReadingsToSupabase(readingsToSave);
      }
    }
  }, [blePressure, bleConnected]);

  useEffect(() => {
    pressureRef.current = blePressure;
  }, [blePressure]);

  useEffect(() => {
    exerciseStartedRef.current = exerciseStarted;
  }, [exerciseStarted]);

  /** Simulated pressure when BLE is off: hold Space to ramp toward max PSI, release to decay. */
  const [demoPressure, setDemoPressure] = useState(0);
  const spaceHeldRef = useRef(false);
  const effectivePressure = bleConnected ? blePressure : demoPressure;

  useEffect(() => {
    pressureRef.current = effectivePressure;
  }, [effectivePressure]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;
      e.preventDefault();
      spaceHeldRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (bleConnected) return;
    const id = window.setInterval(() => {
      setDemoPressure((prev) => {
        const target = spaceHeldRef.current ? MODULE1_GAUGE_PSI_MAX : 0;
        const alpha = 0.22;
        const next = prev + (target - prev) * alpha;
        return Math.abs(next - target) < 0.08 ? target : next;
      });
    }, 32);
    return () => clearInterval(id);
  }, [bleConnected]);

  // Start when first positive pressure (BLE or Space-simulated)
  useEffect(() => {
    if (exerciseStartedRef.current || effectivePressure <= 0) return;
    setExerciseStarted(true);
    setIsExerciseActive(true);
    startTimeRef.current = Date.now();
    lastCheckTimeRef.current = Date.now();
  }, [effectivePressure]);

  // Accumulate time in current green band
  useEffect(() => {
    if (!isExerciseActive || !exerciseStarted) return;
    if (startTimeRef.current === null) startTimeRef.current = Date.now();
    if (lastCheckTimeRef.current === null) lastCheckTimeRef.current = Date.now();

    const id = window.setInterval(() => {
      const now = Date.now();
      const last = lastCheckTimeRef.current ?? now;
      const delta = now - last;
      const p = pressureRef.current;
      const elapsedMs = now - (startTimeRef.current ?? now);
      const { min, max } = module1TargetBandAtElapsedMs(elapsedMs);
      if (p >= min && p <= max) timeOnThresholdRef.current += delta;
      lastCheckTimeRef.current = now;
    }, 100);

    return () => clearInterval(id);
  }, [isExerciseActive, exerciseStarted]);

  // 20s countdown
  useEffect(() => {
    if (!isExerciseActive || timeRemaining <= 0) return;
    const id = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExerciseActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isExerciseActive, timeRemaining]);

  // Score on complete
  useEffect(() => {
    if (!exerciseStarted || timeRemaining !== 0 || startTimeRef.current === null) return;
    if (completeOnceRef.current) return;
    completeOnceRef.current = true;
    setScore(module1ScorePercent(timeOnThresholdRef.current));
  }, [exerciseStarted, timeRemaining]);

  // Persist score, close backend session, then show Module 1 results (completed / incomplete)
  useEffect(() => {
    if (score === null) return;
    if (navigatedToResultsRef.current) return;
    navigatedToResultsRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('module1_last_score', String(score));
      }
    } catch (err) {
      console.warn('Unable to persist module 1 score to localStorage:', err);
    }

    void (async () => {
      try {
        if (readingsBufferRef.current.length > 0 && sessionIdRef.current) {
          const readingsToSave = [...readingsBufferRef.current];
          readingsBufferRef.current = [];
          console.log('Saving final', readingsToSave.length, 'readings to Supabase');
          await saveReadingsToSupabase(readingsToSave);
        }
        if (sessionIdRef.current) {
          await invokeModule1CompleteSession(sessionIdRef.current);
        }
      } catch (e) {
        console.error('invokeModule1CompleteSession', e);
      } finally {
        const path = score >= 80 ? '/module/1/completed' : '/module/1/incomplete';
        navigate(path, { replace: true, state: { sessionId, score } });
      }
    })();
  }, [score, sessionId, navigate]);

  // Flush telemetry on unmount (legacy Module1Exercise1Start)
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current != null) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      if (readingsBufferRef.current.length > 0 && sessionId) {
        const readingsToSave = [...readingsBufferRef.current];
        readingsBufferRef.current = [];
        void saveReadingsToSupabase(readingsToSave);
      }
    };
  }, [sessionId]);

  // Re-render gauge / preview smoothly
  useEffect(() => {
    if (!exerciseStarted || timeRemaining <= 0) return;
    const id = window.setInterval(() => setUiTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [exerciseStarted, timeRemaining]);

  const elapsedMs =
    exerciseStarted && startTimeRef.current != null
      ? Date.now() - startTimeRef.current
      : 0;

  const currentBand = module1TargetBandAtElapsedMs(elapsedMs);
  const nextBand = module1NextTargetBandAfterCurrentSegment(elapsedMs);

  const barGradient = module1PressureBarGradientForBand(currentBand.min, currentBand.max);
  const trianglePct = psiToBarPercent(effectivePressure);

  const timerActive = exerciseStarted && timeRemaining > 0;
  const showNextBandPreview =
    timerActive && module1ShouldPreviewNextBand(elapsedMs) && nextBand != null;
  const timerDisplay =
    !exerciseStarted
      ? `0:${MODULE1_EXERCISE_DURATION_SECONDS.toString().padStart(2, '0')}`
      : timeRemaining === 0
        ? '0:00'
        : `0:${timeRemaining.toString().padStart(2, '0')}`;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        backgroundColor: '#26313E',
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <header
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{
          backgroundColor: '#1E2733',
          borderRadius: '6px',
          marginBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/modules')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-sm font-medium"
          style={{ color: '#ffffff' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L8 10l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Modules
        </button>
        <h1 className="text-lg font-semibold m-0" style={{ color: 'white' }}>
          Module 1: Pressure Control
        </h1>
        <div
          className="text-sm m-0 text-right"
          style={{ color: '#9CA3AF', minWidth: '200px', maxWidth: '280px' }}
        >
          {bleConnected ? 'Gloves connected' : null}
        </div>
      </header>

      <div
        className="flex-1 rounded-lg min-h-0 relative"
        style={{
          width: '100%',
          backgroundColor: '#1E2733',
          isolation: 'isolate',
          overflow: 'visible',
        }}
      >
        {/* Clip WebGL to rounded rect only; HUD stays overflow-visible so the gauge isn’t clipped */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            cursor: 'default',
          }}
        >
          <Canvas
            camera={{ position: [0, 0.5, 0], fov: 50, near: 0.08, far: 100 }}
            dpr={1}
            gl={{ alpha: false, antialias: true }}
            onCreated={({ gl }) => {
              gl.setClearColor('#1a222c');
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              background: '#1a222c',
            }}
          >
            <Suspense fallback={null}>
              <Module1ORScene pressurePsiRef={pressureRef} />
            </Suspense>
          </Canvas>
        </div>

        {/* HUD: flex column so the pressure bar is anchored to bottom-center (not top-left) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            pointerEvents: 'none',
            transform: 'translateZ(0)',
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <style>{`
          @keyframes nextBandHintPulse {
            0%, 100% { opacity: 0.82; }
            50% { opacity: 1; }
          }
        `}</style>
          <div
            className="flex-1 min-h-0 relative"
            style={{ pointerEvents: 'none' }}
          >
            {/* Timer card: match Module 3 presentation */}
            <div
              className="absolute"
              style={{
                top: 16,
                left: 16,
                zIndex: 45,
                minWidth: 160,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: '#1E2733',
                color: '#fff',
                border: '1px solid #374151',
                textAlign: 'center',
                fontWeight: 700,
                letterSpacing: 0.3,
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 2 }}>Time Remaining</div>
              <div className="tabular-nums" style={{ fontSize: 26, lineHeight: 1.1 }}>{timerDisplay}</div>
            </div>

          </div>

          {/* Bottom-middle: wide pressure gradient gauge */}
          <div
            className="w-full flex flex-col items-center px-3 sm:px-6 pb-1.5 pt-2 flex-shrink-0"
            style={{
              pointerEvents: 'auto',
              overflow: 'visible',
              background:
                'linear-gradient(to top, rgba(18, 24, 32, 0.97) 0%, rgba(18, 24, 32, 0.55) 45%, rgba(18, 24, 32, 0.12) 78%, transparent 100%)',
              borderTop: '1px solid rgba(55, 65, 81, 0.85)',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.35)',
            }}
          >
            <div
              className="flex w-full flex-col items-center gap-2"
              style={{
                overflow: 'visible',
                width: 'min(100%, 1180px)',
                maxWidth: '100%',
              }}
            >
              <div
                className="relative w-full"
                style={{ overflow: 'visible', flexShrink: 0 }}
              >
                <div
                  className="relative w-full rounded-[14px] shadow-lg overflow-hidden"
                  style={{
                    minHeight: 60,
                    height: 60,
                    width: '100%',
                    flexShrink: 0,
                    backgroundColor: '#dc2626',
                    backgroundImage: barGradient,
                    border: '2px solid #cbd5e1',
                    boxShadow: '0 4px 24px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  {showNextBandPreview && nextBand != null ? (
                    <div
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        height: '100%',
                        zIndex: 1,
                        left: `${psiToBarPercent(nextBand.min)}%`,
                        width: `${Math.max(
                          0.25,
                          psiToBarPercent(nextBand.max) - psiToBarPercent(nextBand.min),
                        )}%`,
                        background:
                          'linear-gradient(180deg, #4ade80 0%, #22c55e 42%, #16a34a 100%)',
                        boxShadow:
                          'inset 0 0 0 2px rgba(255,255,255,0.92), 0 0 18px rgba(74, 222, 128, 0.85)',
                        animation: 'nextBandHintPulse 0.75s ease-in-out infinite',
                      }}
                    />
                  ) : null}
                </div>
                <div
                  className="absolute top-full transition-all duration-200 ease-out"
                  style={{
                    left: `${trianglePct}%`,
                    transform: 'translateX(-50%)',
                    marginTop: '6px',
                  }}
                >
                  <svg width="22" height="16" viewBox="0 0 22 16" className="text-white">
                    <path d="M11 16L0 0h22L11 16z" fill="white" />
                    <path d="M11 15L1.5 1h19L11 15z" fill="#e5e7eb" opacity="0.25" />
                  </svg>
                </div>
              </div>
              <div
                className="text-center mt-4 flex flex-wrap justify-center gap-4 sm:gap-8 text-sm w-full"
                style={{ color: '#e2e8f0' }}
              >
                <span>
                  Pressure: <strong>{effectivePressure.toFixed(1)} PSI</strong>
                </span>
                {exerciseStarted && timeRemaining > 0 && (
                  <span style={{ opacity: 0.85 }}>
                    In zone (this slice): {currentBand.min}–{currentBand.max} PSI
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDModule1;
