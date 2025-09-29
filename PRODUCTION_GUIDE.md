# Production Deployment Guide

## Environment Variables Required for Production

### Critical Variables (Must Set)
```bash
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com  # REQUIRED - Your production domain
AUTH_SECRET=your-super-secret-key-min-32-chars  # REQUIRED - Generate random 32+ chars

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
```

## Common Production Issues & Solutions

### 1. Login Redirect Not Working
**Problem**: After successful login, user stays on login page instead of redirecting to home.

**Solutions**:
- Set `NEXTAUTH_URL` to your production domain (e.g., `https://yourdomain.com`)
- Ensure `AUTH_SECRET` is set to a secure random string (32+ characters)
- Check browser console for CORS or network errors

### 2. Generate AUTH_SECRET
```bash
# Generate secure random string
openssl rand -base64 32
# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Platform-Specific Instructions

#### Vercel
1. Go to Project Settings → Environment Variables
2. Add all required environment variables
3. Redeploy

#### Railway/Heroku
```bash
# Set environment variables
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set AUTH_SECRET=your-generated-secret
```

#### Docker
```dockerfile
ENV NEXTAUTH_URL=https://your-domain.com
ENV AUTH_SECRET=your-generated-secret
```

## Debugging Production Login Issues

### 1. Check Browser Network Tab
- Look for 401/403 errors on `/api/auth/*` endpoints
- Check if cookies are being set

### 2. Check Server Logs
- Authentication errors
- Database connection issues
- Missing environment variables

### 3. Test Environment Variables
Add temporary logging in production (remove after debugging):
```javascript
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('AUTH_SECRET set:', !!process.env.AUTH_SECRET);
```

## Security Checklist for Production
- [ ] `AUTH_SECRET` is set to secure random string
- [ ] `NEXTAUTH_URL` matches your production domain exactly
- [ ] MongoDB connection string is secure
- [ ] Cloudinary credentials are environment-specific
- [ ] No development secrets in production