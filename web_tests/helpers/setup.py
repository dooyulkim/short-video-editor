"""Test setup configuration for Playwright E2E tests."""
from typing import Dict, Any


# Default configuration
DEFAULT_CONFIG: Dict[str, Any] = {
    "base_url": "http://localhost:3000",
    "backend_url": "http://localhost:8000",
    "headless": True,
    "slow_mo": 0,  # Milliseconds to slow down operations (useful for debugging)
    "timeout": 30000,  # Default timeout in milliseconds
    "screenshot_on_failure": True,
    "video_on_failure": False,
}


def get_browser_config(headless: bool = True, slow_mo: int = 0) -> Dict[str, Any]:
    """Get browser configuration.
    
    Args:
        headless: Whether to run in headless mode
        slow_mo: Milliseconds to slow down operations
        
    Returns:
        Browser configuration dictionary
    """
    return {
        "headless": headless,
        "slow_mo": slow_mo,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
    }


def get_context_config(viewport_width: int = 1920, viewport_height: int = 1080) -> Dict[str, Any]:
    """Get browser context configuration.
    
    Args:
        viewport_width: Viewport width in pixels
        viewport_height: Viewport height in pixels
        
    Returns:
        Context configuration dictionary
    """
    return {
        "viewport": {"width": viewport_width, "height": viewport_height},
        "ignore_https_errors": True,
        "record_video_dir": "web_tests/reports/videos" if DEFAULT_CONFIG["video_on_failure"] else None,
    }


def get_test_config() -> Dict[str, Any]:
    """Get complete test configuration.
    
    Returns:
        Complete test configuration dictionary
    """
    return DEFAULT_CONFIG.copy()
