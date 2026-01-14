# E2E Test Suite

This directory contains end-to-end tests for the Video Editor application using Playwright.

## Quick Start

### 1. Install Dependencies

```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Unix/Mac

# Install Playwright and dependencies
pip install -r web_tests/requirements.txt
playwright install chromium
```

### 2. Generate Test Fixtures

```bash
# Generate synthetic test media files (requires FFmpeg)
python web_tests/generate_fixtures.py
```

### 3. Start Application Servers

In separate terminals:

```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 4. Run Tests

```bash
# Run smoke test only
python web_tests/smoke_frontend.py

# Run critical flow test
python web_tests/test_critical_flow.py

# Run media management tests
python web_tests/test_media_management.py

# Run all tests with reporting
python web_tests/run_all_tests.py
```

## Test Structure

```
web_tests/
├── helpers/                    # Reusable test utilities
│   ├── test_helper.py         # TestHelper class for common actions
│   ├── assertions.py          # Custom assertions
│   └── setup.py               # Browser configuration
│
├── fixtures/                   # Sample media files for testing
│   ├── video.mp4
│   ├── audio.mp3
│   ├── image.jpg
│   └── README.md
│
├── reports/                    # Generated test reports
│   ├── report.html            # HTML test report
│   └── screenshots/           # Failure screenshots
│
├── smoke_frontend.py           # Basic smoke test
├── test_critical_flow.py       # Core user journey test
├── test_media_management.py    # Media upload/management tests
├── generate_fixtures.py        # Script to create test media
├── run_all_tests.py           # Test orchestration and reporting
└── requirements.txt           # Python dependencies
```

## Test Suites

### Smoke Test (`smoke_frontend.py`)

- **Duration**: ~5 seconds
- **Purpose**: Verify app loads and basic rendering works
- **Use case**: Quick sanity check before development

### Critical Flow Test (`test_critical_flow.py`)

- **Duration**: ~30 seconds
- **Purpose**: Validate core user journey (upload → timeline → export)
- **Use case**: Verify critical functionality after changes

### Media Management Tests (`test_media_management.py`)

- **Duration**: ~2 minutes
- **Tests**: Upload, filtering, deletion, thumbnails
- **Use case**: Verify media handling features

## Running with Server Automation

Use `with_server.py` to automatically start/stop servers:

```bash
python .github/skills/webapp-testing/scripts/with_server.py \
  --server "cd backend && python main.py" --port 8000 \
  --server "cd frontend && npm run dev" --port 3000 \
  -- python web_tests/run_all_tests.py
```

## Writing New Tests

### Example Test

```python
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys

sys.path.insert(0, str(Path(__file__).parent))

from helpers.test_helper import TestHelper
from helpers.setup import get_browser_config, get_context_config, DEFAULT_CONFIG

def test_my_feature() -> None:
    """Test description."""
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, DEFAULT_CONFIG["base_url"])

        try:
            helper.navigate_to_app()
            # Your test code here
            print("✅ Test passed")
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("my_feature_failure.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_my_feature()
```

## Viewing Reports

After running tests, open `web_tests/reports/report.html` in a browser to view results.

## CI/CD Integration

See [docs/testing/playwright-e2e-testing.md](../docs/testing/playwright-e2e-testing.md) for GitHub Actions integration.

## Troubleshooting

### Import Error: "playwright.sync_api" could not be resolved

```bash
pip install playwright
playwright install chromium
```

### Tests Timing Out

- Ensure frontend is running on http://localhost:3000
- Ensure backend is running on http://localhost:8000
- Check network connectivity
- Increase timeout in `helpers/setup.py`

### Fixtures Not Found

```bash
python web_tests/generate_fixtures.py
```

## Documentation

Full documentation: [docs/testing/playwright-e2e-testing.md](../docs/testing/playwright-e2e-testing.md)
