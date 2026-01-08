from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import media, timeline, export
import os
import logging
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("video-editor")

app = FastAPI(
    title="Short Video Editor API",
    description="Backend API for short video editing application",
    version="1.0.0"
)

# Get allowed origins from environment variable
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

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
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(f"{status_emoji} {request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    
    return response


# Include routers
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])
app.include_router(export.router, prefix="/api/export", tags=["export"])


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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
