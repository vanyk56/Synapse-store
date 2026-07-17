# Synapse Store Local Setup Script for Windows
# Run this script in PowerShell to install dependencies, configure the database schema, and build the project.

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       Synapse Store Setup & Install         " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is installed
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] pnpm is not installed on this system!" -ForegroundColor Red
    Write-Host "Please install pnpm first (e.g. run: npm install -g pnpm) and try again." -ForegroundColor Yellow
    Exit 1
}

# 1. Check for .env file
if (!(Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found at the root. Creating one from template..." -ForegroundColor Yellow
    @'
# Server Port Configuration
PORT=5000
BASE_PATH=/

# Database Connection (Postgres)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synapse_store

# Telegram Bot configuration
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

# OpenRouter API Integration
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
'@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "[INFO] A template .env has been created. Please configure your Postgres credentials, Telegram token, and OpenRouter API key inside it!" -ForegroundColor Green
}

# 2. Install dependencies
Write-Host "`n[1/3] Installing workspace dependencies via pnpm..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] pnpm install failed!" -ForegroundColor Red
    Exit $LASTEXITCODE
}
Write-Host "[SUCCESS] Dependencies installed." -ForegroundColor Green

# 3. Push DB Schema
Write-Host "`n[2/3] Syncing PostgreSQL schema via Drizzle ORM..." -ForegroundColor Yellow
Write-Host "(Make sure PostgreSQL is running and DATABASE_URL is configured in .env)" -ForegroundColor Gray
pnpm --filter @workspace/db run push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Database schema push failed! Check if your PostgreSQL server is active and DATABASE_URL in .env is correct." -ForegroundColor Red
    Write-Host "You can re-run this step later using: pnpm --filter @workspace/db run push" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Database schema synchronized." -ForegroundColor Green
}

# 4. Build components
Write-Host "`n[3/3] Compiling workspace packages & Admin web panel..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Exit $LASTEXITCODE
}
Write-Host "[SUCCESS] Build completed successfully." -ForegroundColor Green

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "          Setup Completed Successfully!       " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "To run the unified server (Bot & Web Admin Panel), run:" -ForegroundColor White
Write-Host "  PowerShell:   ./start.ps1" -ForegroundColor Yellow
Write-Host "  Command Line: pnpm --filter @workspace/api-server run start" -ForegroundColor Yellow
Write-Host ""
