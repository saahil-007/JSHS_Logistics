# Vercel Configuration for Frontend Deployment

This file configures the Vercel deployment for the JSHS Logistics frontend.

## Environment Variables Required

Set these in your Vercel dashboard under **Project Settings > Environment Variables**:

1. **VITE_API_URL**: Your Render backend URL + /api (e.g., `https://your-backend.onrender.com/api`)
2. **VITE_SOCKET_URL**: Your Render backend URL without /api (e.g., `https://your-backend.onrender.com`)
3. **VITE_BASE_DOMAIN**: Your domain for multitenancy (e.g., `yourdomain.com`)

> **Note**: Do NOT use the `@` prefix for values in the dashboard. Just enter the plain URL or string. Vercel automatically injects these into the Vite build process.

## Deployment Steps

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Configure environment variables
4. Deploy

## Build Settings

- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`