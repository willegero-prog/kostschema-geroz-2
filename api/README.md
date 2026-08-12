# Auth API

## `GET /api/auth-config`

Returns the public Clerk publishable key used by the frontend for Google, Apple and email login.

### Vercel setup

1. Create a Clerk application: https://dashboard.clerk.com
2. In Clerk → **SSO connections**, enable **Google** and **Apple**
3. Add allowed redirect URLs for `https://kostschema-geroz.com` (and preview URLs)
4. In Vercel project → **Settings → Environment Variables**, add:
   - `CLERK_PUBLISHABLE_KEY` = your Clerk publishable key (`pk_...`)
5. Redeploy

### Apple notes

- Development instances can use Clerk shared credentials for quick testing
- Production Apple Sign In requires your Apple Developer Services ID, Team ID, Key ID and private key in Clerk

Meal-plan data is still stored per signed-in user in the browser. Cloud sync (Neon/etc.) can replace that later without changing the login UI.
