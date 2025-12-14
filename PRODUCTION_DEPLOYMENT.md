# Complete Production Deployment Guide

This guide will walk you through deploying your Sudoku application to production:
- **Backend**: Render (Free tier)
- **Frontend**: Netlify (Free tier)

---

## Part 1: Deploy Backend to Render

### Prerequisites
- GitHub account
- Render account (sign up at https://render.com - free)
- Your code pushed to a GitHub repository

### Step 1: Push Your Code to GitHub (if not already done)

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for production deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your Sudoku repository

3. **Configure the Service**:
   - **Name**: `sudoku-backend` (or your preferred name)
   - **Environment**: `Python 3`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Build Command**: 
     ```
     pip install --upgrade pip && pip install -r backend/requirements.txt
     ```
   - **Start Command**: 
     ```
     cd backend && uvicorn fastapi_app:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: Free

4. **Advanced Settings** (click "Advanced"):
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: Yes (recommended)

5. **Click "Create Web Service"**

6. **Wait for Deployment** (~5-10 minutes)
   - Watch the logs for any errors
   - Once complete, you'll see "Live" status

7. **Copy Your Backend URL**:
   - It will look like: `https://sudoku-backend-xxxx.onrender.com`
   - Test it: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"ok"}`

### Step 3: Update Frontend to Use Production Backend

1. Open `frontend/play.js`
2. Update line 3 with your Render URL:
   ```javascript
   const PRODUCTION_API = 'https://your-backend-url.onrender.com';
   ```
3. Save the file
4. Commit and push:
   ```bash
   git add frontend/play.js
   git commit -m "Update production API URL"
   git push
   ```

---

## Part 2: Deploy Frontend to Netlify

### Step 1: Prepare Frontend for Deployment

The frontend is already configured with `netlify.toml`. Just make sure your backend URL is updated in `play.js`.

### Step 2: Deploy to Netlify

#### Option A: Deploy via Netlify UI (Recommended)

1. **Go to Netlify**: https://app.netlify.com/

2. **Sign Up/Login**: Use GitHub to sign in

3. **New Site from Git**:
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your repositories
   - Select your Sudoku repository

4. **Configure Build Settings**:
   - **Branch to deploy**: `main`
   - **Base directory**: Leave empty
   - **Build command**: Leave empty (or `echo 'Static site'`)
   - **Publish directory**: `frontend`

5. **Click "Deploy site"**

6. **Wait for Deployment** (~1-2 minutes)

7. **Your Site is Live!**
   - Netlify will give you a random URL like: `https://random-name-12345.netlify.app`
   - You can customize this in Site Settings → Domain Management

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from the project root
netlify deploy --prod --dir=frontend

# Follow the prompts to create a new site or link to existing
```

### Step 3: Custom Domain (Optional)

1. Go to **Site Settings** → **Domain Management**
2. Click **Add custom domain**
3. Follow instructions to configure your domain's DNS

---

## Part 3: Verify Deployment

### Test Backend
```bash
# Health check
curl https://your-backend-url.onrender.com/api/health

# Generate a puzzle
curl "https://your-backend-url.onrender.com/api/generate?difficulty=medium"
```

### Test Frontend
1. Visit your Netlify URL: `https://your-site.netlify.app`
2. Click "Play Now"
3. Select a difficulty
4. Verify the puzzle loads correctly
5. Test all features:
   - Hint button
   - Undo button
   - Auto-solve
   - New game

---

## Part 4: Continuous Deployment

Both Render and Netlify are now set up for automatic deployment:

- **Push to GitHub** → Render automatically redeploys backend
- **Push to GitHub** → Netlify automatically redeploys frontend

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push
```

Both services will automatically deploy your changes!

---

## Troubleshooting

### Backend Issues

**Problem**: Backend shows "Build failed"
- Check the build logs in Render dashboard
- Verify `requirements.txt` is in the `backend` folder
- Ensure Python version compatibility

**Problem**: Backend returns 404
- Verify the start command includes `cd backend`
- Check that `fastapi_app.py` exists in the backend folder

**Problem**: CORS errors
- The backend already has CORS configured for all origins
- If issues persist, check browser console for specific errors

### Frontend Issues

**Problem**: Frontend can't connect to backend
- Verify `PRODUCTION_API` in `play.js` matches your Render URL
- Check browser console for network errors
- Ensure backend is running (test `/api/health`)

**Problem**: 404 on page refresh
- Netlify should handle this with the `_redirects` file
- Verify `_redirects` file exists in the `frontend` folder

**Problem**: Assets not loading
- Check that all files are in the `frontend` folder
- Verify paths in HTML files are relative (no leading `/`)

---

## Environment Variables (Optional)

### Render Backend
If you need environment variables:
1. Go to your service in Render
2. Click "Environment"
3. Add variables as needed

### Netlify Frontend
If you need environment variables:
1. Go to Site Settings → Environment Variables
2. Add variables
3. Redeploy the site

---

## Cost Considerations

### Free Tier Limits

**Render Free Tier**:
- ✅ 750 hours/month (enough for 1 service running 24/7)
- ✅ Automatic sleep after 15 minutes of inactivity
- ✅ Wakes up on first request (may take 30-60 seconds)
- ⚠️ Spins down after inactivity - first request will be slow

**Netlify Free Tier**:
- ✅ 100 GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ Instant global CDN
- ✅ Automatic HTTPS

### Upgrade Options
- **Render**: $7/month for always-on service
- **Netlify**: $19/month for Pro features (not needed for this app)

---

## Quick Reference

### Your Deployment URLs
- **Backend**: `https://your-backend.onrender.com`
- **Frontend**: `https://your-site.netlify.app`
- **Backend Health**: `https://your-backend.onrender.com/api/health`

### Useful Commands
```bash
# Test backend locally
cd backend
python -m uvicorn fastapi_app:app --reload

# Test frontend locally
python serve_frontend.py

# Deploy updates
git add .
git commit -m "Update message"
git push
```

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Update `play.js` with production API URL
3. ✅ Deploy frontend to Netlify
4. ✅ Test the live application
5. 🎉 Share your Sudoku app with the world!

---

## Support

- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **FastAPI Docs**: https://fastapi.tiangolo.com

Good luck with your deployment! 🚀
