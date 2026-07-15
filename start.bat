@echo off
title Whiteboard App
echo Starting Whiteboard...
echo.
echo Server: http://localhost:3001
echo Client: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
start "" http://localhost:5173
npx concurrently "cd server && npx tsx index.ts" "cd client && npx vite"
