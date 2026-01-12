from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import media, timeline, export, transitions
import os
import logging
import sys
import time
import traceback
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add local bin directory to PATH for ffmpeg
bin_dir = Path(__file__).parent / "bin"
if bin_dir.exists():
    os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ.get("PATH", "")

# Configure logging - ensure output goes to stdout
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Set specific loggers
logger = logging.getLogger("video-editor")
logger.setLevel(logging.DEBUG)

# Also configure uvicorn loggers to show
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)

app = FastAPI(
    title="Short Video Editor API",
    description="Backend API for short video editing application",
    version="1.0.0"
)

# Get allowed origins from environment variable
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing information."""
    start_time = time.time()
    
    # Log request
    logger.info(f"➡️  {request.method} {request.url.path}")
    if request.query_params:
        logger.info(f"    Query params: {dict(request.query_params)}")
    
    # Process request and catch exceptions
    try:
        response = await call_next(request)
    except Exception as e:
        # Log the full exception with traceback
        logger.error(f"❌ EXCEPTION in {request.method} {request.url.path}")
        logger.error(f"   Exception type: {type(e).__name__}")
        logger.error(f"   Exception message: {str(e)}")
        logger.error(f"   Traceback:\n{traceback.format_exc()}")
        raise
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(f"{status_emoji} {request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and log them."""
    logger.error(f"🔥 UNHANDLED EXCEPTION in {request.method} {request.url.path}")
    logger.error(f"   Exception type: {type(exc).__name__}")
    logger.error(f"   Exception message: {str(exc)}")
    logger.error(f"   Traceback:\n{traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {str(exc)}",
            "type": type(exc).__name__
        }
    )


# Include routers
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(transitions.router, prefix="/api/transitions", tags=["transitions"])


@app.get("/")
async def root():
    return {
        "message": "Short Video Editor API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Video Editor Backend Server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
