import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import styles from './TrainerDashboard.module.css';
import adminDashboardStyles from './AdminDashboard.module.css';

const PLACEHOLDER_TRAINEES = [
  'John Doe',
  'Jane Doe',
  'John Smith',
  'Jane Smith',
  'Alex Johnson',
];

const MODULE_AVERAGE_PERCENT = 75;

const TrainerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      setCurrentRole(profile.role || '');

    };

    checkUser();
  }, [navigate]);

  const navItems = [
    { path: '/admin/dashboard', label: 'Admin Dashboard', icon: 'dashboard' },
    { path: '/admin/trainees', label: 'Trainer Dashboard', icon: 'trainees' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
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

  const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M15.66 11.7l-.73-.42a3.5 3.5 0 000-1.56l.73-.42a.5.5 0 00.18-.68l-.68-1.18a.5.5 0 00-.69-.18l-.73.42a3.5 3.5 0 00-1.18-.68V6.5a.5.5 0 00-.5-.5H8.5a.5.5 0 00-.5.5v.84a3.5 3.5 0 00-1.18.68l-.73-.42a.5.5 0 00-.69.18l-.68 1.18a.5.5 0 00.18.68l.73.42a3.5 3.5 0 000 1.56l-.73.42a.5.5 0 00-.18.68l.68 1.18a.5.5 0 00.69.18l.73-.42a3.5 3.5 0 001.18.68v.84a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-.84a3.5 3.5 0 001.18-.68l.73.42a.5.5 0 00.69-.18l.68-1.18a.5.5 0 00-.18-.68z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
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
      case 'settings':
        return <SettingsIcon />;
      default:
        return null;
    }
  };

  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const r = 76;
  const dash = 2 * Math.PI * r;
  const offset = dash * (1 - MODULE_AVERAGE_PERCENT / 100);

  return (
    <div className={styles.page}>
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
                    type="button"
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

        <main className={styles.main}>
          <h2 className="text-2xl font-semibold" style={{ color: '#ffffff', margin: '0 0 28px 0' }}>
            Hello, Trainer
          </h2>

          <div className={styles.grid}>
            <section className={styles.card} aria-label="Module 1 progress">
              <div className={styles.moduleCardHeader}>
                <h2 className={adminDashboardStyles.chartCardTitle} style={{ margin: 0, textAlign: 'left' }}>
                  Module 1
                </h2>
                <div className={styles.arrowGroup}>
                  <button type="button" className={styles.arrowBtn} aria-label="Previous module">
                    <ArrowLeftIcon />
                  </button>
                  <button type="button" className={styles.arrowBtn} aria-label="Next module">
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>

              <div className={styles.chartBlock}>
                <div className={styles.donutWrap}>
                  <svg className={styles.donutSvg} width="180" height="180" viewBox="0 0 180 180">
                    <circle cx="90" cy="90" r={r} fill="none" stroke="#374151" strokeWidth="14" />
                    <circle
                      cx="90"
                      cy="90"
                      r={r}
                      fill="none"
                      stroke="#1DA5FF"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={dash}
                      strokeDashoffset={offset}
                    />
                  </svg>
                  <span className={styles.donutLabel}>{MODULE_AVERAGE_PERCENT}%</span>
                </div>
                <p className={styles.averageLabel}>Average Score</p>
              </div>

              <button type="button" className={styles.primaryBtn}>
                View Trainee Progress
              </button>
            </section>

            <section className={styles.card} aria-label="My trainees">
              <h2 className={adminDashboardStyles.chartCardTitle} style={{ textAlign: 'left' }}>
                My Trainees
              </h2>
              <div className={styles.traineeList}>
                {PLACEHOLDER_TRAINEES.map((name) => (
                  <div key={name} className={styles.traineeRow}>
                    <div className={styles.avatarWrap} aria-hidden>
                      <svg className={styles.avatarSvg} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="22" cy="22" r="21" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                        <circle cx="22" cy="17" r="5" stroke="white" strokeWidth="1.5"/>
                        <path d="M9 37c0-7 6-12 13-12s13 5 13 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className={styles.traineeName}>{name}</p>
                    <button type="button" className={styles.rowBtn}>
                      View Progress
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TrainerDashboard;
