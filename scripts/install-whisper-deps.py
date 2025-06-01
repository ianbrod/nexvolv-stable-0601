#!/usr/bin/env python3
"""
Script to install Whisper dependencies
"""

import os
import sys
import subprocess
import platform
import argparse

def check_python_version():
    """Check if Python version is compatible with Whisper"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"Python version: {sys.version}")

def install_package(package):
    """Install a Python package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        return True
    except subprocess.CalledProcessError:
        print(f"Failed to install {package}")
        return False

def install_ffmpeg():
    """Install ffmpeg based on the platform"""
    system = platform.system().lower()
    
    if system == "windows":
        print("Please install ffmpeg manually:")
        print("Option 1: Using Chocolatey: choco install ffmpeg")
        print("Option 2: Using Scoop: scoop install ffmpeg")
        print("Option 3: Download from https://ffmpeg.org/download.html")
        return False
    
    elif system == "darwin":  # macOS
        try:
            # Check if Homebrew is installed
            subprocess.check_call(["which", "brew"])
            # Install ffmpeg using Homebrew
            subprocess.check_call(["brew", "install", "ffmpeg"])
            return True
        except subprocess.CalledProcessError:
            print("Please install Homebrew (https://brew.sh/) and then run: brew install ffmpeg")
            return False
    
    elif system == "linux":
        # Try to detect the Linux distribution
        if os.path.exists("/etc/debian_version"):  # Debian, Ubuntu, etc.
            try:
                subprocess.check_call(["sudo", "apt", "update"])
                subprocess.check_call(["sudo", "apt", "install", "-y", "ffmpeg"])
                return True
            except subprocess.CalledProcessError:
                print("Failed to install ffmpeg. Please install it manually: sudo apt install ffmpeg")
                return False
        elif os.path.exists("/etc/arch-release"):  # Arch Linux
            try:
                subprocess.check_call(["sudo", "pacman", "-S", "--noconfirm", "ffmpeg"])
                return True
            except subprocess.CalledProcessError:
                print("Failed to install ffmpeg. Please install it manually: sudo pacman -S ffmpeg")
                return False
        else:
            print("Please install ffmpeg manually for your Linux distribution")
            return False
    
    else:
        print(f"Unsupported platform: {system}")
        print("Please install ffmpeg manually")
        return False

def check_ffmpeg():
    """Check if ffmpeg is installed"""
    try:
        subprocess.check_call(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("ffmpeg is already installed")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ffmpeg is not installed")
        return False

def install_whisper_dependencies():
    """Install all dependencies required for Whisper"""
    dependencies = [
        "torch",
        "numpy",
        "tqdm",
        "more-itertools",
        "transformers>=4.19.0",
        "ffmpeg-python",
        "setuptools-rust",
        "openai-whisper"
    ]
    
    for package in dependencies:
        print(f"Installing {package}...")
        if not install_package(package):
            print(f"Warning: Failed to install {package}")
    
    # Install Rust if needed for tiktoken
    try:
        import tiktoken
        print("tiktoken is already installed")
    except ImportError:
        print("Installing tiktoken...")
        if not install_package("tiktoken"):
            print("Warning: Failed to install tiktoken")

def test_whisper_installation():
    """Test if Whisper is installed correctly"""
    try:
        import whisper
        print("Whisper is installed correctly")
        
        # Try to load the base.en model
        print("Testing model loading (this might take a while the first time)...")
        model = whisper.load_model("base.en")
        print("Model loaded successfully")
        
        return True
    except ImportError:
        print("Error: Failed to import whisper")
        return False
    except Exception as e:
        print(f"Error testing Whisper: {e}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Install Whisper dependencies")
    parser.add_argument("--skip-ffmpeg", action="store_true", help="Skip ffmpeg installation")
    parser.add_argument("--test", action="store_true", help="Test Whisper installation")
    args = parser.parse_args()
    
    print("Checking Python version...")
    check_python_version()
    
    if not args.skip_ffmpeg:
        print("Checking ffmpeg...")
        if not check_ffmpeg():
            print("Installing ffmpeg...")
            install_ffmpeg()
    
    print("Installing Whisper dependencies...")
    install_whisper_dependencies()
    
    if args.test:
        print("Testing Whisper installation...")
        test_whisper_installation()
    
    print("Done!")

if __name__ == "__main__":
    main()
