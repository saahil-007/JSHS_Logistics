#!/bin/bash

# JSHS Logistics Deployment Script
# This script helps deploy the application to production

echo "🚀 JSHS Logistics Deployment Script"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment variables
validate_env() {
    local env_file=$1
    local required_vars=$2
    
    echo "Validating $env_file..."
    
    for var in $required_vars; do
        if ! grep -q "^$var=" "$env_file"; then
            echo "❌ Missing required variable: $var"
            return 1
        fi
    done
    
    echo "✅ $env_file validation passed"
    return 0
}

# Function to test backend health
test_backend() {
    local backend_url=$1
    echo "Testing backend health at $backend_url..."
    
    if curl -s -f "$backend_url/health" >/dev/null; then
        echo "✅ Backend is healthy"
        return 0
    else
        echo "❌ Backend health check failed"
        return 1
    fi
}

# Function to test frontend
test_frontend() {
    local frontend_url=$1
    echo "Testing frontend at $frontend_url..."
    
    if curl -s -f "$frontend_url" >/dev/null; then
        echo "✅ Frontend is accessible"
        return 0
    else
        echo "❌ Frontend is not accessible"
        return 1
    fi
}

# Main deployment process
main() {
    echo "Starting deployment process..."
    
    # Check prerequisites
    if ! command_exists git; then
        echo "❌ Git is not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
    
    # Validate backend environment
    if [ -f "backend/.env.production" ]; then
        validate_env "backend/.env.production" "NODE_ENV PORT MONGODB_URI JWT_SECRET CORS_ORIGIN GOOGLE_MAPS_API_KEY SMTP_USER SMTP_PASS RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET"
    else
        echo "⚠️  backend/.env.production not found, creating from template..."
        cp backend/.env.example backend/.env.production
        echo "❌ Please update backend/.env.production with your actual values"
        exit 1
    fi
    
    # Validate frontend environment
    if [ -f "frontend/.env.production" ]; then
        validate_env "frontend/.env.production" "VITE_API_URL VITE_SOCKET_URL VITE_BASE_DOMAIN"
    else
        echo "⚠️  frontend/.env.production not found, creating from template..."
        cp frontend/.env.example frontend/.env.production
        echo "❌ Please update frontend/.env.production with your actual values"
        exit 1
    fi
    
    # Build backend
    echo "Building backend..."
    cd backend
    npm install
    npm run build 2>/dev/null || echo "No build script for backend"
    cd ..
    
    # Build frontend
    echo "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    echo "✅ Build process completed"
    echo ""
    echo "📋 Deployment Summary"
    echo "==================="
    echo "Backend: Ready for Render deployment"
    echo "Frontend: Ready for Vercel deployment"
    echo ""
    echo "Next steps:"
    echo "1. Deploy backend to Render using render.yaml"
    echo "2. Deploy frontend to Vercel using vercel.json"
    echo "3. Update CORS_ORIGIN in backend with actual frontend URL"
    echo "4. Test the deployment"
    echo ""
    echo "📚 Documentation:"
    echo "- backend/RENDER_DEPLOYMENT.md"
    echo "- frontend/VERCEL_DEPLOYMENT.md"
    echo "- DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"