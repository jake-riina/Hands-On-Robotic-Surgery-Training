import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import analyticsStyles from '../pages/Module1Analytics.module.css';
import modalStyles from './TraineeModuleProgressModal.module.css';

export type TraineeModuleId = 1 | 2 | 3;

type ProgressPoint = {
  completedAt: string;
  scorePct: number;
  completionSeconds: number | null;
};

const MODULE_PERCENTILE_VIEWS: Record<TraineeModuleId, string> = {
  1: 'module1_department_percentile',
  2: 'module2_department_percentile',
  3: 'module3_department_percentile',
};

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return 'N/A';
  const totalSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatFastestLabel(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '--';
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0) {
    return `${mins} minute${mins === 1 ? '' : 's'}, ${secs} second${secs === 1 ? '' : 's'}`;
  }
  return `${secs} second${secs === 1 ? '' : 's'}`;
}

async function fetchHighestScore(traineeUserId: string, moduleId: TraineeModuleId): Promise<number | null> {
  const { data, error } = await supabase
    .from('trainee_best_scores')
    .select('best_score')
    .eq('user_id', traineeUserId)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (error) {
    console.error('TraineeModuleProgressModal: highest score', error);
    return null;
  }
  if (data?.best_score === null || data?.best_score === undefined) return null;
  return data.best_score * 100;
}

async function fetchTopPercentile(
  moduleId: TraineeModuleId,
  traineeUserId: string,
  departmentId: string | null
): Promise<number | null> {
  const viewName = MODULE_PERCENTILE_VIEWS[moduleId];
  let query = supabase.from(viewName).select('score').eq('user_id', traineeUserId);
  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    return null;
  }
  if (data?.score === null || data?.score === undefined) return null;
  const raw = Number(data.score);
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  return Math.max(0, Math.min(100, pct));
}

async function fetchProgressPoints(traineeUserId: string, moduleId: TraineeModuleId): Promise<ProgressPoint[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', traineeUserId)
    .eq('module_id', moduleId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });

  if (sessionsError) {
    console.error('TraineeModuleProgressModal: sessions', sessionsError);
    return [];
  }

  const sessionIds = (sessions ?? []).map((s) => s.session_id as string);
  if (sessionIds.length === 0) return [];

  if (moduleId === 1) {
    const { data: pressureRows, error: pressureError } = await supabase
      .from('pressure_sessions')
      .select('session_id, score, duration_seconds')
      .in('session_id', sessionIds);
    if (pressureError) {
      console.error('TraineeModuleProgressModal: pressure_sessions', pressureError);
      return [];
    }
    const bySession = new Map(
      (pressureRows ?? []).map((row) => [
        row.session_id as string,
        { score: row.score as number | null, duration: row.duration_seconds as number | null },
      ])
    );
    return (sessions ?? [])
      .map((session) => {
        const sessionId = session.session_id as string;
        const match = bySession.get(sessionId);
        if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
        return {
          completedAt: session.completed_at as string,
          scorePct: Math.max(0, Math.min(100, match.score * 100)),
          completionSeconds: match.duration,
        };
      })
      .filter((p): p is ProgressPoint => p !== null);
  }

  if (moduleId === 2) {
    const { data: cameraRows, error: cameraError } = await supabase
      .from('camera_sessions')
      .select('session_id, score, time_to_completion')
      .in('session_id', sessionIds);
    if (cameraError) {
      console.error('TraineeModuleProgressModal: camera_sessions', cameraError);
      return [];
    }
    const bySession = new Map(
      (cameraRows ?? []).map((row) => [
        row.session_id as string,
        { score: row.score as number | null, duration: row.time_to_completion as number | null },
      ])
    );
    return (sessions ?? [])
      .map((session) => {
        const sessionId = session.session_id as string;
        const match = bySession.get(sessionId);
        if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
        return {
          completedAt: session.completed_at as string,
          scorePct: Math.max(0, Math.min(100, match.score * 100)),
          completionSeconds: match.duration,
        };
      })
      .filter((p): p is ProgressPoint => p !== null);
  }

  const { data: pegRows, error: pegError } = await supabase
    .from('peg_sessions')
    .select('session_id, score, time_to_completion')
    .in('session_id', sessionIds);
  if (pegError) {
    console.error('TraineeModuleProgressModal: peg_sessions', pegError);
    return [];
  }
  const bySession = new Map(
    (pegRows ?? []).map((row) => [
      row.session_id as string,
      { score: row.score as number | null, duration: row.time_to_completion as number | null },
    ])
  );
  return (sessions ?? [])
    .map((session) => {
      const sessionId = session.session_id as string;
      const match = bySession.get(sessionId);
      if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
      return {
        completedAt: session.completed_at as string,
        scorePct: Math.max(0, Math.min(100, match.score * 100)),
        completionSeconds: match.duration,
      };
    })
    .filter((p): p is ProgressPoint => p !== null);
}

function fastestSeconds(points: ProgressPoint[]): number | null {
  const durations = points.map((p) => p.completionSeconds).filter((s): s is number => s != null && !Number.isNaN(s));
  if (durations.length === 0) return null;
  return Math.min(...durations);
}

export interface TraineeModuleProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeUserId: string;
  displayName: string;
  moduleId: TraineeModuleId;
  departmentId: string | null;
}

const TraineeModuleProgressModal: React.FC<TraineeModuleProgressModalProps> = ({
  isOpen,
  onClose,
  traineeUserId,
  displayName,
  moduleId,
  departmentId,
}) => {
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!traineeUserId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [best, top, points] = await Promise.all([
        fetchHighestScore(traineeUserId, moduleId),
        fetchTopPercentile(moduleId, traineeUserId, departmentId),
        fetchProgressPoints(traineeUserId, moduleId),
      ]);
      setHighestScore(best);
      setTopPercent(top);
      setProgressPoints(points);
    } catch (e) {
      console.error(e);
      setLoadError('Could not load progress for this trainee.');
    } finally {
      setIsLoading(false);
    }
  }, [traineeUserId, moduleId, departmentId]);

  useEffect(() => {
    if (!isOpen || !traineeUserId) return;
    void loadData();
  }, [isOpen, traineeUserId, loadData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const chartWidth = 420;
  const chartHeight = 240;
  const padding = { top: 20, right: 20, bottom: 28, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const scoreMin = 0;
  const scoreMax = 100;
  const progressTimes = progressPoints.map((point) => new Date(point.completedAt).getTime());
  const minTime = progressTimes.length > 0 ? Math.min(...progressTimes) : 0;
  const maxTime = progressTimes.length > 0 ? Math.max(...progressTimes) : 0;
  const xScale = (timeMs: number) => {
    if (progressPoints.length <= 1 || maxTime === minTime) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + ((timeMs - minTime) / (maxTime - minTime)) * innerWidth;
  };
  const yScale = (s: number) => padding.top + innerHeight - ((s - scoreMin) / (scoreMax - scoreMin)) * innerHeight;
  const plottedPoints = progressPoints.map((point) => ({
    ...point,
    x: xScale(new Date(point.completedAt).getTime()),
    y: yScale(point.scorePct),
  }));
  const points = plottedPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const axisStroke = 'rgba(255,255,255,0.5)';
  const x1 = padding.left;
  const y1 = padding.top + innerHeight;
  const x2 = padding.left + innerWidth;
  const y2 = padding.top;
  const timeLabelX = padding.left - 16;
  const timeLabelY = padding.top + innerHeight / 2;
  const scoreLabelX = padding.left + innerWidth / 2;
  const scoreLabelY = chartHeight - 8;
  const normalizedHighestScore = Math.max(0, Math.min(100, highestScore ?? 0));

  const fastest = moduleId === 1 ? null : fastestSeconds(progressPoints);

  const ArrowLeftIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!isOpen || !traineeUserId) {
    return null;
  }

  const modalContent = (
    <div
      className={modalStyles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainee-module-progress-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={analyticsStyles.pageHeaderRow} style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            className={analyticsStyles.navButton}
            aria-label="Close"
          >
            <ArrowLeftIcon />
          </button>
          <h1 id="trainee-module-progress-title" className={analyticsStyles.pageTitle}>
            Module {moduleId} Analytics
          </h1>
          <span style={{ width: 40, height: 40 }} aria-hidden />
        </div>

        {loadError && (
          <p style={{ color: '#fca5a5', marginBottom: '12px', fontSize: '14px' }}>{loadError}</p>
        )}
        {isLoading && !loadError && (
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '12px', fontSize: '14px' }}>Loading…</p>
        )}

        <div className={modalStyles.analyticsBody}>
          <div className={analyticsStyles.analyticsLayout}>
            <div className={analyticsStyles.leftColumnWrapper}>
              <div className={analyticsStyles.card}>
                <h2 className={analyticsStyles.cardTitle}>Highest Score</h2>
                <div className="relative flex items-center justify-center" style={{ width: '100px', height: '100px', margin: '0 auto' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90" style={{ display: 'block' }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#1DA5FF"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - normalizedHighestScore / 100)}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold" style={{ color: 'white' }}>
                    {highestScore !== null ? `${Math.round(normalizedHighestScore)}%` : '--'}
                  </span>
                </div>
              </div>

              <div className={`${analyticsStyles.card} ${analyticsStyles.topCard}`}>
                <h2 className={analyticsStyles.cardTitle}>Top</h2>
                <div className={analyticsStyles.topCardBody}>
                  <p className={analyticsStyles.cardValue}>
                    {topPercent !== null ? `${topPercent}%` : '--'}
                  </p>
                  <p className={analyticsStyles.cardSubtext}>of Department</p>
                </div>
              </div>

              <div className={analyticsStyles.card}>
                {moduleId === 1 ? (
                  <>
                    <h2 className={analyticsStyles.cardTitle}>Average Pressure Accuracy</h2>
                    <p className={analyticsStyles.cardValue}>--</p>
                  </>
                ) : (
                  <>
                    <h2 className={analyticsStyles.cardTitle}>Fastest Time</h2>
                    <p className={analyticsStyles.cardValue}>{formatFastestLabel(fastest)}</p>
                  </>
                )}
              </div>
            </div>

            <div className={analyticsStyles.rightCard}>
              <h2 className={analyticsStyles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>
                {`${displayName}'s Progress`}
              </h2>
              <div className={analyticsStyles.chartWrapper}>
                {progressPoints.length === 0 ? (
                  <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    No completed sessions
                  </div>
                ) : (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className={analyticsStyles.progressChart}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                    <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                    <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    {plottedPoints.map((point, i) => (
                      <circle key={i} cx={point.x} cy={point.y} r="5" fill="#ef4444" stroke="#1e2733" strokeWidth="1">
                        <title>{`Score: ${Math.round(point.scorePct)}%\nCompletion Time: ${formatDuration(point.completionSeconds)}\nCompleted: ${formatTimestamp(point.completedAt)}`}</title>
                      </circle>
                    ))}
                    <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Score</text>
                    <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Time</text>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TraineeModuleProgressModal;
