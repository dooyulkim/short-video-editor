"""Custom assertions for Playwright E2E tests."""
from typing import Optional
from playwright.sync_api import Page


def assert_timeline_has_clips(page: Page, expected_count: int) -> None:
    """Assert that timeline has expected number of clips.
    
    Args:
        page: Playwright page object
        expected_count: Expected number of clips
        
    Raises:
        AssertionError: If clip count doesn't match
    """
    clips = page.locator('[data-testid="timeline-clip"], .timeline-clip').count()
    assert clips == expected_count, f"Expected {expected_count} clips on timeline, found {clips}"


def assert_media_library_has_items(page: Page, expected_count: int) -> None:
    """Assert that media library has expected number of items.
    
    Args:
        page: Playwright page object
        expected_count: Expected number of items
        
    Raises:
        AssertionError: If item count doesn't match
    """
    items = page.locator('[data-testid="media-item"], .media-item, .resource-item').count()
    assert items == expected_count, f"Expected {expected_count} media items, found {items}"


def assert_export_complete(page: Page) -> None:
    """Assert that export has completed successfully.
    
    Args:
        page: Playwright page object
        
    Raises:
        AssertionError: If export is not complete
    """
    # Check for completion indicators
    complete_indicators = [
        '[data-testid="export-complete"]',
        '.export-complete',
        'text="Export complete"',
        'text="Download"'
    ]
    
    found = False
    for indicator in complete_indicators:
        if page.locator(indicator).count() > 0:
            found = True
            break
    
    assert found, "Export completion indicator not found"


def assert_playback_active(page: Page) -> None:
    """Assert that video playback is active.
    
    Args:
        page: Playwright page object
        
    Raises:
        AssertionError: If playback is not active
    """
    # Check for pause button (indicates playing state)
    pause_button = page.locator('button[data-testid="pause-button"], button[aria-label="Pause"]')
    is_playing = pause_button.count() > 0 and pause_button.first.is_visible()
    
    assert is_playing, "Playback is not active"


def assert_layer_exists(page: Page, layer_name: Optional[str] = None) -> None:
    """Assert that a layer exists on timeline.
    
    Args:
        page: Playwright page object
        layer_name: Optional specific layer name to check
        
    Raises:
        AssertionError: If layer doesn't exist
    """
    if layer_name:
        layer = page.locator(f'[data-testid="timeline-layer"]:has-text("{layer_name}")')
        assert layer.count() > 0, f"Layer '{layer_name}' not found"
    else:
        layers = page.locator('[data-testid="timeline-layer"], .timeline-layer')
        assert layers.count() > 0, "No layers found on timeline"


def assert_transition_applied(page: Page, clip_selector: str) -> None:
    """Assert that a transition has been applied to a clip.
    
    Args:
        page: Playwright page object
        clip_selector: CSS selector for the clip
        
    Raises:
        AssertionError: If transition is not found
    """
    clip = page.locator(clip_selector).first
    transition_indicator = clip.locator('[data-testid="transition-indicator"], .transition-icon')
    
    assert transition_indicator.count() > 0, f"No transition found on clip '{clip_selector}'"


def assert_text_clip_exists(page: Page, text_content: str) -> None:
    """Assert that a text clip with specific content exists.
    
    Args:
        page: Playwright page object
        text_content: Text content to search for
        
    Raises:
        AssertionError: If text clip doesn't exist
    """
    text_clip = page.locator(f'[data-testid="timeline-clip"][data-type="text"]:has-text("{text_content}")')
    
    if text_clip.count() == 0:
        # Fallback: check any timeline clip with the text
        text_clip = page.locator(f'.timeline-clip:has-text("{text_content}")')
    
    assert text_clip.count() > 0, f"Text clip with content '{text_content}' not found"


def assert_waveform_visible(page: Page) -> None:
    """Assert that audio waveform is visible on timeline.
    
    Args:
        page: Playwright page object
        
    Raises:
        AssertionError: If waveform is not visible
    """
    waveform = page.locator('[data-testid="audio-waveform"], .waveform, canvas.waveform')
    assert waveform.count() > 0, "Audio waveform not found"
    assert waveform.first.is_visible(), "Audio waveform is not visible"


def assert_canvas_rendered(page: Page) -> None:
    """Assert that video preview canvas is rendered.
    
    Args:
        page: Playwright page object
        
    Raises:
        AssertionError: If canvas is not rendered
    """
    canvas = page.locator('canvas').first
    assert canvas.is_visible(), "Video preview canvas is not visible"
    
    # Check that canvas has dimensions
    box = canvas.bounding_box()
    assert box is not None, "Canvas has no dimensions"
    assert box['width'] > 0 and box['height'] > 0, "Canvas has zero dimensions"


def assert_project_saved(page: Page, project_name: str) -> None:
    """Assert that project has been saved.
    
    Args:
        page: Playwright page object
        project_name: Name of the project
        
    Raises:
        AssertionError: If project save indication is not found
    """
    # Check for project name in UI
    name_element = page.locator(f'text="{project_name}"')
    assert name_element.count() > 0, f"Project name '{project_name}' not found in UI"
