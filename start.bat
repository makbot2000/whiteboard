@echo off
setlocal
title Whiteboard App
echo Starting Whiteboard...
echo.
echo Server: http://localhost:3001
echo Client: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"

rem Stop only Node processes that were launched from this Whiteboard folder.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = [Regex]::Escape((Get-Location).Path); Get-CimInstance Win32_Process -Filter 'Name = ''node.exe''' | Where-Object { $_.CommandLine -match $root } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"
npx concurrently --kill-others-on-fail "cd server && npm run dev" "cd client && npm run dev"
