import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [_firstName, setFirstName] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

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

  // Data for charts
  const traineesByDeptData = [
    { name: 'Cardiothoracic', value: 10, color: '#ffffff' },
    { name: 'ENT', value: 6, color: '#0E98df' },
    { name: 'Urology', value: 2, color: '#2e3c4b' },
  ];

  const moduleCompletionData = [
    { name: 'Cardiothoracic', value: 5, color: '#ffffff' },
    { name: 'ENT', value: 6, color: '#0E98df' },
    { name: 'Urology', value: 12, color: '#2e3c4b' },
  ];

  const averageUsageData = [
    { day: 'Sunday', users: 22 },
    { day: 'Monday', users: 2 },
    { day: 'Tuesday', users: 2 },
    { day: 'Wednesday', users: 8 },
    { day: 'Thursday', users: 12 },
    { day: 'Friday', users: 16 },
    { day: 'Saturday', users: 20 },
  ];

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
        <main style={{ flex: 1, padding: '32px 48px' }}>
          {/* Page Title */}
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px', color: '#ffffff' }}>
            Analytics
          </h2>
          
          {/* Totals Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', position: 'relative' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Totals</h3>
              <div
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#ffffff" strokeWidth="1" fill="none"/>
                  <text x="8" y="11" textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="bold">i</text>
                </svg>
                {showTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    backgroundColor: '#1E2733',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    minWidth: '280px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <path d="M6 2L10 8H2L6 2Z" fill="#73BC42"/>
                        </svg>
                        <span style={{ fontSize: '14px', color: '#ffffff' }}>Increase compared to previous 30 days</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#d9d9d9', flexShrink: 0 }}></div>
                        <span style={{ fontSize: '14px', color: '#ffffff' }}>No change compared to previous 30 days</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <path d="M6 10L2 4H10L6 10Z" fill="#c80000"/>
                        </svg>
                        <span style={{ fontSize: '14px', color: '#ffffff' }}>Decrease compared to previous 30 days</span>
                      </div>
                    </div>
                    {/* Tooltip arrow */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid #1E2733'
                    }}></div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              {/* Total Usage Hours */}
              <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '36px', fontWeight: 600, color: '#ffffff' }}>64</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2L10 8H2L6 2Z" fill="#73BC42"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total Usage Hours</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
                </div>
              </div>

              {/* Total New Trainees */}
              <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '36px', fontWeight: 600, color: '#ffffff' }}>4</span>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#d9d9d9' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total New Trainees</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
                </div>
              </div>

              {/* Total Active Trainees */}
              <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '36px', fontWeight: 600, color: '#ffffff' }}>18</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 10L2 4H10L6 10Z" fill="#c80000"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total Active Trainees</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
                </div>
              </div>
            </div>
          </div>

          {/* By Department Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>By Department</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Number of Trainees by Department */}
              <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '16px', textAlign: 'center' }}>Number of Trainees by Department</h4>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={traineesByDeptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        label={{ value: 'Department', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                        stroke="#ffffff" 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                      />
                      <YAxis 
                        label={{ value: 'Number of Trainees', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                        stroke="#ffffff" 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {traineesByDeptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                  {traineesByDeptData.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                      <span style={{ fontSize: '12px', color: '#ffffff' }}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Completion by Department */}
              <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '16px', textAlign: 'center' }}>Module Completion by Department</h4>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleCompletionData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        label={{ value: 'Highest Module Completed', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                        stroke="#ffffff" 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        label={{ value: 'Department', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                        stroke="#ffffff" 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                        width={100} 
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {moduleCompletionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                  {moduleCompletionData.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                      <span style={{ fontSize: '12px', color: '#ffffff' }}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Average Usage per Day Section */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>Average Usage per Day</h3>
            <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={averageUsageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="day" 
                      label={{ value: 'Days of the Week', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                      stroke="#ffffff" 
                      tick={{ fill: '#ffffff', fontSize: 12 }} 
                    />
                    <YAxis 
                      label={{ value: 'Active Users', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }} 
                      stroke="#ffffff" 
                      tick={{ fill: '#ffffff', fontSize: 12 }} 
                    />
                    <Line type="monotone" dataKey="users" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAnalytics;
