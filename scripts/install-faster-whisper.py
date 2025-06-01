#!/usr/bin/env python3
"""
Install faster-whisper for significantly improved transcription performance
"""

import subprocess
import sys
import os

def run_command(command):
    """Run a command and return the result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    print("🚀 Installing faster-whisper for improved transcription performance...")
    print()
    
    # Check current Python version
    print("📋 Checking Python environment...")
    success, stdout, stderr = run_command("python --version")
    if success:
        print(f"✅ Python version: {stdout.strip()}")
    else:
        print("❌ Python not found in PATH")
        return False
    
    # Check if pip is available
    success, stdout, stderr = run_command("pip --version")
    if success:
        print(f"✅ Pip version: {stdout.strip()}")
    else:
        print("❌ Pip not found")
        return False
    
    print()
    
    # Install faster-whisper
    print("📦 Installing faster-whisper...")
    success, stdout, stderr = run_command("pip install faster-whisper")
    
    if success:
        print("✅ faster-whisper installed successfully!")
        print()
        
        # Verify installation
        print("🔍 Verifying installation...")
        success, stdout, stderr = run_command("python -c \"import faster_whisper; print('faster-whisper version:', faster_whisper.__version__)\"")
        
        if success:
            print(f"✅ Verification successful: {stdout.strip()}")
            print()
            
            print("🎯 Performance Benefits:")
            print("• 3-5x faster transcription speed")
            print("• Lower memory usage")
            print("• Better GPU utilization (if available)")
            print("• Optimized for production use")
            print()
            
            print("✅ Installation complete! Restart your development server to use faster-whisper.")
            return True
        else:
            print(f"❌ Verification failed: {stderr}")
            return False
    else:
        print(f"❌ Installation failed: {stderr}")
        print()
        
        # Try alternative installation methods
        print("🔄 Trying alternative installation...")
        success, stdout, stderr = run_command("pip install --upgrade faster-whisper")
        
        if success:
            print("✅ Alternative installation successful!")
            return True
        else:
            print(f"❌ Alternative installation also failed: {stderr}")
            print()
            print("💡 Manual installation steps:")
            print("1. Open command prompt as administrator")
            print("2. Run: pip install faster-whisper")
            print("3. If that fails, try: pip install --user faster-whisper")
            print("4. Restart your development server")
            return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
