# JSHS Logistics Backend - Render Deployment Guide

## Prerequisites

1. MongoDB Atlas account and database cluster
2. Render account
3. Gmail account with App Password (for SMTP)
4. Google Maps API key
5. Razorpay account (for payments)

## Environment Variables

Set these in your Render dashboard under Environment > Environment Variables:

### Required Variables
- `NODE_ENV=production`
- `PORT=10000` (Render requires this port)
- `MONGODB_URI=your_mongodb_atlas_connection_string`
- `JWT_SECRET=your_strong_jwt_secret_min_32_chars`
- `CORS_ORIGIN=your_frontend_vercel_domain`
- `GOOGLE_MAPS_API_KEY=your_google_maps_api_key`
- `SMTP_USER=your_gmail@gmail.com`
- `SMTP_PASS=your_gmail_app_password`
- `RAZORPAY_KEY_ID=your_razorpay_key_id`
- `RAZORPAY_KEY_SECRET=your_razorpay_key_secret`

### Optional Variables
- `TWILIO_ACCOUNT_SID=your_twilio_sid` (for SMS)
- `TWILIO_AUTH_TOKEN=your_twilio_token`
- `TWILIO_FROM_NUMBER=your_twilio_phone`

## Build Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node

## Deployment Steps

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure environment variables
4. Deploy

## Post-Deployment

1. Update your frontend VITE_API_URL to point to your Render backend
2. Test the connection between frontend and backend
3. Verify all features work correctly