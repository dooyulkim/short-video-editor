# Video Editor Backend

Python FastAPI backend for the video editor application.

## Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

API documentation (Swagger UI): http://localhost:8000/docs

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── routers/            # API route handlers
│   ├── media.py        # Media upload/management endpoints
│   ├── timeline.py     # Timeline processing endpoints
│   └── export.py       # Video export endpoints
├── services/           # Business logic
├── models/             # Pydantic models
│   └── media.py        # Media resource models
├── utils/              # Helper functions
└── requirements.txt    # Python dependencies
```

## API Endpoints

### Health Check
- `GET /` - API status
- `GET /health` - Health check

### Media (to be implemented)
- `POST /media/upload` - Upload media files
- `GET /media/{media_id}/thumbnail` - Get thumbnail
- `GET /media/{media_id}/metadata` - Get metadata
- `DELETE /media/{media_id}` - Delete media

### Timeline (to be implemented)
- `POST /timeline/cut` - Cut video at timestamp
- `POST /timeline/trim` - Trim video
- `POST /timeline/merge` - Merge clips

### Export (to be implemented)
- `POST /export/start` - Start export
- `GET /export/status/{task_id}` - Export status
- `GET /export/download/{task_id}` - Download exported video
