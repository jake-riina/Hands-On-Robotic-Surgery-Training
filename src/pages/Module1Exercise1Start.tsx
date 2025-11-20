import { useNavigate, useLocation } from 'react-router-dom';

const Module1Exercise1Start = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with icons (using simple SVG icons;no bullet points))
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'dashboard', 
      className: 'text-white no-underline', // assume in rendering, buttons/links are not inside a <ul>
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

  // Gauge component - semi-circular gauge with three colored sections
  const PressureGauge = () => {
    return (
      <div className="flex flex-col items-center">
        <p className="text-white text-lg mb-4">Apply Pressure To Begin!</p>
        
        {/* Semi-circular gauge */}
        <div className="relative w-80 h-40 mb-8">
          <svg width="320" height="160" viewBox="0 0 320 160" className="overflow-visible">
            {/* Red section (left/low pressure) */}
            <path
              d="M 20 140 A 140 140 0 0 1 90 30"
              stroke="none"
              fill="#EF4444"
            />
            
            {/* Green section (middle/optimal pressure) */}
            <path
              d="M 90 30 A 140 140 0 0 1 230 30"
              stroke="none"
              fill="#22C55E"
            />
            
            {/* Orange section (right/high pressure) */}
            <path
              d="M 230 30 A 140 140 0 0 1 300 140"
              stroke="none"
              fill="#F97316"
            />
            
            {/* Outer arc border */}
            <path
              d="M 20 140 A 140 140 0 0 1 300 140"
              stroke="#4B5563"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Center line */}
            <line
              x1="160"
              y1="160"
              x2="160"
              y2="20"
              stroke="#4B5563"
              strokeWidth="2"
            />
          </svg>
          
          {/* Pointer triangle below the gauge */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
            <svg width="20" height="20" viewBox="0 0 20 20" className="text-white">
              <path d="M 10 0 L 0 20 L 20 20 Z" fill="white" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#26313E' }}>
        <div className="flex items-center gap-4">
          {/* Logo placeholder */}
          <div className="w-10 h-8 bg-gray-400 rounded"></div>
          {/* Application title */}
          <h1 className="text-white text-xl font-semibold">Hands On</h1>
        </div>
        {/* Profile picture */}
        <div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#9CA3AF"/>
            <circle cx="20" cy="16" r="6" fill="#4B5563"/>
            <path d="M 8 32 Q 8 26 12 26 L 28 26 Q 32 26 32 32 L 32 40 L 8 40 Z" fill="#4B5563"/>
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
                // Check if button is active based on current route
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
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Exercise Title */}
            <h2 className="text-white text-3xl font-bold mb-6">
              Exercise 1: Find the Right Pressure
            </h2>

            <div className="flex gap-12 items-start">
              {/* Left Section - Instructions */}
              <div className="flex-1">
                <div className="space-y-4 text-white">
                  <p className="text-lg leading-relaxed">
                    Apply pressure to the control handles and watch the bar respond.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Keep the bar in the green zone for as much of the 20 seconds as possible. This zone represents optimal pressure for safe and precise movement!
                  </p>
                </div>
              </div>

              {/* Right Section - Pressure Gauge */}
              <div className="flex-1 flex justify-center">
                <PressureGauge />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module1Exercise1Start;