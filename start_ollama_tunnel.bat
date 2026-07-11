@echo off
echo Starting Ngrok with Permanent Static Domain...
echo.
echo ========================================================
echo YOUR PERMANENT URL IS: https://letter-unboxed-cash.ngrok-free.dev
echo (Make sure this is saved in Vercel as OLLAMA_BASE_URL + /v1)
echo ========================================================
echo.

C:\Users\apela\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe http --domain=letter-unboxed-cash.ngrok-free.dev --host-header=localhost 11434

pause
