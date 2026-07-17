# Synapse Store Start Script for Windows
# Run this script to start the Express server and Telegram bot.

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "         Starting Synapse Store Bot          " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found! Please run setup.ps1 first or create a .env file." -ForegroundColor Red
    Exit 1
}

# Run the build start command
pnpm --filter @workspace/api-server run start
