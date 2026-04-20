import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Module1Analytics.module.css';
import { supabase } from '../lib/supabaseClient';

const Module1Analytics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [progressPoints, setProgressPoints] = useState<
    { sessionLabel: string; completedAt: string; scorePct: number; completionSeconds: number | null }[]
  >([]);

  type TooltipState = {
    visible: boolean;
    xPct: number;
    yPct: number;
    lines: string[];
  };
  const [progressTooltip, setProgressTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/modules', label: 'Modules', icon: 'modules' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Profile', icon: 'profile' },
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
  const ProfileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M4 16c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard': return <DashboardIcon />;
      case 'modules': return <ModulesIcon />;
      case 'analytics': return <AnalyticsIcon />;
      case 'profile': return <ProfileIcon />;
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

  const chartWidth = 420;
  const chartHeight = 248;
  const padding = { top: 20, right: 20, bottom: 36, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const scoreMin = 0;
  const scoreMax = 100;
  const progressCount = progressPoints.length;
  const xScaleByIndex = (i: number) => {
    if (progressCount <= 1) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + (i / (progressCount - 1)) * innerWidth;
  };
  const yScale = (s: number) => padding.top + innerHeight - (s - scoreMin) / (scoreMax - scoreMin) * innerHeight;
  const plottedPoints = progressPoints.map((point, i) => ({
    ...point,
    x: xScaleByIndex(i),
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
  const scoreLabelY = chartHeight - 4;
  const sessionTickLabelY = chartHeight - 20;
  const normalizedHighestScore = Math.max(0, Math.min(100, highestScore ?? 0));

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
        .eq('module_id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading module 1 highest score:', error);
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
        return;
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('session_id, completed_at')
        .eq('user_id', user.id)
        .eq('module_id', 1)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (sessionsError) {
        console.error('Error loading module 1 sessions:', sessionsError);
        setProgressPoints([]);
        return;
      }

      const sessionIds = (sessions ?? []).map((session) => session.session_id as string);
      if (sessionIds.length === 0) {
        setProgressPoints([]);
        return;
      }

      const { data: pressureRows, error: pressureError } = await supabase
        .from('pressure_sessions')
        .select('session_id, score, duration_seconds')
        .in('session_id', sessionIds);

      if (pressureError) {
        console.error('Error loading module 1 pressure scores:', pressureError);
        setProgressPoints([]);
        return;
      }

      const pressureBySession = new Map(
        (pressureRows ?? []).map((row) => [
          row.session_id as string,
          {
            score: row.score as number | null,
            duration: row.duration_seconds as number | null,
          },
        ])
      );

      const mappedPoints = (sessions ?? [])
        .map((session) => {
          const sessionId = session.session_id as string;
          const match = pressureBySession.get(sessionId);
          if (!match || match.score === null || match.score === undefined || !session.completed_at) {
            return null;
          }

          return {
            completedAt: session.completed_at as string,
            scorePct: Math.max(0, Math.min(100, match.score * 100)),
            completionSeconds: match.duration,
          };
        })
        .filter((point): point is { completedAt: string; scorePct: number; completionSeconds: number | null } => point !== null)
        .map((point, index) => ({
          ...point,
          sessionLabel: `Session ${index + 1}`,
        }));

      setProgressPoints(mappedPoints);
    };

    fetchProgressData();
  }, []);

  const handleTryAgain = () => {
    navigate('/module/1/instructions');
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
              <span className={styles.backArrowDisabled} aria-hidden>
                <ArrowLeftIcon />
              </span>
              <h1 className={styles.pageTitle}>Module 1 Analytics</h1>
              <button
                type="button"
                onClick={() => navigate('/analytics/module2')}
                className={styles.navButton}
                aria-label="Next module"
              >
                <span className={`${styles.module2WithArrow} ${styles.module2WithArrowClickable}`}>
                  <span style={{ fontSize: '0.9375rem' }}>Module 2</span>
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
                    <p className={styles.cardValue}>20%</p>
                    <p className={styles.cardSubtext}>of Department</p>
                  </div>
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Average Pressure Accuracy</h2>
                  <p className={styles.cardValue}>16 psi</p>
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
                    <>
                      <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                        <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                        <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                        <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                        {plottedPoints.map((point, i) => (
                          <g key={i} className={styles.chartNodeGroup}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="18"
                              className={styles.chartNodeHit}
                              onMouseEnter={() =>
                                setProgressTooltip({
                                  visible: true,
                                  xPct: (point.x / chartWidth) * 100,
                                  yPct: (point.y / chartHeight) * 100,
                                  lines: [
                                    `${point.sessionLabel}`,
                                    `Score: ${Math.round(point.scorePct)}%`,
                                    `Completion Time: ${formatDuration(point.completionSeconds)}`,
                                    `Completed: ${formatTimestamp(point.completedAt)}`,
                                  ],
                                })
                              }
                              onMouseLeave={() => setProgressTooltip((prev) => ({ ...prev, visible: false }))}
                            />
                            <circle cx={point.x} cy={point.y} r="8" className={styles.chartNode} />
                            <text
                              x={point.x}
                              y={sessionTickLabelY}
                              textAnchor="middle"
                              fill="rgba(255,255,255,0.85)"
                              fontSize="10"
                            >
                              {point.sessionLabel.replace('Session ', 'S')}
                            </text>
                          </g>
                        ))}
                        <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Score</text>
                        <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Session</text>
                      </svg>
                      {progressTooltip.visible && (
                        <div
                          className={styles.chartTooltip}
                          style={{
                            left: `${progressTooltip.xPct}%`,
                            top: `max(8%, calc(${progressTooltip.yPct}% - 20px))`,
                          }}
                        >
                          {progressTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={styles.chartTooltipArrow} />
                        </div>
                      )}
                    </>
                  )}
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

export default Module1Analytics;
