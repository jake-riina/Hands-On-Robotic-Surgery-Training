import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Module } from '../api/mock/types';
import { mockModulesAPI } from '../api/mock/modules';

const ModulesGrid = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedModuleIds, setUnlockedModuleIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    mockModulesAPI.getAllModules().then((data) => {
      setModules(data);
      setLoading(false);
    });
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/modules', label: 'Modules', icon: 'modules' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
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

  const cardStyle = {
    backgroundColor: '#1E2733',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center overflow-hidden" style={{ width: '72px', height: '72px' }}>
            <img
              src="/Logo.png"
              alt="Logo"
              className="object-contain"
              style={{ width: '72px', height: '72px', maxWidth: '72px', maxHeight: '72px', objectFit: 'contain' }}
            />
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
        {/* Sidebar */}
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
                    style={{ backgroundColor: '#1E2733', border: 'none', paddingTop: '1.5rem', paddingBottom: '1.5rem', color: 'white' }}
                    className="w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white"
                  >
                    <span className="flex-shrink-0" style={{ color: isActive ? '#1DA5FF' : 'white' }}>{getIcon(item.icon)}</span>
                    <span className="font-medium" style={{ color: isActive ? '#1DA5FF' : 'white' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1" style={{ padding: '32px 48px' }}>
          <h1 className="text-2xl font-bold mb-8" style={{ color: 'white' }}>
            Modules
          </h1>

          {loading ? (
            <p style={{ color: '#9CA3AF' }}>Loading modules...</p>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
                maxWidth: '100%',
              }}
            >
              {modules.map((module) => {
                const isUnlockedByUser = unlockedModuleIds.has(module.id);
                const isLocked = module.locked && !isUnlockedByUser;
                const content = (
                  <div
                    className="rounded-lg p-6 flex flex-col h-full transition-all"
                    style={{
                      ...cardStyle,
                      minHeight: '380px',
                      opacity: isLocked ? 0.75 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      border: '2px solid transparent',
                    }}
                  >
                    <div className="flex items-start justify-end mb-2" style={{ minHeight: '28px' }}>
                      {module.completed && (
                        <span className="text-green-500 font-medium text-sm">✓ Completed</span>
                      )}
                      {isLocked && (
                        <span className="text-gray-400 font-medium" style={{ fontSize: '1.25rem' }}>🔒</span>
                      )}
                    </div>
                    {module.id === 1 ? (
                      <div className="relative mb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: '#1DA5FF' }}>Module {module.id}</span>
                        </div>
                        <div className="absolute" style={{ right: '24px', top: '-10px', width: '48px' }}>
                          <span className="text-sm font-medium whitespace-nowrap block" style={{ color: '#9CA3AF', position: 'relative', left: '50%', transform: 'translateX(-50%)', width: 'max-content' }}>Top Score</span>
                        </div>
                        <div className="absolute flex flex-col items-center" style={{ right: '24px', top: '14px', width: '48px' }}>
                          <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" className="block w-full h-full" style={{ transform: 'rotate(0deg)', display: 'block' }}>
                              <path
                                fill="none"
                                stroke="#374151"
                                strokeWidth="2.5"
                                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                              />
                              <path
                                fill="none"
                                stroke="#1DA5FF"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={`${module.progress * 97.4 / 100} 97.4`}
                                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                              />
                            </svg>
                            <span
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#1DA5FF',
                                fontSize: '11px',
                                fontWeight: 500,
                                pointerEvents: 'none',
                              }}
                            >
                              {module.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="block text-sm font-medium mb-1" style={{ color: '#1DA5FF' }}>
                        Module {module.id}
                      </span>
                    )}
                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'white' }}>
                      {module.title}
                    </h3>
                    {module.id === 1 && (
                      <div className="mb-3 w-full overflow-hidden rounded-lg" style={{ height: '200px', backgroundColor: '#26313E' }}>
                        <img src="/ForceCover.png" alt="Pressure / Force" className="w-full h-full object-cover object-top" />
                      </div>
                    )}
                    {module.id === 2 && (
                      <div className="mb-3 w-full overflow-hidden rounded-lg" style={{ height: '200px', backgroundColor: '#26313E' }}>
                        <img src="/CamControl.png" alt="Camera control" className="w-full h-full object-cover object-top" />
                      </div>
                    )}
                    {module.id === 3 && (
                      <div className="mb-3 w-full overflow-hidden rounded-lg" style={{ height: '200px', backgroundColor: '#26313E' }}>
                        <img src="/Peg.png" alt="Peg transfer" className="w-full h-full object-cover object-top" />
                      </div>
                    )}
                    {module.description && (
                      <p className="text-sm flex-1 mb-4" style={{ color: '#9CA3AF', lineHeight: 1.5 }}>
                        {module.description}
                      </p>
                    )}
                    <div className="mt-auto pt-2 flex justify-end">
                      {isLocked ? (
                        module.id === 2 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockedModuleIds((prev) => new Set(prev).add(2));
                              navigate('/module/2/camera-control');
                            }}
                            className="inline-block px-8 py-2 rounded-lg font-medium text-center text-sm cursor-pointer hover:opacity-90 border-0"
                            style={{ backgroundColor: '#1DA5FF', color: 'white', minWidth: '180px' }}
                          >
                            Go To Module
                          </button>
                        ) : module.id === 3 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockedModuleIds((prev) => new Set(prev).add(3));
                              navigate('/module/3/instructions');
                            }}
                            className="inline-block px-8 py-2 rounded-lg font-medium text-center text-sm cursor-pointer hover:opacity-90 border-0"
                            style={{ backgroundColor: '#1DA5FF', color: 'white', minWidth: '180px' }}
                          >
                            Go To Module
                          </button>
                        ) : (
                          <span
                            className="inline-block px-8 py-2 rounded-lg font-medium text-center text-sm cursor-not-allowed"
                            style={{ backgroundColor: '#374151', color: '#9CA3AF', minWidth: '180px' }}
                          >
                            Go To Module
                          </span>
                        )
                      ) : (
                        <Link
                          to={
                            module.id === 2
                              ? '/module/2/camera-control'
                              : module.id === 3
                                ? '/module/3/instructions'
                                : `/module/${module.id}/instructions`
                          }
                          className="inline-block px-8 py-2 rounded-lg font-medium text-center transition-colors hover:opacity-90 text-sm"
                          style={{ backgroundColor: '#1DA5FF', color: 'white', textDecoration: 'none', minWidth: '180px' }}
                        >
                          Go To Module
                        </Link>
                      )}
                    </div>
                  </div>
                );

                if (isLocked) {
                  return <div key={module.id}>{content}</div>;
                }
                return <div key={module.id}>{content}</div>;
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ModulesGrid;
