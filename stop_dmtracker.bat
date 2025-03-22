@echo off
echo Stopping DM Tracker server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080"') do taskkill /F /PID %%a
echo Server stopped!