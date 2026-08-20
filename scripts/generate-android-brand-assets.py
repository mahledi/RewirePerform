#!/usr/bin/env python3
"""Generate Android-only assets from the locked RewirePerform logo kit."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LOCKED = ROOT / "design/brand/logo-finalization-20260718/final/exports"
ANDROID_RES = ROOT / "android/app/src/main/res"

MIDNIGHT = "#0D0E12"
ADAPTIVE_ICON_FOREGROUND_RATIO = 0.80
SPLASH_SYMBOL_CANVAS_RATIO = 0.336

DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}

SPLASHES = {
    "drawable-port-mdpi/splash.png": (320, 480),
    "drawable-port-hdpi/splash.png": (480, 800),
    "drawable-port-xhdpi/splash.png": (720, 1280),
    "drawable-port-xxhdpi/splash.png": (960, 1600),
    "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    "drawable-land-mdpi/splash.png": (480, 320),
    "drawable-land-hdpi/splash.png": (800, 480),
    "drawable-land-xhdpi/splash.png": (1280, 720),
    "drawable-land-xxhdpi/splash.png": (1600, 960),
    "drawable-land-xxxhdpi/splash.png": (1920, 1280),
    "drawable/splash.png": (480, 320),
}


def resize(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    return source.resize(size, Image.Resampling.LANCZOS)


def save(image: Image.Image, relative_path: str) -> None:
    output = ANDROID_RES / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


def generate_launcher_icons(app_icon: Image.Image, symbol: Image.Image) -> None:
    for density, scale in DENSITIES.items():
        legacy_size = round(48 * scale)
        foreground_canvas_size = round(108 * scale)
        foreground_symbol_size = round(
            foreground_canvas_size * ADAPTIVE_ICON_FOREGROUND_RATIO
        )

        legacy = resize(app_icon, (legacy_size, legacy_size)).convert("RGB")
        save(legacy, f"mipmap-{density}/ic_launcher.png")
        save(legacy, f"mipmap-{density}/ic_launcher_round.png")

        foreground = Image.new(
            "RGBA",
            (foreground_canvas_size, foreground_canvas_size),
            (0, 0, 0, 0),
        )
        rendered_symbol = resize(
            symbol,
            (foreground_symbol_size, foreground_symbol_size),
        )
        foreground_offset = (
            (foreground_canvas_size - foreground_symbol_size) // 2,
            (foreground_canvas_size - foreground_symbol_size) // 2,
        )
        foreground.paste(rendered_symbol, foreground_offset, rendered_symbol)
        save(foreground, f"mipmap-{density}/ic_launcher_foreground.png")


def generate_launch_logo(symbol: Image.Image) -> None:
    for density, scale in DENSITIES.items():
        size = round(192 * scale)
        save(resize(symbol, (size, size)), f"drawable-{density}/splash_logo.png")


def generate_splashes(symbol: Image.Image) -> None:
    for relative_path, (width, height) in SPLASHES.items():
        canvas = Image.new("RGB", (width, height), MIDNIGHT)
        symbol_size = round(min(width, height) * SPLASH_SYMBOL_CANVAS_RATIO)
        rendered = resize(symbol, (symbol_size, symbol_size))
        position = ((width - symbol_size) // 2, (height - symbol_size) // 2)
        canvas.paste(rendered, position, rendered)
        save(canvas, relative_path)


def main() -> None:
    app_icon_path = LOCKED / "pwa/rewireperform-app-icon-512.png"
    symbol_path = LOCKED / "web/rewireperform-symbol-dark-background-512.png"

    with Image.open(app_icon_path).convert("RGB") as app_icon, Image.open(
        symbol_path
    ).convert("RGBA") as symbol:
        generate_launcher_icons(app_icon, symbol)
        generate_launch_logo(symbol)
        generate_splashes(symbol)

    print("Generated Android assets from locked RewirePerform logo exports.")


if __name__ == "__main__":
    main()
