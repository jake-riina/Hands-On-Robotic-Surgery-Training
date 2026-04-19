import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useBLE } from '../contexts/BLEContext';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import ChevronNavButtons from '../components/ChevronNavButtons';
import DashboardMySkillsProgressChart from '../components/DashboardMySkillsProgressChart';
import { BRIDGE_WS_URL } from '../types/geomagicBridge';
import analyticsPageStyles from './Module1Analytics.module.css';

const EXPLORE_MODULES = [
  {
    id: 1,
    title: 'Module 1: Pressure Control',
    description: 'Develop precise force control for safe tissue interaction.',
    cover: '/Mod1Cover.png',
    route: '/module/1/instructions',
  },
  {
    id: 2,
    title: 'Module 2: Camera Control',
    description: 'Master camera navigation for optimal surgical visibility.',
    cover: '/CamControl.png',
    route: '/module/2/instructions',
  },
  {
    id: 3,
    title: 'Module 3: Peg Transfer',
    description: 'Build bimanual dexterity with precise peg transfers.',
    cover: '/Peg.png',
    route: '/module/3/instructions',
  },
];

const MY_SKILLS_MODULES = [
  { moduleId: 1 as const, title: 'Module 1: Pressure' },
  { moduleId: 2 as const, title: 'Module 2: Camera Control' },
  { moduleId: 3 as const, title: 'Module 3: Peg Transfer' },
];
const MY_SKILLS_ANALYTICS_ROUTES = ['/analytics', '/analytics/module2', '/analytics/module3'];

const DashboardGlovesConnected = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exploreModuleIndex, setExploreModuleIndex] = useState(0);
  const [mySkillsModuleIndex, setMySkillsModuleIndex] = useState(0);

  const bridgeWsRef = useRef<WebSocket | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeConnecting, setBridgeConnecting] = useState(false);
  const [userFirstName, setUserFirstName] = useState('');

  // Check user role and redirect if admin; load display name for dashboard titles
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, first_name')
        .eq('user_id', user.id)
        .single();

      setUserFirstName(typeof profile?.first_name === 'string' ? profile.first_name.trim() : '');

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
    connect: connectBLE,
    disconnect: disconnectBLE
  } = useBLE();

  const handleConnectGloves = async () => {
    await connectBLE();
  };
  
  const handleDisconnectGloves = async () => {
    await disconnectBLE();
  };

  useEffect(() => {
    return () => {
      bridgeWsRef.current?.close();
      bridgeWsRef.current = null;
    };
  }, []);

  const handleConnectBridge = () => {
    if (bridgeWsRef.current?.readyState === WebSocket.OPEN || bridgeConnecting) return;
    setBridgeConnecting(true);
    const ws = new WebSocket(BRIDGE_WS_URL);
    bridgeWsRef.current = ws;
    ws.onopen = () => {
      setBridgeConnected(true);
      setBridgeConnecting(false);
    };
    ws.onclose = () => {
      setBridgeConnected(false);
      setBridgeConnecting(false);
      if (bridgeWsRef.current === ws) bridgeWsRef.current = null;
    };
    ws.onerror = () => {
      setBridgeConnecting(false);
    };
  };

  const handleDisconnectBridge = () => {
    bridgeWsRef.current?.close();
    bridgeWsRef.current = null;
    setBridgeConnected(false);
    setBridgeConnecting(false);
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

  const StatusConnectedIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#10B981" strokeWidth="1.5" fill="none" />
      <path d="M6.5 10.25L9 12.75L13.5 7.75" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const StatusDisconnectedIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="1.5" fill="none" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const StatusConnectingIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
    </svg>
  );

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
        <main style={{ flex: 1, padding: '32px 48px' }}>
          <div className={analyticsPageStyles.pageHeaderRow}>
            <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
            <h1 className={analyticsPageStyles.pageTitle}>
              {userFirstName ? `Hello, ${userFirstName}` : 'Hello'}
            </h1>
            <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
          </div>
          {/* Dashboard Cards Container */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Top Row - 3 Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '320px 24px 320px 24px 320px',
              gap: 0,
              marginBottom: '24px',
            }}
          >
            {/* First column: unified Devices setup (gloves + controllers) */}
            <div
              style={{
                borderRadius: '8px',
                backgroundColor: '#1E2733',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                height: '400px',
                width: '320px',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, lineHeight: 1.25, color: 'white' }}>
                  Devices
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', lineHeight: 1.4, color: '#9CA3AF' }}>
                  Connect gloves and practice controllers before a session.
                </p>

                {/* HandsOn Gloves */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }}>
                    HandsOn Gloves
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: isConnecting ? 'rgba(245, 158, 11, 0.12)' : isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${isConnecting ? 'rgba(245, 158, 11, 0.35)' : isConnected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    {isConnecting ? <StatusConnectingIcon /> : isConnected ? <StatusConnectedIcon /> : <StatusDisconnectedIcon />}
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isConnecting ? '#FBBF24' : isConnected ? '#34D399' : '#F87171',
                      }}
                    >
                      {isConnecting ? 'Connecting…' : isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGloves}
                      disabled={isConnecting}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                        opacity: isConnecting ? 0.6 : 1,
                        backgroundColor: '#EF4444',
                        color: 'white',
                      }}
                    >
                      Disconnect gloves
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGloves}
                      disabled={isConnecting}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                        opacity: isConnecting ? 0.6 : 1,
                        backgroundColor: '#1DA5FF',
                        color: 'white',
                      }}
                    >
                      {isConnecting ? 'Connecting…' : 'Connect gloves'}
                    </button>
                  )}
                </div>

                <div style={{ height: '1px', backgroundColor: '#374151', margin: '16px 0', flexShrink: 0 }} aria-hidden />

                {/* Practice Controllers (bridge) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }}>
                    Practice Controllers
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: bridgeConnecting ? 'rgba(245, 158, 11, 0.12)' : bridgeConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${bridgeConnecting ? 'rgba(245, 158, 11, 0.35)' : bridgeConnected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    {bridgeConnecting ? <StatusConnectingIcon /> : bridgeConnected ? <StatusConnectedIcon /> : <StatusDisconnectedIcon />}
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: bridgeConnecting ? '#FBBF24' : bridgeConnected ? '#34D399' : '#F87171',
                      }}
                    >
                      {bridgeConnecting ? 'Connecting…' : bridgeConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  {bridgeConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectBridge}
                      disabled={bridgeConnecting}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: bridgeConnecting ? 'not-allowed' : 'pointer',
                        opacity: bridgeConnecting ? 0.6 : 1,
                        backgroundColor: '#EF4444',
                        color: 'white',
                      }}
                    >
                      Disconnect controllers
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectBridge}
                      disabled={bridgeConnecting}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: bridgeConnecting ? 'not-allowed' : 'pointer',
                        opacity: bridgeConnecting ? 0.6 : 1,
                        backgroundColor: '#1DA5FF',
                        color: 'white',
                      }}
                    >
                      {bridgeConnecting ? 'Connecting…' : 'Connect controllers'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Empty spacer column for gap */}
            <div></div>

            {/* Box 2: Explore Modules Card - carousel for each of the 3 modules */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                backgroundColor: '#1E2733',
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: 1.25, color: 'white' }}>
                    Explore Modules
                  </h3>
                  <ChevronNavButtons
                    onPrev={() => setExploreModuleIndex((i) => (i - 1 + EXPLORE_MODULES.length) % EXPLORE_MODULES.length)}
                    onNext={() => setExploreModuleIndex((i) => (i + 1) % EXPLORE_MODULES.length)}
                    ariaLabelPrev="Previous module"
                    ariaLabelNext="Next module"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {(() => {
                  const module = EXPLORE_MODULES[exploreModuleIndex];
                  return (
                    <>
                      <div
                        style={{
                          height: '212px',
                          width: '100%',
                          flexShrink: 0,
                          position: 'relative',
                          boxSizing: 'border-box',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#1E2733',
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
                          }}
                          onError={(e) => {
                            e.currentTarget.src = '/Mod1Cover.png';
                          }}
                        />
                      </div>
                      <h4 style={{ margin: '12px 0 4px 0', fontSize: '16px', fontWeight: 600, flexShrink: 0, color: 'white' }}>
                        {module.title}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          lineHeight: 1.625,
                          flex: 1,
                          minHeight: 0,
                          color: '#9CA3AF',
                        }}
                      >
                        {module.description}
                      </p>
                      <div style={{ marginTop: '12px', flexShrink: 0 }}>
                        <button
                          type="button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            fontSize: '14px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: '#1DA5FF',
                            color: 'white',
                          }}
                          onClick={() => navigate(module.route)}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span style={{ fontSize: '14px' }}>Go to Module</span>
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                backgroundColor: '#1E2733',
                height: '400px',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: 1.25, color: 'white' }}>
                    My Skills
                  </h3>
                  <ChevronNavButtons
                    onPrev={() => setMySkillsModuleIndex((i) => (i - 1 + MY_SKILLS_MODULES.length) % MY_SKILLS_MODULES.length)}
                    onNext={() => setMySkillsModuleIndex((i) => (i + 1) % MY_SKILLS_MODULES.length)}
                    ariaLabelPrev="Previous module"
                    ariaLabelNext="Next module"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <DashboardMySkillsProgressChart
                    moduleId={MY_SKILLS_MODULES[mySkillsModuleIndex].moduleId}
                    moduleTitle={MY_SKILLS_MODULES[mySkillsModuleIndex].title}
                  />
                <div style={{ marginTop: '12px', flexShrink: 0 }}>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: '#1DA5FF',
                      color: 'white',
                    }}
                    onClick={() => navigate(MY_SKILLS_ANALYTICS_ROUTES[mySkillsModuleIndex] ?? '/analytics')}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '14px' }}>Go to Analytics</span>
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>


          {/* Box 5: Continue Module 1 Card */}
          <div
            style={{
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#1E2733',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              width: '1008px',
              marginTop: '24px',
              paddingBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
              <div
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#374151',
                  width: '136px',
                  height: '136px',
                  marginLeft: '16px',
                  marginTop: 'auto',
                  marginBottom: 'auto',
                  transform: 'translateY(12px)',
                }}
              >
                <img
                  src="/Mod1Cover.png"
                  alt="Module 1: Pressure"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: 'white' }}>
                  Continue Module 1: Pressure Control
                </h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#9CA3AF' }}>
                  In Progress • Started 03 Nov 2025
                </p>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.625, color: '#9CA3AF' }}>
                  Enhance your robotic surgery skills by mastering precise pressure control to ensure safe, accurate instrument handling.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      backgroundColor: '#374151',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '9999px',
                        width: '0%',
                        backgroundColor: '#1DA5FF',
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: '#1DA5FF',
                    color: 'white',
                  }}
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
