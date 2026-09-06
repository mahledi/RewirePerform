#!/usr/bin/env python3
"""Generate the locked RewirePerform logo variants and raster exports."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "design/brand/logo-finalization-20260718/final"
SOCIAL_SHARE_DIR = ROOT / "design/brand/social-share-v2"
MASTER_DIR = KIT / "master"
EXPORT_DIR = KIT / "exports"
MASTER = MASTER_DIR / "rewireperform-symbol-v1.svg"

GREEN = "#2EAD89"
OFF_WHITE = "#EEF0F2"
MIDNIGHT = "#0D0E12"


def brand_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf" if not bold else "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def make_variants() -> dict[str, Path]:
    source = MASTER.read_text(encoding="utf-8")
    app_icon = source.replace(
        "  <g transform=",
        f'  <rect width="1024" height="1024" fill="{MIDNIGHT}"/>\n  <g transform=',
        1,
    )
    variants = {
        "primary": MASTER,
        "app_icon": MASTER_DIR / "rewireperform-app-icon-v1.svg",
        "light_background": MASTER_DIR / "rewireperform-symbol-light-background-v1.svg",
        "white": MASTER_DIR / "rewireperform-symbol-white-v1.svg",
        "midnight": MASTER_DIR / "rewireperform-symbol-midnight-v1.svg",
        "green": MASTER_DIR / "rewireperform-symbol-green-v1.svg",
    }
    write_text(variants["app_icon"], app_icon)
    write_text(variants["light_background"], source.replace(OFF_WHITE, MIDNIGHT))
    write_text(variants["white"], source.replace(OFF_WHITE, "#FFFFFF").replace(GREEN, "#FFFFFF"))
    write_text(variants["midnight"], source.replace(OFF_WHITE, MIDNIGHT).replace(GREEN, MIDNIGHT))
    write_text(variants["green"], source.replace(OFF_WHITE, GREEN))
    return variants


def render_svg(svg: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["sips", "-s", "format", "png", str(svg), "--out", str(output)],
        check=True,
        capture_output=True,
        text=True,
    )


def resize(source: Path, output: Path, size: int, rgb: bool = False) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        rendered = image.convert("RGB" if rgb else "RGBA")
        rendered = rendered.resize((size, size), Image.Resampling.LANCZOS)
        rendered.save(output, "PNG", optimize=True)


def create_preview(app_png: Path, dark_png: Path, light_png: Path, output: Path) -> None:
    canvas = Image.new("RGB", (1600, 1000), (8, 10, 13))
    draw = ImageDraw.Draw(canvas)
    try:
        heading = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 46)
        body = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 25)
    except OSError:
        heading = ImageFont.load_default()
        body = ImageFont.load_default()

    draw.text((80, 58), "RewirePerform — locked logo v1.0", font=heading, fill=(238, 240, 242))
    draw.text((82, 124), "B2 Normal R · #2EAD89 · #EEF0F2 · #0D0E12", font=body, fill=(150, 160, 168))

    with Image.open(app_png).convert("RGB") as app:
        app = app.resize((520, 520), Image.Resampling.LANCZOS)
        canvas.paste(app, (80, 210))

    light_panel = Image.new("RGB", (520, 520), (246, 247, 248))
    with Image.open(light_png).convert("RGBA") as symbol:
        symbol = symbol.resize((520, 520), Image.Resampling.LANCZOS)
        light_panel.paste(symbol, (0, 0), symbol)
    canvas.paste(light_panel, (650, 210))

    draw.rounded_rectangle((1240, 210, 1518, 488), radius=42, fill=(13, 14, 18), outline=(50, 55, 62), width=2)
    with Image.open(dark_png).convert("RGBA") as symbol:
        symbol = symbol.resize((278, 278), Image.Resampling.LANCZOS)
        canvas.paste(symbol, (1240, 210), symbol)

    for size, x in ((180, 1240), (60, 1394), (29, 1480)):
        with Image.open(app_png).convert("RGB") as app:
            icon = app.resize((size, size), Image.Resampling.LANCZOS)
            canvas.paste(icon, (x, 610 + (180 - size)), None)
        draw.text((x, 820), f"{size}px", font=body, fill=(190, 196, 202))

    draw.text((80, 770), "App Store / dark surface", font=body, fill=(238, 240, 242))
    draw.text((650, 770), "Light surface", font=body, fill=(238, 240, 242))
    draw.text((1240, 540), "Small-size checks", font=body, fill=(238, 240, 242))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def create_splash(symbol_png: Path, output: Path) -> None:
    canvas = Image.new("RGB", (2732, 2732), MIDNIGHT)
    with Image.open(symbol_png).convert("RGBA") as symbol:
        symbol = symbol.resize((620, 620), Image.Resampling.LANCZOS)
        canvas.paste(symbol, ((canvas.width - 620) // 2, (canvas.height - 620) // 2), symbol)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def create_social_image(symbol_png: Path, output: Path) -> None:
    canvas = Image.new("RGB", (1200, 630), MIDNIGHT)
    draw = ImageDraw.Draw(canvas)
    heading = brand_font(66, bold=True)
    body = brand_font(30)

    with Image.open(symbol_png).convert("RGBA") as symbol:
        symbol = symbol.resize((250, 250), Image.Resampling.LANCZOS)
        canvas.paste(symbol, (86, 190), symbol)

    draw.text((392, 196), "RewirePerform", font=heading, fill=OFF_WHITE)
    draw.rectangle((394, 296, 526, 304), fill=GREEN)
    draw.text((392, 340), "Mentale Performance für Sportler.", font=body, fill=(190, 198, 202))
    draw.text((392, 389), "Klar aufgebaut. Täglich trainierbar.", font=body, fill=(190, 198, 202))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def create_invitation_social_image(symbol_png: Path, output: Path) -> None:
    canvas = Image.new("RGB", (1200, 1500), MIDNIGHT)
    draw = ImageDraw.Draw(canvas)
    heading = brand_font(82, bold=True)
    body = brand_font(38)

    with Image.open(symbol_png).convert("RGBA") as symbol:
        symbol = symbol.resize((330, 330), Image.Resampling.LANCZOS)
        canvas.paste(symbol, (435, 250), symbol)

    brand_text = "RewirePerform"
    brand_box = draw.textbbox((0, 0), brand_text, font=heading)
    brand_width = brand_box[2] - brand_box[0]
    draw.text(((canvas.width - brand_width) // 2, 650), brand_text, font=heading, fill=OFF_WHITE)
    draw.rounded_rectangle((480, 785, 720, 797), radius=6, fill=GREEN)

    line_one = "Deine Einladung."
    line_two = "Ein klarer Weg in dein Team."
    for text, y in ((line_one, 865), (line_two, 925)):
        box = draw.textbbox((0, 0), text, font=body)
        width = box[2] - box[0]
        draw.text(((canvas.width - width) // 2, y), text, font=body, fill=(190, 198, 202))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def create_role_invitation_social_image(symbol_png: Path, output: Path, audience: str) -> None:
    canvas = Image.new("RGB", (1200, 630), MIDNIGHT)
    draw = ImageDraw.Draw(canvas)
    brand = brand_font(48, bold=True)
    eyebrow = brand_font(19, bold=True)
    heading = brand_font(55, bold=True)
    body = brand_font(24)
    card_heading = brand_font(20, bold=True)
    card_body = brand_font(19)

    with Image.open(symbol_png).convert("RGBA") as symbol:
        symbol = symbol.resize((132, 132), Image.Resampling.LANCZOS)
        canvas.paste(symbol, (58, 42), symbol)

    draw.text((192, 72), "RewirePerform", font=brand, fill=OFF_WHITE)
    draw.rounded_rectangle((62, 205, 318, 244), radius=19, fill=(31, 54, 50), outline=GREEN, width=2)
    invite_label = "CO-COACH-EINLADUNG" if audience == "coach" else "TEAM-EINLADUNG"
    draw.text((83, 214), invite_label, font=eyebrow, fill=GREEN)

    draw.text((62, 278), "Mentale Performance.", font=heading, fill=OFF_WHITE)
    draw.text((62, 343), "Im Team trainierbar.", font=heading, fill=OFF_WHITE)
    description = (
        "Dein persönlicher Zugang zum Coach-System."
        if audience == "coach"
        else "Dein persönlicher Zugang zum mentalen Training."
    )
    draw.text((65, 430), description, font=body, fill=(190, 198, 202))
    draw.rounded_rectangle((65, 492, 462, 547), radius=17, fill=GREEN)
    action = "Coach-Einführung starten" if audience == "coach" else "Team-Einladung öffnen"
    draw.text((90, 508), action, font=card_heading, fill=MIDNIGHT)

    draw.rounded_rectangle((820, 128, 1136, 538), radius=32, fill=(20, 23, 28), outline=(58, 65, 72), width=2)
    draw.ellipse((856, 170, 900, 214), fill=GREEN)
    panel_title = "COACH-SYSTEM" if audience == "coach" else "DEIN TRAINING"
    draw.text((920, 178), panel_title, font=card_heading, fill=OFF_WHITE)
    rows = (
        ("Aktivität", "Team im Blick"),
        ("Entwicklung", "Klar strukturiert"),
        ("Coach-Team", "Sicher verbunden"),
    ) if audience == "coach" else (
        ("Fokus", "Täglich trainierbar"),
        ("Druck", "Klar regulieren"),
        ("Team", "Direkt verbunden"),
    )
    row_y = 254
    for label, value in rows:
        draw.rounded_rectangle((854, row_y, 1102, row_y + 70), radius=16, fill=(30, 34, 40))
        draw.text((875, row_y + 12), label, font=card_heading, fill=OFF_WHITE)
        draw.text((875, row_y + 40), value, font=card_body, fill=(154, 164, 172))
        row_y += 86

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def generate_manifest(paths: list[Path]) -> None:
    records = []
    for path in sorted(set(paths)):
        if not path.is_file():
            continue
        record = {
            "path": path.relative_to(KIT).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
        if path.suffix.lower() == ".png":
            with Image.open(path) as image:
                record.update({"width": image.width, "height": image.height, "mode": image.mode})
        records.append(record)
    manifest = {
        "brand": "RewirePerform",
        "logo_version": "1.0.0",
        "status": "LOCKED",
        "generated_at": "2026-07-18",
        "assets": records,
    }
    write_text(KIT / "manifest.json", json.dumps(manifest, indent=2) + "\n")


def create_zip() -> Path:
    output = KIT / "rewireperform-logo-kit-v1.zip"
    included_roots = [MASTER_DIR, EXPORT_DIR]
    included_files = [KIT / "README.md", KIT / "AGENT_HANDOFF.md", KIT / "brand-lock.json", KIT / "manifest.json"]
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for root in included_roots:
            for path in sorted(root.rglob("*")):
                if path.is_file():
                    archive.write(path, Path("rewireperform-logo-kit-v1") / path.relative_to(KIT))
        for path in included_files:
            archive.write(path, Path("rewireperform-logo-kit-v1") / path.relative_to(KIT))
    return output


def main() -> None:
    variants = make_variants()
    generated: list[Path] = list(variants.values())

    with tempfile.TemporaryDirectory(prefix="rewireperform-logo-") as temp:
        temp_dir = Path(temp)
        app_render = temp_dir / "app.png"
        dark_render = temp_dir / "dark.png"
        light_render = temp_dir / "light.png"
        render_svg(variants["app_icon"], app_render)
        render_svg(variants["primary"], dark_render)
        render_svg(variants["light_background"], light_render)

        targets = [
            (app_render, EXPORT_DIR / "app-store/rewireperform-app-icon-1024.png", 1024, True),
            (app_render, EXPORT_DIR / "pwa/rewireperform-app-icon-512.png", 512, True),
            (app_render, EXPORT_DIR / "pwa/rewireperform-app-icon-192.png", 192, True),
            (app_render, EXPORT_DIR / "apple/rewireperform-apple-touch-icon-180.png", 180, True),
            (app_render, EXPORT_DIR / "web/rewireperform-favicon-64.png", 64, True),
            (app_render, EXPORT_DIR / "web/rewireperform-favicon-32.png", 32, True),
            (dark_render, EXPORT_DIR / "web/rewireperform-symbol-dark-background-512.png", 512, False),
            (light_render, EXPORT_DIR / "web/rewireperform-symbol-light-background-512.png", 512, False),
            (dark_render, EXPORT_DIR / "email/rewireperform-email-dark-background-256.png", 256, False),
            (light_render, EXPORT_DIR / "email/rewireperform-email-light-background-256.png", 256, False),
        ]
        for source, output, size, rgb in targets:
            resize(source, output, size, rgb)
            generated.append(output)

        preview = KIT / "preview/rewireperform-logo-delivery-sheet.png"
        create_preview(app_render, dark_render, light_render, preview)
        generated.append(preview)

    app_1024 = EXPORT_DIR / "app-store/rewireperform-app-icon-1024.png"
    app_512 = EXPORT_DIR / "pwa/rewireperform-app-icon-512.png"
    app_192 = EXPORT_DIR / "pwa/rewireperform-app-icon-192.png"
    apple_180 = EXPORT_DIR / "apple/rewireperform-apple-touch-icon-180.png"
    favicon_32 = EXPORT_DIR / "web/rewireperform-favicon-32.png"
    favicon_64 = EXPORT_DIR / "web/rewireperform-favicon-64.png"
    dark_symbol_512 = EXPORT_DIR / "web/rewireperform-symbol-dark-background-512.png"
    light_symbol_512 = EXPORT_DIR / "web/rewireperform-symbol-light-background-512.png"
    email_dark_256 = EXPORT_DIR / "email/rewireperform-email-dark-background-256.png"
    email_light_256 = EXPORT_DIR / "email/rewireperform-email-light-background-256.png"
    integrations = {
        ROOT / "public/app-icon.png": app_1024,
        ROOT / "public/app-icon-512.png": app_512,
        ROOT / "public/app-icon-192.png": app_192,
        ROOT / "public/apple-touch-icon-180.png": apple_180,
        ROOT / "public/favicon-32.png": favicon_32,
        ROOT / "public/favicon-64.png": favicon_64,
        ROOT / "public/brand/rewireperform-symbol-dark.svg": variants["primary"],
        ROOT / "public/brand/rewireperform-symbol-light.svg": variants["light_background"],
        ROOT / "public/brand/rewireperform-symbol-dark-512.png": dark_symbol_512,
        ROOT / "public/brand/rewireperform-symbol-light-512.png": light_symbol_512,
        ROOT / "public/brand/rewireperform-email-dark-256.png": email_dark_256,
        ROOT / "public/brand/rewireperform-email-light-256.png": email_light_256,
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png": app_1024,
    }
    for destination, source in integrations.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    shutil.copyfile(SOCIAL_SHARE_DIR / "og-image.png", ROOT / "public/og-image.png")
    create_invitation_social_image(dark_symbol_512, ROOT / "public/og-invite.png")
    shutil.copyfile(SOCIAL_SHARE_DIR / "og-team-invite.png", ROOT / "public/og-team-invite.png")
    shutil.copyfile(SOCIAL_SHARE_DIR / "og-coach-invite.png", ROOT / "public/og-coach-invite.png")
    splash_targets = [
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png",
        ROOT / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png",
    ]
    for splash_target in splash_targets:
        create_splash(dark_symbol_512, splash_target)

    generate_manifest(generated)
    zip_path = create_zip()
    print(f"Generated locked logo kit: {KIT}")
    print(f"Handoff archive: {zip_path}")


if __name__ == "__main__":
    main()
