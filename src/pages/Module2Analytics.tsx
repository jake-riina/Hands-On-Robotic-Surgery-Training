import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Module2Analytics.module.css';
import { supabase } from '../lib/supabaseClient';

const Module2Analytics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [progressPoints, setProgressPoints] = useState<
    { completedAt: string; scorePct: number; completionSeconds: number | null }[]
  >([]);

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
        return;
      }

      const sessionIds = (sessions ?? []).map((session) => session.session_id as string);
      if (sessionIds.length === 0) {
        setProgressPoints([]);
        return;
      }

      const { data: cameraRows, error: cameraError } = await supabase
        .from('camera_sessions')
        .select('session_id, score, time_to_completion')
        .in('session_id', sessionIds);

      if (cameraError) {
        console.error('Error loading module 2 camera scores:', cameraError);
        setProgressPoints([]);
        return;
      }

      const cameraBySession = new Map(
        (cameraRows ?? []).map((row) => [
          row.session_id as string,
          {
            score: row.score as number | null,
            duration: row.time_to_completion as number | null,
          },
        ])
      );

      const mappedPoints = (sessions ?? [])
        .map((session) => {
          const sessionId = session.session_id as string;
          const match = cameraBySession.get(sessionId);
          if (!match || match.score === null || match.score === undefined || !session.completed_at) {
            return null;
          }

          return {
            completedAt: session.completed_at as string,
            scorePct: Math.max(0, Math.min(100, match.score * 100)),
            completionSeconds: match.duration,
          };
        })
        .filter((point): point is { completedAt: string; scorePct: number; completionSeconds: number | null } => point !== null);

      setProgressPoints(mappedPoints);
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
              <div className={styles.leftColumnWrapper}>
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
                  <p className={styles.cardValue}>1 minute, 25 seconds</p>
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
        </main>
      </div>
    </div>
  );
};

export default Module2Analytics;
