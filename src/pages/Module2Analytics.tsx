import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Module2Analytics.module.css';
import { supabase } from '../lib/supabaseClient';

const Module2Analytics = () => {
  type TooltipState = {
    visible: boolean;
    xPct: number;
    yPct: number;
    lines: string[];
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [progressPoints, setProgressPoints] = useState<
    { completedAt: string; scorePct: number; completionSeconds: number | null }[]
  >([]);
  const [fastestSeconds, setFastestSeconds] = useState<number | null>(null);
  const [economyOfMotionPoints, setEconomyOfMotionPoints] = useState<
    { completedAt: string; value: number }[]
  >([]);
  const [wastedMovementBars, setWastedMovementBars] = useState<
    { sessionLabel: string; completedAt: string; overshootDistance: number }[]
  >([]);
  const [economyInfoVisible, setEconomyInfoVisible] = useState(false);
  const [wasteInfoVisible, setWasteInfoVisible] = useState(false);
  const [progressTooltip, setProgressTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });
  const [economyTooltip, setEconomyTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });
  const [wasteTooltip, setWasteTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/modules', label: 'Modules', icon: 'modules' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="11" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
  const ModulesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="7" height="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="9" y="9" width="7" height="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
  const AnalyticsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="15" width="3" height="2" fill="currentColor"/>
      <rect x="7" y="11" width="3" height="6" fill="currentColor"/>
      <rect x="11" y="8" width="3" height="9" fill="currentColor"/>
      <rect x="15" y="4" width="3" height="13" fill="currentColor"/>
    </svg>
  );
  const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M15.66 11.7l-.73-.42a3.5 3.5 0 000-1.56l.73-.42a.5.5 0 00.18-.68l-.68-1.18a.5.5 0 00-.69-.18l-.73.42a3.5 3.5 0 00-1.18-.68V6.5a.5.5 0 00-.5-.5H8.5a.5.5 0 00-.5.5v.84a3.5 3.5 0 00-1.18.68l-.73-.42a.5.5 0 00-.69.18l-.68 1.18a.5.5 0 00.18.68l.73.42a3.5 3.5 0 000 1.56l-.73.42a.5.5 0 00-.18.68l.68 1.18a.5.5 0 00.69.18l.73-.42a3.5 3.5 0 001.18.68v.84a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-.84a3.5 3.5 0 001.18-.68l.73.42a.5.5 0 00.69-.18l.68-1.18a.5.5 0 00-.18-.68z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard': return <DashboardIcon />;
      case 'modules': return <ModulesIcon />;
      case 'analytics': return <AnalyticsIcon />;
      case 'settings': return <SettingsIcon />;
      default: return null;
    }
  };

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

  const formatFastestTimeLabel = (seconds: number | null) => {
    if (seconds === null || Number.isNaN(seconds)) return '--';
    const s = Math.max(0, Math.round(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) {
      return `${mins} minute${mins === 1 ? '' : 's'}, ${secs} second${secs === 1 ? '' : 's'}`;
    }
    return `${secs} second${secs === 1 ? '' : 's'}`;
  };

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
  const yScale = (s: number) => padding.top + innerHeight - (s - scoreMin) / (scoreMax - scoreMin) * innerHeight;
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

  const motionChartWidth = 420;
  const motionChartHeight = 220;
  const motionPadding = { top: 16, right: 16, bottom: 30, left: 42 };
  const motionInnerWidth = motionChartWidth - motionPadding.left - motionPadding.right;
  const motionInnerHeight = motionChartHeight - motionPadding.top - motionPadding.bottom;
  const motionTimes = economyOfMotionPoints.map((point) => new Date(point.completedAt).getTime());
  const motionMinTime = motionTimes.length > 0 ? Math.min(...motionTimes) : 0;
  const motionMaxTime = motionTimes.length > 0 ? Math.max(...motionTimes) : 0;
  const motionXScale = (timeMs: number) => {
    if (economyOfMotionPoints.length <= 1 || motionMaxTime === motionMinTime) {
      return motionPadding.left + motionInnerWidth / 2;
    }
    return motionPadding.left + ((timeMs - motionMinTime) / (motionMaxTime - motionMinTime)) * motionInnerWidth;
  };
  const motionValues = economyOfMotionPoints.map((point) => point.value);
  const motionMinValueRaw = motionValues.length > 0 ? Math.min(...motionValues) : 0;
  const motionMaxValueRaw = motionValues.length > 0 ? Math.max(...motionValues) : 1;
  const motionMinValue = Math.min(0, motionMinValueRaw);
  const motionMaxValue = Math.max(1, motionMaxValueRaw);
  const motionYScale = (v: number) =>
    motionPadding.top +
    motionInnerHeight -
    ((v - motionMinValue) / Math.max(0.0001, motionMaxValue - motionMinValue)) * motionInnerHeight;
  const plottedMotionPoints = economyOfMotionPoints.map((point) => ({
    ...point,
    x: motionXScale(new Date(point.completedAt).getTime()),
    y: motionYScale(point.value),
  }));
  const motionLinePoints = plottedMotionPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const motionX1 = motionPadding.left;
  const motionY1 = motionPadding.top + motionInnerHeight;
  const motionX2 = motionPadding.left + motionInnerWidth;
  const motionY2 = motionPadding.top;

  const barChartWidth = 420;
  const barChartHeight = 220;
  const barPadding = { top: 16, right: 16, bottom: 38, left: 48 };
  const barInnerWidth = barChartWidth - barPadding.left - barPadding.right;
  const barInnerHeight = barChartHeight - barPadding.top - barPadding.bottom;
  const wasteValues = wastedMovementBars.map((bar) => bar.overshootDistance);
  const wasteMin = wasteValues.length > 0 ? Math.min(0, ...wasteValues) : 0;
  const wasteMax = wasteValues.length > 0 ? Math.max(0, ...wasteValues) : 1;
  const wasteYScale = (v: number) =>
    barPadding.top + barInnerHeight - ((v - wasteMin) / Math.max(0.0001, wasteMax - wasteMin)) * barInnerHeight;
  const wasteZeroY = wasteYScale(0);
  const barCount = wastedMovementBars.length;
  const barGap = 10;
  const computedBarWidth =
    barCount > 0 ? Math.max(8, (barInnerWidth - barGap * Math.max(0, barCount - 1)) / barCount) : 20;

  useEffect(() => {
    const fetchHighestScore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHighestScore(null);
        return;
      }

      const { data, error } = await supabase
        .from('trainee_best_scores')
        .select('best_score')
        .eq('user_id', user.id)
        .eq('module_id', 2)
        .maybeSingle();

      if (error) {
        console.error('Error loading module 2 highest score:', error);
        setHighestScore(null);
        return;
      }

      setHighestScore(data?.best_score !== null && data?.best_score !== undefined ? data.best_score * 100 : null);
    };

    fetchHighestScore();
  }, []);

  useEffect(() => {
    const fetchProgressData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProgressPoints([]);
        setFastestSeconds(null);
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
        return;
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('session_id, completed_at')
        .eq('user_id', user.id)
        .eq('module_id', 2)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (sessionsError) {
        console.error('Error loading module 2 sessions:', sessionsError);
        setProgressPoints([]);
        setFastestSeconds(null);
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
        return;
      }

      const orderedSessions = (sessions ?? []).map((session, index) => ({
        sessionId: session.session_id as string,
        completedAt: session.completed_at as string,
        sessionLabel: `Session ${index + 1}`,
      }));
      const sessionIds = orderedSessions.map((session) => session.sessionId);
      if (sessionIds.length === 0) {
        setProgressPoints([]);
        setFastestSeconds(null);
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
        return;
      }

      const { data: cameraRows, error: cameraError } = await supabase
        .from('camera_sessions')
        .select('session_id, score, time_to_completion, economy_of_motion, total_distance_traveled, optimal_distance')
        .in('session_id', sessionIds);

      if (cameraError) {
        console.error('Error loading module 2 camera scores:', cameraError);
        setProgressPoints([]);
        setFastestSeconds(null);
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
        return;
      }

      const completionValues = (cameraRows ?? [])
        .map((row) => row.time_to_completion)
        .filter((t): t is number => t !== null && t !== undefined && !Number.isNaN(Number(t)))
        .map((t) => Number(t));
      setFastestSeconds(completionValues.length > 0 ? Math.min(...completionValues) : null);

      const cameraBySession = new Map(
        (cameraRows ?? []).map((row) => [
          row.session_id as string,
          {
            score: row.score as number | null,
            duration: row.time_to_completion as number | null,
            economyOfMotion: row.economy_of_motion as number | null,
            totalDistanceTraveled: row.total_distance_traveled as number | null,
            optimalDistance: row.optimal_distance as number | null,
          },
        ])
      );

      const mappedPoints = orderedSessions
        .map((session) => {
          const sessionId = session.sessionId;
          const match = cameraBySession.get(sessionId);
          if (!match || match.score === null || match.score === undefined || !session.completedAt) {
            return null;
          }

          return {
            completedAt: session.completedAt,
            scorePct: Math.max(0, Math.min(100, match.score * 100)),
            completionSeconds: match.duration,
          };
        })
        .filter((point): point is { completedAt: string; scorePct: number; completionSeconds: number | null } => point !== null);

      const mappedEconomyPoints = orderedSessions
        .map((session) => {
          const match = cameraBySession.get(session.sessionId);
          if (!match || match.economyOfMotion === null || match.economyOfMotion === undefined || !session.completedAt) {
            return null;
          }
          return {
            completedAt: session.completedAt,
            value: Number(match.economyOfMotion),
          };
        })
        .filter((point): point is { completedAt: string; value: number } => point !== null);

      const mappedWasteBars = orderedSessions
        .map((session) => {
          const match = cameraBySession.get(session.sessionId);
          if (
            !match ||
            match.totalDistanceTraveled === null ||
            match.totalDistanceTraveled === undefined ||
            match.optimalDistance === null ||
            match.optimalDistance === undefined ||
            Number(match.optimalDistance) === 0
          ) {
            return null;
          }
          const totalDistanceTraveled = Number(match.totalDistanceTraveled);
          const optimalDistance = Number(match.optimalDistance);
          const overshootDistance = totalDistanceTraveled - optimalDistance;
          return {
            sessionLabel: session.sessionLabel,
            completedAt: session.completedAt,
            overshootDistance,
          };
        })
        .filter(
          (bar): bar is { sessionLabel: string; completedAt: string; overshootDistance: number } => bar !== null
        );

      setProgressPoints(mappedPoints);
      setEconomyOfMotionPoints(mappedEconomyPoints);
      setWastedMovementBars(mappedWasteBars);
    };

    fetchProgressData();
  }, []);

  const handleTryAgain = () => {
    navigate('/module/2/instructions');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2a3642' }}>
      <header className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center overflow-hidden" style={{ width: '72px', height: '72px' }}>
            <img src="/Logo.png" alt="Logo" className="object-contain" style={{ width: '72px', height: '72px', maxWidth: '72px', maxHeight: '72px', objectFit: 'contain' }} />
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-500 overflow-hidden flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#9CA3AF"/>
            <circle cx="14" cy="10" r="4" fill="#4B5563"/>
            <path d="M 6 22 Q 6 18 10 18 L 18 18 Q 22 18 22 22 L 22 28 L 6 28 Z" fill="#4B5563"/>
          </svg>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 72px)' }}>
        <aside className="w-64" style={{ backgroundColor: '#1E2733' }}>
          <nav className="py-6">
            <div className="space-y-2 pt-[30px]">
              {navItems.map((item) => {
                const isActive =
                  (item.path === '/dashboard' && location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/modules')) ||
                  (item.path === '/modules' && (location.pathname.startsWith('/modules') || location.pathname.startsWith('/module'))) ||
                  (item.path === '/analytics' && location.pathname.startsWith('/analytics')) ||
                  (item.path === '/settings' && location.pathname.startsWith('/settings'));
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{ backgroundColor: '#1E2733', border: 'none', paddingTop: '1.5rem', paddingBottom: '1.5rem', color: isActive ? '#1DA5FF' : 'white' }}
                    className="w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none"
                  >
                    <span className="flex-shrink-0" style={{ color: isActive ? '#1DA5FF' : 'white' }}>{getIcon(item.icon)}</span>
                    <span className="font-medium" style={{ color: isActive ? '#1DA5FF' : 'white' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="flex-1" style={{ padding: '32px 48px' }}>
          <div className="max-w-6xl mx-auto">
            <div className={styles.pageHeaderRow}>
              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className={styles.navButton}
                aria-label="Previous module"
              >
                <span className={styles.moduleNavWithArrow}>
                  <ArrowLeftIcon />
                  <span style={{ fontSize: '0.9375rem' }}>Module 1</span>
                </span>
              </button>
              <h1 className={styles.pageTitle}>Module 2 Analytics</h1>
              <button
                type="button"
                onClick={() => navigate('/analytics/module3')}
                className={styles.navButton}
                aria-label="Next module"
              >
                <span className={styles.moduleNavWithArrow}>
                  <span style={{ fontSize: '0.9375rem' }}>Module 3</span>
                  <ArrowRightIcon />
                </span>
              </button>
            </div>

            <div className={styles.analyticsContentArea}>
            <div className={styles.analyticsLayout}>
              <div className={styles.topMetricsRow}>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Highest Score</h2>
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

                <div className={`${styles.card} ${styles.topCard}`}>
                  <h2 className={styles.cardTitle}>Top</h2>
                  <div className={styles.topCardBody}>
                    <p className={styles.cardValue}>10%</p>
                    <p className={styles.cardSubtext}>of Department</p>
                  </div>
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Fastest Time</h2>
                  <p className={styles.cardValue}>{formatFastestTimeLabel(fastestSeconds)}</p>
                  <button type="button" onClick={handleTryAgain} className={styles.tryAgainButton}>
                    Try Again
                  </button>
                </div>
              </div>

              <div className={styles.rightCard}>
                <h2 className={styles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>My Progress</h2>
                <div className={styles.chartWrapper}>
                  {progressPoints.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      No completed sessions
                    </div>
                  ) : (
                    <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                      <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                      <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                      {plottedPoints.map((point, i) => (
                        <circle
                          key={i}
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          fill="#ef4444"
                          stroke="#1e2733"
                          strokeWidth="1"
                          onMouseEnter={() =>
                            setProgressTooltip({
                              visible: true,
                              xPct: (point.x / chartWidth) * 100,
                              yPct: (point.y / chartHeight) * 100,
                              lines: [
                                `Score: ${Math.round(point.scorePct)}%`,
                                `Completion Time: ${formatDuration(point.completionSeconds)}`,
                                `Completed: ${formatTimestamp(point.completedAt)}`,
                              ],
                            })
                          }
                          onMouseLeave={() => setProgressTooltip((prev) => ({ ...prev, visible: false }))}
                        />
                      ))}
                      <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Score</text>
                      <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Time</text>
                    </svg>
                  )}
                  {progressTooltip.visible && (
                    <div
                      className={styles.chartTooltip}
                      style={{ left: `${progressTooltip.xPct}%`, top: `max(8%, calc(${progressTooltip.yPct}% - 20px))` }}
                    >
                      {progressTooltip.lines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                      <div className={styles.chartTooltipArrow} />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.rightCard}>
                <h2 className={styles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>
                  Motion Efficiency
                </h2>
                <div className={styles.motionGrid}>
                  <div className={styles.motionPanel}>
                    <div className={styles.motionPanelTitleWrap}>
                      <h3 className={styles.motionPanelTitle}>Economy of motion</h3>
                      <span
                        className={styles.infoIcon}
                        aria-label="Economy of motion info"
                        onMouseEnter={() => setEconomyInfoVisible(true)}
                        onMouseLeave={() => setEconomyInfoVisible(false)}
                      >
                        i
                        {economyInfoVisible && (
                          <span className={styles.chartTooltip} style={{ left: '50%', top: '-8px' }}>
                            <span>
                              Economy of motion refers to the efficiency of your movement of the camera. It is
                              computed by dividing the optimal distance of camera travel by the distance the camera
                              traveled when you completed the module.
                            </span>
                            <span style={{ display: 'block', marginTop: '10px' }}>
                              The closer you are to 1, the more efficient your motion was.
                            </span>
                            <span className={styles.chartTooltipArrow} />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={styles.motionChartWrap}>
                      {plottedMotionPoints.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No economy of motion data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${motionChartWidth} ${motionChartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                          <line x1={motionX1} y1={motionY1} x2={motionX1} y2={motionY2} stroke={axisStroke} strokeWidth="1" />
                          <line x1={motionX1} y1={motionY1} x2={motionX2} y2={motionY1} stroke={axisStroke} strokeWidth="1" />
                          <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={motionLinePoints} />
                          {plottedMotionPoints.map((point, i) => (
                            <circle
                              key={i}
                              cx={point.x}
                              cy={point.y}
                              r="4.5"
                              fill="#ef4444"
                              stroke="#1e2733"
                              strokeWidth="1"
                              onMouseEnter={() =>
                                setEconomyTooltip({
                                  visible: true,
                                  xPct: (point.x / motionChartWidth) * 100,
                                  yPct: (point.y / motionChartHeight) * 100,
                                  lines: [
                                    `Economy of motion: ${point.value.toFixed(3)}`,
                                    `Completed: ${formatTimestamp(point.completedAt)}`,
                                  ],
                                })
                              }
                              onMouseLeave={() => setEconomyTooltip((prev) => ({ ...prev, visible: false }))}
                            />
                          ))}
                          <text x={motionPadding.left - 16} y={motionPadding.top + motionInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${motionPadding.left - 16}, ${motionPadding.top + motionInnerHeight / 2})`}>Economy</text>
                          <text x={motionPadding.left + motionInnerWidth / 2} y={motionChartHeight - 8} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">Time</text>
                        </svg>
                      )}
                      {economyTooltip.visible && (
                        <div
                          className={styles.chartTooltip}
                          style={{ left: `${economyTooltip.xPct}%`, top: `max(8%, calc(${economyTooltip.yPct}% - 18px))` }}
                        >
                          {economyTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={styles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.motionPanel}>
                    <div className={styles.motionPanelTitleWrap}>
                      <h3 className={styles.motionPanelTitle}>Wasted movement (raw distance)</h3>
                      <span
                        className={styles.infoIcon}
                        aria-label="Wasted movement info"
                        onMouseEnter={() => setWasteInfoVisible(true)}
                        onMouseLeave={() => setWasteInfoVisible(false)}
                      >
                        i
                        {wasteInfoVisible && (
                          <span className={styles.chartTooltip} style={{ left: '50%', top: '-8px' }}>
                            <span>
                              Wasted movement refers to the difference between the total distance the camera traveled
                              and the optimal distance. It represents the amount of extra movement you used in
                              completing the module.
                            </span>
                            <span className={styles.chartTooltipArrow} />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={styles.motionChartWrap}>
                      {wastedMovementBars.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No distance data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                          <line x1={barPadding.left} y1={barPadding.top} x2={barPadding.left} y2={barPadding.top + barInnerHeight} stroke={axisStroke} strokeWidth="1" />
                          <line x1={barPadding.left} y1={wasteZeroY} x2={barPadding.left + barInnerWidth} y2={wasteZeroY} stroke={axisStroke} strokeWidth="1" />
                          {wastedMovementBars.map((bar, i) => {
                            const x = barPadding.left + i * (computedBarWidth + barGap);
                            const y = wasteYScale(Math.max(0, bar.overshootDistance));
                            const yNeg = wasteYScale(Math.min(0, bar.overshootDistance));
                            const rectY = bar.overshootDistance >= 0 ? y : wasteZeroY;
                            const height = Math.abs(yNeg - y);
                            const labelX = x + computedBarWidth / 2;
                            return (
                              <g key={`${bar.sessionLabel}-${i}`}>
                                <rect x={x} y={rectY} width={computedBarWidth} height={Math.max(1, height)} fill="#1DA5FF" />
                                <rect
                                  x={x}
                                  y={rectY}
                                  width={computedBarWidth}
                                  height={Math.max(14, height)}
                                  fill="transparent"
                                  onMouseEnter={() =>
                                    setWasteTooltip({
                                      visible: true,
                                      xPct: ((x + computedBarWidth / 2) / barChartWidth) * 100,
                                      yPct: ((rectY + Math.max(8, height / 2)) / barChartHeight) * 100,
                                      lines: [
                                        `${bar.sessionLabel}`,
                                        `Overshoot distance: ${bar.overshootDistance.toFixed(2)}`,
                                        `Completed: ${formatTimestamp(bar.completedAt)}`,
                                      ],
                                    })
                                  }
                                  onMouseLeave={() => setWasteTooltip((prev) => ({ ...prev, visible: false }))}
                                />
                                <text x={labelX} y={barChartHeight - 12} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10">
                                  {bar.sessionLabel.replace('Session ', 'S')}
                                </text>
                              </g>
                            );
                          })}
                          <text x={barPadding.left - 24} y={barPadding.top + barInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${barPadding.left - 24}, ${barPadding.top + barInnerHeight / 2})`}>Distance</text>
                          <text x={barPadding.left + barInnerWidth / 2} y={barChartHeight - 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">Sessions</text>
                        </svg>
                      )}
                      {wasteTooltip.visible && (
                        <div
                          className={styles.chartTooltip}
                          style={{ left: `${wasteTooltip.xPct}%`, top: `max(8%, calc(${wasteTooltip.yPct}% - 18px))` }}
                        >
                          {wasteTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={styles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module2Analytics;
