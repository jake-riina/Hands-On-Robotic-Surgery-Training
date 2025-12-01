import { useNavigate, useLocation } from 'react-router-dom';

const DashboardGlovesConnected = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with icons
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'dashboard'
    },
    { 
      path: '/modules', 
      label: 'Modules', 
      icon: 'modules'
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: 'analytics'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: 'settings'
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
          {/* Dashboard Cards Container */}
          <div className="flex flex-col items-center">
          {/* Top Row - 3 Cards */}
          <div className="grid mb-6" style={{ gridTemplateColumns: '320px 24px 320px 24px 320px', gap: '0' }}>
            {/* First Column: Jake's Hands On Gloves + Daily Challenge */}
            <div className="flex flex-col" style={{ height: '400px', gap: '24px', width: '320px' }}>
              {/* Box 1: Jake's Hands On Gloves Card */}
              <div 
                className="rounded-lg p-4" 
                style={{ 
                  backgroundColor: '#1E2733',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  height: '170px',
                  width: '100%'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                    Jake's Hands On Gloves
                  </h3>
                  <button className="text-gray-400 hover:text-gray-300">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M15.66 11.7l-.73-.42a3.5 3.5 0 000-1.56l.73-.42a.5.5 0 00.18-.68l-.68-1.18a.5.5 0 00-.69-.18l-.73.42a3.5 3.5 0 00-1.18-.68V6.5a.5.5 0 00-.5-.5H8.5a.5.5 0 00-.5.5v.84a3.5 3.5 0 00-1.18.68l-.73-.42a.5.5 0 00-.69.18l-.68 1.18a.5.5 0 00.18.68l.73.42a3.5 3.5 0 000 1.56l-.73.42a.5.5 0 00-.18.68l.68 1.18a.5.5 0 00.69.18l.73-.42a3.5 3.5 0 001.18.68v.84a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-.84a3.5 3.5 0 001.18-.68l.73.42a.5.5 0 00.69-.18l.68-1.18a.5.5 0 00-.18-.68z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Connected</span>
                </div>
                  <div className="flex items-center gap-2">
                    <div className="relative" style={{ width: '32px', height: '18px' }}>
                      <svg width="32" height="18" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="4" width="24" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3"/>
                        <path d="M28 7v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
                      </svg>
                      <div className="absolute inset-0 flex items-center" style={{ paddingLeft: '6px', paddingRight: '8px', gap: '3px' }}>
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }}></div>
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }}></div>
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'white' }}>70%</span>
                  </div>
              </div>

              {/* Box 4: Daily Challenge Card */}
              <div 
                className="rounded-lg p-4 flex flex-col" 
                style={{ 
                  backgroundColor: '#1E2733',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  height: '206px',
                  width: '100%'
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'white' }}>
                  Daily Challenge
                </h3>
                <div className="flex items-start justify-between flex-1">
                  <div className="flex-1 pr-4">
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: '#9CA3AF' }}>
                      Mimic finger sequences on-screen to build speed, accuracy, and awareness.
                    </p>
                    <button 
                      className="px-4 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                    >
                      Start
                    </button>
                  </div>
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#374151' }}>
                    {/* Placeholder for hand image */}
                    <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty spacer column for gap */}
            <div></div>

            {/* Box 2: Explore Modules Card */}
            <div 
              className="rounded-lg p-4 flex flex-col" 
              style={{ 
                backgroundColor: '#1E2733', 
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                  Explore Modules
                </h3>
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-gray-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="text-gray-400 hover:text-gray-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                <div 
                  className="w-full rounded-lg mb-3 overflow-hidden bg-white flex-shrink-0" 
                  style={{ 
                    height: '160px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    position: 'relative'
                  }}
                >
                  <img 
                    src="/endowrist-scissors.png" 
                    alt="Da Vinci Endowrist Scissors" 
                    style={{ 
                      maxWidth: 'calc(100% - 24px)', 
                      maxHeight: 'calc(100% - 24px)', 
                      width: 'auto', 
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0',
                      position: 'absolute',
                      left: '46%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onError={(e) => {
                      console.error('Image failed to load. Trying original path...');
                      e.currentTarget.src = "/Screenshot 2025-12-01 at 5.46.00 PM.png";
                    }}
                    onLoad={() => console.log('Image loaded successfully')}
                  />
                </div>
                <h4 className="text-base font-semibold mb-2 flex-shrink-0" style={{ color: 'white' }}>
                  Cutting (Endowrist Scissors)
                </h4>
                <p className="text-sm mb-4 leading-relaxed flex-shrink-0" style={{ color: '#9CA3AF' }}>
                  Simulate cutting along a marked virtual line, maintaining consistent pressure and path.
                </p>
                <div className="mt-auto flex-shrink-0">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="6" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M5 6V4a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M8 9v2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span className="text-sm">Locked</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty spacer column for gap */}
            <div></div>
            
            {/* Box 3: My Skills Card */}
            <div 
              className="rounded-lg p-4 flex flex-col" 
              style={{ 
                backgroundColor: '#1E2733', 
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                  My Skills
                </h3>
                <div className="flex gap-2">
                  <button className="text-white hover:text-gray-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="text-white hover:text-gray-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center flex-1 justify-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    <g transform="rotate(-90 64 64)">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#1E2733"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#1DA5FF"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56 * 0.77} ${2 * Math.PI * 56}`}
                        strokeLinecap="round"
                      />
                    </g>
                    <text
                      x="64"
                      y="64"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ 
                        fontSize: '32px', 
                        fontWeight: 'bold', 
                        fill: 'white'
                      }}
                    >
                      77%
                    </text>
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: 'white' }}>
                  Pressure Accuracy (Module 1)
                </p>
              </div>
            </div>
          </div>


          {/* Box 5: Continue Module 1 Card */}
          <div 
            className="rounded-lg p-4" 
            style={{ 
              backgroundColor: '#1E2733',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              width: '1008px',
              marginTop: '24px'
            }}
          >
            <div className="flex gap-6">
              <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#374151' }}>
                {/* Placeholder for module image */}
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'white' }}>
                  Continue Module 1: Pressure Control
                </h3>
                <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                  In Progress • Started 03 Nov 2025
                </p>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  Enhance your robotic surgery skills by mastering precise pressure control to ensure safe, accurate instrument handling.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#9CA3AF' }}>
                    <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M5 2v14M11 2v14M3 6h10M3 10h10" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: '0%',
                        backgroundColor: '#1DA5FF'
                      }}
                    ></div>
                  </div>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>0%</span>
                </div>
                <button 
                  className="px-6 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                  onClick={() => navigate('/module/1/instructions')}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardGlovesConnected;
