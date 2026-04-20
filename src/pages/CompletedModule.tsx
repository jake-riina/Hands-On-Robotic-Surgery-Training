import { useNavigate, useLocation } from 'react-router-dom';
import { module1PressureBarGradient } from '../lib/module1PressureGauge';
import styles from './CompletedModule.module.css';
import ProfileDropdown from '../components/ProfileDropdown';

const CompletedModule = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with icons
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'dashboard', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/modules', 
      label: 'Modules', 
      icon: 'modules', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: 'analytics', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/settings', 
      label: 'Profile', 
      icon: 'profile', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
  ];

  // Icon components as inline SVGs
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
      case 'dashboard':
        return <DashboardIcon />;
      case 'modules':
        return <ModulesIcon />;
      case 'analytics':
        return <AnalyticsIcon />;
      case 'profile':
        return <ProfileIcon />;
      default:
        return null;
    }
  };

  // Score from exercise (Continue) or fallback when visiting directly.
  // Prefer the score passed via navigation state; otherwise fall back to the last
  // saved Module 1 score in localStorage so repeat visits don't show 0%.
  const stateScore = (location.state as { score?: number } | null)?.score;
  let persistedScore: number | null = null;
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('module1_last_score');
    if (stored !== null && !Number.isNaN(Number(stored))) {
      persistedScore = Number(stored);
    }
  }
  const score = stateScore ?? persistedScore ?? 0;

  // Placeholder pressure distribution (TODO: wire to real data when available)
  const INSUFFICIENT_PRESSURE_PCT = 10;
  const OPTIMAL_PRESSURE_PCT = 80;
  const EXCESSIVE_PRESSURE_PCT = 10;

  const handleRepeatModule = () => {
    navigate('/module/1/instructions');
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  const handleNextModule = () => {
    navigate('/module/2/instructions');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
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
        {/* Profile picture */}
        <ProfileDropdown />
      </header>

      {/* Main Layout Container */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 88px)' }}>
        {/* Sidebar Container - Left Navigation */}
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
                    style={{ 
                      backgroundColor: '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: isActive ? '#1DA5FF' : 'white'
                    }}
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

        {/* Main Content Area */}
        <main className={`flex-1 ${styles.mainContentWrapper}`}>
          <div className="max-w-6xl mx-auto">
            {/* Page header - centered above both columns */}
            <div className={`text-center ${styles.pageHeader}`}>
              <h1 className="text-5xl font-bold mb-4" style={{ color: 'white' }}>
                Congratulations!
              </h1>
              <h2 className="text-3xl font-semibold" style={{ color: 'white' }}>
                You have completed Module 1
              </h2>
            </div>

            <div className={styles.completionLayout}>
              <section className={styles.leftPanel}>
                {/* Pressure Summary - reuses gradient bar from Module1Exercise1Start */}
                <div className={`w-full ${styles.leftPanelCard}`}>
                  <div
                    className="w-full h-[48px] rounded-[14px] shadow-lg"
                    style={{
                      background: module1PressureBarGradient(),
                      border: '1.5px solid #e2e8f0',
                      boxShadow: '0 4px 24px 2px rgba(0,0,0,0.04)',
                    }}
                  />
                  <div className={styles.pressureBarLabels}>
                    <span className={styles.pressureBarLabel}>Insufficient Pressure</span>
                    <span className={styles.pressureBarLabel}>Optimal Pressure</span>
                    <span className={styles.pressureBarLabel}>Excessive Pressure</span>
                  </div>
                  <p className={styles.percentageLine}>
                    <span className={styles.percentageValue}>{INSUFFICIENT_PRESSURE_PCT}%</span> of time spent
                    applying <span className={styles.percentageTerm}>insufficient pressure</span>
                  </p>
                  <p className={styles.percentageLine}>
                    <span className={styles.percentageValue}>{OPTIMAL_PRESSURE_PCT}%</span> of time spent
                    applying <span className={styles.percentageTerm}>optimal pressure</span>
                  </p>
                  <p className={styles.percentageLine}>
                    <span className={styles.percentageValue}>{EXCESSIVE_PRESSURE_PCT}%</span> of time spent
                    applying <span className={styles.percentageTerm}>excessive pressure</span>
                  </p>
                </div>
              </section>

              <section className={styles.rightPanel}>
                <div className={styles.existingCompletionContent}>
                  {/* Circular Score Bar */}
                  <div className={`flex flex-col items-center ${styles.rightContentRing}`}>
                    <div className="relative" style={{ width: '200px', height: '200px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                        {/* Background ring */}
                        <circle
                          cx="100"
                          cy="100"
                          r="85"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="14"
                        />
                        {/* Score ring */}
                        <circle
                          cx="100"
                          cy="100"
                          r="85"
                          fill="none"
                          stroke="#1DA5FF"
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 85}
                          strokeDashoffset={2 * Math.PI * 85 * (1 - Math.min(100, Math.max(0, score)) / 100)}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                      >
                        <span className="text-4xl font-bold" style={{ color: 'white' }}>
                          {score.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-lg mt-4" style={{ color: '#9CA3AF' }}>Score</p>
                  </div>

                  {/* Action buttons */}
                  <div className={`flex justify-center gap-4 flex-wrap ${styles.rightContentButtons}`}>
                    <button
                      onClick={handleRepeatModule}
                      className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Repeat Module
                    </button>
                    <button
                      onClick={handleHome}
                      className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Home
                    </button>
                    <button
                      onClick={handleNextModule}
                      className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Next Module
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CompletedModule;
