# TBU AI Service - Activate Script for Windows PowerShell
# Usage: .\activate.ps1

$ErrorActionPreference = "Stop"

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set environment variables
$env:PYTHONPATH = "$scriptDir"
$env:VIRTUAL_ENV = "$scriptDir"

# Update PATH
$env:PATH = "$scriptDir\Scripts;$scriptDir\bin;$env:PATH"

# Change to project directory
Set-Location -Path "$scriptDir"

# Display success message
Write-Host "✅ TBU AI Virtual Environment Activated" -ForegroundColor Green
Write-Host "   Python: $(& python --version)" -ForegroundColor Cyan
Write-Host "   Working directory: $scriptDir" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "To deactivate, run: deactivate" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White

# Define deactivate function (available in the session)
function global:deactivate {
    $env:PYTHONPATH = ""
    $env:VIRTUAL_ENV = ""
    $env:PATH = $env:PATH -replace [regex]::Escape("$scriptDir\\Scripts;?"), ""
    Remove-Item -Force function:\deactivate -ErrorAction SilentlyContinue
    
    Write-Host "✅ Virtual environment deactivated" -ForegroundColor Green
}

# Check if running elevated
$isAdmin = ([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "" -ForegroundColor Yellow
    Write-Host "⚠️  WARNING: Running as Administrator" -ForegroundColor Yellow
    Write-Host "   This is not required for Python virtual environment" -ForegroundColor Yellow
}
