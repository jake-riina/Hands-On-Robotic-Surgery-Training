import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InviteTraineeModal from '../components/InviteTraineeModal';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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
        .select('role, email')
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

      setUserEmail(profile.email || user.email || '');
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#1E2733' }}>
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
          <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#EF4444' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome, Admin</h2>
            <p className="text-gray-400">Manage trainees and oversee training activities</p>
          </div>

          {/* Add Trainee Card */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              backgroundColor: '#1E2733',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Trainee Management</h3>
                <p className="text-gray-400 text-sm">
                  Invite new trainees to join the platform
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 text-white font-medium rounded-lg transition-colors"
              style={{ backgroundColor: '#1DA5FF' }}
            >
              Add a trainee
            </button>
          </div>

          {/* Placeholder for future admin features */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: '#1E2733',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Admin Features</h3>
            <p className="text-gray-400">
              Additional admin features will be added here, such as:
            </p>
            <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
              <li>View all trainees</li>
              <li>Monitor training progress</li>
              <li>Analytics and reports</li>
              <li>Manage modules and exercises</li>
            </ul>
          </div>
        </div>
      </main>

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
