# Email Confirmation Setup Guide

This guide explains how to configure email confirmations for your Supabase project.

## Overview

Email confirmation ensures that users verify their email address before they can sign in to the application. This improves security and prevents fake accounts.

## Configuration Steps

### 1. Enable Email Confirmations in Supabase Dashboard

1. Go to your Supabase project dashboard: https://app.supabase.com/project/<your-project-ref>
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable **"Confirm email"** toggle
4. Click **Save**

### 2. Configure Site URL

1. In the same Email provider settings, find **"Site URL"**
2. Set it to your production URL:
   - Production: `https://your-domain.com`
   - Local development: `http://localhost:5173`
3. Click **Save**

### 3. Configure Redirect URLs

1. Find **"Redirect URLs"** section
2. Add these URLs:
   - `https://your-domain.com/**`
   - `http://localhost:5173/**`
   - `http://localhost:3000/**` (if using different port)
3. Click **Save**

### 4. Configure SMTP Settings (For Production)

To send actual emails (not just log them), you need to configure SMTP:

1. Navigate to **Authentication** → **Email Templates**
2. Go to **Authentication** → **Providers** → **Email**
3. Scroll to **SMTP Settings** section
4. Enable **"Use custom SMTP"**
5. Enter your SMTP credentials:
   - **Host**: `smtp.gmail.com` (for Gmail) or your provider's SMTP host
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: Your email address
   - **Password**: Your email password or app-specific password
   - **Sender Email**: The email address that will send confirmations
   - **Sender Name**: "Barangay Culiat Safety Portal"
6. Click **Save**

**Recommended SMTP Providers:**
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month for 3 months)
- **Amazon SES** (Pay-as-you-go, very cheap)
- **Gmail SMTP** (Free but limited to 500 emails/day)

### 5. Test Email Confirmation

1. Sign up with a new account using a real email address
2. Check your email inbox for the confirmation email
3. Click the confirmation link
4. Try signing in with the confirmed account

## Troubleshooting

### Emails Not Being Sent

**Check SMTP Configuration:**
- Verify SMTP credentials are correct
- Check if your email provider requires app-specific passwords
- Ensure the sender email is verified (if required by your SMTP provider)

**Check Supabase Logs:**
- Go to **Logs** → **Auth Logs** in Supabase dashboard
- Look for email sending errors

**Check Rate Limits:**
- Supabase has email rate limits (see config.toml line 199: `email_sent = 2`)
- Default is 2 emails per hour per user
- Increase if needed for testing

### Confirmation Link Not Working

**Check Redirect URLs:**
- Ensure your site URL is in the allowed redirect URLs list
- Check for typos in the URL

**Check Browser Console:**
- Open browser DevTools (F12)
- Look for errors when clicking the confirmation link

### User Can't Sign In After Confirmation

**Check Database:**
- Go to **Table Editor** → **auth.users**
- Verify the user's `email_confirmed_at` field is set

**Check RLS Policies:**
- Ensure your RLS policies allow confirmed users to access the app
- Check the `public_users` table for the user's profile

## Email Templates

You can customize the email templates in Supabase:

1. Go to **Authentication** → **Email Templates**
2. Edit these templates:
   - **Confirm signup**: Sent when user signs up
   - **Invite user**: Sent when admin invites a user
   - **Magic link**: Sent for passwordless login
   - **Reset password**: Sent for password reset

### Example: Custom Confirm Signup Template

```html
<h2>Welcome to Barangay Culiat Safety Portal</h2>
<p>Click the link below to confirm your email address:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
<p>This link will expire in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
```

## Production Checklist

Before deploying to production:

- [ ] Enable email confirmations in Supabase dashboard
- [ ] Set correct Site URL for production domain
- [ ] Add production domain to Redirect URLs
- [ ] Configure production SMTP settings
- [ ] Test email sending with real email addresses
- [ ] Customize email templates with your branding
- [ ] Set appropriate rate limits for your use case
- [ ] Monitor email delivery rates and errors

## Local Development

For local development, you can use Supabase's built-in email testing:

1. Run `supabase start` to start local Supabase
2. Go to http://localhost:54324 (Inbucket web interface)
3. All emails sent locally will appear here
4. Click the confirmation link in the email to confirm

This allows you to test the full email confirmation flow without configuring SMTP.

## Support

If you encounter issues:
- Check Supabase documentation: https://supabase.com/docs/guides/auth/auth-email
- Check Supabase status: https://status.supabase.com
- Create a support ticket in Supabase dashboard
