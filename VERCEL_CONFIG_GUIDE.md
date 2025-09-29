# Vercel Environment Configuration Guide

## Environment Variables Required in Vercel

To fix the 500 error on the NextAuth providers endpoint, you need to set the following environment variables in your Vercel project dashboard:

### 1. NEXTAUTH_URL
- **Production**: `https://yololabel-generator.vercel.app`
- **Purpose**: Tells NextAuth what the canonical URL of your site is

### 2. AUTH_SECRET
- **Value**: `KT44LllrQ1EtgsW344aO5eYhVokpHAYaeHclfAQTaLE=`
- **Purpose**: Used to encrypt NextAuth.js JWT tokens and session cookies

### 3. MongoDB Connection
Ensure these are also set:
- `MONGODB_URI`: Your MongoDB connection string
- Any other database-related environment variables

## How to Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (yololabel-generator)
3. Go to "Settings" > "Environment Variables"
4. Add each variable with its value
5. Make sure to set them for "Production" environment
6. Redeploy your application after adding the variables

## Common NextAuth Production Issues Fixed

✅ **Proper TypeScript Configuration** - Added NextAuthOptions type
✅ **Environment Variable Setup** - Auto-detection of Vercel URL
✅ **Proper AUTH_SECRET** - Generated secure secret
✅ **NEXTAUTH_URL** - Canonical URL configuration
✅ **Error logging** - Added for debugging authentication issues
✅ **Providers Configuration** - Fixed "providers is not iterable" error

## Testing After Configuration

After setting the environment variables:
1. Redeploy your application
2. Try accessing: https://yololabel-generator.vercel.app/api/auth/providers
3. This should return a JSON response instead of a 500 error
4. Test the login functionality

## Additional Notes

- NextAuth automatically handles `trustHost` for production environments
- Make sure your MongoDB database is accessible from Vercel's servers
- The code auto-detects Vercel environment and sets NEXTAUTH_URL accordingly
- Check Vercel function logs if issues persist

## Recent Fix Applied

🔧 **Fixed "g.providers is not iterable" Error**:
- Added proper TypeScript typing with `NextAuthOptions`
- Moved environment variable setup to the top of the file
- Ensured providers array is properly configured
- Removed conflicting `trustHost` configuration that caused TypeScript errors