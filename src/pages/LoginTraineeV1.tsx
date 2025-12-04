import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

/* ---------------- TYPES ---------------- */
type UserRole = 'trainee' | 'physician';

interface User {
  email: string;
  role: UserRole;
}

/* ---------------- LOGIN COMPONENT ---------------- */
const images = [
  '/Screenshot-1.png',
  '/Screenshot-2.png',
  '/Screenshot-3.png',
];

const LoginTraineeV1: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('trainee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);

  /* ---------- Carousel auto-rotate ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Check if user is already logged in ---------- */
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  /* ---------- Sign-In Handler ---------- */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          // Create user profile with selected role
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              role: role,
            });
          if (profileError) throw profileError;
          // Navigate to dashboard
          navigate('/dashboard');
        }
      } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Navigate to dashboard
        if (data.user) {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Google Sign-In ---------- */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      const googleUser: User = await new Promise<User>((resolve) =>
        setTimeout(() => resolve({ email: 'googleuser@test.com', role: 'trainee' }), 500)
      );

      if (googleUser.role === 'trainee') navigate('/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#26313E' }}>
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
              className="inline-flex rounded-full p-1"
              style={{ backgroundColor: '#26313E' }}
            >
              <button
                onClick={() => setRole('trainee')}
                className={`px-6 py-2 font-medium transition-all duration-200 ${
                  role === 'trainee' ? 'rounded-full' : ''
                }`}
                style={
                  role === 'trainee'
                    ? { backgroundColor: '#2563eb', color: 'white', borderRadius: '9999px' }
                    : { backgroundColor: 'transparent', color: 'white' }
                }
              >
                Trainee
              </button>
              <button
                onClick={() => setRole('physician')}
                className={`px-6 py-2 font-medium transition-all duration-200 ${
                  role === 'physician' ? 'rounded-full' : ''
                }`}
                style={
                  role === 'physician'
                    ? { backgroundColor: '#2563eb', color: 'white', borderRadius: '9999px' }
                    : { backgroundColor: 'transparent', color: 'white' }
                }
              >
                Physician
              </button>
            </div>
          </div>

          {/* Sign In Form - White rounded box */}
          <div
            className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              width: '25vw',
              minWidth: '400px',
              maxWidth: '500px',
              height: '500px',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
          <div
            className="w-full text-center"
            style={{ padding: '0 2rem', marginBottom: '1rem', marginTop: '-40px' }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            <p className="text-gray-600">{isSignUp ? 'Create an account to get started' : 'Welcome Back! Please enter your details'}</p>
          </div>
          <form
            className="space-y-4 w-full"
            onSubmit={handleSignIn}
          >
            {error && (
              <div className="px-1 w-full flex justify-center mb-4">
                <div className="text-red-500 text-sm text-center" style={{ width: '75%' }}>{error}</div>
              </div>
            )}

            {/* Email Input */}
            <div className="px-1 w-full flex justify-center mb-8">
              <div style={{ minWidth: '0', width: '75%' }}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                  placeholder="Enter your email"
                />
              </div>
            </div>





            {/* Password Input */}
            <div className="px-1 w-full flex justify-center">
              <div style={{ minWidth: '0', width: '75%' }}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                  placeholder="Enter your password"
                />
              </div>
            </div>





            {/* Remember Me & Forgot Password */}
            <div className="px-1 w-full flex justify-center">
              <div style={{ minWidth: '0', width: '75%' }}>
                <div className="flex items-center justify-between w-full">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-700">Remember for 30 Days</span>
                  </label>
                  <a href="#" className="text-xs text-blue-600 hover:underline" style={{ color: '#2563eb' }}>
                    Forgot Password?
                  </a>
                </div>
              </div>
            </div>





            {/* Sign In Button */}
            <div
              style={{
                minWidth: '0',
                width: '60%',
                margin: '1rem auto',
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
                  padding: '0px'
                }}
              >
                {isLoading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
              </button>
            </div>
          </form>





          {/* OR Separator */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>





          {/* Google Sign In Button */}
          <div
            style={{
              minWidth: '0',
              width: '75%',
              margin: '1rem auto',
            }}
          >
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              type="button"
              className="bg-transparent border-none rounded-lg font-medium transition-colors flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxSizing: 'border-box',
                height: '50px',
                padding: '0px'
              }}
            >
              <img
                src="/Google.png"
                alt="Google logo"
                className="object-contain"
                style={{ 
                  width: '115%', 
                  height: '115%'
                }}
              />
            </button>
          </div>







          {/* Sign Up/Sign In Toggle Link */}
          <div className="mt-6 text-center">
            {isSignUp ? (
              <>
                <span className="text-sm text-gray-600">Already have an account? </span>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsSignUp(false); }}
                  className="text-sm text-blue-600 hover:underline font-medium" 
                  style={{ color: '#2563eb' }}
                >
                  Sign in
                </a>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600">Don't have an account? </span>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsSignUp(true); }}
                  className="text-sm text-blue-600 hover:underline font-medium" 
                  style={{ color: '#2563eb' }}
                >
                  Sign up
                </a>
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-1/2 bg-[#1E2733] flex flex-col items-center justify-center relative" style={{ backgroundColor: '#26313E' }}>
        <div className="w-[75%] max-w-[600px] bg-[#151B24] rounded-lg p-4 sm:p-6 flex flex-col items-center text-white relative min-h-[500px] pb-16">
          <div className="text-center mt-10 mb-6 relative z-20">
            <h1 className="text-4xl font-semibold leading-tight mb-2 text-white" style={{ color: '#ffffff' }}>
              Democratizing Access to Robotic Surgery Training
            </h1>
            <p className="text-lg opacity-90 text-white" style={{ color: '#ffffff' }}>
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
