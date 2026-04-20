import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type DashboardMySkillsModuleId = 1 | 2 | 3;

type ProgressPoint = {
  sessionLabel: string;
  completedAt: string;
  scorePct: number;
  completionSeconds: number | null;
};

async function fetchModule1Progress(userId: string): Promise<ProgressPoint[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', userId)
    .eq('module_id', 1)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });

  if (sessionsError || !sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.session_id as string);
  const { data: pressureRows, error: pressureError } = await supabase
    .from('pressure_sessions')
    .select('session_id, score, duration_seconds')
    .in('session_id', sessionIds);

  if (pressureError) return [];

  const pressureBySession = new Map(
    (pressureRows ?? []).map((row) => [
      row.session_id as string,
      {
        score: row.score as number | null,
        duration: row.duration_seconds as number | null,
      },
    ])
  );

  return (sessions ?? [])
    .map((session) => {
      const sessionId = session.session_id as string;
      const match = pressureBySession.get(sessionId);
      if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
      return {
        completedAt: session.completed_at as string,
        scorePct: Math.max(0, Math.min(100, match.score * 100)),
        completionSeconds: match.duration,
      };
    })
    .filter((p): p is Omit<ProgressPoint, 'sessionLabel'> => p !== null)
    .map((p, index) => ({ ...p, sessionLabel: `Session ${index + 1}` }));
}

async function fetchModule2Progress(userId: string): Promise<ProgressPoint[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', userId)
    .eq('module_id', 2)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });

  if (sessionsError || !sessions?.length) return [];

  const orderedSessions = sessions.map((session, index) => ({
    sessionId: session.session_id as string,
    completedAt: session.completed_at as string,
    sessionLabel: `Session ${index + 1}`,
  }));
  const sessionIds = orderedSessions.map((s) => s.sessionId);

  const { data: cameraRows, error: cameraError } = await supabase
    .from('camera_sessions')
    .select('session_id, score, time_to_completion')
    .in('session_id', sessionIds);

  if (cameraError) return [];

  const cameraBySession = new Map(
    (cameraRows ?? []).map((row) => [
      row.session_id as string,
      {
        score: row.score as number | null,
        duration: row.time_to_completion as number | null,
      },
    ])
  );

  return orderedSessions
    .map((session) => {
      const match = cameraBySession.get(session.sessionId);
      if (!match || match.score === null || match.score === undefined || !session.completedAt) return null;
      return {
        sessionLabel: session.sessionLabel,
        completedAt: session.completedAt,
        scorePct: Math.max(0, Math.min(100, match.score * 100)),
        completionSeconds: match.duration,
      };
    })
    .filter((p): p is ProgressPoint => p !== null);
}

async function fetchModule3Progress(userId: string): Promise<ProgressPoint[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', userId)
    .eq('module_id', 3)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });

  if (sessionsError || !sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.session_id as string);
  const { data: pegRows, error: pegError } = await supabase
    .from('peg_sessions')
    .select('session_id, score, time_to_completion')
    .in('session_id', sessionIds);

  if (pegError) return [];

  const pegBySession = new Map(
    (pegRows ?? []).map((row) => [
      row.session_id as string,
      {
        score: row.score as number | null,
        duration: row.time_to_completion as number | null,
      },
    ])
  );

  return (sessions ?? [])
    .map((session) => {
      const sessionId = session.session_id as string;
      const match = pegBySession.get(sessionId);
      if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
      return {
        completedAt: session.completed_at as string,
        scorePct: Math.max(0, Math.min(100, match.score * 100)),
        completionSeconds: match.duration,
      };
    })
    .filter((p): p is Omit<ProgressPoint, 'sessionLabel'> => p !== null)
    .map((p, index) => ({ ...p, sessionLabel: `Session ${index + 1}` }));
}

async function fetchProgressForModule(moduleId: DashboardMySkillsModuleId): Promise<ProgressPoint[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  if (moduleId === 1) return fetchModule1Progress(user.id);
  if (moduleId === 2) return fetchModule2Progress(user.id);
  return fetchModule3Progress(user.id);
}

type TooltipState = {
  visible: boolean;
  xPct: number;
  yPct: number;
  lines: string[];
};

const formatTimestamp = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return 'N/A';
  const totalSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

type Props = {
  moduleId: DashboardMySkillsModuleId;
  moduleTitle: string;
};

export default function DashboardMySkillsProgressChart({ moduleId, moduleTitle }: Props) {
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressTooltip, setProgressTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });

  useEffect(() => {
    let cancelled = false;
    setProgressPoints([]);
    setLoading(true);
    setProgressTooltip((t) => ({ ...t, visible: false }));
    (async () => {
      try {
        const points = await fetchProgressForModule(moduleId);
        if (!cancelled) setProgressPoints(points);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const chartWidth = 420;
  const chartHeight = 248;
  const padding = { top: 20, right: 20, bottom: 36, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const scoreMin = 0;
  const scoreMax = 100;
  const progressCount = progressPoints.length;
  const xScaleByIndex = (i: number) => {
    if (progressCount <= 1) return padding.left + innerWidth / 2;
    return padding.left + (i / (progressCount - 1)) * innerWidth;
  };
  const yScale = (s: number) => padding.top + innerHeight - ((s - scoreMin) / (scoreMax - scoreMin)) * innerHeight;
  const plottedPoints = progressPoints.map((point, i) => ({
    ...point,
    x: xScaleByIndex(i),
    y: yScale(point.scorePct),
  }));
  const points = plottedPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const axisStroke = 'rgba(255,255,255,0.5)';
  const x1 = padding.left;
  const y1 = padding.top + innerHeight;
  const x2 = padding.left + innerWidth;
  const timeLabelX = padding.left - 16;
  const timeLabelY = padding.top + innerHeight / 2;
  const scoreLabelX = padding.left + innerWidth / 2;
  const scoreLabelY = chartHeight - 4;
  const sessionTickLabelY = chartHeight - 20;

  const latestBlurb = loading
    ? 'Loading progress…'
    : progressPoints.length === 0
      ? 'No completed sessions yet.'
      : `${Math.round(progressPoints[progressPoints.length - 1].scorePct)}% on your latest attempt.`;

  return (
    <>
      <div
        style={{
          width: '100%',
          height: '212px',
          flexShrink: 0,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              height: '100%',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Loading…
          </div>
        ) : progressPoints.length === 0 ? (
          <div
            style={{
              display: 'flex',
              height: '100%',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            No completed sessions
          </div>
        ) : (
          <>
            <svg
              width="100%"
              height="170"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ maxWidth: '100%', display: 'block' }}
            >
              <line x1={x1} y1={y1} x2={x1} y2={padding.top} stroke={axisStroke} strokeWidth="1" />
              <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
              <polyline
                fill="none"
                stroke="#1DA5FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {plottedPoints.map((point, i) => (
                <g key={i} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="transparent"
                    onMouseEnter={() =>
                      setProgressTooltip({
                        visible: true,
                        xPct: (point.x / chartWidth) * 100,
                        yPct: (point.y / chartHeight) * 100,
                        lines: [
                          point.sessionLabel,
                          `Score: ${Math.round(point.scorePct)}%`,
                          `Completion Time: ${formatDuration(point.completionSeconds)}`,
                          `Completed: ${formatTimestamp(point.completedAt)}`,
                        ],
                      })
                    }
                    onMouseLeave={() => setProgressTooltip((prev) => ({ ...prev, visible: false }))}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill="#ef4444"
                    stroke="#1e2733"
                    strokeWidth="1"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={point.x}
                    y={sessionTickLabelY}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize="10"
                    style={{ pointerEvents: 'none' }}
                  >
                    {point.sessionLabel.replace('Session ', 'S')}
                  </text>
                </g>
              ))}
              <text
                x={timeLabelX}
                y={timeLabelY}
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize="12"
                transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}
              >
                Score
              </text>
              <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">
                Session
              </text>
            </svg>
            {progressTooltip.visible && (
              <div
                style={{
                  position: 'absolute',
                  left: `${progressTooltip.xPct}%`,
                  top: `max(8%, calc(${progressTooltip.yPct}% - 20px))`,
                  transform: 'translate(-50%, -100%)',
                  background: '#1E2733',
                  color: 'white',
                  fontSize: '12px',
                  lineHeight: 1.4,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  zIndex: 2,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {progressTooltip.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <h4
        style={{
          margin: '12px 0 4px 0',
          fontSize: '16px',
          fontWeight: 600,
          flexShrink: 0,
          color: 'white',
        }}
      >
        {moduleTitle}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: 1.625,
          flex: 1,
          minHeight: 0,
          color: '#9CA3AF',
        }}
      >
        {latestBlurb}
      </p>
    </>
  );
}
