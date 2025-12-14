# Quick Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Code is working locally
- [ ] Backend runs without errors
- [ ] Frontend connects to backend successfully
- [ ] All features tested (new game, hint, solve, undo)
- [ ] Code committed to Git
- [ ] Code pushed to GitHub

---

## 🚀 Deployment Steps

### Step 1: Update Backend on Render

**If you already have a Render service:**

1. Go to https://dashboard.render.com/
2. Find your `sudoku-backend` service
3. Click on it
4. Go to "Manual Deploy" → "Deploy latest commit"
5. Or just push to GitHub - it will auto-deploy!

**If this is your first deployment:**

Follow the full guide in `PRODUCTION_DEPLOYMENT.md`

### Step 2: Get Your Backend URL

After Render deployment completes:
- Copy your backend URL (e.g., `https://sudoku-backend-xxxx.onrender.com`)
- Test it: Visit `https://your-url.onrender.com/api/health`
- Should return: `{"status":"ok"}`

### Step 3: Update Frontend Configuration

1. Open `frontend/play.js`
2. Find line 3: `const PRODUCTION_API = '...'`
3. Replace with your Render URL:
   ```javascript
   const PRODUCTION_API = 'https://your-backend-url.onrender.com';
   ```
4. Save the file

### Step 4: Commit and Push Changes

```bash
git add frontend/play.js
git commit -m "Update production API URL"
git push
```

### Step 5: Deploy Frontend to Netlify

**Option A: Drag and Drop (Fastest)**
1. Go to https://app.netlify.com/drop
2. Drag the `frontend` folder
3. Done! Get your URL

**Option B: Connect to GitHub (Recommended)**
1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub
4. Select your repository
5. Configure:
   - **Publish directory**: `frontend`
   - **Build command**: (leave empty)
6. Click "Deploy site"

### Step 6: Test Your Live Site

1. Visit your Netlify URL
2. Click "Play Now"
3. Select difficulty
4. Verify puzzle loads
5. Test all features

---

## 🔄 Updating Your Deployment

Whenever you make changes:

```bash
# Make your changes, then:
git add .
git commit -m "Description of changes"
git push
```

Both Render and Netlify will automatically redeploy! 🎉

---

## 📝 Quick Commands

### Test Backend Locally
```bash
cd backend
python -m uvicorn fastapi_app:app --reload
```

### Test Frontend Locally
```bash
python serve_frontend.py
```

### Check Git Status
```bash
git status
```

### Push to GitHub
```bash
git add .
git commit -m "Your message"
git push
```

---

## 🆘 Quick Troubleshooting

**Backend not responding:**
- Check Render logs
- Verify service is "Live" (not sleeping)
- Test `/api/health` endpoint

**Frontend can't connect:**
- Check `PRODUCTION_API` in `play.js`
- Open browser console for errors
- Verify backend is running

**CORS errors:**
- Backend already configured for CORS
- Clear browser cache
- Check backend logs

---

## 📱 Your Live URLs

**Backend API:**
```
https://suduko-solver-8y24.onrender.com
```
(Update this with your actual URL)

**Frontend Website:**
```
https://your-site.netlify.app
```
(Update this after Netlify deployment)

---

## 🎯 Current Status

Based on your `play.js`, your current backend is:
```
https://suduko-solver-8y24.onrender.com
```

This appears to already be deployed! You just need to:
1. Verify it's working: https://suduko-solver-8y24.onrender.com/api/health
2. Deploy frontend to Netlify
3. Done!

---

For detailed instructions, see `PRODUCTION_DEPLOYMENT.md`
