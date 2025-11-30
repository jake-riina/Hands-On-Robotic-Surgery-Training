import { useNavigate, useLocation } from 'react-router-dom';

const Module1Instructions = () => {
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

  // Star icon for achievements
  const StarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5"/>
    </svg>
  );

  // Arrow left icon
  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );


  const handleBeginTraining = () => {
    navigate('/module/1/exercise/1/start');
  };

  const handleViewCompletedModule = () => {
    navigate('/module/1/completed');
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
            {/* Back Button */}
            <button
              onClick={() => navigate('/modules')}
              className="flex items-center gap-2 text-white mb-6 hover:opacity-80 transition-opacity"
            >
              <ArrowLeftIcon />
              <span className="text-lg">Modules</span>
            </button>

            {/* Module Title */}
            <h1 className="text-4xl font-bold mb-6" style={{ color: 'white' }}>
              Module 1: Pressure Control
            </h1>

            {/* Instructional Text */}
            <p className="text-lg leading-relaxed max-w-4xl" style={{ color: 'white', marginBottom: '60px' }}>
              In robotic surgery, your hands guide every movement of the instruments. The amount of pressure you apply to the console controls determines how firmly the robot interacts with tissue. Too much pressure can cause harm; too little can make movements imprecise.
            </p>

            {/* Embedded Application Preview */}
            <div className="flex justify-center" style={{ marginTop: '60px', marginBottom: '60px', gap: '40px' }}>
              {/* Exercise 1 Preview */}
              <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '100%', maxWidth: '500px', backgroundColor: '#26313E' }}>
                <img 
                  src="/Exercise 1.png" 
                  alt="Exercise 1 Preview" 
                  className="w-full h-auto object-contain"
                />
              </div>
              {/* Exercise 2 Preview */}
              <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '100%', maxWidth: '500px', backgroundColor: '#26313E' }}>
                <img 
                  src="/Exercise 2.png" 
                  alt="Exercise 2 Preview" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* Bottom Section - Achievements and Begin Button */}
            <div className="flex items-center justify-between">
              {/* Achievements */}
              <div className="flex items-center" style={{ gap: '32px' }}>
                <div className="flex items-center gap-2">
                  <StarIcon />
                  <span className="text-lg" style={{ color: 'white' }}>Optimal Pressure</span>
                </div>
                <div className="flex items-center gap-2">
                  <StarIcon />
                  <span className="text-lg" style={{ color: 'white' }}>Consistent Force</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {/* Placeholder button to view completed module */}
                <button
                  onClick={handleViewCompletedModule}
                  className="px-6 py-4 rounded-lg font-semibold text-white text-lg transition-colors hover:opacity-90 border-2"
                  style={{ backgroundColor: 'transparent', borderColor: '#1DA5FF', color: '#1DA5FF' }}
                >
                  View Score
                </button>
                {/* Begin Training Button */}
                <button
                  onClick={handleBeginTraining}
                  className="px-8 py-4 rounded-lg font-semibold text-white text-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1DA5FF' }}
                >
                  Begin Training
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module1Instructions;
