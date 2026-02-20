import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InviteTraineeModal from '../components/InviteTraineeModal';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

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
      label: 'Trainees', 
      icon: 'trainees'
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
  const traineesData = [
    { name: 'Cardiothoracic', value: 10, color: '#ffffff' },
    { name: 'ENT', value: 6, color: '#1DA5FF' },
    { name: 'Urology', value: 2, color: '#374151' },
  ];

  const moduleCompletionData = [
    { name: 'Cardiothoracic', completions: 5, color: '#ffffff' },
    { name: 'ENT', completions: 6, color: '#374151' },
    { name: 'Urology', completions: 12, color: '#1DA5FF' },
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
        <div className="w-9 h-9 rounded-full bg-gray-500 overflow-hidden flex items-center justify-center">
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
                  (item.path === '/admin/dashboard' && location.pathname.startsWith('/admin/dashboard') && !location.pathname.startsWith('/admin/trainees')) ||
                  (item.path === '/admin/trainees' && location.pathname.startsWith('/admin/trainees')) ||
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
          {/* Greeting */}
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#ffffff' }}>
            Hello, {firstName || 'Admin'}
          </h2>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            {/* Container 1: Number of Trainees by Department */}
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: '#1E2733',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#ffffff' }}>Number of Trainees by Department</h3>
              
              {/* Pie Chart */}
              <div className="flex justify-center mb-6" style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={traineesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {traineesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'white' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>Cardiothoracic - 10 trainees</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1DA5FF' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>ENT - 6 trainees</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#374151' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>Urology - 2 trainees</span>
                </div>
              </div>
            </div>

            {/* Container 2: Invite a Trainee */}
            <div
              className="rounded-lg p-6 flex flex-col items-center"
              style={{
                backgroundColor: '#1E2733',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#ffffff' }}>Invite a Trainee</h3>
              <div className="flex justify-center items-center mb-6" style={{ height: '200px' }}>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 text-white font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#1DA5FF' }}
                >
                  Add a trainee
                </button>
              </div>
            </div>

            {/* Container 3: Module Completion by Department */}
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: '#1E2733',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#ffffff' }}>Module Completion by Department</h3>
              
              {/* Horizontal Bar Chart */}
              <div className="mb-6" style={{ height: '150px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moduleCompletionData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" domain={[0, 12]} stroke="#ffffff" tick={{ fill: '#ffffff', fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#ffffff" 
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      width={100}
                    />
                    <Bar dataKey="completions" radius={[0, 4, 4, 0]}>
                      {moduleCompletionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'white' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>Cardiothoracic - 5 completions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#374151' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>ENT - 6 completions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1DA5FF' }}></div>
                  <span className="text-sm" style={{ color: '#ffffff' }}>Urology - 12 completions</span>
                </div>
              </div>
            </div>
          </div>
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
