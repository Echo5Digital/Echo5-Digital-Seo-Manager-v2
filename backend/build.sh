#!/bin/bash
# Render.com build script with optimizations

echo "🚀 Starting optimized build..."

# Set npm timeout and optimize for Render
npm config set fetch-timeout 300000
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000

# Use npm ci for faster, cleaner installs in production
if [ -f package-lock.json ]; then
  echo "📦 Installing with npm ci..."
  npm ci --production --quiet --no-audit --no-fund
else
  echo "📦 Installing with npm install..."
  npm install --production --quiet --no-audit --no-fund
fi

echo "✅ Build complete!"
