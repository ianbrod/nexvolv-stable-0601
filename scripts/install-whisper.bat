@echo off
echo Installing Whisper dependencies...
python scripts\install-whisper-deps.py --test
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install Whisper dependencies.
    exit /b 1
)
echo Whisper dependencies installed successfully.
