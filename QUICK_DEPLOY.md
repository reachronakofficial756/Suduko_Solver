# Quick Backend Deployment & APK Build

## 🚀 Fastest Way to Deploy Backend

### Method 1: Render.com (5 minutes)

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to https://render.com → Sign up (free)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Render will auto-detect settings from `render.yaml`
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - Copy your URL (e.g., `https://suduko-backend-xxxx.onrender.com`)

3. **Update Frontend:**
   - Open `frontend/play.js`
   - Replace `YOUR_BACKEND_URL_HERE` with your Render URL
   - Save the file

4. **Rebuild APK:**
   ```bash
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   ```

### Method 2: Railway.app (Even Faster)

1. Go to https://railway.app → Sign up
2. "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Railway auto-detects Python
5. Set start command: `cd backend && uvicorn fastapi_app:app --host 0.0.0.0 --port $PORT`
6. Deploy → Copy URL

### Method 3: Fly.io (CLI-based)

```bash
cd backend
fly launch
fly deploy
```

## 📱 After Deployment

Once you have your backend URL:

1. Update `frontend/play.js` line 2 with your URL
2. Run: `npx cap sync android`
3. Run: `cd android && ./gradlew assembleDebug`
4. Your APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## ✅ Test Your Backend

```bash
curl https://your-backend-url.onrender.com/api/health
```

Should return: `{"status":"ok"}`


