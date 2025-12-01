import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const Module1Exercise1Start = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with icons (using simple SVG icons;no bullet points))
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'dashboard', 
      className: 'text-white no-underline', // assume in rendering, buttons/links are not inside a <ul>
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

 // Exercise state
 const [pressure, setPressure] = useState(0);
 const [isExerciseActive, setIsExerciseActive] = useState(false);
 const [timeRemaining, setTimeRemaining] = useState(20);
 const [exerciseStarted, setExerciseStarted] = useState(false);
 
 const intervalRef = useRef<number | null>(null);
 const mockSensorRef = useRef<number | null>(null);

 // Calculate triangle position based on pressure (0-35 PSI range)
 const getTrianglePosition = () => {
   const maxPressure = 35;
   const percentage = Math.min((pressure / maxPressure) * 100, 100);
   return percentage;
 };

 // Mock sensor - simulates pressure fluctuations
 const startMockSensor = () => {
   mockSensorRef.current = setInterval(() => {
     setPressure(prev => {
       const change = (Math.random() - 0.5) * 3;
       const newPressure = Math.max(0, prev + change);
       return Math.min(newPressure, 35);
     });
   }, 100);
 };

 // Start exercise on spacebar press
 useEffect(() => {
   const handleKeyPress = (e: KeyboardEvent) => {
     if (e.code === 'Space' && !exerciseStarted) {
       e.preventDefault();
       setExerciseStarted(true);
       setIsExerciseActive(true);
       setPressure(17.5);
       startMockSensor();
     }
   };
   window.addEventListener('keydown', handleKeyPress);
   return () => window.removeEventListener('keydown', handleKeyPress);
 }, [exerciseStarted]);

 // Timer countdown
 useEffect(() => {
   if (isExerciseActive && timeRemaining > 0) {
     intervalRef.current = setInterval(() => {
       setTimeRemaining(prev => {
         if (prev <= 1) {
           setIsExerciseActive(false);
           return 0;
         }
         return prev - 1;
       });
     }, 1000);
   }
   return () => {
     if (intervalRef.current) clearInterval(intervalRef.current);
   };
 }, [isExerciseActive, timeRemaining]);

 // Navigate when complete
 useEffect(() => {
   if (exerciseStarted && timeRemaining === 0) {
     if (mockSensorRef.current) clearInterval(mockSensorRef.current);
     setTimeout(() => {
       navigate('/DashboardGlovesConnected');
     }, 1000);
   }
 }, [exerciseStarted, timeRemaining, navigate]);

 // Cleanup on unmount
 useEffect(() => {
   return () => {
     if (intervalRef.current) clearInterval(intervalRef.current);
     if (mockSensorRef.current) clearInterval(mockSensorRef.current);
   };
 }, []);

 // Gauge component
 const PressureGauge = () => {
   const trianglePosition = getTrianglePosition();

   return (
     <div className="flex flex-col items-center">
       {!exerciseStarted ? (
         <p className="text-white text-lg mb-4">
           Press SPACEBAR to Begin!
         </p>
       ) : timeRemaining > 0 ? (
         <p className="text-white text-2xl font-bold mb-4">
           {timeRemaining}s
         </p>
       ) : (
         <p className="text-white text-2xl font-bold mb-4" style={{ color: '#22c55e' }}>
           Exercise Complete!
         </p>
       )}
       
       <div className="relative w-[480px] max-w-full mb-10">
         <div
           className="w-full h-[48px] rounded-[14px] shadow-lg mx-auto"
           style={{
             background: "linear-gradient(90deg, #ef4444 10%, #f97316 28%, #22c55e 50%, #f97316 72%, #ef4444 90%)",
             border: "1.5px solid #e2e8f0",
             boxShadow: "0 4px 24px 2px rgba(0,0,0,0.04)"
           }}
         />
         
         <div 
           className="absolute top-full mt-2 transition-all duration-200 ease-out"
           style={{ 
             left: `${trianglePosition}%`,
             transform: 'translateX(-50%)'
           }}
         >
           <svg width="22" height="16" viewBox="0 0 22 16" className="text-white">
             <path d="M11 16L0 0h22L11 16z" fill="white" />
             <path d="M11 15L1.5 1h19L11 15z" fill="#e5e7eb" opacity="0.25" />
           </svg>
         </div>

         {exerciseStarted && (
           <div className="text-center mt-12">
             <p className="text-white text-sm">
               Current Pressure: <span className="font-bold">{pressure.toFixed(1)} PSI</span>
             </p>
             <p className="text-white text-xs mt-1" style={{ opacity: 0.75 }}>
               Target: 15-20 PSI
             </p>
           </div>
         )}
       </div>
     </div>
   );
 };
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#26313E' }}>
      {/* Header Container - Top Bar */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          {/* Logo container - allows positioning/tweaking as needed */}
          <div className="flex items-center justify-center overflow-hidden" style={{ width: '100px', height: '100px' }}>
            <img 
              src="/Logo.png" 
              alt="Logo" 
              className="object-contain"
              style={{ 
                width: '100px', 
                height: '100px', 
                maxWidth: '100px', 
                maxHeight: '100px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
        {/* Profile picture */}
        <div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden flex items-center justify-center">
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
                // Check if button is active based on current route
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
                      backgroundColor: isActive ? '#1DA5FF' : '#1E2733',
                      border: 'none',
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      color: 'white'
                    }}
                    className={`w-full flex items-center gap-3 px-6 mx-2 rounded-lg transition-colors border-none text-white`}
                  >
                    <span className="flex-shrink-0" style={{ color: 'white' }}>{getIcon(item.icon)}</span>
                    <span className="font-medium" style={{ color: 'white' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8" style={{ color: 'white', marginLeft: '2rem' }}>
          <div className="max-w-6xl mx-auto">
            {/* Exercise Title */}
            <h2 className="text-6xl font-bold mb-6" style={{ color: 'white' }}>
              Exercise 1: Find the Right Pressure
            </h2>

            <div className="flex gap-12 items-start">
              {/* Left Section - Instructions */}
              <div className="flex-1">
                <div className="space-y-4">
                  <p className="text-xl leading-relaxed" style={{ color: 'white' }}>
                    Apply pressure to the control handles and watch the bar respond.
                  </p>
                  <p className="text-lg leading-relaxed" style={{ color: 'white' }}>
                    Keep the bar in the green zone for as much of the 20 seconds as possible. This zone represents optimal pressure for safe and precise movement!
                  </p>
                </div>
              </div>

              {/* Right Section - Pressure Gauge */}
              <div className="flex-1 flex justify-center">
                <PressureGauge />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module1Exercise1Start;