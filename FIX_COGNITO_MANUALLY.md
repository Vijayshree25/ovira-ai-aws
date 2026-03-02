# Fix Cognito 400 Error - Manual Steps

Since AWS CLI is not available, follow these steps in the AWS Console:

## Step 1: Open AWS Cognito Console

1. Go to: https://console.aws.amazon.com/cognito/
2. Click on **User pools**
3. Click on your user pool: **us-east-1_itYHpVqJo**

## Step 2: Update App Client Settings

1. In the left sidebar, click **App integration**
2. Scroll down to **App clients and analytics**
3. Click on your app client: **5a9j5p6cusobugun5ah3v4dvem**
4. Click **Edit** button

## Step 3: Enable Authentication Flows

Scroll to **Authentication flows** section and make sure these are **CHECKED**:

- ✅ **ALLOW_USER_PASSWORD_AUTH** (Enable username password auth for admin APIs)
- ✅ **ALLOW_USER_SRP_AUTH** (Enable SRP (secure remote password) protocol based authentication)
- ✅ **ALLOW_REFRESH_TOKEN_AUTH** (Enable auth flow to refresh tokens)

**UNCHECK** these if they are checked:
- ❌ ALLOW_CUSTOM_AUTH
- ❌ ALLOW_USER_AUTH

## Step 4: Prevent User Existence Errors

Scroll to **Prevent user existence errors** section:

- Select: **Enabled (Recommended)**

This prevents attackers from discovering valid usernames.

## Step 5: Save Changes

1. Scroll to the bottom
2. Click **Save changes**

## Step 6: Verify Email Attribute Configuration

1. Go back to your User Pool main page
2. Click **Sign-up experience** tab
3. Under **Required attributes**, verify that **email** is listed
4. If not, you may need to add it (though this requires recreating the user pool)

## Step 7: Check Password Policy

1. Click **Sign-in experience** tab
2. Under **Password policy**, verify:
   - Minimum length: 8 characters
   - Requires: Uppercase, Lowercase, Numbers
   - Special characters: Optional

## Step 8: Test Again

1. Stop your Next.js dev server (Ctrl+C)
2. Restart it: `npm run dev`
3. Try signing up again at http://localhost:3000/signup

---

## Still Getting 400 Error?

If you still get the error after these changes, the issue might be:

### Option A: Email Verification Not Configured

1. Go to User Pool → **Messaging** tab
2. Check **Email** configuration
3. Make sure email verification is enabled

### Option B: Create New User Pool Client

If the above doesn't work, create a new app client:

1. Go to User Pool → **App integration** → **App clients**
2. Click **Create app client**
3. Settings:
   - **App type**: Public client
   - **App client name**: ovira-web-client-v2
   - **Authentication flows**: Check all three (USER_PASSWORD, SRP, REFRESH_TOKEN)
   - **Prevent user existence errors**: Enabled
4. Click **Create**
5. Copy the new **Client ID**
6. Update `.env.local` with the new Client ID
7. Restart dev server

---

## Quick Verification Checklist

Before testing again, verify:

- ✅ User Pool ID in `.env.local` matches AWS Console
- ✅ Client ID in `.env.local` matches AWS Console
- ✅ Region is `us-east-1` in both places
- ✅ Authentication flows are enabled
- ✅ Email is a required attribute
- ✅ Dev server was restarted after changes

---

## Need Help?

If you're still stuck, share a screenshot of:
1. Your app client settings page (Authentication flows section)
2. The browser console error (full error message)
