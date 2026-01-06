#!/usr/bin/env python
"""
Run all tests with coverage report
"""
import sys
import subprocess

def main():
    """Run pytest with coverage"""
    print("Running all backend tests with coverage...\n")
    
    result = subprocess.run([
        sys.executable,
        "-m",
        "pytest",
        "tests/",
        "-v",
        "--cov=services",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--tb=short"
    ])
    
    if result.returncode == 0:
        print("\n" + "="*70)
        print("✅ All tests passed!")
        print("="*70)
        print("\nCoverage report generated in htmlcov/index.html")
    else:
        print("\n" + "="*70)
        print("❌ Some tests failed!")
        print("="*70)
        sys.exit(1)

if __name__ == "__main__":
    main()
