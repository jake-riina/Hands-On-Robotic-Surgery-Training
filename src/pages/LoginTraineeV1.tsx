import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  ADMIN_SIGNUP_DEPARTMENT_NAMES,
  type AdminSignupDepartmentName,
} from '../lib/adminDepartmentOptions';
import {
  finalizeAdminSignupWithRpc,
  getViteProgramIdOrThrow,
} from '../lib/adminSignupService';

/* ---------------- TYPES ---------------- */
type UserRole = 'trainee' | 'trainer' | 'admin';

/* ---------------- LOGIN COMPONENT ---------------- */
const images = [
  '/Screenshot-1.png',
  '/Screenshot-2.png',
  '/Screenshot-3.png',
];

const LoginTraineeV1: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState<UserRole>('trainee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState<AdminSignupDepartmentName | ''>('');
  const [showSignOutPopup, setShowSignOutPopup] = useState(false);

  const resetAdminSignupFields = () => {
    setFirstName('');
    setLastName('');
    setDepartment('');
  };

  /* ---------- Carousel auto-rotate ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Check for sign out parameter ---------- */
  useEffect(() => {
    if (searchParams.get('signedOut') === 'true') {
      setShowSignOutPopup(true);
      // Remove the parameter from URL
      setSearchParams({});
      // Auto-close popup after 3 seconds
      const timer = setTimeout(() => {
        setShowSignOutPopup(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  /* ---------- Check if user is already logged in ---------- */
  /* Skip redirect in dev so "npm run dev" always opens login page */
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check user role and redirect accordingly
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile?.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (profile?.role === 'trainer') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const formatAuthOrRpcError = (err: unknown): string => {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    return 'Something went wrong. Please try again.';
  };

  /* ---------- Sign-In Handler ---------- */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (role === 'admin') {
          if (!department) {
            setError('Please select a department.');
            setIsLoading(false);
            return;
          }
          if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required.');
            setIsLoading(false);
            return;
          }
          try {
            getViteProgramIdOrThrow();
          } catch {
            setError('Application is missing program configuration (VITE_PROGRAM_ID). Contact support.');
            setIsLoading(false);
            return;
          }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        const user = data.user;
        if (!user?.id) {
          throw new Error('Sign up did not return a user. Please try again.');
        }

        if (role === 'admin') {
          if (!data.session) {
            setError(
              'Your account was created, but a browser session was not started (often due to email confirmation). ' +
                'After you confirm your email and sign in, contact support if your profile is still incomplete.',
            );
            setIsLoading(false);
            return;
          }

          const userEmail = user.email ?? email;
          try {
            await finalizeAdminSignupWithRpc({
              userId: user.id,
              email: userEmail,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              departmentName: department as AdminSignupDepartmentName,
            });
          } catch (rpcErr) {
            await supabase.auth.signOut();
            setError(
              `Account was created, but profile setup failed: ${formatAuthOrRpcError(rpcErr)}. ` +
                'You have been signed out. If this persists after retrying, contact support.',
            );
            setIsLoading(false);
            return;
          }

          navigate('/admin/dashboard');
        } else {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              user_id: user.id,
              email: user.email,
              role: role,
            });
          if (profileError) throw profileError;
          navigate('/dashboard');
        }
      } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Navigate based on role
        if (data.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();

          if (profile?.role === 'trainer' && role !== 'trainer') {
            await supabase.auth.signOut();
            setRole('trainer');
            setIsSignUp(false);
            resetAdminSignupFields();
            setError(
              'Trainer accounts must sign in with the Trainer option. Trainer is now selected — enter your password and sign in again.',
            );
            return;
          }

          if (role === 'trainer') {
            if (profile?.role !== 'trainer') {
              await supabase.auth.signOut();
              setError(
                'This sign-in option is for trainer accounts only. Choose Trainee or Admin if you use a different account type.',
              );
              return;
            }
            navigate('/admin/dashboard');
            return;
          }

          if (profile?.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#26313E' }}>
      {/* Sign Out Complete Popup */}
      {showSignOutPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 50,
            paddingTop: '80px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '32px',
              maxWidth: '384px',
              width: '100%',
              marginLeft: '16px',
              marginRight: '16px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>✓</div>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: '#1F2937',
                }}
              >
                Sign Out Complete
              </h2>
              <p style={{ color: '#4B5563', marginBottom: '24px' }}>
                You have been successfully signed out.
              </p>
              <button
                onClick={() => setShowSignOutPopup(false)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '500',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease-in-out',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Logo in top-left corner */}
      <div className="fixed top-0 left-0 z-50 p-4 bg-white rounded-br-lg shadow">
        <img
          src="/Logo.png"
          alt="HandsOn Logo"
          className="h-12 w-auto max-w-[140px] object-contain"
          onError={() => console.error('Logo image failed to load')}
        />
      </div>

      {/* Left Panel - Authentication */}
      <div className="w-1/2 flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#26313E' }}>
        {/* Centered Sign In Container */}
        <div className="flex flex-col items-center justify-center w-full">
          {/* Role Selector - Pill-shaped segmented control - Centered above Sign In box */}
          <div className="flex justify-center mb-8">
            <div
              className="inline-flex rounded-full overflow-hidden"
              style={{ 
                backgroundColor: '#ffffff',
                borderRadius: '9999px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRole('trainee');
                  setIsSignUp(false);
                  resetAdminSignupFields();
                }}
                className="px-6 py-2 font-medium transition-all duration-200"
                style={
                  role === 'trainee'
                    ? {
                        backgroundColor: '#2563eb',
                        color: 'white',
                        borderTopLeftRadius: '9999px',
                        borderBottomLeftRadius: '9999px',
                        fontSize: '16px',
                      }
                    : {
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontSize: '16px',
                        borderTopLeftRadius: '9999px',
                        borderBottomLeftRadius: '9999px',
                      }
                }
              >
                Trainee
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('trainer');
                  setIsSignUp(false);
                  resetAdminSignupFields();
                }}
                className="px-6 py-2 font-medium transition-all duration-200"
                style={
                  role === 'trainer'
                    ? {
                        backgroundColor: '#2563eb',
                        color: 'white',
                        fontSize: '16px',
                      }
                    : {
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontSize: '16px',
                      }
                }
              >
                Trainer
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setIsSignUp(false);
                  resetAdminSignupFields();
                }}
                className="px-6 py-2 font-medium transition-all duration-200"
                style={
                  role === 'admin'
                    ? {
                        backgroundColor: '#2563eb',
                        color: 'white',
                        borderTopRightRadius: '9999px',
                        borderBottomRightRadius: '9999px',
                        fontSize: '16px',
                      }
                    : {
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontSize: '16px',
                        borderTopRightRadius: '9999px',
                        borderBottomRightRadius: '9999px',
                      }
                }
              >
                Admin
              </button>
            </div>
          </div>

          {/* Sign In Form - White rounded box */}
          <div
            className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              width: '25vw',
              minWidth: '400px',
              maxWidth: '500px',
              minHeight: '300px',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '2rem',
            }}
          >
          <div
            className="w-full text-center"
            style={{
              padding: '0 2rem',
              marginBottom: '1rem',
              marginTop: isSignUp ? '1.25rem' : '0',
            }}
          >
            <h2
              className={`font-bold text-gray-900 ${isSignUp ? 'mb-0' : 'mb-2'}`}
              style={{ fontSize: '24px' }}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </h2>
            {!isSignUp && (
              <p className="text-gray-600" style={{ fontSize: '16px' }}>
                Welcome Back! Please enter your details
              </p>
            )}
          </div>
          <form
            className="space-y-4 w-full"
            onSubmit={handleSignIn}
          >
            {error && (
              <div className="px-1 w-full flex justify-center mb-4">
                <div className="text-red-500 text-center" style={{ width: '75%', fontSize: '13px' }}>{error}</div>
              </div>
            )}

            {/* Email Input */}
            <div className="px-1 w-full flex justify-center mb-8">
              <div style={{ minWidth: '0', width: '75%' }}>
                <label htmlFor="email" className="block font-medium text-gray-700 mb-1" style={{ fontSize: '13px' }}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px', fontSize: '16px' }}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {role === 'admin' && isSignUp && (
              <>
                <div className="px-1 w-full flex justify-center mb-4">
                  <div style={{ minWidth: '0', width: '75%' }}>
                    <label htmlFor="firstName" className="block font-medium text-gray-700 mb-1" style={{ fontSize: '13px' }}>
                      First name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                      style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px', fontSize: '16px' }}
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div className="px-1 w-full flex justify-center mb-4">
                  <div style={{ minWidth: '0', width: '75%' }}>
                    <label htmlFor="lastName" className="block font-medium text-gray-700 mb-1" style={{ fontSize: '13px' }}>
                      Last name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                      style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px', fontSize: '16px' }}
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="px-1 w-full flex justify-center mb-8">
                  <div style={{ minWidth: '0', width: '75%' }}>
                    <label htmlFor="department" className="block font-medium text-gray-700 mb-1" style={{ fontSize: '13px' }}>
                      Department
                    </label>
                    <select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as AdminSignupDepartmentName | '')}
                      className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white"
                      style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px', fontSize: '16px' }}
                      required
                    >
                      <option value="">Select department</option>
                      {ADMIN_SIGNUP_DEPARTMENT_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Password Input */}
            <div className="px-1 w-full flex justify-center">
              <div style={{ minWidth: '0', width: '75%' }}>
                <label htmlFor="password" className="block font-medium text-gray-700 mb-1" style={{ fontSize: '13px' }}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px', fontSize: '16px' }}
                  placeholder="Enter your password"
                />
              </div>
            </div>





            {/* Sign In Button */}
            <div
              style={{
                minWidth: '0',
                width: '60%',
                margin: '1rem auto 0 auto',
              }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  height: '50px',
                  borderRadius: '0.75rem',
                  boxSizing: 'border-box',
                  padding: '0px',
                  fontSize: '16px'
                }}
              >
                {isLoading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
              </button>
            </div>
          </form>

















          {/* Sign Up/Sign In Toggle Link - Only show for Admin */}
          {role === 'admin' && (
            <div className="mt-6 text-center">
              {isSignUp ? (
                <>
                  <span className="text-gray-600" style={{ fontSize: '13px' }}>Already have an account? </span>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignUp(false);
                      resetAdminSignupFields();
                    }}
                    className="text-blue-600 hover:underline font-medium" 
                    style={{ color: '#2563eb', fontSize: '13px' }}
                  >
                    Sign in
                  </a>
                </>
              ) : (
                <>
                  <span className="text-gray-600" style={{ fontSize: '13px' }}>Don't have an account? </span>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignUp(true);
                      resetAdminSignupFields();
                    }}
                    className="text-blue-600 hover:underline font-medium" 
                    style={{ color: '#2563eb', fontSize: '13px' }}
                  >
                    Sign up
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-1/2 bg-[#1E2733] flex flex-col items-center justify-center relative p-8" style={{ backgroundColor: '#26313E' }}>
        <div className="w-[75%] max-w-[600px] bg-[#151B24] rounded-lg p-4 sm:p-6 flex flex-col items-center text-white relative min-h-[500px] pb-16">
          <div className="text-center mt-10 mb-6 relative z-20">
            <h1 className="font-semibold leading-tight mb-2 text-white" style={{ color: '#ffffff', fontSize: '36px' }}>
              Democratizing Access to Robotic Surgery Training
            </h1>
            <p className="opacity-90 text-white" style={{ color: '#ffffff', fontSize: '19px' }}>
              Develop the right training habits with HandsOn
            </p>
          </div>

          <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden z-5">
            {images.map((image, index) => {
              const offset = index - current;
              const isActive = index === current;
              return (
                <div
                  key={index}
                  className="absolute w-full h-full transition-transform duration-700 ease-in-out z-0"
                  style={{
                    transform: `translateX(${offset * 100}%)`,
                    opacity: isActive ? 1 : 0,
                  }}
                >
                  <img
                    src={image}
                    alt={`carousel-${index}`}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              );
            })}
          </div>

          {/* Indicator buttons - positioned 25% below carousel images, horizontally centered, responsive */}
          <div className="flex gap-2 justify-center z-20 items-center w-full mt-[100px] sm:mt-[100px]">
            {images.map((_, i) => {
              const isActive = i === current;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-8 h-2.5 sm:w-10 sm:h-3 bg-white'
                      : 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/40 hover:bg-white/60'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginTraineeV1;
