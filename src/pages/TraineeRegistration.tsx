import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { validateToken, markTokenAsUsed } from '../lib/invitationService';

type ExperienceLevel = 
  | 'Medical School student'
  | 'PGY1'
  | 'PGY2'
  | 'PGY3'
  | 'PGY4+'
  | 'fellow';

const images = [
  '/Screenshot-1.png',
  '/Screenshot-2.png',
  '/Screenshot-3.png',
];

const TraineeRegistration: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [current, setCurrent] = useState(0);

  /* ---------- Carousel auto-rotate ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Development mode: bypass token validation
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (isDev && (!token || token === 'dev')) {
      // Skip validation in dev mode - allows UI development without tokens
      setInvitationEmail('dev@example.com');
      setIsValidating(false);
      return;
    }

    // Validate token on mount (production mode)
    const validateInvitation = async () => {
      if (!token) {
        setError('Invalid registration link');
        setIsValidating(false);
        return;
      }

      const validation = await validateToken(token);
      if (!validation.valid) {
        setError(validation.error || 'Invalid or expired invitation link');
        setIsValidating(false);
        return;
      }

      if (validation.role !== 'trainee') {
        setError('This invitation is not for a trainee account.');
        setIsValidating(false);
        return;
      }

      setInvitationEmail(validation.email || '');
      setIsValidating(false);
    };

    validateInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (!firstName.trim()) {
      setError('First name is required');
      setIsLoading(false);
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!experienceLevel) {
      setError('Please select your experience level');
      setIsLoading(false);
      return;
    }

    // Development mode check
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (!token && !isDev) {
      setError('Invalid registration link');
      setIsLoading(false);
      return;
    }

    try {
      let validation;
      
      // In dev mode with 'dev' token, skip validation
      if (isDev && token === 'dev') {
        validation = { valid: true, email: 'dev@example.com' };
      } else if (!token && isDev) {
        // Dev mode without token - still allow form testing but show warning
        validation = { valid: true, email: 'dev@example.com' };
      } else {
        // Production mode: validate token before registration
        validation = await validateToken(token!);
        if (!validation.valid) {
          setError(validation.error || 'Invalid or expired invitation link');
          setIsLoading(false);
          return;
        }
      }

      // In dev mode, prevent actual account creation
      if (isDev && (!token || token === 'dev')) {
        setError('Development mode: Account creation is disabled. Use a real token to test registration.');
        setIsLoading(false);
        return;
      }

      const programId = (import.meta.env.VITE_PROGRAM_ID as string | undefined)?.trim();
      if (!programId) {
        setError('Application configuration error: VITE_PROGRAM_ID is not set.');
        setIsLoading(false);
        return;
      }

      if (validation.role !== 'trainee') {
        setError('This invitation is not for a trainee account.');
        setIsLoading(false);
        return;
      }

      if (!validation.departmentId) {
        setError('This invitation is missing a department. Please request a new invite.');
        setIsLoading(false);
        return;
      }

      let userId: string;
      let needsPasswordSet = false;

      // Check if user already exists (created by inviteUserByEmail)
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      
      if (existingUser && existingUser.email === validation.email) {
        // User was created by inviteUserByEmail, use existing user
        userId = existingUser.id;
        needsPasswordSet = true;
      } else {
        // Try to sign in first (in case user exists but not signed in)
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: validation.email!,
          password: password,
        });

        if (signInData?.user) {
          userId = signInData.user.id;
        } else {
          // Create new user account
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: validation.email!,
            password: password,
          });

          if (signUpError) {
            // Check if user already exists
            if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
              // User exists, try to sign in
              const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                email: validation.email!,
                password: password,
              });
              
              if (retryError || !retrySignIn.user) {
                setError('An account with this email already exists. Please sign in with your password.');
                setIsLoading(false);
                return;
              }
              userId = retrySignIn.user.id;
            } else {
              throw signUpError;
            }
          } else {
            if (!authData.user) {
              throw new Error('Failed to create user account');
            }
            userId = authData.user.id;
          }
        }
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      const profilePayload = {
        user_id: userId,
        department_id: validation.departmentId,
        program_id: programId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: validation.email!,
        experience_level: experienceLevel,
        role: 'trainee' as const,
      };

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('user_profiles').insert(profilePayload);

        if (profileError) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              department_id: profilePayload.department_id,
              program_id: profilePayload.program_id,
              first_name: profilePayload.first_name,
              last_name: profilePayload.last_name,
              email: profilePayload.email,
              experience_level: profilePayload.experience_level,
              role: profilePayload.role,
            })
            .eq('user_id', userId);

          if (updateError) throw updateError;
        }
      } else {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            department_id: profilePayload.department_id,
            program_id: profilePayload.program_id,
            first_name: profilePayload.first_name,
            last_name: profilePayload.last_name,
            email: profilePayload.email,
            experience_level: profilePayload.experience_level,
            role: profilePayload.role,
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      // If user was created by inviteUserByEmail, update their password
      if (needsPasswordSet) {
        const { error: updatePasswordError } = await supabase.auth.updateUser({
          password: password
        });
        
        if (updatePasswordError) {
          console.warn('Password update failed:', updatePasswordError);
          // Continue anyway - they can reset password later
        }

      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.email!,
        password: password,
      });

      if (signInError) {
        navigate('/');
        return;
      }

      if (token) {
        await markTokenAsUsed(token);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#26313E' }}>
        {/* Sticky Logo in top-left corner */}
        <div className="fixed top-0 left-0 z-50 p-4 bg-white rounded-br-lg shadow">
          <img
            src="/Logo.png"
            alt="HandsOn Logo"
            className="h-12 w-auto max-w-[140px] object-contain"
            onError={() => console.error('Logo image failed to load')}
          />
        </div>
        <div className="text-center">
          <div className="text-white text-lg">Validating invitation...</div>
        </div>
      </div>
    );
  }

  if (error && !token) {
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
        {/* Left Panel - Error Message */}
        <div className="w-1/2 flex items-center justify-center p-8" style={{ backgroundColor: '#26313E' }}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-white rounded-lg"
                style={{ backgroundColor: '#2563eb' }}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
        {/* Right Panel - Dark Container with Carousel */}
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

            {/* Indicator buttons */}
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
  }

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

      {/* Left Panel - Registration Form */}
      <div className="w-1/2 flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#26313E', paddingTop: '100px' }}>
        {/* Centered Registration Container */}
        <div className="flex flex-col items-center justify-center w-full">
          {/* Registration Form - White rounded box */}
          <div
            className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              width: '25vw',
              minWidth: '400px',
              maxWidth: '500px',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div
              className="w-full text-center"
              style={{ padding: '0 2rem', marginBottom: '1rem', marginTop: '1rem' }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
              <p className="text-gray-600">Create your account to get started with robotic surgery training</p>
              {invitationEmail && (
                <p className="text-gray-500 text-xs mt-1">Email: {invitationEmail}</p>
              )}
            </div>
            <form
              className="space-y-4 w-full"
              onSubmit={handleSubmit}
            >
              {error && (
                <div className="px-1 w-full flex justify-center mb-4">
                  <div className="text-red-500 text-sm text-center" style={{ width: '75%' }}>{error}</div>
                </div>
              )}

              {/* First Name Input */}
              <div className="px-1 w-full flex justify-center mb-4">
                <div style={{ minWidth: '0', width: '75%' }}>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                    placeholder="Enter your first name"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Last Name Input */}
              <div className="px-1 w-full flex justify-center mb-4">
                <div style={{ minWidth: '0', width: '75%' }}>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="py-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                    placeholder="Enter your last name"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="px-1 w-full flex justify-center mb-4">
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
                    placeholder="Create a password (min. 6 characters)"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="px-1 w-full flex justify-center mb-4">
                <div style={{ minWidth: '0', width: '75%' }}>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>

              {/* Experience Level Select */}
              <div className="px-1 w-full flex justify-center mb-4">
                <div style={{ minWidth: '0', width: '75%' }}>
                  <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Level
                  </label>
                  <select
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                    className="py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    style={{ paddingLeft: '10px', paddingRight: '10px', boxSizing: 'border-box', height: '50px' }}
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select your experience level</option>
                    <option value="Medical School student">Medical School student</option>
                    <option value="PGY1">PGY1</option>
                    <option value="PGY2">PGY2</option>
                    <option value="PGY3">PGY3</option>
                    <option value="PGY4+">PGY4+</option>
                    <option value="fellow">Fellow</option>
                  </select>
                </div>
              </div>

              {/* Create Account Button */}
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
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Dark Container with Carousel */}
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

export default TraineeRegistration;
