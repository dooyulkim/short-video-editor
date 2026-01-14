"""TestHelper class providing reusable actions for Playwright E2E tests."""
from pathlib import Path
from typing import Optional, Tuple, List
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError


class TestHelper:
    """Helper class for common test actions."""

    def __init__(self, page: Page, base_url: str = "http://localhost:3000"):
        """Initialize TestHelper.
        
        Args:
            page: Playwright page object
            base_url: Base URL of the application
        """
        self.page = page
        self.base_url = base_url

    def navigate_to_app(self, wait_for_canvas: bool = True) -> None:
        """Navigate to the application and wait for it to load.
        
        Args:
            wait_for_canvas: Whether to wait for canvas element (default: True)
        """
        self.page.goto(self.base_url)
        
        # Try networkidle first, fall back to basic load
        try:
            self.page.wait_for_load_state("networkidle", timeout=10000)
        except PlaywrightTimeoutError:
            self.page.wait_for_load_state("load", timeout=10000)
        
        if wait_for_canvas:
            self.page.wait_for_selector("canvas", timeout=10000)

    def upload_file(self, file_path: str, wait_for_thumbnail: bool = True) -> None:
        """Upload a file to the application.
        
        Args:
            file_path: Absolute path to file to upload
            wait_for_thumbnail: Wait for thumbnail to appear (default: True)
        """
        # Locate file input (may be hidden)
        file_input = self.page.locator('input[type="file"]').first
        
        # Set file
        file_input.set_input_files(file_path)
        
        if wait_for_thumbnail:
            # Wait for media item to appear in library
            self.page.wait_for_selector('[data-testid="media-item"], .media-item, .resource-item', timeout=15000)

    def upload_files(self, file_paths: List[str], wait_for_all: bool = True) -> None:
        """Upload multiple files to the application.
        
        Args:
            file_paths: List of absolute paths to files
            wait_for_all: Wait for all files to be uploaded (default: True)
        """
        file_input = self.page.locator('input[type="file"]').first
        file_input.set_input_files(file_paths)
        
        if wait_for_all:
            # Wait for all media items to appear
            for _ in file_paths:
                self.page.wait_for_selector('[data-testid="media-item"], .media-item, .resource-item', timeout=15000)

    def drag_to_timeline(self, media_selector: str, drop_position: Optional[Tuple[int, int]] = None) -> None:
        """Drag a media item from library to timeline.
        
        Args:
            media_selector: CSS selector for the media item
            drop_position: Optional (x, y) coordinates for drop position
        """
        # Get the media element
        media_element = self.page.locator(media_selector).first
        
        # Get timeline drop zone
        timeline = self.page.locator('[data-testid="timeline"], .timeline').first
        
        if drop_position:
            # Drag to specific position
            media_element.drag_to(timeline, target_position={"x": drop_position[0], "y": drop_position[1]})
        else:
            # Drag to timeline center
            media_element.drag_to(timeline)
        
        # Wait for clip to appear on timeline
        self.page.wait_for_selector('[data-testid="timeline-clip"], .timeline-clip', timeout=5000)

    def click_play(self) -> None:
        """Click the play button."""
        play_button = self.page.locator('button[data-testid="play-button"], button[aria-label="Play"]').first
        play_button.click()

    def click_pause(self) -> None:
        """Click the pause button."""
        pause_button = self.page.locator('button[data-testid="pause-button"], button[aria-label="Pause"]').first
        pause_button.click()

    def click_stop(self) -> None:
        """Click the stop button."""
        stop_button = self.page.locator('button[data-testid="stop-button"], button[aria-label="Stop"]').first
        stop_button.click()

    def open_export_dialog(self) -> None:
        """Open the export dialog."""
        export_button = self.page.locator('button[data-testid="export-button"], button:has-text("Export")').first
        export_button.click()
        
        # Wait for dialog to appear
        self.page.wait_for_selector('[data-testid="export-dialog"], [role="dialog"]', timeout=5000)

    def start_export(self, filename: Optional[str] = None, resolution: Optional[str] = None) -> None:
        """Start the export process.
        
        Args:
            filename: Optional custom filename
            resolution: Optional resolution preset (e.g., "1080p", "720p")
        """
        if filename:
            filename_input = self.page.locator('input[data-testid="export-filename"], input[name="filename"]').first
            filename_input.fill(filename)
        
        if resolution:
            resolution_select = self.page.locator('select[data-testid="export-resolution"], select[name="resolution"]').first
            resolution_select.select_option(resolution)
        
        # Click start export button
        start_button = self.page.locator('button[data-testid="start-export"], button:has-text("Start Export")').first
        start_button.click()

    def wait_for_export_complete(self, timeout: int = 120000) -> None:
        """Wait for export to complete.
        
        Args:
            timeout: Maximum time to wait in milliseconds (default: 120 seconds)
        """
        # Wait for export complete indicator
        self.page.wait_for_selector(
            '[data-testid="export-complete"], .export-complete, :has-text("Export complete")',
            timeout=timeout
        )

    def get_timeline_clips_count(self) -> int:
        """Get the number of clips on the timeline.
        
        Returns:
            Number of clips on timeline
        """
        clips = self.page.locator('[data-testid="timeline-clip"], .timeline-clip').count()
        return clips

    def get_media_items_count(self) -> int:
        """Get the number of media items in the library.
        
        Returns:
            Number of media items in library
        """
        items = self.page.locator('[data-testid="media-item"], .media-item, .resource-item').count()
        return items

    def wait_for_element(self, selector: str, timeout: int = 10000) -> None:
        """Wait for an element to appear.
        
        Args:
            selector: CSS selector
            timeout: Maximum time to wait in milliseconds
        """
        self.page.wait_for_selector(selector, timeout=timeout)

    def click_element(self, selector: str) -> None:
        """Click an element by selector.
        
        Args:
            selector: CSS selector
        """
        self.page.locator(selector).first.click()

    def fill_input(self, selector: str, value: str) -> None:
        """Fill an input field.
        
        Args:
            selector: CSS selector for input
            value: Value to fill
        """
        self.page.locator(selector).first.fill(value)

    def select_option(self, selector: str, value: str) -> None:
        """Select an option from a dropdown.
        
        Args:
            selector: CSS selector for select element
            value: Value to select
        """
        self.page.locator(selector).first.select_option(value)

    def press_key(self, key: str) -> None:
        """Press a keyboard key.
        
        Args:
            key: Key to press (e.g., "Space", "Enter", "Delete")
        """
        self.page.keyboard.press(key)

    def press_keys(self, keys: str) -> None:
        """Press multiple keys (keyboard shortcut).
        
        Args:
            keys: Keys to press (e.g., "Control+S", "Control+C")
        """
        self.page.keyboard.press(keys)

    def take_screenshot(self, filename: str) -> None:
        """Take a screenshot.
        
        Args:
            filename: Filename for screenshot
        """
        screenshots_dir = Path(__file__).parent.parent / "reports" / "screenshots"
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(screenshots_dir / filename))

    def assert_element_visible(self, selector: str, error_message: Optional[str] = None) -> None:
        """Assert that an element is visible.
        
        Args:
            selector: CSS selector
            error_message: Optional custom error message
        """
        is_visible = self.page.locator(selector).first.is_visible()
        assert is_visible, error_message or f"Element '{selector}' is not visible"

    def assert_element_count(self, selector: str, expected_count: int, error_message: Optional[str] = None) -> None:
        """Assert the count of elements matching selector.
        
        Args:
            selector: CSS selector
            expected_count: Expected number of elements
            error_message: Optional custom error message
        """
        actual_count = self.page.locator(selector).count()
        assert actual_count == expected_count, error_message or f"Expected {expected_count} elements, found {actual_count}"

    def assert_text_present(self, text: str, error_message: Optional[str] = None) -> None:
        """Assert that text is present on the page.
        
        Args:
            text: Text to search for
            error_message: Optional custom error message
        """
        is_present = self.page.locator(f'text="{text}"').count() > 0
        assert is_present, error_message or f"Text '{text}' not found on page"
