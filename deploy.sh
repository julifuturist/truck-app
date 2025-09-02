#!/bin/bash

# TruckLog Pro Deployment Script
# This script helps deploy the application to production

echo "🚛 TruckLog Pro Deployment Script"
echo "================================="

# Function to deploy backend to Railway
deploy_backend() {
    echo "📦 Deploying Backend to Railway..."
    
    if ! command -v railway &> /dev/null; then
        echo "❌ Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    echo "🔐 Please login to Railway (opens browser):"
    railway login
    
    echo "🚀 Deploying backend..."
    railway init --name trucklog-backend
    railway add --service postgresql
    
    echo "⚙️ Setting environment variables..."
    railway variables set DEBUG=False
    railway variables set CORS_ALLOW_ALL_ORIGINS=False
    railway variables set OPENROUTE_API_KEY=${OPENROUTE_API_KEY:-"5b3ce3597851110001cf6248ea3ab4e2cf4148b19b68be21b1bcbf75"}
    
    railway deploy
    
    echo "✅ Backend deployed! Note the URL for frontend configuration."
}

# Function to deploy frontend to Vercel
deploy_frontend() {
    echo "🌐 Deploying Frontend to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    cd frontend
    
    echo "🔐 Please login to Vercel:"
    vercel login
    
    echo "⚙️ Setting up environment variables..."
    echo "Please enter your backend API URL (e.g., https://trucklog-backend.railway.app/api/v1):"
    read -p "Backend URL: " BACKEND_URL
    
    echo "🚀 Deploying frontend..."
    vercel --prod --env REACT_APP_API_URL="$BACKEND_URL"
    
    cd ..
    echo "✅ Frontend deployed!"
}

# Function to setup local development
setup_local() {
    echo "💻 Setting up local development environment..."
    
    # Backend setup
    echo "🐍 Setting up Python backend..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python create_sample_data.py
    
    # Frontend setup
    echo "⚛️ Setting up React frontend..."
    cd frontend
    npm install
    cd ..
    
    echo "✅ Local development setup complete!"
    echo ""
    echo "To start the application:"
    echo "1. Backend: source venv/bin/activate && python manage.py runserver"
    echo "2. Frontend: cd frontend && npm start"
}

# Function to run tests
run_tests() {
    echo "🧪 Running tests..."
    
    # Backend tests
    echo "Testing Django backend..."
    source venv/bin/activate
    python manage.py test
    
    # Frontend tests
    echo "Testing React frontend..."
    cd frontend
    npm test -- --coverage --watchAll=false
    cd ..
    
    echo "✅ Tests completed!"
}

# Main menu
echo ""
echo "What would you like to do?"
echo "1. Deploy Backend to Railway"
echo "2. Deploy Frontend to Vercel"
echo "3. Deploy Both (Full Deployment)"
echo "4. Setup Local Development"
echo "5. Run Tests"
echo "6. Exit"
echo ""

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        echo ""
        deploy_frontend
        ;;
    4)
        setup_local
        ;;
    5)
        run_tests
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-6."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment script completed!"
echo ""
echo "📚 Next Steps:"
echo "1. Test your deployed application"
echo "2. Set up monitoring and alerts"
echo "3. Configure SSL certificates"
echo "4. Set up database backups"
echo ""
echo "📖 For more information, see the README.md file"
