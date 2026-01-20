# Video Editor - Browser-Based Video Editing Application

A professional browser-based video editor built with React, TypeScript, and Python/FastAPI. Features a complete timeline editor, transitions, audio mixing, text overlays, and video export capabilities.

![Video Editor](docs/screenshot.png)

## 🎬 Features

- **📹 Media Management**: Upload and manage video, audio, and image files
- **✂️ Timeline Editing**: Multi-layer timeline with drag-and-drop clips
- **🎨 Transitions**: Fade in/out, cross-dissolve, and wipe effects
- **🎵 Audio Mixing**: Multi-track audio with volume control and fades
- **📝 Text Overlays**: Add customizable text with fonts, colors, and positioning
- **✂️ Editing Tools**: Cut, trim, duplicate, and delete clips
- **⚡ Keyboard Shortcuts**: Efficient editing with keyboard commands
- **↩️ Undo/Redo**: Full history management (50 states)
- **💾 Project Save/Load**: Export and import projects as JSON
- **📤 Video Export**: Export timeline to MP4 with custom resolution/quality
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **FFmpeg** (required for video processing)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd "Video editor"
```

2. **Install Frontend Dependencies**

```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. **Install FFmpeg** (required for video/audio processing)

   **Option A: Install to backend/bin (Recommended for Windows)**

   ```bash
   cd backend
   # Download FFmpeg
   curl -L -o ffmpeg.zip "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
   # Extract and copy binaries
   unzip ffmpeg.zip -d ffmpeg_temp
   mkdir -p bin
   cp ffmpeg_temp/ffmpeg-master-latest-win64-gpl/bin/*.exe bin/
   # Cleanup
   rm -rf ffmpeg_temp ffmpeg.zip
   ```

   The backend automatically adds `backend/bin` to PATH on startup.

   **Option B: System-wide installation**
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg`

### Running the Application

1. **Start Backend Server**

```bash
cd backend
uvicorn main:app --reload --port 8000 or python main.py
```

2. **Start Frontend Development Server**

```bash
cd frontend
npm run dev
```

3. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Backend API: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

## 📖 User Guide

### Uploading Media

1. Click the **Resources** panel on the left
2. Drag and drop files or click "Upload Media"
3. Supported formats: MP4, AVI, MOV, MP3, WAV, JPG, PNG

### Creating a Timeline

1. **Add Clips**: Drag media from Resources panel to Timeline
2. **Move Clips**: Click and drag clips horizontally on timeline
3. **Trim Clips**: Drag clip edges to adjust duration
4. **Add Layers**: Click "+" button to add video/audio/text layers

### Editing Tools

- **Cut** (Scissors icon): Split clip at playhead position
- **Trim**: Drag clip edges to trim start/end
- **Delete**: Select clip and press Delete or click trash icon
- **Duplicate**: Copy clip with Ctrl+C, paste with Ctrl+V

### Adding Transitions

1. Open **Transitions** panel on the right
2. Drag transition effect onto clip
3. Adjust duration with slider
4. Transitions appear at clip edges

### Adding Text

1. Click **"Add Text"** button in toolbar
2. Enter text content and customize properties
3. Set position, font, size, and color
4. Click "Add to Timeline"

### Audio Mixing

- Each clip has independent volume control
- Audio waveforms display in timeline
- Apply fade in/out effects in transition panel
- Multiple audio tracks mix automatically

### Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| `Space`  | Play/Pause           |
| `Delete` | Delete selected clip |
| `Ctrl+C` | Copy clip            |
| `Ctrl+V` | Paste clip           |
| `Ctrl+Z` | Undo                 |
| `Ctrl+Y` | Redo                 |
| `←/→`    | Move playhead        |
| `+/-`    | Zoom in/out          |

### Exporting Video

1. Click **"Export"** button in top toolbar
2. Choose resolution (1080p, 720p, 480p)
3. Select format (MP4, WebM)
4. Set quality (High, Medium, Low)
5. Click "Start Export"
6. Download when complete

### Saving Projects

- **Save**: Click "Save Project" to download JSON file
- **Load**: Click "Load Project" to import saved project
- **Recent**: Access recently opened projects from dropdown

## 🧪 Testing

### Frontend Tests

```bash
cd frontend
npm run test          # Run all tests
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### Backend Tests

```bash
cd backend
pytest tests/ -v                    # Run all tests
pytest tests/ --cov=services        # With coverage
python run_tests.py                 # Alternative runner
```

**Test Coverage**: 95% backend, comprehensive frontend

## 🏗️ Architecture

### Frontend Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **shadcn/ui** components
- **Tailwind CSS** for styling
- **Vitest** for testing

### Backend Stack

- **FastAPI** for REST API
- **FFmpeg-Python** for video/audio processing
- **OpenCV** for image/video operations
- **NumPy** for audio processing
- **Pytest** for testing

### Project Structure

```
Video editor/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── context/      # State management
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── package.json
├── backend/              # FastAPI backend
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── tests/           # Test suite
│   └── requirements.txt
└── README.md
```

## 📚 Documentation

- [Development Plan](DEVELOPMENT_PLAN.md) - Step-by-step implementation guide
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Frontend Components](frontend/README.md) - Component documentation
- [Backend Services](backend/README.md) - Service documentation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Video processing powered by [FFmpeg](https://ffmpeg.org/) via [ffmpeg-python](https://github.com/kkroening/ffmpeg-python)
- Icons from [Lucide](https://lucide.dev/)

## 📧 Support

For issues and questions:

- Open an [Issue](https://github.com/yourusername/video-editor/issues)
- Check [Documentation](docs/)
- Review existing [Discussions](https://github.com/yourusername/video-editor/discussions)

---

**Made with ❤️ by the Video Editor Team**
