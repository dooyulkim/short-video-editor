from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import media, timeline, export
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# Include routers
app.include_router(media.router, prefix="/media", tags=["media"])
app.include_router(timeline.router, prefix="/timeline", tags=["timeline"])
app.include_router(export.router, tags=["export"])


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
