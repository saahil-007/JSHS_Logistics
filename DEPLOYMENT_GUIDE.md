# JSHS Logistics - Complete Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy your JSHS Logistics application with:
- **Frontend**: Vercel (React + Vite + TypeScript)
- **Backend**: Render (Node.js + Express + MongoDB)

## Prerequisites

### Required Accounts
1. **GitHub** - For version control
2. **Vercel** - For frontend deployment
3. **Render** - For backend deployment
4. **MongoDB Atlas** - For database
5. **Google Cloud** - For Maps API
6. **Gmail** - For SMTP/email services
7. **Razorpay** - For payment processing

### Required Information
- Domain name (optional, for custom domains)
- GitHub repository with your code

---

## Step 1: Backend Deployment (Render)

### 1.1 Prepare Backend Environment

1. **Create MongoDB Atlas Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Create a database user
   - Whitelist all IP addresses (0.0.0.0/0) for now
   - Get your connection string

2. **Set up Gmail App Password**:
   - Go to Google Account settings
   - Enable 2-factor authentication
   - Generate app password for Gmail
   - Save the 16-character password

3. **Get Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or use existing
   - Enable Maps JavaScript API and Places API
   - Create API key
   - Restrict the key to your domains

4. **Set up Razorpay**:
   - Create account at [Razorpay](https://razorpay.com/)
   - Get your Key ID and Key Secret from dashboard

### 1.2 Deploy to Render

1. **Connect GitHub to Render**:
   - Login to [Render](https://render.com/)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder/directory

2. **Configure Backend Service**:
   ```
   Name: jshs-logistics-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Root Directory: backend
   ```

3. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jshs_logistics
   JWT_SECRET=your_very_long_random_string_min_32_characters
   CORS_ORIGIN=https://your-frontend.vercel.app
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your_gmail_app_password
   SMTP_FROM="JSHS Logistics" <no-reply@yourdomain.com>
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. **Deploy Backend**:
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your backend URL (e.g., `https://jshs-logistics-backend.onrender.com`)

---

## Step 2: Frontend Deployment (Vercel)

### 2.1 Prepare Frontend Environment

1. **Update Frontend Environment Variables**:
   Edit `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   VITE_BASE_DOMAIN=yourdomain.com
   ```

### 2.2 Deploy to Vercel

1. **Connect GitHub to Vercel**:
   - Login to [Vercel](https://vercel.com/)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` folder

2. **Configure Frontend Project**:
   ```
   Framework: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Root Directory: frontend
   ```

3. **Set Environment Variables**:
   In the Vercel dashboard, add these under **Settings > Environment Variables**:
   ```env
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   VITE_BASE_DOMAIN=yourdomain.com
   ```
   *(Enter the plain values without any `@` prefix or quotes)*

4. **Deploy Frontend**:
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your frontend URL (e.g., `https://jshs-logistics-frontend.vercel.app`)

---

## Step 3: Final Configuration

### 3.1 Update Backend CORS

1. **Update Backend CORS Origin**:
   - Go to your Render dashboard
   - Find your backend service
   - Update the `CORS_ORIGIN` environment variable to your actual Vercel frontend URL
   - Redeploy the backend

### 3.2 Update Frontend API URLs

1. **Update Frontend Environment**:
   - Go to your Vercel dashboard
   - Find your frontend project
   - Update environment variables with your actual Render backend URL
   - Redeploy the frontend

---

## Step 4: Testing & Verification

### 4.1 Test Core Functionality

1. **User Registration/Login**:
   - Visit your frontend URL
   - Try registering a new user
   - Check if confirmation emails are sent

2. **Shipment Creation**:
   - Create a test shipment
   - Verify maps load correctly
   - Check if tracking works

3. **Payment Processing**:
   - Test payment functionality
   - Verify Razorpay integration

4. **Real-time Features**:
   - Test live tracking
   - Check notifications
   - Verify socket connections

### 4.2 Monitor Logs

1. **Backend Logs**:
   - Check Render logs for any errors
   - Monitor database connections
   - Verify email sending

2. **Frontend Console**:
   - Check browser console for errors
   - Verify API calls are successful
   - Test on different devices/browsers

---

## Step 5: Production Optimization

### 5.1 Security Hardening

1. **Update Environment Variables**:
   - Use strong JWT secrets
   - Enable API key restrictions
   - Set up proper CORS origins

2. **Database Security**:
   - Update MongoDB Atlas IP whitelist
   - Create database backups
   - Monitor connection usage

3. **API Security**:
   - Implement rate limiting
   - Add input validation
   - Enable HTTPS everywhere

### 5.2 Performance Optimization

1. **Frontend**:
   - Enable caching headers
   - Optimize images
   - Use CDN for static assets

2. **Backend**:
   - Implement caching
   - Optimize database queries
   - Monitor response times

---

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check CORS_ORIGIN matches your frontend URL exactly
   - Verify protocol (http vs https)
   - Check for trailing slashes

2. **Database Connection Issues**:
   - Verify MongoDB Atlas whitelist includes Render IP
   - Check connection string format
   - Ensure database user has correct permissions

3. **Email Sending Issues**:
   - Verify Gmail app password is correct
   - Check SMTP settings
   - Test with different email providers

4. **Payment Processing Issues**:
   - Verify Razorpay keys are correct
   - Check webhook configuration
   - Test in sandbox mode first

5. **Maps Not Loading**:
   - Verify Google Maps API key
   - Check API key restrictions
   - Ensure billing is enabled

### Getting Help

- Check application logs in Render/Vercel dashboards
- Use browser developer tools for frontend debugging
- Monitor network requests for API issues
- Check database logs in MongoDB Atlas

---

## Maintenance

### Regular Tasks

1. **Monitor Usage**:
   - Check database connection limits
   - Monitor API rate limits
   - Track email sending quotas

2. **Update Dependencies**:
   - Keep npm packages updated
   - Monitor security advisories
   - Test updates in staging first

3. **Backup Data**:
   - Regular database backups
   - Export critical data
   - Test restore procedures

### Scaling Considerations

1. **Database**:
   - Monitor connection pool usage
   - Consider sharding for large datasets
   - Implement read replicas

2. **Backend**:
   - Use load balancers for high traffic
   - Implement horizontal scaling
   - Monitor server resources

3. **Frontend**:
   - Use CDN for global distribution
   - Implement service workers
   - Optimize for mobile devices

---

## Support

For issues specific to:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Render**: Check [Render Documentation](https://render.com/docs)
- **MongoDB Atlas**: Check [MongoDB Documentation](https://docs.atlas.mongodb.com/)
- **Google Maps**: Check [Maps Documentation](https://developers.google.com/maps)

Remember to replace all placeholder values with your actual configuration details!