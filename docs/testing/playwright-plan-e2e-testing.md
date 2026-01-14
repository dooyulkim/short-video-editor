# Plan: Comprehensive E2E Test Suite for Video Editor

Create a systematic, feature-by-feature Playwright E2E test suite covering all 200+ features of the Video Editor application, organized by priority and complexity.

## Steps

### 1. Set up test infrastructure

Create `web_tests/helpers/` with reusable utilities:

- **`TestHelper` class** - Common actions like upload, drag-and-drop, wait for elements, click and verify
- **`testFixtures.ts`** - Sample media paths, test data generation, fixture cleanup
- **`assertions.ts`** - Custom Playwright assertions for timeline state, clip properties, export completion
- **`setup.ts`** - Browser configuration, base URL management, authentication if needed

### 2. Implement critical path tests first

Create `web_tests/test_critical_flow.py` covering the core user journey:

- Upload media (video + audio)
- Drag to timeline
- Play preview and verify playback
- Export video (default settings)
- Download and verify output file

This validates the core user journey that must always work.

### 3. Build feature-specific test modules

Create separate test files for each major feature area:

#### `web_tests/test_media_management.py`
- **Upload**: Drag-drop, click upload, multi-file, all supported formats (MP4, AVI, MOV, MP3, WAV, JPG, PNG)
- **Library**: Filtering by type (All/Video/Audio/Images), preview in player, metadata display
- **Deletion**: Single file, with timeline cleanup, cascade deletion
- **Thumbnails**: Auto-generation on upload, thumbnail display
- **Project organization**: Project-based media storage, isolation

#### `web_tests/test_timeline_editing.py`
- **Layer operations**: Add layer (video/audio/text/image), delete layer, reorder layers, lock/unlock, mute/unmute, rename, visibility toggle
- **Clip operations**: Add clip to timeline, move horizontally, move between layers, trim (resize edges), split at playhead, delete, duplicate, copy/paste
- **Timeline controls**: Zoom in/out (5-200 px/sec), horizontal scrolling, playhead dragging, snapping to grid, duration adjustment
- **Clip properties**: Position adjustment (x, y), scale/resize, rotation, opacity, maintain aspect ratio

#### `web_tests/test_transitions.py`
- **Transition types**: Fade In/Out, Cross Dissolve, Wipe (4 directions), Slide (4 directions), Zoom (In/Out)
- **Duration adjustment**: 0.1-3.0 seconds slider
- **Visual indicators**: Transition icons on clip edges
- **Edit/Remove**: Modify existing transitions, delete transitions
- **Drop zones**: Visual feedback when dragging

#### `web_tests/test_text_overlays.py`
- **Text creation**: Add text button, keyboard shortcut (`T`)
- **Content editing**: Multi-line text input
- **Styling**: Font family (10 options), font size (12-200px), color picker, text color
- **Positioning**: X/Y coordinates, drag in preview, center default
- **Duration**: 0.1-300 seconds
- **Animations**: None, Fade, Slide
- **Timeline editing**: Edit properties, resize, rotate, context menu

#### `web_tests/test_audio.py`
- **Audio clips**: Add to timeline, waveform display
- **Waveform generation**: API call, visual rendering
- **Volume control**: 0-200% slider
- **Fade in/out**: Apply fade transitions
- **Multi-track mixing**: Multiple audio layers, simultaneous playback
- **Layer mute**: Audio layer mute toggle
- **Extract audio**: Extract from video clips

#### `web_tests/test_playback.py`
- **Controls**: Play/Pause (button + Space), Stop (button + S), frame stepping (arrow keys), jump to start/end (Home/End)
- **Scrubbing**: Drag playhead, click-to-seek on ruler
- **Preview rendering**: Composite video, layer rendering order, transition preview
- **Canvas**: Size detection from first video, responsive scaling
- **Performance**: RequestAnimationFrame rendering, video element pooling

#### `web_tests/test_project_management.py`
- **New project**: Create new, confirmation dialog if unsaved
- **Save project**: Save to JSON file, download
- **Load project**: Open from file picker, JSON validation
- **Rename project**: Update project name
- **Auto-save**: localStorage persistence on every change
- **Recent projects**: List display, open recent, delete from recent
- **Project metadata**: Name, timestamps, clip count

#### `web_tests/test_export.py`
- **Export dialog**: Open dialog, UI elements present
- **Resolution presets**: 1080p, 720p, 480p, Custom
- **Aspect ratios**: 16:9, 9:16, 1:1, 4:3, 3:4, 4:5, Custom
- **Format selection**: MP4, WebM
- **Quality presets**: High (8000kbps), Medium (4000kbps), Low (2000kbps)
- **Filename**: Custom naming
- **Export process**: Start export, progress tracking (polling every 2s), cancel export
- **Auto-download**: Verify file download on completion
- **Error handling**: Failed export scenarios

#### `web_tests/test_keyboard_shortcuts.py`
- **Playback**: Space (play/pause), S (stop), Home/End (jump), arrows (seek), Shift+arrows (5s seek)
- **Editing**: Delete (delete clip), Escape (deselect), K (cut), Ctrl+C/V (copy/paste), Ctrl+D (duplicate)
- **View**: +/- (zoom), 0 (reset zoom), F (fit to window)
- **Tools**: V (selection), T (text), A (audio)
- **Project**: Ctrl+S (save), Ctrl+O (open), Ctrl+E (export), Ctrl+N (new)
- **Undo/Redo**: Ctrl+Z (undo), Ctrl+Y (redo)

### 4. Add advanced feature tests

Create `web_tests/test_advanced.py` for:

- **Undo/Redo system**: 50 state history, multiple operations, history navigation
- **Keyframe animations**: Position keyframes, scale keyframes, rotation keyframes, opacity keyframes, interpolation between keyframes
- **Context menus**: Right-click on clips (Edit, Duplicate, Delete, Reset), right-click on layers (Rename, Delete, Duplicate)
- **Optimistic updates**: Immediate UI feedback during async operations (upload, deletion)
- **Error handling**: Invalid file upload, file size limits, unsupported formats, export failures

### 5. Create test orchestration and reporting

Build `web_tests/run_all_tests.py` to:

- Execute all tests sequentially with `with_server.py`
- Generate HTML report with pass/fail by feature category
- Track coverage against 200+ feature checklist
- Provide summary statistics (total features, passed, failed, skipped)
- Save screenshots on failures
- Generate JUnit XML for CI/CD

Create `.github/workflows/e2e-tests.yml` for CI/CD integration:

- Trigger on push/pull request
- Set up Python + Node.js environments
- Install dependencies (backend, frontend, Playwright)
- Run test suite
- Upload test artifacts (reports, screenshots)
- Comment PR with test results

## Further Considerations

### 1. Test data management

Need sample media files in `web_tests/fixtures/`:

- **video.mp4** - Short sample video (5-10 seconds, 1920x1080)
- **video_portrait.mp4** - Portrait video (9:16 aspect ratio)
- **audio.mp3** - Short audio clip (5-10 seconds)
- **audio_long.mp3** - Longer audio for mixing tests (30 seconds)
- **image.jpg** - Still image (1920x1080)
- **image_transparent.png** - PNG with transparency

**Options**:
- Pre-record test assets and commit to repo
- Generate synthetic media using FFmpeg in test setup
- Download from public domain sources on first run

### 2. Test execution strategy

**Test Suites**:
- **Smoke** (5 min): Critical flow + basic features (~20 tests)
- **Regression** (20 min): High-priority features (~80 tests)
- **Full** (60+ min): All 200+ features

**Execution**:
- Local development: Run smoke suite
- Pre-commit hook: Run smoke suite
- PR checks: Run regression suite
- Nightly builds: Run full suite

**Parallel execution**:
- Multiple browser instances (Chromium, Firefox, WebKit)
- Shard tests across multiple workers
- Use `pytest-xdist` for parallel test execution

### 3. Visual regression testing

Add screenshot comparison for UI consistency:

- **Baseline screenshots**: Capture reference images for each view
- **Comparison**: Pixel-by-pixel or perceptual diff
- **Threshold**: Define acceptable difference percentage
- **Review workflow**: Manual review of visual changes

**Tools**:
- Percy (cloud-based, paid)
- Chromatic (Storybook integration)
- Playwright built-in screenshot comparison
- Custom Python image comparison (PIL/OpenCV)

### 4. Performance benchmarks

Test with large projects to validate performance:

- **Large project**: 50+ clips, 10+ layers, 5 minute timeline
- **Load time**: Project load from JSON (target: <2s)
- **Scrubbing**: Responsive scrubbing with complex timeline (target: <100ms)
- **Export**: Export 1080p 1-minute video (target: <60s on CI machine)
- **Memory**: Monitor memory usage during long sessions

**Metrics to track**:
- Page load time
- Time to interactive
- Timeline render FPS
- Export processing time
- Memory consumption
- CPU usage

**Timeout thresholds**:
- Element wait: 10 seconds (default)
- Page load: 30 seconds
- Upload: 60 seconds per file
- Export: 5 minutes (5-minute video at 1080p)

## Test Organization Structure

```
web_tests/
├── fixtures/                    # Test media files
│   ├── video.mp4
│   ├── video_portrait.mp4
│   ├── audio.mp3
│   ├── audio_long.mp3
│   ├── image.jpg
│   └── image_transparent.png
│
├── helpers/                     # Reusable utilities
│   ├── __init__.py
│   ├── test_helper.py          # TestHelper class
│   ├── assertions.py           # Custom assertions
│   └── setup.py                # Browser config
│
├── reports/                     # Test reports (generated)
│   ├── report.html
│   ├── junit.xml
│   └── screenshots/
│
├── smoke_frontend.py            # Existing smoke test
├── test_critical_flow.py        # Core user journey
├── test_media_management.py     # Media features
├── test_timeline_editing.py     # Timeline & editing
├── test_transitions.py          # Transition effects
├── test_text_overlays.py        # Text features
├── test_audio.py                # Audio features
├── test_playback.py             # Playback & preview
├── test_project_management.py   # Project operations
├── test_export.py               # Export & rendering
├── test_keyboard_shortcuts.py   # Keyboard shortcuts
├── test_advanced.py             # Advanced features
├── run_all_tests.py             # Test orchestration
└── requirements.txt             # Python dependencies
```

## Success Criteria

- ✅ All 200+ features have at least one test case
- ✅ Critical flow test passes consistently (>99% reliability)
- ✅ Smoke suite completes in <5 minutes
- ✅ Full suite completes in <90 minutes
- ✅ Test coverage report shows >80% feature coverage
- ✅ CI/CD pipeline integrated with GitHub Actions
- ✅ Test failures include screenshots and logs
- ✅ Documentation updated with test running instructions

## Implementation Priority

### Phase 1 (Week 1): Foundation
1. Test infrastructure setup (helpers, fixtures)
2. Critical flow test
3. Smoke suite (20 essential tests)

### Phase 2 (Week 2): Core Features
4. Media management tests (15 tests)
5. Timeline editing tests (30 tests)
6. Playback tests (10 tests)

### Phase 3 (Week 3): Extended Features
7. Transitions tests (12 tests)
8. Text overlays tests (12 tests)
9. Audio tests (8 tests)

### Phase 4 (Week 4): Advanced & Integration
10. Project management tests (12 tests)
11. Export tests (15 tests)
12. Keyboard shortcuts tests (25 tests)
13. Advanced features tests (10 tests)

### Phase 5 (Week 5): Polish & CI/CD
14. Test orchestration and reporting
15. Visual regression testing setup
16. Performance benchmarks
17. CI/CD pipeline integration
18. Documentation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky tests due to timing issues | High | Use explicit waits, increase timeouts, add retry logic |
| Large test suite execution time | Medium | Implement parallel execution, create tiered suites |
| Test data management complexity | Medium | Commit fixtures to repo, document generation process |
| CI/CD resource constraints | Medium | Optimize suite for CI, use caching, run nightly |
| Visual regression false positives | Low | Set appropriate diff thresholds, manual review process |
| Test maintenance burden | High | Invest in reusable utilities, clear naming conventions |

## Next Steps

1. Review and approve this plan
2. Set up development environment for E2E tests
3. Create test fixtures directory and sample media
4. Implement test infrastructure (helpers, setup)
5. Begin Phase 1 implementation (critical flow + smoke suite)
6. Iterate based on feedback and test execution results
