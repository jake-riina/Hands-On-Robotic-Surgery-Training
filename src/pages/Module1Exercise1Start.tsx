import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useBLE } from '../contexts/BLEContext';

// Web Bluetooth API types
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface RequestDeviceOptions {
  filters: Array<{ services: number[] }>;
}

interface BluetoothDevice extends EventTarget {
  gatt?: BluetoothRemoteGATTServer;
  name?: string;
  id?: string;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryService(service: number): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
  disconnect(): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  value?: DataView;
  service?: BluetoothRemoteGATTService;
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
}

const Module1Exercise1Start = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;

  console.log('Current session ID:', sessionId);

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

 // Get BLE connection from shared context
 const { 
   isConnected: bleIsConnected,
   connectionStatus: bleConnectionStatus,
   pressure: blePressure
 } = useBLE();

 // Exercise state
 const [isExerciseActive, setIsExerciseActive] = useState(false);
 const [timeRemaining, setTimeRemaining] = useState(20);
 const [exerciseStarted, setExerciseStarted] = useState(false);
 const [score, setScore] = useState<number | null>(null);
 
 // Use pressure from BLE context
 const pressure = blePressure;
 
 const intervalRef = useRef<number | null>(null);
 const mockSensorRef = useRef<number | null>(null);
 const startTimeRef = useRef<number | null>(null);
 const timeOnThresholdRef = useRef<number>(0);
 const lastCheckTimeRef = useRef<number | null>(null);
 const thresholdCheckIntervalRef = useRef<number | null>(null);
 const readingsBufferRef = useRef<Array<{timestamp_ms: number, force_psi: number}>>([]);
 const saveIntervalRef = useRef<number | null>(null);
 const exerciseStartedRef = useRef<boolean>(false);
 const sessionIdRef = useRef<string | undefined>(sessionId);

 // Target pressure range (15-20 PSI)
 const TARGET_MIN = 15;
 const TARGET_MAX = 20;

 // Mock sensor - simulates pressure fluctuations (fallback if BLE not available)
 // Note: This is kept for potential fallback, but BLE context handles pressure updates

 // Function to save readings to Supabase (batched)
 const saveReadingsToSupabase = async (readings: Array<{timestamp_ms: number, force_psi: number}>) => {
   const currentSessionId = sessionIdRef.current;
   if (!currentSessionId || readings.length === 0) {
     console.warn('Cannot save readings - sessionId:', currentSessionId, 'readings count:', readings.length);
     return;
   }

   try {
     console.log(`Attempting to save ${readings.length} readings to Supabase for session:`, currentSessionId);
     const { data, error } = await supabase
       .from('trainee_readings')
       .insert(
         readings.map(reading => ({
           trainee_session_id: currentSessionId,
           timestamp_ms: reading.timestamp_ms,
           force_psi: reading.force_psi,
           flex_value: null,
           imu_value: null
         }))
       )
       .select();

     if (error) {
       console.error('Error saving readings to Supabase:', error);
       console.error('Error details:', JSON.stringify(error, null, 2));
     } else {
       console.log(`Successfully saved ${readings.length} readings to Supabase. Data:`, data);
     }
   } catch (err) {
     console.error('Exception saving readings:', err);
   }
 };

 // Update refs when state changes
 useEffect(() => {
   exerciseStartedRef.current = exerciseStarted;
 }, [exerciseStarted]);

 useEffect(() => {
   sessionIdRef.current = sessionId;
 }, [sessionId]);

 // Periodic save of readings buffer (every 1 second)
 useEffect(() => {
   if (sessionId) {
     saveIntervalRef.current = setInterval(() => {
       if (readingsBufferRef.current.length > 0) {
         const readingsToSave = [...readingsBufferRef.current];
         readingsBufferRef.current = [];
         saveReadingsToSupabase(readingsToSave);
       }
     }, 1000);
   }

   return () => {
     if (saveIntervalRef.current) {
       clearInterval(saveIntervalRef.current);
       saveIntervalRef.current = null;
     }
   };
 }, [sessionId]);


// Use shared BLE connection from context
// Save readings to Supabase when pressure changes from BLE
useEffect(() => {
  if (bleIsConnected && pressure > 0 && sessionIdRef.current) {
    const timestamp = Date.now();
    readingsBufferRef.current.push({
      timestamp_ms: timestamp,
      force_psi: pressure
    });
    
    console.log('Added reading to buffer. Buffer size:', readingsBufferRef.current.length);

    // Batch save every 10 readings
    if (readingsBufferRef.current.length >= 10) {
      const readingsToSave = [...readingsBufferRef.current];
      readingsBufferRef.current = [];
      console.log('Saving batch of', readingsToSave.length, 'readings to Supabase');
      saveReadingsToSupabase(readingsToSave);
    }
  }
}, [pressure, bleIsConnected]);

// Start exercise when first non-zero pressure is detected
useEffect(() => {
  if (!exerciseStartedRef.current && pressure > 0 && bleIsConnected) {
    console.log('Starting exercise - first non-zero pressure detected:', pressure);
    setExerciseStarted(true);
    setIsExerciseActive(true);
    startTimeRef.current = Date.now();
    lastCheckTimeRef.current = Date.now();
    // Stop mock sensor if it was running
    if (mockSensorRef.current) {
      clearInterval(mockSensorRef.current);
      mockSensorRef.current = null;
    }
  }
}, [pressure, bleIsConnected]);

 // Track time spent in target threshold
 useEffect(() => {
   if (isExerciseActive && exerciseStarted) {
     // Initialize start time on first activation
     if (startTimeRef.current === null) {
       startTimeRef.current = Date.now();
       lastCheckTimeRef.current = Date.now();
     }

     // Check every 100ms if pressure is in target range
     thresholdCheckIntervalRef.current = setInterval(() => {
       const now = Date.now();
       const lastCheck = lastCheckTimeRef.current || now;
       const timeDelta = now - lastCheck;
       
       // Check if current pressure is in target range (15-20 PSI)
       if (pressure >= TARGET_MIN && pressure <= TARGET_MAX) {
         timeOnThresholdRef.current += timeDelta;
       }
       
       lastCheckTimeRef.current = now;
     }, 100);
   }

   return () => {
     if (thresholdCheckIntervalRef.current) {
       clearInterval(thresholdCheckIntervalRef.current);
       thresholdCheckIntervalRef.current = null;
     }
   };
 }, [isExerciseActive, exerciseStarted, pressure]);

 // Timer countdown - starts immediately when exercise becomes active
 useEffect(() => {
   if (isExerciseActive && timeRemaining > 0) {
     // Clear any existing interval first
     if (intervalRef.current) {
       clearInterval(intervalRef.current);
     }
     
     // Start the timer immediately
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
     if (intervalRef.current) {
       clearInterval(intervalRef.current);
       intervalRef.current = null;
     }
   };
 }, [isExerciseActive, timeRemaining]);

 // Calculate score when exercise completes
 useEffect(() => {
   if (exerciseStarted && timeRemaining === 0 && startTimeRef.current !== null) {
     const endTime = Date.now();
     const duration = endTime - startTimeRef.current;
     const timeOnThreshold = timeOnThresholdRef.current;
     
     // Calculate score: (time_on_threshold / duration) * 100
     const calculatedScore = duration > 0 ? (timeOnThreshold / duration) * 100 : 0;
     setScore(calculatedScore);
     console.log('Exercise completed. Score:', calculatedScore.toFixed(1), '%');

     // Save any remaining readings in buffer
     if (readingsBufferRef.current.length > 0 && sessionIdRef.current) {
       const readingsToSave = [...readingsBufferRef.current];
       readingsBufferRef.current = [];
       console.log('Saving final', readingsToSave.length, 'readings to Supabase');
       saveReadingsToSupabase(readingsToSave);
     }
   }
 }, [exerciseStarted, timeRemaining]);

 // Navigate when complete (with delay to show score)
 useEffect(() => {
   if (exerciseStarted && timeRemaining === 0 && score !== null) {
     if (mockSensorRef.current) clearInterval(mockSensorRef.current);
     // Show score for 3 seconds before navigating
     setTimeout(() => {
       navigate('/Module1Exercise2Start');
     }, 3000);
   }
 }, [exerciseStarted, timeRemaining, navigate, score]);

 // Cleanup on unmount
 useEffect(() => {
   return () => {
     if (intervalRef.current) clearInterval(intervalRef.current);
     if (mockSensorRef.current) clearInterval(mockSensorRef.current);
     if (thresholdCheckIntervalRef.current) clearInterval(thresholdCheckIntervalRef.current);
     if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
     // Save any remaining readings before unmount
     if (readingsBufferRef.current.length > 0 && sessionId) {
       const readingsToSave = [...readingsBufferRef.current];
       readingsBufferRef.current = [];
       saveReadingsToSupabase(readingsToSave);
     }
   };
 }, [sessionId]);

 // Gauge component
 const PressureGauge = () => {
   // Calculate triangle position directly using current pressure state
   const maxPressure = 35;
   const trianglePosition = Math.min((pressure / maxPressure) * 100, 100);
   
   // Debug logging
   useEffect(() => {
     console.log('PressureGauge render - Pressure:', pressure, 'PSI, Triangle Position:', trianglePosition.toFixed(1), '%');
   }, [pressure, trianglePosition]);

   return (
     <div className="flex flex-col items-center">
       {!exerciseStarted ? (
         <p className="text-white text-lg mb-4">
           Apply Pressure to Begin!
         </p>
       ) : timeRemaining > 0 ? (
         <p className="text-white text-2xl font-bold mb-4">
           {timeRemaining}s
         </p>
       ) : (
         <div className="flex flex-col items-center mb-4">
           <p className="text-white text-2xl font-bold mb-2" style={{ color: '#22c55e' }}>
             Exercise Complete!
           </p>
           {score !== null && (
             <p className="text-white text-xl font-semibold" style={{ color: '#1DA5FF' }}>
               Score: {score.toFixed(1)}%
             </p>
           )}
         </div>
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

         <div className="text-center mt-12">
           <p className="text-white text-sm">
             Current Pressure: <span className="font-bold">{pressure.toFixed(1)} PSI</span>
           </p>
           {exerciseStarted && (
             <p className="text-white text-xs mt-1" style={{ opacity: 0.75 }}>
               Target: 15-20 PSI
             </p>
           )}
         </div>
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
            {sessionId && (
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                Session ID: {sessionId}
              </p>
            )}
            {!bleIsConnected && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#1E2733', border: '1px solid #ef4444' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>
                  ⚠️ BLE Status: {bleConnectionStatus}
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Please connect your device on the Dashboard first.
                </p>
              </div>
            )}

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