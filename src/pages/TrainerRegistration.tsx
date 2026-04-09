import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { validateToken, markTokenAsUsed } from '../lib/invitationService';

type Department = 'ENT' | 'Cardiothoracic' | 'Urology';

const images = [
  '/Screenshot-1.png',
  '/Screenshot-2.png',
  '/Screenshot-3.png',
];

const TrainerRegistration: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

    if (isDev && (!token || token === 'dev')) {
      setInvitationEmail('dev@example.com');
      setIsValidating(false);
      return;
    }

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
    if (!department) {
      setError('Please select your department');
      setIsLoading(false);
      return;
    }

    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

    if (!token && !isDev) {
      setError('Invalid registration link');
      setIsLoading(false);
      return;
    }

    try {
      let validation;
      if (isDev && (!token || token === 'dev')) {
        validation = { valid: true, email: 'dev@example.com' };
      } else {
        validation = await validateToken(token!);
        if (!validation.valid) {
          setError(validation.error || 'Invalid or expired invitation link');
          setIsLoading(false);
          return;
        }
      }

      if (isDev && (!token || token === 'dev')) {
        setError('Development mode: Account creation is disabled. Use a real token to test registration.');
        setIsLoading(false);
        return;
      }

      let userId: string;
      let needsPasswordSet = false;

      const { data: { user: existingUser } } = await supabase.auth.getUser();
      if (existingUser && existingUser.email === validation.email) {
        userId = existingUser.id;
        needsPasswordSet = true;
      } else {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: validation.email!,
          password,
        });

        if (signInData?.user) {
          userId = signInData.user.id;
        } else {
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: validation.email!,
            password,
          });

          if (signUpError) {
            if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
              const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                email: validation.email!,
                password,
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
            if (!authData.user) throw new Error('Failed to create user account');
            userId = authData.user.id;
          }
        }
      }

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: validation.email!,
            role: 'trainer',
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            department,
          });

        if (profileError) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              role: 'trainer',
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              department,
            })
            .eq('user_id', userId);

          if (updateError) throw updateError;
        }
      } else {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            role: 'trainer',
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            department,
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      if (needsPasswordSet) {
        await supabase.auth.updateUser({ password });
      }

      if (token) {
        await markTokenAsUsed(token);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.email!,
        password,
      });
      if (signInError) {
        navigate('/');
        return;
      }

      navigate('/admin/trainees');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#26313E' }}>
        <div className="text-white text-lg">Validating invitation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#26313E' }}>
      <div className="w-1/2 flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#26313E', paddingTop: '100px' }}>
        <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center justify-center" style={{ width: '25vw', minWidth: '400px', maxWidth: '500px' }}>
          <div className="w-full text-center" style={{ padding: '0 2rem', marginBottom: '1rem', marginTop: '1rem' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Trainer Registration</h2>
            <p className="text-gray-600">Create your trainer account to get started</p>
            {invitationEmail && <p className="text-gray-500 text-xs mt-1">Email: {invitationEmail}</p>}
          </div>

          <form className="space-y-4 w-full" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full border border-gray-300 rounded-lg p-3" disabled={isLoading} required />
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full border border-gray-300 rounded-lg p-3" disabled={isLoading} required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" className="w-full border border-gray-300 rounded-lg p-3" disabled={isLoading} required minLength={6} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full border border-gray-300 rounded-lg p-3" disabled={isLoading} required minLength={6} />

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="w-full border border-gray-300 rounded-lg p-3"
              disabled={isLoading}
              required
            >
              <option value="">Select your department</option>
              <option value="ENT">ENT</option>
              <option value="Cardiothoracic">Cardiothoracic</option>
              <option value="Urology">Urology</option>
            </select>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white rounded-lg p-3 disabled:opacity-50">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>

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
                <div key={index} className="absolute w-full h-full transition-transform duration-700 ease-in-out z-0" style={{ transform: `translateX(${offset * 100}%)`, opacity: isActive ? 1 : 0 }}>
                  <img src={image} alt={`carousel-${index}`} className="w-full h-full object-contain rounded-xl" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerRegistration;
