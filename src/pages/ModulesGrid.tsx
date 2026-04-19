import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import type { Module } from '../api/mock/types';
import { mockModulesAPI } from '../api/mock/modules';
import ProfileDropdown from '../components/ProfileDropdown';
import analyticsPageStyles from './Module1Analytics.module.css';
import { supabase } from '../lib/supabaseClient';

const SKILLS_SECTION_SPLIT = '\n\nSkills\n\n';

const moduleDescriptionWrapperStyle = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  lineHeight: 1.625,
  flex: 1,
  color: '#ffffff',
  textAlign: 'center' as const,
};

function splitIntroSentences(intro: string): string[] {
  return intro
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderIntroWithBoldThisModule(intro: string): ReactNode {
  const sentences = splitIntroSentences(intro);
  return sentences.map((sentence, i) => {
    const isBold = sentence.startsWith('This module');
    if (isBold) {
      return (
        <strong key={i} style={{ fontWeight: 700 }}>
          {sentence}
          {i < sentences.length - 1 ? ' ' : ''}
        </strong>
      );
    }
    return (
      <span key={i}>
        {sentence}
        {i < sentences.length - 1 ? ' ' : ''}
      </span>
    );
  });
}

function ModuleBulletIcon({ moduleId, index }: { moduleId: number; index: number }) {
  const svgProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg' as const,
    style: { flexShrink: 0, marginTop: 2, color: '#1DA5FF' },
  };

  if (moduleId === 1) {
    if (index === 0) {
      return (
        <svg {...svgProps} aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" />
        </svg>
      );
    }
    if (index === 1) {
      return (
        <svg {...svgProps} aria-hidden>
          <path
            d="M12 3 L19 6.5v6c0 4-3 7.5-7 8.5-4-1-7-4.5-7-8.5v-6L12 3z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 9v5M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg {...svgProps} aria-hidden>
        <path d="M4 14c2-3 4-4 8-4s6 1 8 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M4 10c2 2 4 3 8 3s6-1 8-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.65" />
        <path d="M4 18c2-2 4-3 8-3s6 1 8 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }

  if (moduleId === 2) {
    if (index === 0) {
      return (
        <svg {...svgProps} aria-hidden>
          <path
            d="M4 8h4l2-3h4l2 3h4v10H4V8z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    }
    if (index === 1) {
      return (
        <svg {...svgProps} aria-hidden>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg {...svgProps} aria-hidden>
        <path d="M8 16l-3-3M16 8l3 3M8 8l-3 3M16 16l3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }

  if (moduleId === 3) {
    if (index === 0) {
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M5 12h14M8 9l-3 3 3 3M16 9l3 3-3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (index === 1) {
      return (
        <svg {...svgProps} aria-hidden>
          <path
            d="M8 14c1.5-2 3-3 4-5 .5 2 2 3.5 4 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path d="M10 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg {...svgProps} aria-hidden>
        <path d="M4 8l4-2 4 2 4-2 4 2v8l-4 2-4-2-4 2-4-2V8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...svgProps} aria-hidden>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function ModuleDescriptionContent({ moduleId, description }: { moduleId: number; description: string }) {
  const parts = description.split(SKILLS_SECTION_SPLIT);
  if (parts.length !== 2) {
    return (
      <div style={{ ...moduleDescriptionWrapperStyle, whiteSpace: 'pre-line' as const }}>
        {description}
      </div>
    );
  }

  const [intro, bulletBlock] = parts;
  const bullets = bulletBlock
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);

  return (
    <div style={moduleDescriptionWrapperStyle}>
      <p style={{ margin: '0 0 16px' }}>{renderIntroWithBoldThisModule(intro)}</p>
      <p style={{ margin: '0 0 12px' }}>
        <strong style={{ fontWeight: 700 }}>Skills</strong>
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {bullets.map((text, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              textAlign: 'left',
              maxWidth: '100%',
              width: 'fit-content',
            }}
          >
            <ModuleBulletIcon moduleId={moduleId} index={i} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ModulesGrid = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedModuleIds, setUnlockedModuleIds] = useState<Set<number>>(new Set());
  /** Best score 0–100 per module id from Supabase (same source as analytics: trainee_best_scores). */
  const [topScorePctByModuleId, setTopScorePctByModuleId] = useState<Record<number, number>>({});

  useEffect(() => {
    mockModulesAPI.getAllModules().then((data) => {
      setModules(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('trainee_best_scores')
        .select('module_id, best_score')
        .eq('user_id', user.id)
        .in('module_id', [1, 2, 3]);

      if (cancelled) return;
      if (error) {
        console.error('ModulesGrid: error loading top scores', error);
        return;
      }

      const map: Record<number, number> = {};
      for (const row of data ?? []) {
        const mid = row.module_id;
        if (mid == null || row.best_score == null) continue;
        const pct = Math.max(0, Math.min(100, Math.round(Number(row.best_score) * 100)));
        map[mid] = pct;
      }
      setTopScorePctByModuleId(map);
    })();
    return () => {
      cancelled = true;
    };
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
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  };

  const primaryActionStyle = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    backgroundColor: '#1DA5FF',
    color: 'white',
    textDecoration: 'none' as const,
    minWidth: '160px',
    boxSizing: 'border-box' as const,
  };

  /** Matches padding-top so space above header ≈ space below header before the image */
  const headerImageGap = 16;

  const renderTopScoreRing = (percent: number) => (
    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', display: 'block' }}>
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
          strokeDasharray={`${percent * 97.4 / 100} 97.4`}
          d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1DA5FF',
          fontSize: '11px',
          fontWeight: 500,
          pointerEvents: 'none',
        }}
      >
        {percent}%
      </span>
    </div>
  );

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
        <ProfileDropdown />
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
        <main style={{ flex: 1, padding: '32px 48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ width: '100%', maxWidth: '1008px' }}>
              <div className={analyticsPageStyles.pageHeaderRow}>
                <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
                <h1 className={analyticsPageStyles.pageTitle}>Modules</h1>
                <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
              </div>

              {loading ? (
                <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF' }}>Loading modules...</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px',
                    width: '100%',
                  }}
                >
              {modules.map((module) => {
                const isUnlockedByUser = unlockedModuleIds.has(module.id);
                const isLocked = module.id !== 2 && module.id !== 3 && module.locked && !isUnlockedByUser;
                const content = (
                  <div
                    style={{
                      ...cardStyle,
                      padding: `${headerImageGap}px 24px 24px 24px`,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxSizing: 'border-box',
                      minHeight: '380px',
                      opacity: isLocked ? 0.75 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {module.id >= 1 && module.id <= 3 ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '12px',
                          marginBottom: `${headerImageGap}px`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px',
                            }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1DA5FF' }}>Module {module.id}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {module.completed && (
                                <span style={{ color: '#10B981', fontWeight: 500, fontSize: '14px' }}>✓ Completed</span>
                              )}
                              {isLocked && (
                                <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: '1.25rem', lineHeight: 1 }}>🔒</span>
                              )}
                            </div>
                          </div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: '18px',
                              fontWeight: 600,
                              lineHeight: 1.25,
                              color: 'white',
                              textAlign: 'left',
                            }}
                          >
                            {module.title}
                          </h3>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flexShrink: 0,
                            gap: '6px',
                            paddingTop: '2px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Top Score
                          </span>
                          {renderTopScoreRing(topScorePctByModuleId[module.id] ?? 0)}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: `${headerImageGap}px` }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1DA5FF' }}>Module {module.id}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {module.completed && (
                              <span style={{ color: '#10B981', fontWeight: 500, fontSize: '14px' }}>✓ Completed</span>
                            )}
                            {isLocked && (
                              <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: '1.25rem', lineHeight: 1 }}>🔒</span>
                            )}
                          </div>
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 600,
                            lineHeight: 1.25,
                            color: 'white',
                          }}
                        >
                          {module.title}
                        </h3>
                      </div>
                    )}
                    {module.id === 1 && (
                      <div
                        style={{
                          marginBottom: '12px',
                          width: '100%',
                          height: '200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#26313E',
                        }}
                      >
                        <img
                          src="/ForceCover.png"
                          alt="Pressure / Force"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                        />
                      </div>
                    )}
                    {module.id === 2 && (
                      <div
                        style={{
                          marginBottom: '12px',
                          width: '100%',
                          height: '200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#26313E',
                        }}
                      >
                        <img
                          src="/CamControl.png"
                          alt="Camera control"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                        />
                      </div>
                    )}
                    {module.id === 3 && (
                      <div
                        style={{
                          marginBottom: '12px',
                          width: '100%',
                          height: '200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#26313E',
                        }}
                      >
                        <img
                          src="/Peg.png"
                          alt="Peg transfer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                        />
                      </div>
                    )}
                    {module.description && (
                      <ModuleDescriptionContent moduleId={module.id} description={module.description} />
                    )}
                    <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      {isLocked ? (
                        module.id === 2 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockedModuleIds((prev) => new Set(prev).add(2));
                              navigate('/module/2/instructions');
                            }}
                            style={{ ...primaryActionStyle, cursor: 'pointer' }}
                          >
                            Start
                          </button>
                        ) : module.id === 3 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockedModuleIds((prev) => new Set(prev).add(3));
                              navigate('/module/3/instructions');
                            }}
                            style={{ ...primaryActionStyle, cursor: 'pointer' }}
                          >
                            Start
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'not-allowed',
                              backgroundColor: '#374151',
                              color: '#9CA3AF',
                              minWidth: '160px',
                              boxSizing: 'border-box',
                            }}
                          >
                            Start
                          </span>
                        )
                      ) : (
                        <Link
                          to={
                            module.id === 2
                              ? '/module/2/instructions'
                              : module.id === 3
                                ? '/module/3/instructions'
                                : `/module/${module.id}/instructions`
                          }
                          style={{ ...primaryActionStyle, cursor: 'pointer' }}
                        >
                          Start
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModulesGrid;
