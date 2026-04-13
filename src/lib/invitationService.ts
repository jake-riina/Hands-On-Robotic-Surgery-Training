import { supabase } from './supabaseClient';

export type InvitationRole = 'trainee' | 'trainer';

export interface InvitationResult {
  success: boolean;
  error?: string;
  token?: string;
}

/**
 * Invites a trainee by email.
 * `invited_by` is set in the Edge Function from the caller's JWT.
 */
export async function inviteTrainee(
  email: string,
  departmentId: string
): Promise<InvitationResult> {
  return inviteByRole(email, departmentId, 'trainee');
}

/**
 * Invites a trainer by email.
 * `invited_by` is set in the Edge Function from the caller's JWT.
 */
export async function inviteTrainer(
  email: string,
  departmentId: string
): Promise<InvitationResult> {
  return inviteByRole(email, departmentId, 'trainer');
}

async function inviteByRole(
  email: string,
  departmentId: string,
  role: InvitationRole
): Promise<InvitationResult> {
  try {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const { data, error } = await supabase.functions.invoke('create-invitation', {
      body: {
        email: email.toLowerCase().trim(),
        role_to_assign: role,
        department_id: departmentId,
        appUrl,
      },
    });

    if (error || !data?.success) {
      return {
        success: false,
        error: data?.error || error?.message || 'Failed to send invitation',
      };
    }

    return {
      success: true,
      token: data.token,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Validates a registration token
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  role?: InvitationRole;
  departmentId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('invitation_tokens')
      .select('email, role_to_assign, department_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid invitation token' };
    }

    if (new Date() > new Date(data.expires_at)) {
      return { valid: false, error: 'This invitation link has expired' };
    }

    if (data.used_at) {
      return { valid: false, error: 'This invitation link has already been used' };
    }

    return {
      valid: true,
      email: data.email,
      role: data.role_to_assign,
      departmentId: data.department_id,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Failed to validate token' };
  }
}

/**
 * Marks an invitation token as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invitation_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return !error;
  } catch {
    return false;
  }
}