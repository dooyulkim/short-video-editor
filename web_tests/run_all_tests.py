# -*- coding: utf-8 -*-
"""Test runner script to execute all E2E tests with reporting."""
from pathlib import Path
import subprocess
import sys
import os
from datetime import datetime
from typing import List, Tuple
import io

# Reconfigure stdout to handle UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# Test files to run (in order)
TEST_FILES = [
    "smoke_frontend.py",
    "test_critical_flow.py",
    "test_media_management.py",
    # Add more test files as they're created:
    # "test_timeline_editing.py",
    # "test_transitions.py",
    # "test_text_overlays.py",
    # "test_audio.py",
    # "test_playback.py",
    # "test_project_management.py",
    # "test_export.py",
    # "test_keyboard_shortcuts.py",
    # "test_advanced.py",
]


def run_test(test_file: str) -> Tuple[str, bool, str]:
    """Run a single test file.
    
    Args:
        test_file: Name of test file to run
        
    Returns:
        Tuple of (test_name, passed, output)
    """
    test_path = Path(__file__).parent / test_file
    
    if not test_path.exists():
        return (test_file, False, f"Test file not found: {test_path}")
    
    print(f"\n{'=' * 60}")
    print(f"Running: {test_file}")
    print(f"{'=' * 60}")
    
    try:
        # Set environment to use UTF-8 for subprocess
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        
        result = subprocess.run(
            [sys.executable, str(test_path)],
            capture_output=True,
            text=False,  # Get bytes instead of text
            env=env,
            timeout=300  # 5 minute timeout per test
        )
        
        # Decode output with UTF-8, replacing errors
        stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ''
        stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ''
        
        # Print output
        if stdout:
            print(stdout)
        if stderr:
            print(stderr, file=sys.stderr)
        
        passed = result.returncode == 0
        output = stdout + stderr
        
        return (test_file, passed, output)
        
    except subprocess.TimeoutExpired:
        error_msg = "Test timed out after 5 minutes"
        print(f"❌ {error_msg}")
        return (test_file, False, error_msg)
        
    except Exception as e:
        error_msg = f"Error running test: {e}"
        print(f"❌ {error_msg}")
        return (test_file, False, error_msg)


def generate_report(results: List[Tuple[str, bool, str]]) -> None:
    """Generate HTML test report.
    
    Args:
        results: List of (test_name, passed, output) tuples
    """
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    passed_count = sum(1 for _, passed, _ in results if passed)
    failed_count = len(results) - passed_count
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>E2E Test Report - {timestamp}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #007acc;
            padding-bottom: 10px;
        }}
        .summary {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .summary-stats {{
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }}
        .stat {{
            padding: 15px 25px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
        }}
        .stat.total {{ background: #e3f2fd; color: #1976d2; }}
        .stat.passed {{ background: #e8f5e9; color: #388e3c; }}
        .stat.failed {{ background: #ffebee; color: #d32f2f; }}
        .test-result {{
            background: white;
            margin: 15px 0;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .test-result.passed {{
            border-left: 5px solid #4caf50;
        }}
        .test-result.failed {{
            border-left: 5px solid #f44336;
        }}
        .test-name {{
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .test-name.passed {{ color: #4caf50; }}
        .test-name.failed {{ color: #f44336; }}
        .test-output {{
            background: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            margin-top: 10px;
        }}
        .timestamp {{
            color: #666;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <h1>🧪 E2E Test Report</h1>
    
    <div class="summary">
        <div class="timestamp">Generated: {timestamp}</div>
        <div class="summary-stats">
            <div class="stat total">Total: {len(results)}</div>
            <div class="stat passed">✓ Passed: {passed_count}</div>
            <div class="stat failed">✗ Failed: {failed_count}</div>
        </div>
    </div>
"""
    
    for test_name, passed, output in results:
        status_class = "passed" if passed else "failed"
        status_icon = "✓" if passed else "✗"
        
        html += f"""
    <div class="test-result {status_class}">
        <div class="test-name {status_class}">
            {status_icon} {test_name}
        </div>
        <details>
            <summary>View output</summary>
            <div class="test-output">{output}</div>
        </details>
    </div>
"""
    
    html += """
</body>
</html>
"""
    
    report_path = reports_dir / "report.html"
    report_path.write_text(html, encoding="utf-8")
    
    print(f"\n📊 HTML report generated: {report_path}")


def main() -> None:
    """Run all E2E tests and generate report."""
    print("=" * 60)
    print("E2E TEST SUITE")
    print("=" * 60)
    print(f"\nRunning {len(TEST_FILES)} test file(s)...\n")
    
    results = []
    
    for test_file in TEST_FILES:
        result = run_test(test_file)
        results.append(result)
    
    # Generate report
    generate_report(results)
    
    # Print summary
    passed_count = sum(1 for _, passed, _ in results if passed)
    failed_count = len(results) - passed_count
    
    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    print(f"Total tests: {len(results)}")
    print(f"✓ Passed: {passed_count}")
    print(f"✗ Failed: {failed_count}")
    print("=" * 60)
    
    if failed_count > 0:
        print("\n❌ Some tests failed!")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
