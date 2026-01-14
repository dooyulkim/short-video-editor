"""Frontend smoke tests using Playwright.

Setup Instructions:
1. Activate the virtual environment:
   - Windows: .venv\Scripts\activate
   - Unix/Mac: source .venv/bin/activate

2. Install Playwright:
   pip install playwright

3. Install browser binaries:
   playwright install

4. Ensure the frontend is running on http://localhost:3000

5. Run the test:
   python web_tests/smoke_frontend.py
"""
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright


FRONTEND_URL = "http://localhost:3000"


def run_smoke() -> None:
    """Basic frontend smoke test.

    - Starts a headless Chromium browser
    - Navigates to the app
    - Waits for the network to go idle
    - Verifies that the page has a title
    - Verifies that at least one <canvas> element is rendered
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(FRONTEND_URL)

        # In dev mode, long-lived connections (e.g. Vite HMR websockets) can
        # prevent the page from ever reaching strict "networkidle". We still
        # try it briefly for dynamic content, but gracefully fall back to a
        # simpler readiness check based on DOM content.
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except PlaywrightTimeoutError:
            # Fall back to basic load completion; subsequent selector waits
            # will ensure the UI is actually rendered.
            page.wait_for_load_state("load", timeout=10000)

        # Basic sanity: page should have a non-empty title
        title = page.title()
        if not title or not title.strip():
            raise AssertionError("Expected a non-empty page title for the frontend application.")

        # Core UI sanity: at least one canvas should be present (timeline/player)
        page.wait_for_selector("canvas", timeout=10000)

        browser.close()


if __name__ == "__main__":
    run_smoke()
