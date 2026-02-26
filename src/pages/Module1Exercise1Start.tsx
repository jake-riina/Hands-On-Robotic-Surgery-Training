import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useBLE } from '../contexts/BLEContext';
import RoboticGripper from '../components/RoboticGripper';
import ProfileDropdown from '../components/ProfileDropdown';

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
 const [overrideBleWarning, setOverrideBleWarning] = useState(false);
 const [cheatPressure, setCheatPressure] = useState<number | null>(null);

 // Use pressure from BLE context
 const pressure = blePressure;

 // Effective pressure: spacebar cheat overrides BLE when held
 const effectivePressure = cheatPressure !== null ? cheatPressure : pressure;

 // Spacebar cheat: hold = pressure ramps up, release = pressure ramps down
 const cheatPressureRef = useRef<number>(0);
 const rampUpIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const rampDownIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const RAMP_DURATION_MS = 2000; // Same speed for both up and down
 const RAMP_INTERVAL_MS = 50;
 const CHEAT_MAX_PSI = 35; // Arrow can go to right red; video caps at 20

 // Keep ref in sync with cheat pressure (state updates from ramps)
 useEffect(() => {
   if (cheatPressure !== null) cheatPressureRef.current = cheatPressure;
 }, [cheatPressure]);

 useEffect(() => {
   const stopRampUp = () => {
     if (rampUpIdRef.current) {
       clearInterval(rampUpIdRef.current);
       rampUpIdRef.current = null;
     }
   };
   const stopRampDown = () => {
     if (rampDownIdRef.current) {
       clearInterval(rampDownIdRef.current);
       rampDownIdRef.current = null;
     }
   };

   const onKeyDown = (e: KeyboardEvent) => {
     if (e.code === 'Space' && !e.repeat) {
       e.preventDefault();
       stopRampDown();
       if (rampUpIdRef.current) return;
       const startPsi = cheatPressureRef.current;
       const startTime = Date.now();
       rampUpIdRef.current = setInterval(() => {
         const elapsed = Date.now() - startTime;
         const ratio = Math.min(elapsed / RAMP_DURATION_MS, 1);
         const psi = startPsi + ratio * (CHEAT_MAX_PSI - startPsi);
         cheatPressureRef.current = psi;
         setCheatPressure(psi);
         if (ratio >= 1) {
           stopRampUp();
         }
       }, RAMP_INTERVAL_MS);
     }
   };

   const onKeyUp = (e: KeyboardEvent) => {
     if (e.code === 'Space' && !e.repeat) {
       e.preventDefault();
       stopRampUp();
       if (rampDownIdRef.current) return;
       const startPsi = cheatPressureRef.current;
       const startTime = Date.now();
       setCheatPressure(startPsi);
       rampDownIdRef.current = setInterval(() => {
         const elapsed = Date.now() - startTime;
         const ratio = Math.min(elapsed / RAMP_DURATION_MS, 1);
         const psi = Math.max(0, startPsi * (1 - ratio));
         cheatPressureRef.current = psi;
         setCheatPressure(psi);
         if (ratio >= 1 || psi <= 0) {
           stopRampDown();
           setCheatPressure(null);
           cheatPressureRef.current = 0;
         }
       }, RAMP_INTERVAL_MS);
     }
   };

   window.addEventListener('keydown', onKeyDown);
   window.addEventListener('keyup', onKeyUp);
   return () => {
     window.removeEventListener('keydown', onKeyDown);
     window.removeEventListener('keyup', onKeyUp);
     stopRampUp();
     stopRampDown();
   };
 }, []);
 
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

// Start exercise when first non-zero pressure is detected (BLE or spacebar cheat)
useEffect(() => {
  const canStart = (bleIsConnected || overrideBleWarning) && effectivePressure > 0;
  if (!exerciseStartedRef.current && canStart) {
    console.log('Starting exercise - first non-zero pressure detected:', effectivePressure);
    setExerciseStarted(true);
    setIsExerciseActive(true);
    startTimeRef.current = Date.now();
    lastCheckTimeRef.current = Date.now();
    if (mockSensorRef.current) {
      clearInterval(mockSensorRef.current);
      mockSensorRef.current = null;
    }
  }
}, [effectivePressure, bleIsConnected, overrideBleWarning]);

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
       if (effectivePressure >= TARGET_MIN && effectivePressure <= TARGET_MAX) {
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
 }, [isExerciseActive, exerciseStarted, effectivePressure]);

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

    // Persist latest Module 1 score so it can be shown even when revisiting later
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('module1_last_score', String(calculatedScore));
      }
    } catch (err) {
      console.warn('Unable to persist module 1 score to localStorage:', err);
    }

     // Save any remaining readings in buffer
     if (readingsBufferRef.current.length > 0 && sessionIdRef.current) {
       const readingsToSave = [...readingsBufferRef.current];
       readingsBufferRef.current = [];
       console.log('Saving final', readingsToSave.length, 'readings to Supabase');
       saveReadingsToSupabase(readingsToSave);
     }
   }
 }, [exerciseStarted, timeRemaining]);

 // Stop mock sensor when exercise completes
 useEffect(() => {
   if (exerciseStarted && timeRemaining === 0 && score !== null) {
     if (mockSensorRef.current) clearInterval(mockSensorRef.current);
   }
 }, [exerciseStarted, timeRemaining, score]);

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
   const maxPressure = 35;
   const trianglePosition = Math.min((effectivePressure / maxPressure) * 100, 100);

   useEffect(() => {
     console.log('PressureGauge render - Pressure:', effectivePressure, 'PSI, Triangle Position:', trianglePosition.toFixed(1), '%');
   }, [effectivePressure, trianglePosition]);

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
            <div className="flex items-center" style={{ gap: '16px' }}>
              <p className="text-white text-xl font-semibold" style={{ color: '#1DA5FF' }}>
                Score: {score.toFixed(1)}%
              </p>
              <button
                onClick={() => {
                  const path = score >= 80 ? '/module/1/completed' : '/module/1/incomplete';
                  navigate(path, { state: { sessionId, score } });
                }}
                className="px-8 py-3 rounded-lg font-semibold text-white text-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#1DA5FF' }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
       
       <div className="w-[480px] max-w-full mb-4 mx-auto">
         {/* Bar + arrow wrapper - arrow positioned relative to bar only */}
         <div className="relative w-full">
           <div
             className="w-full h-[48px] rounded-[14px] shadow-lg"
             style={{
               background: "linear-gradient(90deg, #ef4444 10%, #f97316 28%, #22c55e 50%, #f97316 72%, #ef4444 90%)",
               border: "1.5px solid #e2e8f0",
               boxShadow: "0 4px 24px 2px rgba(0,0,0,0.04)"
             }}
           />
           
           <div 
             className="absolute top-full transition-all duration-200 ease-out"
             style={{ 
               left: `${trianglePosition}%`,
               transform: 'translateX(-50%)',
               marginTop: '12px'
             }}
           >
             <svg width="22" height="16" viewBox="0 0 22 16" className="text-white">
               <path d="M11 16L0 0h22L11 16z" fill="white" />
               <path d="M11 15L1.5 1h19L11 15z" fill="#e5e7eb" opacity="0.25" />
             </svg>
           </div>
         </div>

         <div className="text-center mt-[36px] flex flex-wrap items-center justify-center" style={{ gap: '32px' }}>
           <p className="text-white text-sm">
             Current Pressure: <span className="font-bold">{effectivePressure.toFixed(1)} PSI</span>
           </p>
           {exerciseStarted && (
             <p className="text-white text-xs" style={{ opacity: 0.75 }}>
               Target: 15-20 PSI
             </p>
           )}
         </div>
       </div>
     </div>
   );
 };
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#26313E' }}>
      {/* BLE Status Popup Overlay */}
      {!bleIsConnected && !overrideBleWarning && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(4px)',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }}
        >
          <div 
            className="bg-[#1E2733] rounded-lg p-6 shadow-2xl border-2 flex-shrink-0"
            style={{ 
              borderColor: '#ef4444',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0" style={{ fontSize: '24px' }}>⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ef4444' }}>
                  BLE Device Not Connected
                </h3>
                <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                  Status: {bleConnectionStatus}
                </p>
                <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                  Please connect your device on the Dashboard first.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1DA5FF', color: 'white' }}
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => setOverrideBleWarning(true)}
                    className="w-full px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 border"
                    style={{ backgroundColor: 'transparent', color: '#9CA3AF', borderColor: '#6B7280' }}
                  >
                    Override — continue editing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Container - Top Bar */}
      <header className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#1E2733' }}>
        <div className="flex items-center gap-4">
          {/* Logo container - allows positioning/tweaking as needed */}
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
        <main className="flex-1 p-8" style={{ color: 'white', marginLeft: '2rem', paddingTop: '24px' }}>
          <div className="max-w-6xl mx-auto">
            {/* Exercise Title */}
            <h2 className="text-6xl font-bold mb-4" style={{ color: 'white' }}>
              Exercise 1: Find the Right Pressure
            </h2>
            {/* Instructions Section - Above everything */}
            <div className="mb-6" style={{ marginTop: '40px' }}>
              <div className="space-y-4 text-center max-w-3xl mx-auto">
                <p className="text-xl leading-relaxed" style={{ color: 'white' }}>
                  Apply pressure to the control handles and watch the bar respond.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: 'white' }}>
                  Keep the bar in the green zone for as much of the 20 seconds as possible. This zone represents optimal pressure for safe and precise movement!
                </p>
              </div>
            </div>

            {/* Animation and Bar - Centered */}
            <div className="flex flex-col items-center gap-8">
              <div 
                className="relative flex items-center justify-center"
                style={{ width: '560px', maxWidth: '100%', height: '450px' }}
              >
                <RoboticGripper 
                  pressure={Math.min(effectivePressure, 20)} 
                  freezeVideo={effectivePressure > 20} 
                  showReducePressure={effectivePressure > 20}
                  videoSrc="/vidu-video-3141028390928910.mov" 
                />
              </div>
              
              {/* Pressure Gauge - Below the animation, centered */}
              <PressureGauge />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Module1Exercise1Start;