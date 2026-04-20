import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUserProfile, type UserProfile } from '../lib/userService';
import ProfileDropdown from '../components/ProfileDropdown';
import analyticsPageStyles from './Module1Analytics.module.css';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dateJoined, setDateJoined] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
      
      // Get user creation date from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.created_at) {
        const date = new Date(user.created_at);
        setDateJoined(date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }));
      }
      
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/?signedOut=true');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate even if there's an error
      navigate('/?signedOut=true');
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/modules', label: 'Modules', icon: 'modules' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Profile', icon: 'profile' },
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

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#26313E' }}>
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
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: 'calc(100vh - 72px)' 
        }}>
          <p style={{ color: '#9CA3AF' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#26313E' }}>
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
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: 'calc(100vh - 72px)' 
        }}>
          <p style={{ color: '#9CA3AF' }}>Unable to load profile information</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
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
        {/* Profile picture */}
        <ProfileDropdown />
      </header>

      {/* Main Layout Container */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 72px)' }}>
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

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '32px 48px' }}>
          <div className={analyticsPageStyles.pageHeaderRow}>
            <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
            <h1 className={analyticsPageStyles.pageTitle}>Settings</h1>
            <span className={analyticsPageStyles.backArrowDisabled} aria-hidden style={{ visibility: 'hidden' }} />
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '24px' 
          }}>
            {/* Left Card */}
            <div style={{ 
              borderRadius: '8px', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
              padding: '24px', 
              backgroundColor: '#ffffff' 
            }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#1F2937', 
                marginBottom: '24px' 
              }}>
                Personal Information
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    First Name
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.first_name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Last Name
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.last_name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Email
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.email || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Experience Level
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.experience_level || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Date Joined
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {dateJoined || 'Not available'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                style={{ 
                  width: '100%', 
                  paddingLeft: '16px', 
                  paddingRight: '16px', 
                  paddingTop: '12px', 
                  paddingBottom: '12px', 
                  color: 'white', 
                  fontWeight: '500', 
                  borderRadius: '8px', 
                  backgroundColor: '#2563eb',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Sign Out
              </button>
            </div>

            {/* Right Card */}
            <div style={{ 
              borderRadius: '8px', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
              padding: '24px', 
              backgroundColor: '#ffffff' 
            }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#1F2937', 
                marginBottom: '24px' 
              }}>
                Personal Information
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    First Name
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.first_name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Last Name
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.last_name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Email
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.email || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Experience Level
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {profile.experience_level || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '4px' 
                  }}>
                    Date Joined
                  </label>
                  <div style={{ 
                    marginTop: '4px', 
                    paddingLeft: '12px', 
                    paddingRight: '12px', 
                    paddingTop: '8px', 
                    paddingBottom: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px', 
                    backgroundColor: '#F9FAFB', 
                    color: '#111827' 
                  }}>
                    {dateJoined || 'Not available'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                style={{ 
                  width: '100%', 
                  paddingLeft: '16px', 
                  paddingRight: '16px', 
                  paddingTop: '12px', 
                  paddingBottom: '12px', 
                  color: 'white', 
                  fontWeight: '500', 
                  borderRadius: '8px', 
                  backgroundColor: '#2563eb',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
