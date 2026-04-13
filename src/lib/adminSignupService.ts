import { supabase } from './supabaseClient';
import type { AdminSignupDepartmentName } from './adminDepartmentOptions';

export function getViteProgramIdOrThrow(): string {
  const id = import.meta.env.VITE_PROGRAM_ID;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('VITE_PROGRAM_ID is not configured');
  }
  return id.trim();
}

/**
 * Completes admin signup after Supabase Auth has created the user and session.
 * Calls `public.complete_admin_signup` (SECURITY DEFINER) to upsert department + user_profiles.
 */
export async function finalizeAdminSignupWithRpc(params: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentName: AdminSignupDepartmentName;
}): Promise<unknown> {
  const programId = getViteProgramIdOrThrow();
  const { data, error } = await supabase.rpc('complete_admin_signup', {
    p_user_id: params.userId,
    p_email: params.email,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
    p_department_name: params.departmentName,
    p_program_id: programId,
  });
  if (error) throw error;
  if (data == null) {
    throw new Error('Profile setup returned no data. Please try signing in or contact support.');
  }
  return data;
}
