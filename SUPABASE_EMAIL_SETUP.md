# Supabase Email Configuration for Trainee Invitations

This document explains how to configure Supabase to send invitation emails to trainees.

## Option 1: Using Supabase Edge Function (Recommended)

Create a Supabase Edge Function to handle email sending with custom templates.

### Steps:

1. **Create Edge Function**
   - In Supabase Dashboard, go to Edge Functions
   - Create a new function called `send-invitation-email`
   - Use the Supabase service role key for admin operations

2. **Function Code Example** (TypeScript):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, token, appUrl } = await req.json()
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const registrationLink = `${appUrl}/register/${token}`

  // Send email using Supabase's email service
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: registrationLink,
    data: {
      token: token,
      type: 'trainee_invitation'
    }
  })

  return new Response(JSON.stringify({ success: !error, error }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

3. **Update invitationService.ts**
   - Call the Edge Function after creating the invitation:
```typescript
// After storing invitation in database
const { data, error } = await supabase.functions.invoke('send-invitation-email', {
  body: { email, token, appUrl: window.location.origin }
})
```

## Option 2: Using Supabase Auth Invite (Simpler)

Use Supabase's built-in `inviteUserByEmail` method. This requires service role access.

### Steps:

1. **Create a backend API endpoint** or use Supabase Edge Function
2. **Call from your application** after creating the invitation record

## Option 3: Custom Email Service

Integrate with a third-party email service (SendGrid, Mailgun, etc.) via Edge Function.

## Email Template

The invitation email should include:
- Welcome message
- Registration link: `${APP_URL}/register/${token}`
- Expiration notice (24 hours)
- Instructions for completing registration

## Environment Variables

Add to your `.env` file:
```
VITE_APP_URL=http://localhost:5173  # or your production URL
```

## Testing

1. Create an invitation via the admin dashboard
2. Check Supabase logs for email sending status
3. Verify email is received
4. Test registration link expiration

## Notes

- Supabase free tier has email sending limits
- For production, consider using a dedicated email service
- Email templates can be customized in Supabase Dashboard > Authentication > Email Templates
