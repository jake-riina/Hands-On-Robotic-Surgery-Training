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

  useEffect(() => {
    // Validate token on mount
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

    if (!token) {
      setError('Invalid registration link');
      setIsLoading(false);
      return;
    }

    try {
      // Validate token again before registration
      const validation = await validateToken(token);
      if (!validation.valid) {
        setError(validation.error || 'Invalid or expired invitation link');
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

      if (!existingProfile) {
        // Create user profile with trainee role
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: validation.email!,
            role: 'trainee',
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            experience_level: experienceLevel,
          });

        if (profileError) {
          // If profile creation fails, user might already have one
          // Try to update it instead
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              experience_level: experienceLevel,
            })
            .eq('user_id', userId);

          if (updateError) throw updateError;
        }
      } else {
        // Profile exists, update it with registration data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            experience_level: experienceLevel,
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

      // Mark invitation token as used
      await markTokenAsUsed(token);

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.email!,
        password: password,
      });

      if (signInError) {
        // User created but sign-in failed - redirect to login
        navigate('/');
        return;
      }

      // Redirect to trainee dashboard
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
        <div className="text-center">
          <div className="text-white text-lg">Validating invitation...</div>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#26313E' }}>
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
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#26313E' }}>
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
          <p className="text-gray-600 text-sm">
            Create your account to get started with robotic surgery training
          </p>
          {invitationEmail && (
            <p className="text-gray-500 text-xs mt-1">Email: {invitationEmail}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your first name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your last name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a password (min. 6 characters)"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Experience Level
            </label>
            <select
              id="experienceLevel"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: isLoading ? '#9CA3AF' : '#2563eb' }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TraineeRegistration;
