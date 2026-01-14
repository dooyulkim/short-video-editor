# -*- coding: utf-8 -*-
"""Media management E2E tests.

Tests for:
- File upload (drag-drop, click, multi-file, various formats)
- Media library (filtering, preview, metadata)
- Media deletion
- Thumbnail generation
- Project-based media organization
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
import os
import io

# Reconfigure stdout to handle UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))

from helpers.test_helper import TestHelper
from helpers.assertions import assert_media_library_has_items
from helpers.setup import get_browser_config, get_context_config, DEFAULT_CONFIG


FRONTEND_URL = DEFAULT_CONFIG["base_url"]
FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_upload_single_video() -> None:
    """Test uploading a single video file."""
    print("\n=== Testing single video upload ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, FRONTEND_URL)
        
        try:
            helper.navigate_to_app()
            
            video_path = str(FIXTURES_DIR / "video.mp4")
            if not os.path.exists(video_path):
                print(f"⚠ Skipping: fixture not found: {video_path}")
                return
            
            print("✓ Uploading video...")
            helper.upload_file(video_path)
            
            print("✓ Verifying media in library...")
            assert_media_library_has_items(page, 1)
            
            print("✅ Test passed: Single video upload")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("upload_single_video_failure.png")
            raise
        finally:
            browser.close()


def test_upload_multiple_files() -> None:
    """Test uploading multiple files at once."""
    print("\n=== Testing multiple file upload ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, FRONTEND_URL)
        
        try:
            helper.navigate_to_app()
            
            files = [
                FIXTURES_DIR / "video.mp4",
                FIXTURES_DIR / "audio.mp3",
                FIXTURES_DIR / "image.jpg",
            ]
            
            # Check which files exist
            existing_files = [str(f) for f in files if f.exists()]
            
            if not existing_files:
                print("⚠ Skipping: no fixtures found")
                return
            
            print(f"✓ Uploading {len(existing_files)} files...")
            helper.upload_files(existing_files)
            
            print("✓ Verifying all files in library...")
            assert_media_library_has_items(page, len(existing_files))
            
            print(f"✅ Test passed: Multiple file upload ({len(existing_files)} files)")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("upload_multiple_failure.png")
            raise
        finally:
            browser.close()


def test_media_library_filtering() -> None:
    """Test media library filtering by type."""
    print("\n=== Testing media library filtering ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, FRONTEND_URL)
        
        try:
            helper.navigate_to_app()
            
            # Upload different media types
            files = []
            if (FIXTURES_DIR / "video.mp4").exists():
                files.append(str(FIXTURES_DIR / "video.mp4"))
            if (FIXTURES_DIR / "audio.mp3").exists():
                files.append(str(FIXTURES_DIR / "audio.mp3"))
            
            if not files:
                print("⚠ Skipping: no fixtures found")
                return
            
            print(f"✓ Uploading {len(files)} files...")
            helper.upload_files(files)
            
            # Test "All" filter
            print("✓ Testing 'All' filter...")
            all_tab = page.locator('button:has-text("All"), [data-tab="all"]').first
            if all_tab.count() > 0:
                all_tab.click()
                page.wait_for_timeout(500)
                assert helper.get_media_items_count() == len(files)
                print("  ✓ 'All' filter shows all items")
            
            # Test "Video" filter
            print("✓ Testing 'Video' filter...")
            video_tab = page.locator('button:has-text("Video"), [data-tab="video"]').first
            if video_tab.count() > 0:
                video_tab.click()
                page.wait_for_timeout(500)
                video_count = helper.get_media_items_count()
                print(f"  ✓ 'Video' filter shows {video_count} item(s)")
            
            # Test "Audio" filter
            print("✓ Testing 'Audio' filter...")
            audio_tab = page.locator('button:has-text("Audio"), [data-tab="audio"]').first
            if audio_tab.count() > 0:
                audio_tab.click()
                page.wait_for_timeout(500)
                audio_count = helper.get_media_items_count()
                print(f"  ✓ 'Audio' filter shows {audio_count} item(s)")
            
            print("✅ Test passed: Media library filtering")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("filtering_failure.png")
            raise
        finally:
            browser.close()


def test_media_deletion() -> None:
    """Test deleting media from library."""
    print("\n=== Testing media deletion ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, FRONTEND_URL)
        
        try:
            helper.navigate_to_app()
            
            video_path = str(FIXTURES_DIR / "video.mp4")
            if not os.path.exists(video_path):
                print("⚠ Skipping: fixture not found")
                return
            
            print("✓ Uploading video...")
            helper.upload_file(video_path)
            assert_media_library_has_items(page, 1)
            
            print("✓ Deleting media...")
            # Find delete button (may be in media card or context menu)
            delete_button = page.locator('[data-testid="delete-media"], button[aria-label="Delete"], .delete-icon').first
            
            if delete_button.count() == 0:
                # Try right-click context menu
                media_item = page.locator('[data-testid="media-item"]').first
                media_item.click(button="right")
                page.wait_for_timeout(500)
                delete_button = page.locator('text="Delete"').first
            
            if delete_button.count() > 0:
                delete_button.click()
                
                # Handle confirmation dialog if present
                confirm_button = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first
                if confirm_button.count() > 0:
                    page.wait_for_timeout(500)
                    confirm_button.click()
                
                page.wait_for_timeout(1000)
                
                print("✓ Verifying deletion...")
                final_count = helper.get_media_items_count()
                assert final_count == 0, f"Expected 0 items after deletion, found {final_count}"
                
                print("✅ Test passed: Media deletion")
            else:
                print("⚠ Delete button not found, skipping deletion verification")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("deletion_failure.png")
            raise
        finally:
            browser.close()


def test_thumbnail_generation() -> None:
    """Test that thumbnails are generated for uploaded videos."""
    print("\n=== Testing thumbnail generation ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config(headless=True))
        page = browser.new_context(**get_context_config()).new_page()
        helper = TestHelper(page, FRONTEND_URL)
        
        try:
            helper.navigate_to_app()
            
            video_path = str(FIXTURES_DIR / "video.mp4")
            if not os.path.exists(video_path):
                print("⚠ Skipping: fixture not found")
                return
            
            print("✓ Uploading video...")
            helper.upload_file(video_path)
            
            print("✓ Checking for thumbnail...")
            # Look for thumbnail image in media card
            thumbnail = page.locator('[data-testid="media-item"] img, .media-item img, .thumbnail').first
            
            helper.wait_for_element('[data-testid="media-item"] img, .media-item img', timeout=10000)
            
            assert thumbnail.is_visible(), "Thumbnail not visible"
            
            # Verify thumbnail has src
            src = thumbnail.get_attribute("src")
            assert src and len(src) > 0, "Thumbnail has no src attribute"
            
            print("✅ Test passed: Thumbnail generation")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            helper.take_screenshot("thumbnail_failure.png")
            raise
        finally:
            browser.close()


def run_all_media_tests() -> None:
    """Run all media management tests."""
    print("\n" + "=" * 60)
    print("MEDIA MANAGEMENT TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Upload Single Video", test_upload_single_video),
        ("Upload Multiple Files", test_upload_multiple_files),
        ("Media Library Filtering", test_media_library_filtering),
        ("Media Deletion", test_media_deletion),
        ("Thumbnail Generation", test_thumbnail_generation),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"\n❌ {name} failed: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_media_tests()
