# 🎮 Sudoku Solver App - Quick Start Guide

A beautiful Sudoku game with AI-powered solving, real-time player performance tracking, and a sleek grey theme.

## 🚀 Quick Start (Easiest Method)

### Option 1: Direct File Access (No Server Needed)
Simply open the HTML file directly in your browser:

1. Navigate to: `D:\Suduko\frontend\index.html`
2. Double-click to open in your default browser
3. Or drag and drop the file into your browser

**URLs to use:**
- Home: `file:///D:/Suduko/frontend/index.html`
- Play: `file:///D:/Suduko/frontend/play.html`

---

## 🌐 Running on Localhost

### Option 2: Python HTTP Server (Recommended)

**Step 1: Start the Backend API (if not already running)**
```bash
cd D:\Suduko
python -m uvicorn backend.fastapi_app:app --reload --host 0.0.0.0 --port 8000
```

**Step 2: Start the Frontend Server**
```bash
cd D:\Suduko
python serve_frontend.py
```

**Access the app:**
- Frontend: http://localhost:3000
- Play game: http://localhost:3000/play.html
- Backend API: http://localhost:8000

---

### Option 3: Using NPM/Node.js

**Start the frontend server:**
```bash
cd D:\Suduko
npm run serve
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (must be running separately)

---

### Option 4: Simple Python One-Liner

If you just want to serve the frontend quickly:

```bash
cd D:\Suduko\frontend
python -m http.server 8080
```

**Access:** http://localhost:8080

---

## 📋 What's Currently Running

Based on your terminal, you have:
- ✅ `python run.py` running (likely the backend on port 8000)

## 🎯 Recommended Setup

### For Development:

**Terminal 1 - Backend:**
```bash
cd D:\Suduko
python -m uvicorn backend.fastapi_app:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd D:\Suduko
python serve_frontend.py
```

Then open: **http://localhost:3000**

---

## ✨ Features

### 🎨 Grey Theme
- Beautiful blurred grey gradient background
- Solid grey header and buttons
- Professional, modern aesthetic

### 📊 Player Performance Tracking
- **Strain Score**: Real-time difficulty rating (0-100) based on YOUR performance
- **Avg Time/Move**: Track how fast you solve
- **Undo Rate**: Monitor your decision-making
- **Corrections**: See how many times you change cells
  - 🎯 **Grace Period**: Quick corrections within 3 seconds aren't counted as mistakes!
  - Reduces frustration and anxiety
  - Only deliberate changes count toward your score
- **Hint Dependency**: Track hint usage

### 🎮 Game Features
- Multiple difficulty levels (Easy, Medium, Hard, Expert)
- Auto-solve with animation
- Hint system
- Undo functionality
- Smart highlighting (row, column, box, same numbers)
- Responsive design (Desktop & Mobile)

---

## 🔧 Troubleshooting

### Backend Not Reachable
If you see "Backend not reachable" errors:

1. Make sure the backend is running:
   ```bash
   cd D:\Suduko
   python -m uvicorn backend.fastapi_app:app --reload --port 8000
   ```

2. Check if it's working: http://localhost:8000/api/health
   - Should return: `{"status":"ok"}`

### Port Already in Use
If port 3000 or 8000 is busy:

**For Frontend (change port to 8080):**
```bash
python -m http.server 8080
```

**For Backend (change port to 8001):**
```bash
python -m uvicorn backend.fastapi_app:app --reload --port 8001
```

Then update `frontend/play.js` line 7-8 to use the new backend port.

---

## 📱 Mobile/Responsive Design

The app automatically adapts:
- **Desktop (>1024px)**: Stats card on the right side
- **Tablet (768-1024px)**: Stats card below game
- **Mobile (<768px)**: Full-width stacked layout

---

## 🎓 How to Play

1. Click "New Game" or wait for auto-generation
2. Click an empty cell
3. Type a number (1-9) or click the number pad
4. Watch your performance stats update in real-time!
5. Use hints if stuck
6. Try to minimize your strain score for better performance

---

## 📦 Project Structure

```
D:\Suduko/
├── frontend/
│   ├── index.html          # Home page
│   ├── play.html           # Game page
│   ├── play.js             # Game logic + stats tracking
│   ├── styles.css          # Grey theme styling
│   └── *.svg               # Logo files
├── backend/
│   ├── fastapi_app.py      # API endpoints
│   └── Sudoko_backend.py   # Sudoku solver logic
├── serve_frontend.py       # Frontend server script
└── package.json            # NPM scripts
```

---

## 🌟 Tips for Best Experience

1. **Use localhost** for full functionality (API features)
2. **Desktop browser** for best stats card visibility
3. **Try different difficulties** to see how your strain score changes
4. **Minimize undos and hints** to keep your strain score low

---

## 🐛 Common Issues

### "CORS Error" or "API Failed"
- Make sure backend is running on port 8000
- Frontend should be on a different port (3000 or 8080)

### Stats Not Updating
- Refresh the page
- Make sure you're making moves (clicking cells and entering numbers)

### Page Looks Broken
- Clear browser cache (Ctrl+F5)
- Make sure `styles.css` is loading

---

## 💡 Quick Commands Reference

```bash
# Backend only
python -m uvicorn backend.fastapi_app:app --reload --port 8000

# Frontend only (Python)
python serve_frontend.py

# Frontend only (Simple)
cd frontend && python -m http.server 8080

# Frontend only (NPM)
npm run serve
```

---

Enjoy your Sudoku game! 🎉
