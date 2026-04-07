#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

FRAMES_DIR = "video/frames"
COMPOSITES_DIR = "video/composites"
os.makedirs(COMPOSITES_DIR, exist_ok=True)

captions = {
    "01-hero": "This is Nansen Sentinel. It shows what smart money\nis doing right now on Hyperliquid perps.\nBTC for example. Four labeled wallets,\nnet short twenty million dollars.",
    "02-expand": "You can click into any of these to see the actual trades.\nWho opened what, how much, which direction.\nThese aren't aggregated numbers.\nEach row is a real trade from a Nansen-labeled wallet.",
    "03-alerts": "Under the hood there's a scoring engine\nwatching for four things at once.\nNetflow dumps, perp shorts, DEX sells, and exchange inflows.\nIf two or more line up on the same token,\nthe confidence goes up.",
    "04-drift-forensics": "We ran a full forensic analysis on the Drift Protocol hack.\nUsing Nansen's token holders and flows data,\nwe traced thirty million tokens out of custody vaults\nand twenty-eight million flowing into Bybit.\nForty consecutive sells that day. Not a single buy.",
    "05-methodology": "To make sure the signals aren't just noise,\nwe calibrated against fifty tokens per chain.\nSolana came back at zero false positives.\nEthereum at two percent.",
    "06-closer": "Sixty-five API calls across nine endpoints\nand three chains. All built on the Nansen CLI.\nThis is Nansen Sentinel.",
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

print("Done.")
