import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ---------------- MOCK AUTH AND TYPES ---------------- */
type UserRole = 'trainee' | 'physician';

interface User {
  email: string;
  role: UserRole;
}

const mockAuth = async (email: string, password: string, role: UserRole): Promise<User> => {
  return new Promise<User>((resolve, reject) => {
    setTimeout(() => {
      if (email.includes('test') && password === 'password') {
        resolve({ email, role });
      } else {
        reject(new Error('Invalid email, password, or role'));
      }
    }, 500);
  });
};

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

  /* ---------- Carousel auto-rotate ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Sign-In Handler ---------- */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user: User = await mockAuth(email, password, role);
      if (user.role === 'trainee') navigate('/trainee-dashboard');
      else navigate('/physician-dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
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

      if (googleUser.role === 'trainee') navigate('/trainee-dashboard');
      else navigate('/physician-dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#26313E' }}>
      {/* Left Panel - Authentication */}
      <div className="w-1/2 flex flex-col p-8" style={{ backgroundColor: '#26313E' }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">
              Logo
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: 'white' }}>Hands On</h1>
          </div>
        </div>

        {/* ========== TEMPORARY NAVIGATION BUTTON - DELETE WHEN NO LONGER NEEDED ========== */}
        {/* This button is for navigation purposes only - navigates to Module1Exercise1Start */}
        {/* To remove: Delete this entire comment block and the button div below */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => navigate('/module/1/exercise/1/start')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-blue-700"
            style={{ 
              backgroundColor: '#2563eb', 
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            aria-label="Navigate to Module 1 Exercise 1 Start"
          >
            <span>Navigate to Module 1 Exercise 1</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {/* ========== END TEMPORARY NAVIGATION BUTTON ========== */}


        {/* Role Selector - Pill-shaped segmented control - Centered above Sign In box */}
        <div
          className="flex justify-center mb-8"
          style={{
            width: '25vw',
            minWidth: '400px',
            maxWidth: '500px',
            margin: '0 auto'
          }}
        >
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
            margin: 'auto',
            marginTop: '10px',
            height: '500px',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div
            className="w-full text-center"
            style={{ padding: '0 2rem', marginBottom: '1rem', marginTop: '-40px' }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600">Welcome Back! Please enter your details</p>
          </div>
          <form
            className="space-y-4 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              // Handle form submission here
            }}
          >
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
            <div className="px-1 w-full flex justify-center" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ minWidth: '0', width: '75%' }}>
                <button
                  type="submit"
                  className="bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
                  style={{ backgroundColor: '#2563eb', color: 'white', height: '50px' }}
                >
                  Sign in
                </button>
              </div>
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
              className="bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 w-full"
              style={{
                paddingLeft: '10px',
                paddingRight: '10px',
                boxSizing: 'border-box',
                height: '50px'
              }}
            >
              <div className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center font-bold text-gray-600">
                G
              </div>
              Continue With Google
            </button>
          </div>


          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <a href="#" className="text-sm text-blue-600 hover:underline font-medium" style={{ color: '#2563eb' }}>
              Sign up
            </a>
          </div>
        </div>
      </div>


      {/* RIGHT COLUMN */}
      <div className="w-1/2 bg-[#1E2733] flex flex-col items-center justify-center relative">
        <div className="w-[75%] max-w-[600px] bg-[#151B24] rounded-xl p-4 sm:p-6 flex flex-col items-center text-white relative min-h-[500px] pb-16">
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
