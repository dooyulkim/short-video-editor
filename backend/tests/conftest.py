"""
Test configuration for pytest
"""
import sys
from pathlib import Path

# Add parent directory to path to import backend modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Test fixtures and configuration can be added here
