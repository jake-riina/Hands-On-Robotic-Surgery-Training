import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useBLE } from '../contexts/BLEContext';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import ChevronNavButtons from '../components/ChevronNavButtons';

const EXPLORE_MODULES = [
  {
    id: 1,
    title: 'Module 1: Pressure',
    description: 'Learn consistent, controlled pressure on the Da Vinci console.',
    cover: '/Mod1Cover.png',
    route: '/module/1/instructions',
  },
  {
    id: 2,
    title: 'Module 2: Camera Control',
    description: 'Master camera positioning for an optimal surgical view.',
    cover: '/CamControl.png',
    route: '/module/2/instructions',
  },
  {
    id: 3,
    title: 'Module 3: Peg Transfer',
    description: 'Build precision and dexterity with peg transfer between targets.',
    cover: '/Peg.png',
    route: '/module/3/peg-transfer',
  },
];

// My Skills: different # of attempts per module (nonlinear upward), title, blurb
const MY_SKILLS_MODULES = [
  { title: 'Module 1: Pressure', scores: [56, 66, 78, 87, 94], highScoreBlurb: '94% high score on your latest attempt.' },           // 5 attempts
  { title: 'Module 2: Camera Control', scores: [52, 68, 80, 89], highScoreBlurb: '89% high score on your latest attempt.' },          // 4 attempts
  { title: 'Module 3: Peg Transfer', scores: [48, 58, 70, 78, 86, 92], highScoreBlurb: '92% high score on your latest attempt.' },   // 6 attempts
];

const scoreToY = (score: number) => Math.round(158 - score * 1.38);
const X_MIN = 44;
const X_MAX = 252;
const getGraphX = (n: number) => n <= 1 ? [148] : Array.from({ length: n }, (_, i) => Math.round(X_MIN + (X_MAX - X_MIN) * i / (n - 1)));

const DashboardGlovesConnected = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exploreModuleIndex, setExploreModuleIndex] = useState(0);
  const [mySkillsModuleIndex, setMySkillsModuleIndex] = useState(0);

  // Check user role and redirect if admin
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role === 'admin') {
        navigate('/admin/dashboard');
      }
    };

    checkUserRole();
  }, [navigate]);
  
  // Use shared BLE context
  const { 
    isConnected, 
    isConnecting, 
    connectionStatus,
    connect: connectBLE,
    disconnect: disconnectBLE
  } = useBLE();

  const handleConnectGloves = async () => {
    await connectBLE();
  };
  
  const handleDisconnectGloves = async () => {
    await disconnectBLE();
  };


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
      <header className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center overflow-hidden" style={{ width: '72px', height: '72px' }}>
            <img 
              src="/Logo.png" 
              alt="Logo" 
              className="object-contain"
              style={{ 
                width: '72px', 
                height: '72px', 
                maxWidth: '72px', 
                maxHeight: '72px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
        {/* Profile picture */}
        <ProfileDropdown />
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
                      backgroundColor: '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: 'white'
                    }}
                    className={`w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white`}
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
        <main className="flex-1" style={{ padding: '32px 48px' }}>
          {/* Dashboard Cards Container */}
          <div className="flex flex-col items-center">
          {/* Top Row - 3 Cards */}
          <div className="grid mb-6" style={{ gridTemplateColumns: '320px 24px 320px 24px 320px', gap: '0' }}>
            {/* First Column: Jake's Hands On Gloves + Daily Challenge */}
            <div className="flex flex-col" style={{ height: '400px', gap: '24px', width: '320px' }}>
              {/* Box 1: Jake's Hands On Gloves Card */}
              <div 
                className="rounded-lg relative" 
                style={{ 
                  backgroundColor: '#1E2733',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  height: '170px',
                  width: '100%'
                }}
              >
                {!isConnected && (
                  <div className="absolute" style={{ top: '50px', right: '16px', width: '180px', height: '135px' }}>
                    <img 
                      src="/Screenshot-3.png" 
                      alt="HandsOn Gloves" 
                      className="object-contain"
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        maxWidth: '180px',
                        maxHeight: '135px'
                      }}
                    />
                  </div>
                )}
                <div className="p-4" style={{ height: '100%', boxSizing: 'border-box' }}>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                      Jake's HandsOn Gloves
                    </h3>
                  </div>
                  {/* Connection status row */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ 
                          width: '8px', 
                          height: '8px',
                          backgroundColor: isConnected ? '#10B981' : '#EF4444' // green vs red
                        }}
                      ></div>
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>
                        {isConnected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                  </div>

                  {/* Connect / Disconnect button */}
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGloves}
                      disabled={isConnecting}
                      className="mt-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                      style={{
                        backgroundColor: '#EF4444',
                        color: 'white',
                      }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGloves}
                      disabled={isConnecting}
                      className="mt-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 border-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:opacity-60"
                      style={{
                        backgroundColor: '#1DA5FF',
                        color: 'white',
                      }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )}

                  {/* Status message */}
                  <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                    {connectionStatus}
                  </p>
                </div>
              </div>


              {/* Box 4: Daily Challenge Card */}
              <div 
                className="rounded-lg flex flex-col" 
                style={{ 
                  backgroundColor: '#1E2733',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  height: '206px',
                  width: '100%'
                }}
              >
                <div className="p-4 flex flex-col flex-1" style={{ minHeight: 0, boxSizing: 'border-box' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'white' }}>
                    Daily Challenge
                  </h3>
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 pr-4">
                      <p className="text-sm mb-4 leading-relaxed" style={{ color: '#9CA3AF' }}>
                        Mimic finger sequences on-screen to build speed, accuracy, and awareness.
                      </p>
                      <button 
                        className="px-4 py-2 rounded-lg font-medium text-sm cursor-pointer hover:opacity-90 border-0"
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
            </div>

            {/* Empty spacer column for gap */}
            <div></div>

            {/* Box 2: Explore Modules Card - carousel for each of the 3 modules */}
            <div 
              className="rounded-lg flex flex-col" 
              style={{ 
                backgroundColor: '#1E2733', 
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="p-4 flex flex-col flex-1" style={{ minHeight: 0, boxSizing: 'border-box' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                    Explore Modules
                  </h3>
                  <ChevronNavButtons
                    onPrev={() => setExploreModuleIndex((i) => (i - 1 + EXPLORE_MODULES.length) % EXPLORE_MODULES.length)}
                    onNext={() => setExploreModuleIndex((i) => (i + 1) % EXPLORE_MODULES.length)}
                    ariaLabelPrev="Previous module"
                    ariaLabelNext="Next module"
                  />
                </div>
                <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                {(() => {
                  const module = EXPLORE_MODULES[exploreModuleIndex];
                  return (
                    <>
                      <div className="flex-1 flex items-center min-h-0" style={{ minHeight: 0 }}>
                        <div 
                          className="w-full rounded-lg overflow-hidden bg-white flex-shrink-0" 
                          style={{ 
                            height: '212px',
                            width: '100%',
                            position: 'relative',
                            paddingLeft: '16px',
                            paddingRight: '16px',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            boxSizing: 'border-box'
                          }}
                        >
                          <img 
                            src={module.cover} 
                            alt={module.title} 
                            style={{ 
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center center',
                              display: 'block',
                              borderRadius: '8px'
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '/Mod1Cover.png';
                            }}
                          />
                        </div>
                      </div>
                      <h4 className="text-base font-semibold flex-shrink-0" style={{ color: 'white', marginBottom: '4px' }}>
                        {module.title}
                      </h4>
                      <p className="text-sm mb-4 leading-relaxed flex-shrink-0" style={{ color: '#9CA3AF' }}>
                        {module.description}
                      </p>
                      <div className="mt-auto flex-shrink-0">
                        <button 
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer hover:opacity-90 border-0"
                          style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                          onClick={() => navigate(module.route)}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm">Go to Module</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
                </div>
              </div>
            </div>

            {/* Empty spacer column for gap */}
            <div></div>
            
            {/* Box 3: My Skills Card */}
            <div 
              className="rounded-lg flex flex-col" 
              style={{ 
                backgroundColor: '#1E2733', 
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="p-4 flex flex-col flex-1" style={{ minHeight: 0, boxSizing: 'border-box' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'white' }}>
                    My Skills
                  </h3>
                  <ChevronNavButtons
                    onPrev={() => setMySkillsModuleIndex((i) => (i - 1 + MY_SKILLS_MODULES.length) % MY_SKILLS_MODULES.length)}
                    onNext={() => setMySkillsModuleIndex((i) => (i + 1) % MY_SKILLS_MODULES.length)}
                    ariaLabelPrev="Previous module"
                    ariaLabelNext="Next module"
                  />
                </div>
                <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                {(() => {
                  const skill = MY_SKILLS_MODULES[mySkillsModuleIndex];
                  const graphX = getGraphX(skill.scores.length);
                  const points = skill.scores.map((s, i) => `${graphX[i]},${scoreToY(s)}`).join(' ');
                  return (
                    <>
                      <div className="flex-1 flex items-center min-h-0" style={{ minHeight: 0 }}>
                        <div 
                          className="w-full rounded-lg flex items-center justify-center flex-shrink-0" 
                          style={{ height: '212px' }}
                        >
                          <svg width="100%" height="170" viewBox="0 0 260 190" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '280px', transform: 'translateX(-24px)' }}>
                            <text x="14" y="95" textAnchor="middle" transform="rotate(-90 14 95)" style={{ fontSize: '10px', fill: '#9CA3AF' }}>Score</text>
                            <line x1="44" y1="20" x2="44" y2="158" stroke="#374151" strokeWidth="1" />
                            <text x="38" y="24" textAnchor="end" style={{ fontSize: '9px', fill: '#9CA3AF' }}>100</text>
                            <text x="38" y="54" textAnchor="end" style={{ fontSize: '9px', fill: '#9CA3AF' }}>75</text>
                            <text x="38" y="89" textAnchor="end" style={{ fontSize: '9px', fill: '#9CA3AF' }}>50</text>
                            <text x="38" y="126" textAnchor="end" style={{ fontSize: '9px', fill: '#9CA3AF' }}>25</text>
                            <text x="38" y="158" textAnchor="end" style={{ fontSize: '9px', fill: '#9CA3AF' }}>0</text>
                            <line x1="44" y1="158" x2="252" y2="158" stroke="#374151" strokeWidth="1" />
                            {graphX.map((x, i) => (
                              <text key={i} x={x} y="170" textAnchor="middle" style={{ fontSize: '9px', fill: '#9CA3AF' }}>{i + 1}</text>
                            ))}
                            <text x="148" y="186" textAnchor="middle" style={{ fontSize: '10px', fill: '#9CA3AF' }}>Attempt #</text>
                            <polyline points={points} fill="none" stroke="#1DA5FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {skill.scores.map((s, i) => (
                              <circle key={i} cx={graphX[i]} cy={scoreToY(s)} r="4" fill="#1DA5FF" />
                            ))}
                          </svg>
                        </div>
                      </div>
                      <h4 
                        className="text-base font-semibold flex-shrink-0" 
                        style={{ color: 'white', marginBottom: '4px', transform: 'translateY(-22px)' }}
                      >
                        {skill.title}
                      </h4>
                      <p 
                        className="text-sm mb-4 leading-relaxed flex-shrink-0" 
                        style={{ color: '#9CA3AF', transform: 'translateY(-22px)' }}
                      >
                        {skill.highScoreBlurb}
                      </p>
                    </>
                  );
                })()}
                <div className="mt-auto flex-shrink-0">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer hover:opacity-90 border-0"
                    style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                    onClick={() => navigate('/analytics')}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm">Go to Analytics</span>
                  </button>
                </div>
              </div>
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
              marginTop: '24px',
              paddingBottom: '24px'
            }}
          >
            <div className="flex" style={{ gap: '48px', alignItems: 'flex-start' }}>
              <div 
                className="rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" 
                style={{ 
                  backgroundColor: '#374151', 
                  width: '136px', 
                  height: '136px', 
                  marginLeft: '16px',
                  marginTop: 'auto',
                  marginBottom: 'auto',
                  transform: 'translateY(12px)'
                }}
              >
                <img
                  src="/Mod1Cover.png"
                  alt="Module 1: Pressure"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
                />
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
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: '0%',
                        backgroundColor: '#1DA5FF'
                      }}
                    ></div>
                  </div>
                </div>
                <button 
                  className="px-6 py-2 rounded-lg font-medium text-sm cursor-pointer hover:opacity-90 border-0"
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
