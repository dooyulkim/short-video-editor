# Playwright E2E Testing Guide

## 📖 Overview

This guide covers end-to-end (E2E) testing with Playwright for the Video Editor application. Playwright is a powerful browser automation framework that enables automated testing of the frontend application in real browser environments.

---

## 🎯 What is Playwright?

[Playwright](https://playwright.dev/) is a modern browser automation library that:

- Supports Chromium, Firefox, and WebKit browsers
- Provides a Python API for browser automation
- Enables headless or headed browser testing
- Supports taking screenshots and videos
- Handles modern web app features (SPAs, async loading, etc.)

---

## 🚀 Quick Start

### Installation

1. **Activate your Python virtual environment:**

   ```bash
   # Windows
   .venv\Scripts\activate

   # Unix/Mac
   source .venv/bin/activate
   ```

2. **Install Playwright:**

   ```bash
   pip install playwright
   ```

3. **Install browser binaries:**

   ```bash
   playwright install
   ```

   This downloads Chromium, Firefox, and WebKit browser binaries (~300MB per browser).

4. **Install specific browser only (optional):**

   ```bash
   # Install only Chromium (recommended for CI)
   playwright install chromium
   ```

---

## 📁 Test Structure

```
web_tests/
├── smoke_frontend.py        # Basic frontend smoke test
├── requirements.txt         # Python dependencies
└── (future test files)      # Additional E2E tests
```

---

## 🧪 Existing Tests

### Smoke Test (`smoke_frontend.py`)

**Purpose:** Verify the frontend application loads and renders correctly.

**What it checks:**

- ✅ Frontend server is accessible
- ✅ Page loads without errors
- ✅ Page has a non-empty title
- ✅ At least one `<canvas>` element is rendered (timeline/player)

**Run the test:**

```bash
# Ensure frontend is running on http://localhost:3000
python web_tests/smoke_frontend.py
```

**Expected output:**

```
✓ Test passed (no output if successful)
✗ Test failed (assertion error with details)
```

---

## 🛠️ Running Tests

### Manual Testing

1. **Start the backend server:**

   ```bash
   cd backend
   python main.py
   # Backend runs on http://localhost:8000
   ```

2. **Start the frontend server (in another terminal):**

   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

3. **Run the Playwright test (in another terminal):**

   ```bash
   python web_tests/smoke_frontend.py
   ```

### Automated Testing with `with_server.py`

Use the `with_server.py` helper to automatically start both servers and run tests:

```bash
python .github/skills/webapp-testing/scripts/with_server.py \
  --server "cd backend && python main.py" --port 8000 \
  --server "cd frontend && npm run dev" --port 3000 \
  -- python web_tests/smoke_frontend.py
```

This will:

- Start both backend and frontend servers
- Wait for them to become healthy
- Run the test suite
- Automatically shut down servers when done

See [webapp-smoke-tests.md](webapp-smoke-tests.md) for more details.

---

## ✍️ Writing E2E Tests

### Basic Test Structure

```python
"""Test description and purpose."""
from playwright.sync_api import sync_playwright


FRONTEND_URL = "http://localhost:3000"


def run_test() -> None:
    """Test function with clear docstring."""
    with sync_playwright() as p:
        # Launch browser (headless=True for CI, False for debugging)
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to page
        page.goto(FRONTEND_URL)

        # Wait for page to load
        page.wait_for_load_state("load")

        # Perform test actions
        # ...

        # Assert expected behavior
        # ...

        # Clean up
        browser.close()


if __name__ == "__main__":
    run_test()
```

### Common Playwright Patterns

#### 1. Navigating and Waiting

```python
# Navigate to URL
page.goto("http://localhost:3000")

# Wait for network to be idle
page.wait_for_load_state("networkidle")

# Wait for DOM to be loaded
page.wait_for_load_state("load")

# Wait for specific element
page.wait_for_selector("button#upload", timeout=5000)
```

#### 2. Interacting with Elements

```python
# Click button
page.click("button#upload")

# Type text
page.fill("input[type='text']", "My Video Title")

# Upload file
page.set_input_files("input[type='file']", "/path/to/video.mp4")

# Select dropdown
page.select_option("select#format", "mp4")
```

#### 3. Assertions

```python
# Check element exists
assert page.locator("canvas").count() > 0

# Check text content
assert "Video Editor" in page.title()

# Check element visibility
assert page.is_visible("button#export")

# Check element text
assert page.inner_text("h1") == "My Project"
```

#### 4. Debugging

```python
# Take screenshot
page.screenshot(path="screenshot.png")

# Pause execution (headed mode only)
page.pause()

# Print page content
print(page.content())

# Get console messages
page.on("console", lambda msg: print(f"Console: {msg.text}"))
```

---

## 🔍 Test Scenarios

### Example: Upload and Preview Video

```python
def test_video_upload_and_preview() -> None:
    """Test uploading a video and verifying it appears in timeline."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("load")

        # Upload video file
        page.set_input_files("input[type='file']", "test_assets/sample.mp4")

        # Wait for upload to complete
        page.wait_for_selector(".media-item", timeout=10000)

        # Verify video appears in media library
        media_items = page.locator(".media-item").count()
        assert media_items > 0, "No media items found after upload"

        # Drag video to timeline
        page.drag_and_drop(".media-item", ".timeline-drop-zone")

        # Verify video appears in timeline
        timeline_clips = page.locator(".timeline-clip").count()
        assert timeline_clips > 0, "No clips found in timeline"

        browser.close()
```

### Example: Export Video

```python
def test_export_video() -> None:
    """Test exporting a video project."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(FRONTEND_URL)
        page.wait_for_load_state("load")

        # Set up project (upload, add to timeline, etc.)
        # ...

        # Click export button
        page.click("button#export")

        # Select export format
        page.select_option("select#export-format", "mp4")

        # Start export
        page.click("button#start-export")

        # Wait for export to complete (with longer timeout)
        page.wait_for_selector(".export-complete", timeout=60000)

        # Verify success message
        success_text = page.inner_text(".export-status")
        assert "Export complete" in success_text

        browser.close()
```

---

## 🎨 Best Practices

### 1. **Use Explicit Waits**

Always wait for elements before interacting:

```python
# ✅ Good
page.wait_for_selector("button#submit")
page.click("button#submit")

# ❌ Bad
page.click("button#submit")  # May fail if element not ready
```

### 2. **Use Descriptive Selectors**

Prefer IDs and data attributes over CSS classes:

```python
# ✅ Good
page.click("button[data-testid='export-btn']")
page.click("button#submit")

# ❌ Bad
page.click("button.btn.btn-primary")  # Fragile if styles change
```

### 3. **Handle Timeouts Gracefully**

```python
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

try:
    page.wait_for_load_state("networkidle", timeout=10000)
except PlaywrightTimeoutError:
    # Fall back to basic load state
    page.wait_for_load_state("load", timeout=10000)
```

### 4. **Clean Up Resources**

Always close browsers and contexts:

```python
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        # Test code
        pass
    finally:
        browser.close()
```

### 5. **Use Headless Mode for CI**

```python
# Local development (see browser)
browser = p.chromium.launch(headless=False)

# CI environment (faster, no display needed)
browser = p.chromium.launch(headless=True)
```

### 6. **Add Test Documentation**

```python
"""Test video upload functionality.

Prerequisites:
- Frontend running on http://localhost:3000
- Backend running on http://localhost:8000
- Test video file at test_assets/sample.mp4

Steps:
1. Navigate to application
2. Upload video file
3. Verify video appears in media library
4. Drag video to timeline
5. Verify clip appears in timeline
"""
```

---

## 🐛 Troubleshooting

### Import Error: "playwright.sync_api" could not be resolved

**Solution:**

1. Ensure Playwright is installed: `pip install playwright`
2. Verify correct Python interpreter is selected in VS Code
3. Reload VS Code window

### Browser Not Found

**Solution:**

```bash
playwright install chromium
```

### Test Timeout: Element Not Found

**Causes:**

- Element selector is incorrect
- Page hasn't finished loading
- Element is not visible

**Debug:**

```python
# Take screenshot to see current state
page.screenshot(path="debug.png")

# Print page content
print(page.content())

# Increase timeout
page.wait_for_selector("button", timeout=30000)
```

### Network Idle Timeout

**Cause:** Long-lived connections (e.g., Vite HMR websockets) prevent `networkidle`.

**Solution:**

```python
try:
    page.wait_for_load_state("networkidle", timeout=10000)
except PlaywrightTimeoutError:
    page.wait_for_load_state("load", timeout=10000)
```

### Frontend Not Running

**Solution:**

1. Start frontend: `cd frontend && npm run dev`
2. Verify it's accessible: Open http://localhost:3000 in browser
3. Run test

---

## 📊 Test Reporting

### Basic Console Output

```python
def test_with_reporting():
    """Test with progress reporting."""
    print("Starting test...")

    # Test steps
    print("✓ Browser launched")
    print("✓ Page loaded")
    print("✓ Video uploaded")

    print("Test passed!")
```

### Screenshot on Failure

```python
import traceback

def test_with_screenshot():
    """Test that captures screenshot on failure."""
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Test steps
            # ...

    except Exception as e:
        if browser:
            page.screenshot(path="failure-screenshot.png")
            print(f"Screenshot saved: failure-screenshot.png")
        traceback.print_exc()
        raise
    finally:
        if browser:
            browser.close()
```

---

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install playwright
          playwright install chromium

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Run E2E tests
        run: |
          python .github/skills/webapp-testing/scripts/with_server.py \
            --server "cd backend && python main.py" --port 8000 \
            --server "cd frontend && npm run dev" --port 3000 \
            -- python web_tests/smoke_frontend.py
```

---

## 📚 Additional Resources

### Official Documentation

- **Playwright Python Docs:** https://playwright.dev/python/
- **Playwright API Reference:** https://playwright.dev/python/docs/api/class-playwright
- **Selectors Guide:** https://playwright.dev/python/docs/selectors

### Related Project Docs

- [Web App Smoke Tests](webapp-smoke-tests.md) - Using `with_server.py` helper
- [Manual Testing Guide](manual-testing-guide.md) - Manual testing procedures
- [Backend Testing Guide](backend-testing-guide.md) - Backend unit tests

---

## 📝 Next Steps

1. **Add more test scenarios:**

   - Video trimming
   - Audio overlay
   - Transition effects
   - Export in different formats

2. **Implement test fixtures:**

   - Reusable browser setup
   - Test data generation
   - Cleanup utilities

3. **Add visual regression testing:**

   - Screenshot comparison
   - Percy or Chromatic integration

4. **Performance testing:**
   - Measure load times
   - Track memory usage
   - Monitor frame rates

---

## ✅ Checklist

- [x] Playwright installed (`pip install playwright`)
- [x] Browsers installed (`playwright install`)
- [x] Frontend running (`http://localhost:3000`)
- [x] Backend running (`http://localhost:8000`)
- [x] Smoke test passing (`python web_tests/smoke_frontend.py`)
- [ ] Additional E2E tests written
- [ ] CI/CD pipeline configured
- [ ] Test documentation updated

---

**Last Updated:** January 14, 2026
