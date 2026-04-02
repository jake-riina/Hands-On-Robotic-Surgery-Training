import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InviteTraineeModal from '../components/InviteTraineeModal';
import ProfileDropdown from '../components/ProfileDropdown';
import AdminAnalyticsOverview from '../components/AdminAnalyticsOverview';
import dashboardStyles from './AdminDashboard.module.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Check user role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, email, first_name')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        // Redirect to appropriate dashboard based on role
        if (profile?.role === 'trainee') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
        return;
      }

      // Set first name for greeting
      setFirstName(profile.first_name || '');
    };

    checkUser();
  }, [navigate]);

  // Navigation items with icons
  const navItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Admin Dashboard', 
      icon: 'dashboard'
    },
    { 
      path: '/admin/trainees', 
      label: 'Trainer Dashboard', 
      icon: 'trainees'
    },
    { 
      path: '/admin/analytics', 
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

  const TraineesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M15 16.5c0-1.5-1.5-3-5-3s-5 1.5-5 3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M3.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M16.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M1 16.5c0-1.5 1.5-3 5-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M19 16.5c0-1.5-1.5-3-5-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
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
      case 'trainees':
        return <TraineesIcon />;
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
                  (item.path === '/admin/dashboard' && location.pathname.startsWith('/admin/dashboard') && !location.pathname.startsWith('/admin/trainees') && !location.pathname.startsWith('/admin/analytics')) ||
                  (item.path === '/admin/trainees' && location.pathname.startsWith('/admin/trainees')) ||
                  (item.path === '/admin/analytics' && location.pathname.startsWith('/admin/analytics')) ||
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
        <main className="flex-1" style={{ padding: '36px 52px' }}>
          <div className="flex items-start justify-between" style={{ marginBottom: '28px' }}>
            {/* Greeting */}
            <h2 className="text-2xl font-semibold" style={{ color: '#ffffff' }}>
              Hello, {firstName || 'Admin'}
            </h2>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={dashboardStyles.addTraineeButton}
            >
              Add New Trainee
            </button>
          </div>

          <AdminAnalyticsOverview />
        </main>
      </div>

      {/* Invite Trainee Modal */}
      <InviteTraineeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Refresh or update UI if needed
        }}
      />
    </div>
  );
};

export default AdminDashboard;
