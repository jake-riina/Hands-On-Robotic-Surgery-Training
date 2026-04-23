import { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileDropdown from '../components/ProfileDropdown';
import analyticsNavStyles from './Module2Analytics.module.css';
import { createModule1Session } from '../lib/module1PressureSessionService';
import { useBLE } from '../contexts/BLEContext';
import { ModuleInstructionFlow } from '../components/instructions/ModuleInstructionFlow';
import type { InstructionStep } from '../components/instructions/instructionFlowTypes';
import { module1InstructionSteps } from '../config/module1InstructionSteps';
import { module1InstructionVisualForStepId } from './module1/Module1InstructionVisuals';

const Module1Instructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leftGlove, rightGlove } = useBLE();
  const [starting, setStarting] = useState(false);

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      className: 'text-white no-underline',
      iconColor: 'white',
    },
    {
      path: '/modules',
      label: 'Modules',
      icon: 'modules',
      className: 'text-white no-underline',
      iconColor: 'white',
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: 'analytics',
      className: 'text-white no-underline',
      iconColor: 'white',
    },
    {
      path: '/settings',
      label: 'Profile',
      icon: 'profile',
      className: 'text-white no-underline',
      iconColor: 'white',
    },
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
      case 'dashboard':
        return <DashboardIcon />;
      case 'modules':
        return <ModulesIcon />;
      case 'analytics':
        return <AnalyticsIcon />;
      case 'profile':
        return <ProfileIcon />;
      default:
        return null;
    }
  };

  const ArrowLeftIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const decorateStep = useCallback((step: InstructionStep): InstructionStep => {
    return {
      ...step,
      visual: module1InstructionVisualForStepId(step.id),
    };
  }, []);

  const handleStartModule = useCallback(async () => {
    setStarting(true);
    try {
      const activeDeviceId = leftGlove.device?.id ?? rightGlove.device?.id ?? null;
      const result = await createModule1Session(activeDeviceId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      navigate('/module/1/exercise/1/start', { state: { sessionId: result.sessionId } });
    } finally {
      setStarting(false);
    }
  }, [leftGlove.device?.id, navigate, rightGlove.device?.id]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-2 box-border shrink-0"
        style={{
          backgroundColor: '#1E2733',
          height: '88px',
          minHeight: '88px',
          maxHeight: '88px',
        }}
      >
        <div className="flex h-full min-h-0 flex-1 items-center gap-4 min-w-0">
          <div className="flex h-full min-h-0 max-w-[min(280px,42vw)] items-center justify-center overflow-hidden">
            <img src="/Logo.png" alt="Logo" className="block h-auto max-h-full w-auto max-w-full object-contain" />
          </div>
        </div>
        <ProfileDropdown />
      </header>

      {/* Main Layout Container */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 88px)' }}>
        {/* Sidebar Container - Left Navigation */}
        <aside className="w-64 shrink-0" style={{ backgroundColor: '#1E2733' }}>
          <nav className="py-6">
            <div className="space-y-2 pt-[30px]">
              {navItems.map((item) => {
                const isActive =
                  (item.path === '/dashboard' &&
                    location.pathname.startsWith('/dashboard') &&
                    !location.pathname.startsWith('/modules')) ||
                  (item.path === '/modules' &&
                    (location.pathname.startsWith('/modules') ||
                      location.pathname.startsWith('/module'))) ||
                  (item.path === '/analytics' && location.pathname.startsWith('/analytics')) ||
                  (item.path === '/settings' && location.pathname.startsWith('/settings'));

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    style={{
                      backgroundColor: '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: 'white',
                    }}
                    className="w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white"
                  >
                    <span className="flex-shrink-0" style={{ color: isActive ? '#1DA5FF' : 'white' }}>
                      {getIcon(item.icon)}
                    </span>
                    <span className="font-medium" style={{ color: isActive ? '#1DA5FF' : 'white' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0" style={{ padding: 'clamp(20px, 4vw, 48px)' }}>
          <div className="max-w-4xl mx-auto">
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

            <h1
              className="text-center font-bold m-0 mb-2"
              style={{ color: 'white', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)' }}
            >
              Module 1: Pressure Control
            </h1>
            <p
              className="text-center m-0 mb-8"
              style={{ color: '#94a3b8', fontSize: '1.0625rem', maxWidth: 560, marginInline: 'auto' }}
            >
              Quick onboarding—four short steps before you begin.
            </p>

            <ModuleInstructionFlow
              steps={module1InstructionSteps}
              decorateStep={decorateStep}
              onFinalAction={handleStartModule}
              finalBusy={starting}
              labels={{ finalCta: 'Start Module' }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module1Instructions;
