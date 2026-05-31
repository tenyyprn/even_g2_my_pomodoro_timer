#!/usr/bin/env python3
"""Generate 576x288 glasses-HUD screenshot mockups for the Even Hub portal.

Mirrors the on-glasses layout produced by src/main.ts -> glassesContent():
    <phase>   <dots>

    MM:SS

    <hint>
The G2 display is 4-bit greyscale rendered as green on black, single font.
"""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 576, 288
BG = (0, 0, 0)
GREEN_BRIGHT = (0, 255, 0)
GREEN_MED = (0, 200, 0)
GREEN_DIM = (70, 140, 70)

FONT_PATH = "C:\\Windows\\Fonts\\msgothic.ttc"
FALLBACK = "C:\\Windows\\Fonts\\arial.ttf"


def font(size):
    for path in (FONT_PATH, FALLBACK):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


F_PHASE = font(30)
F_TIME = font(120)
F_HINT = font(22)


def center_x(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return (W - (box[2] - box[0])) // 2 - box[0]


def create(filename, phase, dots, mmss, hint):
    img = Image.new("RGB", (W, H), color=BG)
    draw = ImageDraw.Draw(img)

    # Phase + cycle dots (top)
    top = f"{phase}   {dots}"
    draw.text((center_x(draw, top, F_PHASE), 24), top, fill=GREEN_MED, font=F_PHASE)

    # Big countdown (center)
    draw.text((center_x(draw, mmss, F_TIME), 88), mmss, fill=GREEN_BRIGHT, font=F_TIME)

    # Hint (bottom)
    draw.text((center_x(draw, hint, F_HINT), 244), hint, fill=GREEN_DIM, font=F_HINT)

    img.save(filename)
    print(f"[OK] {filename}")


os.makedirs("screenshots", exist_ok=True)

create("screenshots/work_running.png", "作業", "●○○○", "24:59", "タップで一時停止")
create("screenshots/work_paused.png", "作業（停止中）", "●●○○", "25:00", "タップで開始")
create("screenshots/short_break.png", "休憩", "●●○○", "04:30", "タップで一時停止")
create("screenshots/long_break.png", "長休憩", "●●●●", "15:00", "上スワイプでスキップ")

print("\n[OK] screenshots/ に4枚生成 (576x288, Even Hub ポータル用)")
