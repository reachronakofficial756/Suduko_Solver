#!/bin/bash

# Quick Deploy Script for Sudoku App
# This script helps you deploy updates to both Render and Netlify

echo "🚀 Sudoku Deployment Script"
echo "============================"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository"
    echo "Run 'git init' first"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📝 You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    else
        echo "⚠️  Skipping commit"
    fi
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub"
    echo ""
    echo "🔄 Render will automatically deploy your backend"
    echo "🔄 Netlify will automatically deploy your frontend (if connected)"
    echo ""
    echo "📊 Monitor deployment:"
    echo "   Backend: https://dashboard.render.com/"
    echo "   Frontend: https://app.netlify.com/"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi

echo ""
echo "✨ Deployment initiated!"
echo ""
echo "🔗 Your URLs:"
echo "   Backend: https://suduko-solver-8y24.onrender.com"
echo "   Frontend: (Check Netlify dashboard)"
