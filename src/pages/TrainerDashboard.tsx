import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import TraineeModuleProgressModal from '../components/TraineeModuleProgressModal';
import styles from './TrainerDashboard.module.css';
import adminDashboardStyles from './AdminDashboard.module.css';

type TraineeListItem = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

const MODULE_CARDS = [
  { title: 'Module 1', viewName: 'module1_department_percentile' },
  { title: 'Module 2', viewName: 'module2_department_percentile' },
  { title: 'Module 3', viewName: 'module3_department_percentile' },
] as const;

const TrainerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentRole, setCurrentRole] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [moduleAveragePercent, setModuleAveragePercent] = useState<number>(0);
  const [departmentTrainees, setDepartmentTrainees] = useState<TraineeListItem[]>([]);
  const [trainerDepartmentId, setTrainerDepartmentId] = useState<string | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [progressModalTrainee, setProgressModalTrainee] = useState<TraineeListItem | null>(null);

  const activeModule = MODULE_CARDS[activeModuleIndex];
  const activeModuleNumber = (activeModuleIndex + 1) as 1 | 2 | 3;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, email, first_name, department_id, program_id')
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
      setFirstName(typeof profile.first_name === 'string' ? profile.first_name.trim() : '');

      // Module averages remain department-scoped.
      if (profile.department_id) {
        setTrainerDepartmentId(profile.department_id);
      } else {
        setTrainerDepartmentId(null);
        setModuleAveragePercent(0);
      }

      let traineesQuery = supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'trainee');

      if (profile.role === 'admin') {
        if (!profile.program_id) {
          setDepartmentTrainees([]);
          return;
        }
        traineesQuery = traineesQuery.eq('program_id', profile.program_id);
      } else {
        if (!profile.department_id) {
          setDepartmentTrainees([]);
          return;
        }
        traineesQuery = traineesQuery.eq('department_id', profile.department_id);
      }

      const { data: traineeRows, error: traineesError } = await traineesQuery
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true });

      if (traineesError) {
        setDepartmentTrainees([]);
      } else {
        setDepartmentTrainees((traineeRows ?? []) as TraineeListItem[]);
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const fetchModuleAverage = async () => {
      if (!trainerDepartmentId) {
        setModuleAveragePercent(0);
        return;
      }

      const { data: rows, error: averageError } = await supabase
        .from(activeModule.viewName)
        .select('score')
        .eq('department_id', trainerDepartmentId)
        .not('score', 'is', null);

      if (averageError || !rows?.length) {
        setModuleAveragePercent(0);
        return;
      }

      const totalScore = rows.reduce((sum, row) => sum + Number(row.score ?? 0), 0);
      const averageScorePercent = Math.round((totalScore / rows.length) * 100);
      const normalizedAverage = Math.max(0, Math.min(100, averageScorePercent));
      setModuleAveragePercent(normalizedAverage);
    };

    fetchModuleAverage();
  }, [activeModule.viewName, trainerDepartmentId]);

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
  const offset = dash * (1 - moduleAveragePercent / 100);

  const progressModalDisplayName = progressModalTrainee
    ? `${progressModalTrainee.first_name ?? ''} ${progressModalTrainee.last_name ?? ''}`.trim() ||
      progressModalTrainee.email ||
      'Trainee'
    : '';

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
            Hello, {firstName || 'Trainer'}
          </h2>

          <div className={styles.grid}>
            <section className={styles.card} aria-label="Module 1 progress">
              <div className={styles.moduleCardHeader}>
                <h2 className={adminDashboardStyles.chartCardTitle} style={{ margin: 0, textAlign: 'left' }}>
                  {activeModule.title}
                </h2>
                <div className={styles.arrowGroup}>
                  <button
                    type="button"
                    className={styles.arrowBtn}
                    aria-label="Previous module"
                    onClick={() =>
                      setActiveModuleIndex(
                        (prevIndex) => (prevIndex - 1 + MODULE_CARDS.length) % MODULE_CARDS.length
                      )
                    }
                  >
                    <ArrowLeftIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.arrowBtn}
                    aria-label="Next module"
                    onClick={() =>
                      setActiveModuleIndex((prevIndex) => (prevIndex + 1) % MODULE_CARDS.length)
                    }
                  >
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
                  <span className={styles.donutLabel}>{moduleAveragePercent}%</span>
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
                {departmentTrainees.map((trainee) => {
                  const fullName = `${trainee.first_name ?? ''} ${trainee.last_name ?? ''}`.trim();
                  const displayName = fullName || trainee.email || 'Unnamed trainee';

                  return (
                  <div key={trainee.user_id} className={styles.traineeRow}>
                    <div className={styles.avatarWrap} aria-hidden>
                      <svg className={styles.avatarSvg} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="22" cy="22" r="21" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                        <circle cx="22" cy="17" r="5" stroke="white" strokeWidth="1.5"/>
                        <path d="M9 37c0-7 6-12 13-12s13 5 13 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className={styles.traineeName}>{displayName}</p>
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => setProgressModalTrainee(trainee)}
                    >
                      View Progress
                    </button>
                  </div>
                );
                })}
                {departmentTrainees.length === 0 && (
                  <p className={styles.emptyTraineeText}>No trainees found in your department.</p>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <TraineeModuleProgressModal
        isOpen={progressModalTrainee !== null}
        onClose={() => setProgressModalTrainee(null)}
        traineeUserId={progressModalTrainee?.user_id ?? ''}
        displayName={progressModalDisplayName}
        moduleId={activeModuleNumber}
        departmentId={trainerDepartmentId}
      />
    </div>
  );
};

export default TrainerDashboard;
