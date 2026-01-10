# Installation Guide

This guide will walk you through setting up the Video Editor application on your local machine or server.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **CPU**: Dual-core 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 2 GB free space
- **OS**: Windows 10, macOS 10.15, or Linux (Ubuntu 20.04+)
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Recommended Requirements

- **CPU**: Quad-core 2.5 GHz or better
- **RAM**: 16 GB or more
- **Storage**: 10 GB free space (SSD preferred)
- **GPU**: Dedicated graphics card for better performance
- **OS**: Latest stable version of Windows, macOS, or Linux

## Prerequisites

### Required Software

1. **Node.js and npm**

   - Version: Node.js 18.0 or higher
   - Download from: https://nodejs.org/

   ```bash
   # Verify installation
   node --version  # Should show v18.0.0 or higher
   npm --version   # Should show 9.0.0 or higher
   ```

2. **Python**

   - Version: Python 3.9 or higher
   - Download from: https://python.org/downloads/

   ```bash
   # Verify installation
   python --version  # Should show Python 3.9.0 or higher
   pip --version     # Should show pip 21.0 or higher
   ```

3. **FFmpeg**
   - Required for video processing
   - Installation varies by platform (see below)

### Installing FFmpeg

FFmpeg is required for video and audio processing. Choose one of the following installation methods:

#### Option A: Local Installation (Recommended for Windows)

The backend can use FFmpeg binaries from a local `bin/` directory. This is the easiest method for Windows users:

```bash
# Navigate to backend directory
cd backend

# Download FFmpeg from GitHub releases
curl -L -o ffmpeg.zip "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

# Extract the archive
unzip ffmpeg.zip -d ffmpeg_temp

# Create bin directory and copy executables
mkdir -p bin
cp ffmpeg_temp/ffmpeg-master-latest-win64-gpl/bin/*.exe bin/

# Clean up temporary files
rm -rf ffmpeg_temp ffmpeg.zip

# Verify (should show ffmpeg.exe, ffprobe.exe, ffplay.exe)
ls bin/
```

> **Note**: The backend automatically adds `backend/bin/` to the system PATH on startup. No manual PATH configuration needed!

#### Option B: System-Wide Installation

##### Windows (Manual)

1. Download from: https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add to PATH:
   - Open System Properties → Environment Variables
   - Edit PATH variable
   - Add `C:\ffmpeg\bin`
4. Verify: `ffmpeg -version`

##### Windows (Chocolatey)

```bash
# Run as Administrator
choco install ffmpeg -y

# Verify installation
ffmpeg -version
```

##### macOS

```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Verify installation
ffmpeg -version
```

##### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

## Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd "Video editor"
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('Backend dependencies installed successfully')"
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Verify installation
npm run --version
```

### Step 4: Create Required Directories

The application will create these automatically, but you can create them manually:

```bash
# From backend directory
mkdir -p uploads thumbnails temp_audio temp_video exports

# Set permissions (Linux/macOS)
chmod 755 uploads thumbnails temp_audio temp_video exports
```

### Step 5: Start the Application

#### Start Backend Server

```bash
# From backend directory with venv activated
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### Start Frontend Development Server

Open a new terminal:

```bash
# From frontend directory
cd frontend
npm run dev
```

You should see:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Step 6: Verify Installation

1. Open browser and navigate to: `http://localhost:5173`
2. You should see the Video Editor interface
3. Verify backend is running: `http://localhost:8000/docs`
4. Try uploading a test video file

## Configuration

### Backend Configuration

Create `.env` file in `backend/` directory:

```bash
# backend/.env

# Application Settings
APP_NAME="Video Editor"
DEBUG=true
LOG_LEVEL=info

# Server Settings
HOST=0.0.0.0
PORT=8000

# File Storage
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
TEMP_DIR=./temp
EXPORT_DIR=./exports

# File Size Limits (in bytes)
MAX_UPLOAD_SIZE=524288000  # 500MB
MAX_EXPORT_SIZE=2147483648  # 2GB

# Processing Settings
MAX_CONCURRENT_EXPORTS=3
EXPORT_TIMEOUT=3600  # 1 hour

# FFmpeg Settings
FFMPEG_PATH=ffmpeg  # or full path like /usr/bin/ffmpeg
FFPROBE_PATH=ffprobe

# CORS Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Configuration

Create `.env` file in `frontend/` directory:

```bash
# frontend/.env

# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_TRANSITIONS=true
VITE_ENABLE_TEXT_TOOL=true
VITE_ENABLE_AUDIO_MIXING=true

# Development
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

## Docker Installation (Alternative)

If you prefer using Docker:

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Testing Installation

### Run Backend Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v

# Expected output: All tests passing
# ========================= X passed in X.XXs =========================
```

### Run Frontend Tests

```bash
cd frontend
npm run test

# Expected output: All test suites passed
```

## Troubleshooting

### Common Issues

#### Issue: "ModuleNotFoundError: No module named 'fastapi'"

**Solution**: Make sure virtual environment is activated and dependencies are installed

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Issue: "npm ERR! code ENOENT"

**Solution**: Delete node_modules and reinstall

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "FFmpeg not found"

**Solution**: Verify FFmpeg is installed and in PATH

```bash
ffmpeg -version
# If not found, reinstall FFmpeg and add to PATH
```

#### Issue: "Port 8000 already in use"

**Solution**: Kill process using port or use different port

```bash
# Find process
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
uvicorn main:app --port 8001
```

#### Issue: "Cannot connect to backend"

**Solution**:

1. Verify backend is running: `curl http://localhost:8000/docs`
2. Check CORS settings in backend `.env`
3. Update frontend `.env` with correct API URL

#### Issue: "Upload fails immediately"

**Solution**:

1. Check file size (must be < 500MB)
2. Verify file format is supported
3. Check upload directory permissions
4. Look at backend logs for errors

#### Issue: "Export takes too long"

**Solution**:

1. Reduce video resolution
2. Lower quality setting
3. Check available disk space
4. Monitor system resources

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**

   - Backend: Look at terminal where uvicorn is running
   - Frontend: Check browser console (F12)
   - System: Check system logs for FFmpeg errors

2. **Documentation**

   - [README.md](README.md) - General overview
   - [USER_GUIDE.md](USER_GUIDE.md) - User guide
   - [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference

3. **Community Support**
   - GitHub Issues: Report bugs and request features
   - Discussions: Ask questions and share tips

## Next Steps

After successful installation:

1. Read the [User Guide](USER_GUIDE.md)
2. Try the [Quick Start Tutorial](README.md#quick-start)
3. Explore the [API Documentation](API_DOCUMENTATION.md)
4. Check out [Examples](docs/examples/)

## Production Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for:

- Docker deployment
- Nginx configuration
- SSL/TLS setup
- Performance optimization
- Security hardening
- Backup strategies

---

**Installation Complete! 🎉**

You're ready to start editing videos!
