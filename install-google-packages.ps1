# Google Integrations - NPM Package Installation Script
# This script installs the required Google API packages for GA4, GSC, and GBP integrations

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Installing Google Integration Packages" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Set-Location backend

Write-Host "📦 Installing Google Analytics Data API..." -ForegroundColor Yellow
npm install @google-analytics/data

Write-Host ""
Write-Host "📦 Installing Google APIs (for GSC and GBP)..." -ForegroundColor Yellow
npm install googleapis

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Installed packages:"
Write-Host "  - @google-analytics/data (Google Analytics 4)"
Write-Host "  - googleapis (Search Console & Business Profile)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Follow GOOGLE_INTEGRATIONS_SETUP.md to configure Google Cloud"
Write-Host "2. Add environment variables to backend/.env"
Write-Host "3. Place service account JSON in backend/config/"
Write-Host "4. Start the server with: npm run dev"
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan

Set-Location ..
