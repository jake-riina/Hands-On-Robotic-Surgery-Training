import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import styles from './AdminAnalytics.module.css';
import trainerDashboardStyles from './TrainerDashboard.module.css';

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [_firstName, setFirstName] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, email, first_name')
        .eq('user_id', user.id)
        .single();

      if (!profile || (profile.role !== 'admin' && profile.role !== 'trainer')) {
        if (profile?.role === 'trainee') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
        return;
      }

      setFirstName(profile.first_name || '');
      setCurrentRole(profile.role || '');
    };

    checkUser();
  }, [navigate]);

  const navItems = [
    { path: '/admin/dashboard', label: 'Admin Dashboard', icon: 'dashboard' },
    { path: '/admin/trainees', label: 'Trainer Dashboard', icon: 'trainees' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
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

  const TraineesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M15 16.5c0-1.5-1.5-3-5-3s-5 1.5-5 3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M3.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M16.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M1 16.5c0-1.5 1.5-3 5-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M19 16.5c0-1.5-1.5-3-5-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
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
      case 'dashboard':
        return <DashboardIcon />;
      case 'trainees':
        return <TraineesIcon />;
      case 'analytics':
        return <AnalyticsIcon />;
      case 'profile':
        return <ProfileIcon />;
      default:
        return null;
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

  const chartData = [
    { time: 1, score: 24 },
    { time: 2, score: 38 },
    { time: 3, score: 45 },
    { time: 4, score: 58 },
    { time: 5, score: 72 },
    { time: 6, score: 81 },
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

  const averageScorePercent = 78;

  return (
    <div className={trainerDashboardStyles.page}>
      <header
        className="flex items-center justify-between px-6 py-2 box-border shrink-0"
        style={{
          backgroundColor: '#1E2733',
          height: '88px',
          minHeight: '88px',
          maxHeight: '88px',
        }}
      >
        <div className="flex h-full min-h-0 flex-1 items-center gap-4 min-w-0">
          <div className="flex h-full min-h-0 max-w-[min(280px,42vw)] items-center justify-center overflow-hidden">
            <img src="/Logo.png" alt="Logo" className="block h-auto max-h-full w-auto max-w-full object-contain" />
          </div>
        </div>
        <ProfileDropdown />
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 88px)' }}>
        <aside className="w-64" style={{ backgroundColor: '#1E2733' }}>
          <nav className="py-6">
            <div className="space-y-2 pt-[30px]">
              {navItems.map((item) => {
                const isAdminDashboardDisabledForTrainer =
                  currentRole === 'trainer' && item.path === '/admin/dashboard';
                const isActive =
                  (item.path === '/admin/dashboard' && location.pathname.startsWith('/admin/dashboard') && !location.pathname.startsWith('/admin/trainees') && !location.pathname.startsWith('/admin/analytics')) ||
                  (item.path === '/admin/trainees' && location.pathname.startsWith('/admin/trainees')) ||
                  (item.path === '/admin/analytics' && location.pathname.startsWith('/admin/analytics')) ||
                  (item.path === '/settings' && location.pathname.startsWith('/settings'));

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (!isAdminDashboardDisabledForTrainer) {
                        navigate(item.path);
                      }
                    }}
                    disabled={isAdminDashboardDisabledForTrainer}
                    style={{
                      backgroundColor: '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: isAdminDashboardDisabledForTrainer ? '#9CA3AF' : 'white',
                      cursor: isAdminDashboardDisabledForTrainer ? 'not-allowed' : 'pointer',
                    }}
                    className="w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white"
                  >
                    <span className="flex-shrink-0" style={{ color: isAdminDashboardDisabledForTrainer ? '#9CA3AF' : (isActive ? '#1DA5FF' : 'white') }}>{getIcon(item.icon)}</span>
                    <span className="font-medium" style={{ color: isAdminDashboardDisabledForTrainer ? '#9CA3AF' : (isActive ? '#1DA5FF' : 'white') }}>{item.label}</span>
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
              <span className={styles.backArrowDisabled} aria-hidden>
                <ArrowRightIcon />
              </span>
            </div>

            <div className={styles.analyticsContentArea}>
              <div className={styles.analyticsLayout}>
                <div className={styles.leftColumnWrapper}>
                  <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Average Score</h2>
                    <div className="relative flex items-center justify-center" style={{ width: '120px', height: '120px', margin: '0 auto' }}>
                      <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90" style={{ display: 'block' }}>
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
                          strokeDashoffset={2 * Math.PI * 42 * (1 - averageScorePercent / 100)}
                        />
                      </svg>
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-[1.625rem]"
                        style={{ color: 'white' }}
                      >
                        {averageScorePercent}%
                      </span>
                    </div>
                  </div>

                  <div className={`${styles.card} ${styles.topCard}`}>
                    <h2 className={styles.cardTitle}>Top</h2>
                    <div className={styles.topCardBody}>
                      <p className={styles.cardValue}>18%</p>
                      <p className={styles.cardSubtext}>of Departments</p>
                    </div>
                  </div>
                </div>

                <div className={styles.rightCard}>
                  <h2 className={styles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>Overall Progress</h2>
                  <div className={styles.chartWrapper}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.progressChart} preserveAspectRatio="xMidYMid meet">
                      <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                      <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                      {chartData.map((d, i) => {
                        const cx = xScale(d.time);
                        const cy = yScale(d.score);
                        return (
                          <g key={i} className={styles.chartNodeGroup}>
                            <circle cx={cx} cy={cy} r="18" className={styles.chartNodeHit} />
                            <circle cx={cx} cy={cy} r="8" className={styles.chartNode} />
                          </g>
                        );
                      })}
                      <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Period</text>
                      <text x={scoreLabelX} y={scoreLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Progress %</text>
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

export default AdminAnalytics;
