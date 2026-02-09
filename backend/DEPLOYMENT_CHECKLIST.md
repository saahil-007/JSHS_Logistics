# Backend Deployment Checklist for Render

## Pre-Deployment Checklist

### 1. Environment Variables ✅
- [ ] All environment variables are properly configured
- [ ] No hardcoded values in production code
- [ ] JWT secret is strong (minimum 32 characters)
- [ ] MongoDB connection string is correct

### 2. Security ✅
- [ ] CORS is properly configured for production
- [ ] Input validation is implemented
- [ ] Authentication middleware is working
- [ ] Rate limiting is configured (if needed)

### 3. Database ✅
- [ ] MongoDB Atlas cluster is created
- [ ] Database user has correct permissions
- [ ] IP whitelist includes Render IPs
- [ ] Database connection is tested

### 4. External Services ✅
- [ ] Google Maps API key is configured
- [ ] Gmail App Password is set up
- [ ] Razorpay keys are configured
- [ ] Twilio credentials are set (optional)

### 5. Code Quality ✅
- [ ] No console.log statements in production
- [ ] Error handling is implemented
- [ ] Logging is configured
- [ ] Health check endpoint is working

## Render Configuration

### Service Settings
```
Name: jshs-logistics-backend
Environment: Node
Build Command: npm install
Start Command: npm start
Root Directory: backend
Instance Type: Free (upgrade as needed)
```

### Required Environment Variables
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

### Optional Environment Variables
```env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=your_twilio_phone
SPEED_LIMIT_KMPH=80
HARSH_TURN_DEG=45
HARSH_TURN_WINDOW_SEC=2
IDLE_WINDOW_SEC=300
DRIVER_EVENT_COOLDOWN_SEC=60
```

## Post-Deployment Steps

1. **Test Health Endpoint**:
   ```bash
   curl https://your-backend.onrender.com/health
   ```

2. **Test API Endpoints**:
   - Authentication endpoints
   - Shipment creation
   - Payment processing
   - Email notifications

3. **Monitor Logs**:
   - Check Render logs regularly
   - Set up alerts for errors
   - Monitor performance metrics

4. **Database Migration**:
   - Run any pending migrations
   - Seed initial data if needed
   - Verify data integrity

## Common Issues & Solutions

### CORS Errors
- Ensure CORS_ORIGIN matches your frontend URL exactly
- Check protocol (http vs https)
- Verify domain includes www if needed

### Database Connection Issues
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Test connection locally first

### Email Sending Issues
- Verify Gmail App Password is correct
- Check SMTP settings
- Test with different email providers

### Payment Processing Issues
- Verify Razorpay keys are correct
- Check webhook configuration
- Test in sandbox mode first

## Monitoring & Maintenance

### Regular Tasks
- Monitor application logs
- Check database performance
- Update dependencies regularly
- Backup database periodically

### Scaling Considerations
- Monitor response times
- Check memory usage
- Consider upgrading Render plan
- Implement caching if needed