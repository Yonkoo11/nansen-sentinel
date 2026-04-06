#!/usr/bin/env python3
"""Composite captions onto frames. Font: Helvetica Neue 32px, semi-transparent box."""
from PIL import Image, ImageDraw, ImageFont
import os, textwrap

FRAMES_DIR = "video/frames"
COMPOSITES_DIR = "video/composites"
os.makedirs(COMPOSITES_DIR, exist_ok=True)

# Captions — VERBATIM match to audio
captions = {
    "01-hero": "Nansen Sentinel. Real-time smart money intelligence.\nRight now, labeled wallets are net short twenty million\ndollars on Bitcoin. Four traders. Eighteen short trades.",
    "02-expand": "Click any row to see who's behind it.\nThese are Nansen's labeled wallets. Names, positions,\ndollar amounts. Not aggregates from an API. Individual trades.",
    "03-alerts": "The scoring engine cross-references four signals.\nNetflow dumps. Perp shorts. DEX sells. Exchange inflows.\nWhen multiple signals fire on the same token.\nThat's a high-confidence warning.",
    "04-drift": "Case study. The Drift Protocol hack on April first.\nNinety-two percent TVL drop.\nTwenty-three million dollars gone in hours.\nWe ran Nansen's data through the engine.",
    "05-findings": "Custody vaults lost thirty million tokens.\nBybit hot wallet gained twenty-eight million.\nWintermute sold a hundred and fifty-five K.\nBut here's the honest part. All of this happened\nafter the crash. Not before.",
    "06-methodology": "Sixty-five API calls. Nine endpoint types. Three chains.\nSolana, Ethereum, Base. Zero percent false positive\nrate on Solana. Two percent on Ethereum.\nNansen Sentinel.",
}

# Find font
font_candidates = [
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSText.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
font_path = None
for fp in font_candidates:
    if os.path.exists(fp):
        font_path = fp
        break

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

    # Semi-transparent box
    draw.rounded_rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        radius=12,
        fill=(0, 0, 0, 140),
    )

    # Text
    y = box_y + padding
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        tx = box_x + (box_w - tw) // 2
        draw.text((tx, y), line, font=font, fill=(255, 255, 255, 240))
        y += line_height

    result = Image.alpha_composite(img, overlay).convert("RGB")
    out_path = os.path.join(COMPOSITES_DIR, f"{clip}.png")
    result.save(out_path)
    print(f"OK   {clip}")

print("Captions composited.")
