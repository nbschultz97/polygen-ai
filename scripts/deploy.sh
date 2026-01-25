#!/bin/bash

# PolyGen AI - Deployment Script
# Automates the deployment process to Vercel

set -e

echo "=========================================="
echo "PolyGen AI - Deployment Script"
echo "=========================================="

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required but not installed. Aborting." >&2; exit 1; }

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run build to check for errors
echo "Building application..."
npm run build

# Run type check
echo "Running type check..."
npx tsc --noEmit || echo "Warning: TypeScript errors detected"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "WARNING: .env.local not found!"
    echo "Copy .env.example to .env.local and fill in your API keys"
    echo ""
fi

# Git status check
echo "Checking git status..."
if [[ -n $(git status -s) ]]; then
    echo ""
    echo "You have uncommitted changes. Commit them before deploying:"
    git status -s
    echo ""
    read -p "Would you like to commit and push now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        git push origin main
    fi
fi

# Deploy to Vercel
echo ""
echo "Deploying to Vercel..."
echo ""

read -p "Deploy to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Vercel Dashboard"
echo "2. Configure custom domain if needed"
echo "3. Test the deployment at your Vercel URL"
echo ""
