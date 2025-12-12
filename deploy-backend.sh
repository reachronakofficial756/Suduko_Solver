#!/bin/bash
# Quick deployment script for Render.com

echo "=========================================="
echo "Sudoku Backend Deployment Guide"
echo "=========================================="
echo ""
echo "Step 1: Go to https://render.com"
echo "Step 2: Sign up/Login (free account)"
echo "Step 3: Click 'New +' → 'Web Service'"
echo "Step 4: Connect your GitHub repo OR use 'Public Git repository'"
echo "Step 5: Configure:"
echo "   - Name: suduko-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: pip install -r backend/requirements.txt"
echo "   - Start Command: cd backend && uvicorn fastapi_app:app --host 0.0.0.0 --port \$PORT"
echo "Step 6: Click 'Create Web Service'"
echo "Step 7: Wait for deployment (~5-10 min)"
echo "Step 8: Copy your service URL (e.g., https://suduko-backend.onrender.com)"
echo ""
echo "After deployment, update frontend/play.js with your URL"
echo "Then run: npx cap sync android && cd android && ./gradlew assembleDebug"

