import { supabase } from './supabaseClient';

export type UserRole = 'trainee' | 'admin';

export interface UserProfile {
  user_id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  experience_level?: string;
}

/**
 * Gets the current user's profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    return data as UserProfile;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

/**
 * Gets the current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUserProfile();
  return profile?.role || null;
}

/**
 * Checks if the current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'admin';
}

/**
 * Checks if the current user is a trainee
 */
export async function isCurrentUserTrainee(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'trainee';
}
