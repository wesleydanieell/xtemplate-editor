#!/usr/bin/env python3
"""Stage only runtime web files for the Tauri desktop application."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist-web"
FILES = ("index.html", "app.js", "styles.css", "favicon.svg")
DIRS = ("src", "examples")

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir()
for name in FILES:
    shutil.copy2(ROOT / name, DIST / name)
for name in DIRS:
    shutil.copytree(ROOT / name, DIST / name)
assert (DIST / "index.html").exists()
print(f"Staged web app in {DIST}, ready for Tauri")
