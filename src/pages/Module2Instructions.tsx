import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import ProfileDropdown from '../components/ProfileDropdown';
import analyticsNavStyles from './Module2Analytics.module.css';

const Module2Instructions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with icons
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'dashboard', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/modules', 
      label: 'Modules', 
      icon: 'modules', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: 'analytics', 
      className: 'text-white no-underline',
      iconColor: 'white'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: 'settings', 
      className: 'text-white no-underline',
      iconColor: 'white'
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

  // Star icon for achievements
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
    try {
      // Generate a unique session ID
      const sessionId = uuidv4();
      console.log('Generated session ID:', sessionId);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
      }
      
      if (!user) {
        console.error('User not authenticated');
        alert('Please log in to begin training');
        return;
      }

      console.log('User ID:', user.id);
      console.log('Attempting to insert session...');

      // Store session in Supabase
      const { data, error } = await supabase
        .from('sessions_trainee')
        .insert({
          trainee_session_id: sessionId,
          user_id: user.id,
          module_id: 2,
          exercise_id: 1,
          started_at: new Date().toISOString(),
          session_status: 'in_progress'
        })
        .select();

      if (error) {
        console.error('Error saving session to Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Error saving session: ${error.message}. Check console for details.`);
        // Still navigate even if save fails
      } else {
        console.log('Session saved successfully to Supabase:', data);
        console.log('Session ID:', sessionId);
      }

      // Navigate to module 2 camera control (game) with session ID
      navigate('/module/2/camera-control', { state: { sessionId } });
    } catch (err) {
      console.error('Error in handleBeginTraining:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Still navigate even if there's an error
      const sessionId = uuidv4();
      navigate('/module/2/camera-control', { state: { sessionId } });
    }
  };

  const handleViewCompletedModule = () => {
    navigate('/module/2/completed');
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

            {/* Module Title */}
            <h1 className="text-4xl font-bold mb-4 text-center" style={{ color: 'white' }}>
              Module 2: Camera Movement
            </h1>

            {/* Instructional Text */}
            <p className="text-lg leading-relaxed mx-auto text-center" style={{ color: 'white', marginBottom: '60px', maxWidth: '900px' }}>
              In robotic surgery, camera movement is essential as it defines their field of view. Small hand movements at the console guide how the camera pans, tilts, and re-centers within the surgical space. The amount of pressure applied to the controller determines the speed and sensitivity of these camera movements. Too much pressure can cause the view to overshoot or become disorienting, while too little pressure can make repositioning slow and inefficient.
            </p>

            {/* Embedded Application Preview */}
            <div className="flex justify-center items-center" style={{ marginTop: '60px', marginBottom: '60px' }}>
              <img 
                src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWczYWZxOWU3aXE0cm4zcnB0Zjhlc2dhdDI3cmZlMnpzMmVqaXNjcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4s5nPcBlWhFXeDDrId/giphy.gif" 
                alt="Camera Movement Preview" 
                className="max-w-full h-auto rounded-lg shadow-lg"
                style={{ maxWidth: '600px' }}
                onError={(e) => {
                  console.error('GIF failed to load:', e.currentTarget.src);
                }}
              />
            </div>

            {/* Step-by-step instructions */}
            <div className="mx-auto text-center" style={{ marginBottom: '48px', maxWidth: '900px' }}>
              <p className="text-lg leading-relaxed" style={{ color: 'white', marginBottom: '16px' }}>
                Press clutch button to activate camera movement. Surgical target should remain in the middle of the screen. The goal is to navigate the camera to collect objects around the room by centering the target center on them for 5 seconds. A new one will appear after one is collected that you have to look for, and your tally will be in the upper right hand corner. You will have 90 seconds to complete and then the module will end.
              </p>
            </div>

            {/* Bottom Section - Achievements and Begin Button */}
            <div className="flex items-center justify-between" style={{ marginTop: '120px' }}>
              {/* Achievements */}
              <div className="flex items-center" style={{ gap: '32px' }}>
                <div className="flex items-center gap-2">
                  <StarIcon />
                  <span className="text-lg" style={{ color: 'white' }}>Steady Movement</span>
                </div>
                <div className="flex items-center gap-2">
                  <StarIcon />
                  <span className="text-lg" style={{ color: 'white' }}>Optimal Pressure</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {/* Placeholder button to view completed module */}
                <button
                  onClick={handleViewCompletedModule}
                  className="px-6 py-4 rounded-lg font-semibold text-white text-lg transition-colors hover:opacity-90 border-2"
                  style={{ backgroundColor: 'transparent', borderColor: '#1DA5FF', color: '#1DA5FF' }}
                >
                  View Score
                </button>
                {/* Begin Training Button */}
                <button
                  onClick={handleBeginTraining}
                  className="px-8 py-4 rounded-lg font-semibold text-white text-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1DA5FF' }}
                >
                  Begin Training
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module2Instructions;
