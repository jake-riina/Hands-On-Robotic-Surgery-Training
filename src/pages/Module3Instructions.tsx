import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createModule3Session } from '../lib/module3PegSessionService';
import analyticsNavStyles from './Module2Analytics.module.css';

/** Green used for transferred rings on the Peg Transfer page. */
const PEG_TRANSFER_GREEN = '#22c55e';

const Module3Instructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [beginLoading, setBeginLoading] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/modules', label: 'Modules', icon: 'modules', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics', className: 'text-white no-underline', iconColor: 'white' },
    { path: '/settings', label: 'Settings', icon: 'settings', className: 'text-white no-underline', iconColor: 'white' },
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
      case 'dashboard': return <DashboardIcon />;
      case 'modules': return <ModulesIcon />;
      case 'analytics': return <AnalyticsIcon />;
      case 'settings': return <SettingsIcon />;
      default: return null;
    }
  };

  const StarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5"/>
    </svg>
  );

  /* Same left chevron as Analytics pages (Module2Analytics "‹ Module 1") */
  const ArrowLeftIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const handleBeginTraining = async () => {
    setBeginError(null);
    setBeginLoading(true);
    const result = await createModule3Session(null);
    setBeginLoading(false);
    if (!result.ok) {
      setBeginError(result.error);
      return;
    }
    navigate('/module/3/peg-transfer', {
      state: { sessionId: result.sessionId, startedAt: result.startedAt },
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
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

        <main className="flex-1" style={{ padding: '32px 48px' }}>
          <div className="max-w-6xl mx-auto">
            {/* Back Button — same chevron style as Analytics (‹ Module 1 / Module 3 ›) */}
            <button
              type="button"
              onClick={() => navigate('/modules')}
              className={analyticsNavStyles.navButton}
              aria-label="Back to Modules"
              style={{ marginBottom: '1rem' }}
            >
              <span className={analyticsNavStyles.moduleNavWithArrow}>
                <ArrowLeftIcon />
                <span style={{ fontSize: '0.9375rem' }}>Modules</span>
              </span>
            </button>

            <h1 className="text-4xl font-bold mb-4 text-center" style={{ color: 'white' }}>
              Module 3: Peg Transfer
            </h1>

            <p className="text-lg leading-relaxed mx-auto text-center" style={{ color: 'white', marginBottom: '60px', maxWidth: '900px' }}>
              Peg transfer develops the core motor skills required for safe and efficient robotic surgery. This exercise challenges you to coordinate both instruments while maintaining precise control over grip force, movement speed, and spatial awareness. The ability to smoothly lift, reposition, and release objects reflects real surgical tasks such as tissue handling, suturing, and instrument exchange.
            </p>

            <div className="flex justify-center items-center" style={{ marginTop: '60px', marginBottom: '60px' }}>
              <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#26313E' }}>
                <img
                  src="/PegTransfer.png"
                  alt="Peg Transfer"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    console.error('Image failed to load:', e.currentTarget.src);
                  }}
                />
              </div>
            </div>

            <div className="mx-auto text-center" style={{ marginBottom: '48px', maxWidth: '900px' }}>
              <p className="text-lg leading-relaxed" style={{ color: 'white', marginBottom: '16px' }}>
                Use the mock controller to move the rings to pegs on the opposite side. Rings will turn{' '}
                <strong style={{ color: PEG_TRANSFER_GREEN }}>green</strong> when you have successfully completed a transfer.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3" style={{ marginTop: '120px' }}>
              {beginError ? (
                <p className="text-center text-sm max-w-xl" style={{ color: '#fca5a5', margin: 0 }}>
                  {beginError}
                </p>
              ) : null}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center" style={{ gap: '32px' }}>
                  <div className="flex items-center gap-2">
                    <StarIcon />
                    <span className="text-lg" style={{ color: 'white' }}>Optimal Pressure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarIcon />
                    <span className="text-lg" style={{ color: 'white' }}>Steady Movement</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    disabled={beginLoading}
                    onClick={() => void handleBeginTraining()}
                    className="px-12 py-4 rounded-xl font-semibold text-white text-2xl transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ backgroundColor: '#1DA5FF', color: '#ffffff' }}
                  >
                    {beginLoading ? 'Starting…' : 'Begin Training'}
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

export default Module3Instructions;
