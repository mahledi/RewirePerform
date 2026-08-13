#!/usr/bin/env python3
"""Verify the locked RewirePerform logo contract and generated exports."""

from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "design/brand/logo-finalization-20260718/final"
MASTER = KIT / "master/rewireperform-symbol-v1.svg"
FAILURES: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_png(relative: str, size: int, mode: str) -> Image.Image | None:
    path = KIT / relative
    if not path.is_file():
        FAILURES.append(f"missing PNG: {relative}")
        return None
    image = Image.open(path)
    require(image.size == (size, size), f"{relative}: expected {size}x{size}, got {image.size}")
    require(image.mode == mode, f"{relative}: expected mode {mode}, got {image.mode}")
    return image


def verify_integrated_png(path: Path, size: tuple[int, int], mode: str) -> None:
    require(path.is_file(), f"missing integrated asset: {path.relative_to(ROOT)}")
    if not path.is_file():
        return
    with Image.open(path) as image:
        require(image.size == size, f"{path.relative_to(ROOT)}: expected {size}, got {image.size}")
        require(image.mode == mode, f"{path.relative_to(ROOT)}: expected mode {mode}, got {image.mode}")


def main() -> int:
    lock_path = KIT / "brand-lock.json"
    require(lock_path.is_file(), "missing brand-lock.json")
    if lock_path.is_file():
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        require(lock.get("status") == "LOCKED", "brand-lock status must be LOCKED")
        require(lock.get("selected_mark") == "B2 Normal R", "selected mark must be B2 Normal R")
        require(
            lock.get("palette") == {
                "rewire_green": "#2EAD89",
                "off_white": "#EEF0F2",
                "midnight": "#0D0E12",
            },
            "locked palette changed",
        )

    require(MASTER.is_file(), "missing SVG master")
    if MASTER.is_file():
        svg = MASTER.read_text(encoding="utf-8")
        for color in ("#2EAD89", "#EEF0F2"):
            require(color in svg, f"SVG master missing {color}")
        for prohibited in ("<filter", "<linearGradient", "<radialGradient", "stroke=", "opacity="):
            require(prohibited not in svg, f"SVG master contains prohibited effect: {prohibited}")
        require(svg.count("<path ") == 2, "SVG master must contain exactly two geometry paths")

    app = verify_png("exports/app-store/rewireperform-app-icon-1024.png", 1024, "RGB")
    verify_png("exports/pwa/rewireperform-app-icon-512.png", 512, "RGB")
    verify_png("exports/pwa/rewireperform-app-icon-192.png", 192, "RGB")
    verify_png("exports/apple/rewireperform-apple-touch-icon-180.png", 180, "RGB")
    verify_png("exports/web/rewireperform-favicon-64.png", 64, "RGB")
    verify_png("exports/web/rewireperform-favicon-32.png", 32, "RGB")
    verify_png("exports/email/rewireperform-email-dark-background-256.png", 256, "RGBA")
    verify_png("exports/email/rewireperform-email-light-background-256.png", 256, "RGBA")

    if app is not None:
        colors = Counter(app.get_flattened_data())
        for color in ((13, 14, 18), (238, 240, 242), (46, 173, 137)):
            require(colors[color] > 1000, f"App Store icon missing sufficient exact pixels for {color}")
        pixels = app.load()
        background = (13, 14, 18)
        occupied = [
            (x, y)
            for y in range(app.height)
            for x in range(app.width)
            if pixels[x, y] != background
        ]
        if occupied:
            xs = [point[0] for point in occupied]
            ys = [point[1] for point in occupied]
            bounds = (min(xs), min(ys), max(xs), max(ys))
            require(145 <= bounds[0] <= 165, f"App icon left optical bound drifted: {bounds}")
            require(120 <= bounds[1] <= 145, f"App icon top optical bound drifted: {bounds}")
            require(860 <= bounds[2] <= 880, f"App icon right optical bound drifted: {bounds}")
            require(885 <= bounds[3] <= 905, f"App icon bottom optical bound drifted: {bounds}")

    integrations = {
        ROOT / "public/app-icon.png": KIT / "exports/app-store/rewireperform-app-icon-1024.png",
        ROOT / "public/app-icon-512.png": KIT / "exports/pwa/rewireperform-app-icon-512.png",
        ROOT / "public/app-icon-192.png": KIT / "exports/pwa/rewireperform-app-icon-192.png",
        ROOT / "public/apple-touch-icon-180.png": KIT / "exports/apple/rewireperform-apple-touch-icon-180.png",
        ROOT / "public/favicon-32.png": KIT / "exports/web/rewireperform-favicon-32.png",
        ROOT / "public/favicon-64.png": KIT / "exports/web/rewireperform-favicon-64.png",
        ROOT / "public/brand/rewireperform-symbol-dark.svg": KIT / "master/rewireperform-symbol-v1.svg",
        ROOT / "public/brand/rewireperform-symbol-light.svg": KIT / "master/rewireperform-symbol-light-background-v1.svg",
        ROOT / "public/brand/rewireperform-symbol-dark-512.png": KIT / "exports/web/rewireperform-symbol-dark-background-512.png",
        ROOT / "public/brand/rewireperform-symbol-light-512.png": KIT / "exports/web/rewireperform-symbol-light-background-512.png",
        ROOT / "public/brand/rewireperform-email-dark-256.png": KIT / "exports/email/rewireperform-email-dark-background-256.png",
        ROOT / "public/brand/rewireperform-email-light-256.png": KIT / "exports/email/rewireperform-email-light-background-256.png",
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png": KIT / "exports/app-store/rewireperform-app-icon-1024.png",
    }
    for destination, source in integrations.items():
        require(destination.is_file(), f"missing integrated asset: {destination.relative_to(ROOT)}")
        if destination.is_file() and source.is_file():
            require(digest(destination) == digest(source), f"integrated asset drift: {destination.relative_to(ROOT)}")

    verify_integrated_png(ROOT / "public/og-image.png", (1200, 630), "RGB")
    verify_integrated_png(ROOT / "public/og-invite.png", (1200, 1500), "RGB")
    splash_paths = [
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png",
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png",
    ]
    for splash_path in splash_paths:
        verify_integrated_png(splash_path, (2732, 2732), "RGB")
    if all(path.is_file() for path in splash_paths):
        require(len({digest(path) for path in splash_paths}) == 1, "iOS splash variants must remain identical")

    offline_path = ROOT / "public/offline.html"
    require(offline_path.is_file(), "missing offline.html")
    if offline_path.is_file():
        offline_html = offline_path.read_text(encoding="utf-8")
        require(offline_html.rstrip().endswith("</html>"), "offline.html must end after its closing html tag")
        require(
            offline_html.find(".brand {") < offline_html.find("</style>"),
            "offline brand styles must remain inside the style block",
        )
        require(
            "/brand/rewireperform-symbol-dark.svg" in offline_html,
            "offline.html must use the locked brand symbol",
        )

    manifest = KIT / "manifest.json"
    require(manifest.is_file(), "missing generated manifest.json")
    if manifest.is_file():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        require(data.get("status") == "LOCKED", "manifest status must be LOCKED")
        require(len(data.get("assets", [])) >= 16, "manifest asset inventory is incomplete")

    archive = KIT / "rewireperform-logo-kit-v1.zip"
    require(archive.is_file(), "missing handoff ZIP")
    if archive.is_file():
        with zipfile.ZipFile(archive) as package:
            names = package.namelist()
            require(any(name.endswith("brand-lock.json") for name in names), "ZIP missing brand lock")
            require(any(name.endswith("rewireperform-app-icon-1024.png") for name in names), "ZIP missing App Store icon")
            require(any(name.endswith("rewireperform-symbol-v1.svg") for name in names), "ZIP missing vector master")

    if FAILURES:
        print("Brand asset verification failed:", file=sys.stderr)
        for failure in FAILURES:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Locked RewirePerform brand assets verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
