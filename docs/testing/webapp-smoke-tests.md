# Web App Smoke Tests

This document describes how to run automated smoke tests against the Video Editor web application using Playwright and the `with_server.py` helper.

## Prerequisites

1. **Python environment** (same one you use for the backend)
2. **Playwright for Python** installed:

   ```bash
   pip install playwright
   python -m playwright install chromium
   ```

3. Backend dependencies installed (see [backend/README.md](../../backend/README.md))
4. Frontend dependencies installed (see [frontend/README.md](../../frontend/README.md))

## Smoke Test Script

The main smoke test script lives at:

- [web_tests/smoke_frontend.py](../../web_tests/smoke_frontend.py)

What it checks:

- Launches a headless Chromium browser
- Navigates to `http://localhost:3000`
- Waits for the app to finish loading (`networkidle`)
- Verifies the page has a non-empty title
- Verifies at least one `<canvas>` element is rendered (player/timeline)

## Running the Smoke Test with with_server.py

From the repository root, use the `with_server.py` helper provided by the `webapp-testing` skill. This will start both backend and frontend servers, wait for them to become ready, and then run the smoke test script.

```bash
cd path/to/short-video-editor

python .github/skills/webapp-testing/scripts/with_server.py \
  --server "cd backend && python main.py" --port 8000 \
  --server "cd frontend && npm run dev" --port 3000 \
  -- python web_tests/smoke_frontend.py
```

The helper will:

- Start the FastAPI backend on port **8000**
- Start the Vite frontend dev server on port **3000**
- Run `web_tests/smoke_frontend.py` once both ports are healthy
- Shut down the servers when the script finishes

If the smoke test passes, the script exits with status `0`. If any assertion fails (for example, the page never renders a `<canvas>`), the script will raise an error and exit with a non-zero status.

## Notes

- You can customize the smoke test by editing `web_tests/smoke_frontend.py` and adding more assertions (e.g., checking for specific buttons or headers from the manual testing guide).
- For quick manual verification, you can still follow [manual-testing-guide.md](./manual-testing-guide.md) and then use this smoke test as a fast regression check.
