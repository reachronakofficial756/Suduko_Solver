# Backend Deployment Guide

## Quick Deploy to Render (Free)

1. **Create a Render account** at https://render.com (free tier available)

2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository (or push this code to GitHub first)
   - Or use "Public Git repository" and paste your repo URL

3. **Configure the service:**
   - **Name:** `suduko-backend` (or any name you prefer)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && uvicorn fastapi_app:app --host 0.0.0.0 --port $PORT`
   - **Root Directory:** Leave empty (or set to `backend` if deploying from root)

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete (~5-10 minutes)
   - Copy your service URL (e.g., `https://suduko-backend.onrender.com`)

5. **Update Frontend:**
   - Open `frontend/play.js`
   - Replace `PRODUCTION_API` constant with your Render URL
   - Rebuild APK: `npx cap sync android && cd android && ./gradlew assembleDebug`

## Alternative: Deploy to Railway

1. Go to https://railway.app
2. Create new project → Deploy from GitHub
3. Select your repository
4. Railway will auto-detect Python
5. Set start command: `cd backend && uvicorn fastapi_app:app --host 0.0.0.0 --port $PORT`
6. Deploy and copy the URL

## Alternative: Deploy to Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch` (in backend directory)
4. Deploy: `fly deploy`

## Testing Your Backend

Once deployed, test your backend:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Should return: `{"status":"ok"}`

## Update APK After Deployment

1. Update `frontend/play.js` with your backend URL
2. Run: `npx cap sync android`
3. Run: `cd android && ./gradlew assembleDebug`
4. Install the new APK

