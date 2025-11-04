#!/bin/bash

# Google Integrations - NPM Package Installation Script
# This script installs the required Google API packages for GA4, GSC, and GBP integrations

echo "======================================"
echo "Installing Google Integration Packages"
echo "======================================"
echo ""

cd backend

echo "📦 Installing Google Analytics Data API..."
npm install @google-analytics/data

echo ""
echo "📦 Installing Google APIs (for GSC and GBP)..."
npm install googleapis

echo ""
echo "✅ Installation complete!"
echo ""
echo "Installed packages:"
echo "  - @google-analytics/data (Google Analytics 4)"
echo "  - googleapis (Search Console & Business Profile)"
echo ""
echo "Next steps:"
echo "1. Follow GOOGLE_INTEGRATIONS_SETUP.md to configure Google Cloud"
echo "2. Add environment variables to backend/.env"
echo "3. Place service account JSON in backend/config/"
echo "4. Start the server with: npm run dev"
echo ""
echo "======================================"
