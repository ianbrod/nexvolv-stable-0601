#!/bin/bash
echo "Installing Whisper dependencies..."
python3 scripts/install-whisper-deps.py --test
if [ $? -ne 0 ]; then
    echo "Failed to install Whisper dependencies."
    exit 1
fi
echo "Whisper dependencies installed successfully."
