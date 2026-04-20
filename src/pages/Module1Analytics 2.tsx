import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Module1Analytics.module.css';

const Module1Analytics = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  /* Chart: X = Time, Y = Score; data points inside axes; axes + labels per Figma */
  const chartData = [
    { time: 1, score: 20 },
    { time: 2, score: 35 },
    { time: 3, score: 28 },
    { time: 4, score: 52 },
    { time: 5, score: 58 },
    { time: 6, score: 75 },
  ];
  const chartWidth = 420;
  const chartHeight = 240;
  const padding = { top: 20, right: 20, bottom: 28, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const scoreMin = 0;
  const scoreMax = 100;
  const timeMin = 0;
  const timeMax = 7;
  const xScale = (t: number) => padding.left + (t - timeMin) / (timeMax - timeMin) * innerWidth;
  const yScale = (s: number) => padding.top + innerHeight - (s - scoreMin) / (scoreMax - scoreMin) * innerHeight;
  const points = chartData.map((d) => `${xScale(d.time)},${yScale(d.score)}`).join(' ');
  const axisStroke = 'rgba(255,255,255,0.5)';
  const x1 = padding.left;
  const y1 = padding.top + innerHeight;
  const x2 = padding.left + innerWidth;
  const y2 = padding.top;
  const timeLabelX = padding.left - 16;
  const timeLabelY = padding.top + innerHeight / 2;
  const scoreLabelX = padding.left + innerWidth / 2;
  const scoreLabelY = chartHeight - 8;

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
                        strokeDashoffset={2 * Math.PI * 42 * (1 - 75 / 100)}
                      />
                    </svg>
                    <span className="absolute text-xl font-bold" style={{ color: 'white' }}>75%</span>
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
                  <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                    {/* Y axis baseline (left edge of plot) */}
                    <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                    {/* X axis baseline (bottom edge of plot) */}
                    <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                    {/* Data: blue line and red points inside axes */}
                    <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    {chartData.map((d, i) => (
                      <circle key={i} cx={xScale(d.time)} cy={yScale(d.score)} r="5" fill="#ef4444" stroke="#1e2733" strokeWidth="1" />
                    ))}
                    {/* Axis labels */}
                    <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Attempt</text>
                    <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Score</text>
                  </svg>
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
