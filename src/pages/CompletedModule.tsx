import { useNavigate, useLocation } from 'react-router-dom';

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
      label: 'Settings', 
      icon: 'settings', 
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
      case 'modules':
        return <ModulesIcon />;
      case 'analytics':
        return <AnalyticsIcon />;
      case 'settings':
        return <SettingsIcon />;
      default:
        return null;
    }
  };

  // Placeholder scores
  const overallScore = 77.5;
  const exercise1Score = 70;
  const exercise2Score = 85;

  const handleRepeatModule = () => {
    navigate('/module/1/instructions');
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  const handleNextModule = () => {
    navigate('/modules');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center overflow-hidden" style={{ width: '100px', height: '100px' }}>
            <img 
              src="/Logo.png" 
              alt="Logo" 
              className="object-contain"
              style={{ 
                width: '100px', 
                height: '100px', 
                maxWidth: '100px', 
                maxHeight: '100px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
        {/* Profile picture */}
        <div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#9CA3AF"/>
            <circle cx="14" cy="10" r="4" fill="#4B5563"/>
            <path d="M 6 22 Q 6 18 10 18 L 18 18 Q 22 18 22 22 L 22 28 L 6 28 Z" fill="#4B5563"/>
          </svg>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 72px)' }}>
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
                      backgroundColor: isActive ? '#1DA5FF' : '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: 'white'
                    }}
                    className={`w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white`}
                  >
                    <span className="flex-shrink-0" style={{ color: 'white' }}>{getIcon(item.icon)}</span>
                    <span className="font-medium" style={{ color: 'white' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1" style={{ padding: '32px 48px' }}>
          <div className="max-w-6xl mx-auto">
            {/* Congratulations Title */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-4" style={{ color: 'white' }}>
                Congratulations!
              </h1>
              <h2 className="text-3xl font-semibold" style={{ color: 'white' }}>
                You have completed Module 1
              </h2>
            </div>

            {/* Exercise Cards and Overall Accuracy */}
            <div className="flex justify-center items-start" style={{ gap: '40px', marginTop: '60px', width: '100%' }}>
              {/* Exercise 1 Card - Left */}
              <div className="bg-gray-800 rounded-lg shadow-lg text-center" style={{ width: '300px', height: '300px', backgroundColor: '#1E2733', padding: '32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'white' }}>Exercise 1</h3>
                <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                  You maintained steady, controlled pressure for most of the session.
                </p>
                <div className="text-4xl font-bold mb-2" style={{ color: 'white' }}>{exercise1Score}%</div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>Accuracy</div>
              </div>

              {/* Overall Accuracy Box - Center with dark container */}
              <div className="relative flex justify-center" style={{ width: '340px' }}>
                {/* Dark background container behind */}
                <div 
                  className="absolute bg-gray-800 rounded-lg shadow-lg" 
                  style={{ 
                    width: '400px', 
                    height: '100%', 
                    top: '-30px', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1,
                    minHeight: '400px',
                    backgroundColor: '#1E2733'
                  }}
                ></div>
                {/* Overall Accuracy Box */}
                <div className="relative bg-gray-800 rounded-lg shadow-2xl text-center" style={{ width: '340px', zIndex: 10, padding: '48px 32px', backgroundColor: '#1E2733' }}>
                  <h3 className="text-2xl font-bold mb-6" style={{ color: 'white' }}>
                    Overall Accuracy
                  </h3>
                  <div className="text-6xl font-bold mb-4" style={{ color: 'white' }}>
                    {overallScore}%
                  </div>
                  <p className="text-lg mb-8" style={{ color: 'white' }}>
                    Great job!
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRepeatModule}
                      className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Repeat Module
                    </button>
                    <button
                      onClick={handleHome}
                      className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Home
                    </button>
                    <button
                      onClick={handleNextModule}
                      className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-white"
                      style={{ backgroundColor: '#1DA5FF' }}
                    >
                      Next Module
                    </button>
                  </div>
                </div>
              </div>

              {/* Exercise 2 Card - Right */}
              <div className="bg-gray-800 rounded-lg shadow-lg text-center" style={{ width: '300px', height: '300px', backgroundColor: '#1E2733', padding: '32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'white' }}>Exercise 2</h3>
                <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                  You accurately followed expert movements.
                </p>
                <div className="text-4xl font-bold mb-2" style={{ color: 'white' }}>{exercise2Score}%</div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>Accuracy</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CompletedModule;
