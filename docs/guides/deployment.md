# Short Video Editor - Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available
- At least 10GB disk space for media files

## Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Video\ editor
```

### 2. Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env
```

Edit `.env` and update the following critical variables:
- `SECRET_KEY` - Generate a secure random key for production
- `ALLOWED_ORIGINS` - Add your production frontend URL
- `MAX_UPLOAD_SIZE` - Adjust based on your needs

#### Frontend Configuration
Create `frontend/.env.production`:
```bash
VITE_API_URL=http://your-backend-url:8000
```

### 3. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### 4. Stop Services
```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Individual Service Deployment

### Backend Only

#### Build Docker Image
```bash
cd backend
docker build -t video-editor-backend .
```

#### Run Container
```bash
docker run -d \
  --name video-editor-backend \
  -p 8000:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/thumbnails:/app/thumbnails \
  -v $(pwd)/exports:/app/exports \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e SECRET_KEY=your-secret-key \
  video-editor-backend
```

#### Using Gunicorn (Alternative)
To run with Gunicorn instead of Uvicorn:

Update Dockerfile CMD:
```dockerfile
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### Frontend Only

#### Build Docker Image
```bash
cd frontend
docker build -t video-editor-frontend .
```

#### Run Container
```bash
docker run -d \
  --name video-editor-frontend \
  -p 3000:80 \
  video-editor-frontend
```

## Production Deployment Considerations

### Security
1. **Change SECRET_KEY**: Generate a strong random secret key
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Update CORS origins**: Only allow your production frontend URL
   ```env
   ALLOWED_ORIGINS=https://your-production-domain.com
   ```

3. **Enable HTTPS**: Use a reverse proxy (nginx/traefik) with SSL certificates

4. **Limit upload size**: Adjust `MAX_UPLOAD_SIZE` based on your server capacity

### Performance
1. **Increase worker count**: For backend, use multiple workers
   ```dockerfile
   CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
   ```

2. **Configure resource limits** in docker-compose.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
   ```

3. **Use volume mounts**: Store media files on high-performance storage

### Monitoring
1. **Health checks**: Built-in health endpoint at `/health`

2. **Container logs**:
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

3. **Resource monitoring**:
   ```bash
   docker stats
   ```

### Backup
Regularly backup the following directories:
- `backend/uploads/` - Original uploaded files
- `backend/exports/` - Exported videos
- `backend/thumbnails/` - Generated thumbnails

## Troubleshooting

### Backend won't start
1. Check logs: `docker-compose logs backend`
2. Verify environment variables are set correctly
3. Ensure ports 8000 is not in use

### Frontend can't connect to backend
1. Check `VITE_API_URL` in frontend environment
2. Verify CORS settings in backend `.env`
3. Ensure backend service is healthy: `curl http://localhost:8000/health`

### Upload fails
1. Check volume mounts are configured correctly
2. Verify `MAX_UPLOAD_SIZE` setting
3. Ensure sufficient disk space available

### Video processing slow
1. Increase Docker memory limits
2. Adjust `FFMPEG_THREADS` in backend `.env`
3. Consider using GPU acceleration (requires additional setup)

## Development vs Production

### Development
Use docker-compose with volume mounts for hot-reloading:
```yaml
volumes:
  - ./backend:/app
```

Set `DEBUG=True` in backend `.env`

### Production
- Remove volume mounts for source code
- Set `DEBUG=False`
- Use environment-specific `.env` files
- Enable health checks and restart policies
- Use a reverse proxy (nginx/traefik) for SSL termination

## Cloud Deployment Examples

### AWS ECS
1. Push images to ECR
2. Create ECS task definitions
3. Configure EFS for persistent storage
4. Set up Application Load Balancer

### Google Cloud Run
1. Push images to Google Container Registry
2. Deploy each service separately
3. Configure Cloud Storage for media files
4. Set up Cloud Load Balancer

### DigitalOcean App Platform
1. Connect GitHub repository
2. Configure build and run commands
3. Set up managed database if needed
4. Configure environment variables

## Support
For issues and questions, please refer to the project README or create an issue in the repository.
