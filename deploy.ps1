# Quick Deploy Script for Windows (PowerShell)
# This script helps you deploy updates to both Render and Netlify

Write-Host "🚀 Sudoku Deployment Script" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: Not a git repository" -ForegroundColor Red
    Write-Host "Run 'git init' first"
    exit 1
}

# Check for uncommitted changes
$status = git status -s
if ($status) {
    Write-Host "📝 You have uncommitted changes:" -ForegroundColor Yellow
    git status -s
    Write-Host ""
    $commit = Read-Host "Do you want to commit these changes? (y/n)"
    if ($commit -eq 'y' -or $commit -eq 'Y') {
        $commitMsg = Read-Host "Enter commit message"
        git add .
        git commit -m "$commitMsg"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping commit" -ForegroundColor Yellow
    }
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to GitHub" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Render will automatically deploy your backend" -ForegroundColor Cyan
    Write-Host "🔄 Netlify will automatically deploy your frontend (if connected)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Monitor deployment:" -ForegroundColor Yellow
    Write-Host "   Backend: https://dashboard.render.com/"
    Write-Host "   Frontend: https://app.netlify.com/"
} else {
    Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your URLs:" -ForegroundColor Cyan
Write-Host "   Backend: https://suduko-solver-8y24.onrender.com"
Write-Host "   Frontend: (Check Netlify dashboard)"
