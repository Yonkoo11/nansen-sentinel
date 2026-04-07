#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

FRAMES_DIR = "video/frames"
COMPOSITES_DIR = "video/composites"
os.makedirs(COMPOSITES_DIR, exist_ok=True)

captions = {
    "04-drift-forensics": "Forensic case study. The Drift Protocol hack.\nWe traced thirty million tokens leaving custody vaults.\nTwenty-eight million flowing to Bybit.\nForty consecutive sells on April first. Zero buys.\nNansen's labels showed exactly who moved what. When.",
    "05-methodology": "Four signal types. Each weighted and scored.\nFalse positive rate. Zero percent on Solana.\nTwo percent on Ethereum.\nCalibrated against fifty tokens per chain.",
    "06-closer": "Sixty-five API calls. Nine endpoint types. Three chains.\nBuilt with the Nansen CLI.\nNansen Sentinel.",
}

font_candidates = [
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
font_path = next((fp for fp in font_candidates if os.path.exists(fp)), None)
font = ImageFont.truetype(font_path, 32) if font_path else ImageFont.load_default()

for clip, text in captions.items():
    frame_path = os.path.join(FRAMES_DIR, f"{clip}.png")
    if not os.path.exists(frame_path):
        print(f"SKIP {clip} (no frame)")
        continue

    img = Image.open(frame_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    lines = text.split("\n")
    line_height = 42
    padding = 20
    margin_x = 160
    total_text_height = len(lines) * line_height

    box_w = img.width - margin_x * 2
    box_h = total_text_height + padding * 2
    box_x = margin_x
    box_y = img.height - box_h - 60

    draw.rounded_rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        radius=12, fill=(0, 0, 0, 140),
    )

    y = box_y + padding
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        tx = box_x + (box_w - tw) // 2
        draw.text((tx, y), line, font=font, fill=(255, 255, 255, 240))
        y += line_height

    result = Image.alpha_composite(img, overlay).convert("RGB")
    result.save(os.path.join(COMPOSITES_DIR, f"{clip}.png"))
    print(f"OK   {clip}")

print("Captions composited.")
