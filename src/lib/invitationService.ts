import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export type InvitationRole = 'trainee' | 'trainer';

export interface InvitationResult {
  success: boolean;
  error?: string;
  token?: string;
}

/**
 * Invites a trainee by email
 * Generates a unique token, stores it in the database, and sends an email
 */
export async function inviteTrainee(
  email: string,
  invitedBy: string
): Promise<InvitationResult> {
  return inviteByRole(email, invitedBy, 'trainee');
}

/**
 * Invites a trainer by email
 * Generates a unique token, stores it in the database, and sends an email
 */
export async function inviteTrainer(
  email: string,
  invitedBy: string
): Promise<InvitationResult> {
  return inviteByRole(email, invitedBy, 'trainer');
}

async function inviteByRole(
  email: string,
  invitedBy: string,
  role: InvitationRole
): Promise<InvitationResult> {
  try {
    // Generate unique token
    const token = uuidv4();
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store invitation in database
    const { data: _insertData, error } = await supabase
      .from('trainee_invitations')
      .insert({
        email: email.toLowerCase().trim(),
        token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (email already invited)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This email has already been invited',
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to create invitation',
      };
    }

    // Send email via Supabase Edge Function
    // Note: Email sending requires admin privileges and should be done via Edge Function
    // See SUPABASE_EMAIL_SETUP.md for configuration instructions
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const registrationLink = role === 'trainer'
      ? `${appUrl}/register/trainer/${token}`
      : `${appUrl}/register/${token}`;

    // Attempt to call Edge Function if it exists
    // If Edge Function is not set up, the invitation is still created in the database
    // and can be sent manually or via a database trigger
    try {
      const { error: functionError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: email.toLowerCase().trim(),
          token,
          registrationLink,
          appUrl,
          role,
        },
      });

      // Log error but don't fail - invitation is still created
      if (functionError) {
        console.warn('Email sending failed (Edge Function may not be configured):', functionError);
        console.info('Invitation created successfully. Token:', token);
        console.info('Registration link:', registrationLink);
      }
    } catch (err) {
      // Edge Function may not exist yet - this is okay for development
      console.warn('Edge Function not available. Invitation created with token:', token);
      console.info('Registration link:', registrationLink);
    }
    
    return {
      success: true,
      token,
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
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('trainee_invitations')
      .select('email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'Invalid invitation token',
      };
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return {
        valid: false,
        error: 'This invitation link has expired',
      };
    }

    // Check if token has already been used
    if (data.used_at) {
      return {
        valid: false,
        error: 'This invitation link has already been used',
      };
    }

    return {
      valid: true,
      email: data.email,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Failed to validate token',
    };
  }
}

/**
 * Marks an invitation token as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trainee_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return !error;
  } catch (err) {
    return false;
  }
}
