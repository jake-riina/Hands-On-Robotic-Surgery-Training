import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CompletedModule.module.css';

const CompleteModule2 = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as { timeTakenSeconds?: number } | null) ?? {};
  const timeTakenSeconds = Math.max(0, state.timeTakenSeconds ?? 0);

  const timeDisplay = `${Math.floor(timeTakenSeconds / 60)}:${(timeTakenSeconds % 60).toString().padStart(2, '0')}`;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/modules', label: 'Modules', icon: 'modules' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Profile', icon: 'profile' },
  ];

  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="11" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
  const ModulesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="7" height="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="9" y="9" width="7" height="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
  const AnalyticsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="15" width="3" height="2" fill="currentColor" />
      <rect x="7" y="11" width="3" height="6" fill="currentColor" />
      <rect x="11" y="8" width="3" height="9" fill="currentColor" />
      <rect x="15" y="4" width="3" height="13" fill="currentColor" />
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

  const handleRetry = () => navigate('/module/2/camera-control');
  const handleReturnToDashboard = () => navigate('/dashboard');
  const handleNextModule = () => navigate('/module/3/instructions');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      <header className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center justify-center overflow-hidden" style={{ width: '72px', height: '72px' }}>
          <img src="/Logo.png" alt="Logo" className="object-contain" style={{ width: '72px', height: '72px', maxWidth: '72px', maxHeight: '72px', objectFit: 'contain' }} />
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-500 overflow-hidden flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#9CA3AF" />
            <circle cx="14" cy="10" r="4" fill="#4B5563" />
            <path d="M 6 22 Q 6 18 10 18 L 18 18 Q 22 18 22 22 L 22 28 L 6 28 Z" fill="#4B5563" />
          </svg>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 72px)' }}>
        <aside className="w-64" style={{ backgroundColor: '#1E2733' }}>
          <nav className="py-6">
            <div className="space-y-2 pt-[30px]">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{ backgroundColor: '#1E2733', border: 'none', paddingTop: '1.5rem', paddingBottom: '1.5rem', color: 'white' }}
                  className="w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none"
                >
                  <span className="flex-shrink-0" style={{ color: 'white' }}>{getIcon(item.icon)}</span>
                  <span className="font-medium" style={{ color: 'white' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className={`flex-1 flex flex-col min-h-0 ${styles.mainContentWrapper}`}>
          <div className="max-w-2xl mx-auto px-4 flex flex-col flex-1 min-h-0" style={{ paddingLeft: '3rem', paddingRight: '3rem', paddingTop: '0.5rem', paddingBottom: '3rem', transform: 'translateX(-48px)' }}>
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold mb-6" style={{ color: '#22c55e' }}>
                Congratulations!
              </h1>
              <p className="text-xl leading-relaxed" style={{ color: '#E5E7EB' }}>
                You collected all 5 orbs. Great camera control!
              </p>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center min-h-0">
              <div className="flex flex-col items-center">
                <p className="text-lg mb-4" style={{ color: '#9CA3AF' }}>
                  Time taken: {timeDisplay}
                </p>
                <div className="relative" style={{ width: '160px', height: '160px' }}>
                  <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#374151" strokeWidth="12" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#1DA5FF"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={0}
                    />
                    <text
                      x="80"
                      y="80"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform="rotate(90 80 80)"
                      style={{ fontSize: '28px', fontWeight: 'bold', fill: 'white' }}
                    >
                      100%
                    </text>
                  </svg>
                </div>
                <p className="mt-6 text-lg" style={{ color: '#9CA3AF' }}>
                  Score: 100%
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-16">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <button
                  onClick={handleRetry}
                  className="rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#1DA5FF', padding: '8px 16px', fontSize: '12px' }}
                >
                  Retry
                </button>
                <button
                  onClick={handleReturnToDashboard}
                  className="rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#1DA5FF', padding: '8px 16px', fontSize: '12px' }}
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={handleNextModule}
                  className="rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#1DA5FF', padding: '8px 16px', fontSize: '12px' }}
                >
                  Next Module
                </button>
              </div>

              <p
                className="text-center leading-relaxed"
                style={{
                  color: '#9CA3AF',
                  fontSize: '15px',
                  maxWidth: '44rem',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginTop: '3.5rem',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem',
                }}
              >
                Camera control is essential in robotic surgery because it directly determines the surgeon's visual access to the operating field. Precise and stable camera movement ensures clear visibility of anatomical structures, supports accurate instrument manipulation, and reduces cognitive workload during complex procedures. Effective camera control is therefore a foundational skill for safe and efficient robotic surgical performance.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CompleteModule2;
