#!/usr/bin/env python3
"""Create a reproducible zip of the portable, offline web application."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import argparse

ROOT = Path(__file__).resolve().parent.parent
INCLUDED = ("index.html", "app.js", "styles.css", "favicon.svg", "start.sh", "stop.sh", "README.md", "LICENSE", "CONTRIBUTING.md", "SECURITY.md", "package.json")
DIRECTORIES = ("src", "examples", "docs")


def release_files():
    files = [ROOT / name for name in INCLUDED]
    for directory in DIRECTORIES:
        files.extend(p for p in (ROOT / directory).rglob("*") if p.is_file())
    for file in files:
        if not file.is_file():
            raise FileNotFoundError(file)
    return sorted(files, key=lambda f: f.relative_to(ROOT).as_posix())


def build(output):
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for file in release_files():
            member = "XTemplate-Studio/" + file.relative_to(ROOT).as_posix()
            info = ZipInfo(member, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = ((0o755 if file.name in {"start.sh", "stop.sh"} else 0o644) << 16)
            archive.writestr(info, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(f"Created {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist" / "XTemplate-Studio.zip")
    args = parser.parse_args()
    build(args.output)
