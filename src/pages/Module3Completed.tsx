import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CompletedModule.module.css';

const Module3Completed = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/modules', label: 'Modules', icon: 'modules', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/settings', label: 'Profile', icon: 'profile', className: 'text-white no-underline', iconColor: 'white' },
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

  const state = (location.state as { elapsedSeconds?: number; ringsTransferred?: number; score?: number } | null) ?? {};
  const elapsedSeconds = state.elapsedSeconds ?? 57;
  const ringsTransferred = state.ringsTransferred ?? 8;
  const totalRings = 8;
  const score = state.score ?? 80;

  const handleRepeatModule = () => navigate('/module/3/instructions');
  const handleHome = () => navigate('/dashboard');
  const handleNextModule = () => navigate('/modules');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
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

        <main className={`flex-1 ${styles.mainContentWrapper}`}>
          <div className="max-w-6xl mx-auto">
            <div className={`text-center ${styles.pageHeader}`}>
              <h1 className="text-5xl font-bold mb-4" style={{ color: 'white' }}>Congratulations!</h1>
              <h2 className="text-3xl font-semibold" style={{ color: 'white' }}>You have completed Module 3</h2>
            </div>

            <div className={styles.completionLayout}>
              <section className={styles.leftPanel}>
                <div className={`w-full ${styles.leftPanelCard}`}>
                  <p className={styles.percentageLine} style={{ marginTop: 0 }}>
                    <span className={styles.percentageValue}>{elapsedSeconds}</span> seconds spent transferring rings
                  </p>
                  <p className={styles.percentageLine}>
                    <span className={styles.percentageValue}>{ringsTransferred} out of {totalRings}</span> rings transferred
                  </p>
                  <p className={styles.percentageLine} style={{ color: '#E5E7EB', fontWeight: 500 }}>
                    Great job moving the rings to the opposite side. Practice will improve your speed and precision.
                  </p>
                </div>
              </section>

              <section className={styles.rightPanel}>
                <div className={styles.existingCompletionContent}>
                  <div className={`flex flex-col items-center ${styles.rightContentRing}`}>
                    <p className="text-lg mb-2" style={{ color: '#9CA3AF' }}>Overall Score</p>
                    <div className="relative" style={{ width: '200px', height: '200px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                        <circle cx="100" cy="100" r="85" fill="none" stroke="#374151" strokeWidth="14" />
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                        <span className="text-4xl font-bold" style={{ color: 'white' }}>{score}%</span>
                        <span className="text-base mt-1" style={{ color: '#9CA3AF' }}>Great job!</span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex justify-center gap-4 flex-wrap ${styles.rightContentButtons}`}>
                    <button onClick={handleRepeatModule} className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white" style={{ backgroundColor: '#1DA5FF' }}>
                      Repeat Module
                    </button>
                    <button onClick={handleHome} className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white" style={{ backgroundColor: '#1DA5FF' }}>
                      Home
                    </button>
                    <button onClick={handleNextModule} className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90 text-white" style={{ backgroundColor: '#1DA5FF' }}>
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

export default Module3Completed;
