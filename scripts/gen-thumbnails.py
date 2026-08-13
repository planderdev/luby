# 루비AI 데모 캠페인 썸네일 16종 생성 — 모노톤+핑크 디자인 언어
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.join(os.path.dirname(__file__), "thumbs")
os.makedirs(OUT, exist_ok=True)

W, H = 1280, 720
PINK = (244, 63, 142)
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

INDUSTRIES = [
    ("cafe", "카페 · 디저트", "☕"),
    ("dining", "맛집 · 외식", "🍽"),
    ("beauty", "뷰티 · 코스메틱", "💄"),
    ("fashion", "패션 · 의류", "👗"),
    ("stay", "여행 · 숙박", "🌊"),
    ("fitness", "헬스 · 피트니스", "💪"),
    ("clinic", "뷰티 클리닉", "✨"),
    ("class", "교육 · 클래스", "📚"),
    ("living", "리빙 · 인테리어", "🛋"),
    ("pet", "반려동물", "🐾"),
    ("kids", "베이비 · 키즈", "🧸"),
    ("tech", "테크 · 가전", "🎧"),
    ("culture", "문화 · 전시", "🎨"),
    ("wedding", "웨딩 · 스튜디오", "💍"),
    ("mobility", "자동차 · 모빌리티", "🚗"),
    ("food", "식품 · 이커머스", "🍎"),
]

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

for idx, (slug, label, _emoji) in enumerate(INDUSTRIES):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img, "RGBA")

    # 대각 그라디언트 배경 (업종마다 톤 미세 변화)
    base_dark = (12 + (idx % 4) * 2, 11, 14 + (idx % 3) * 2)
    base_light = (30 + (idx % 5) * 3, 26, 34 + (idx % 4) * 3)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=lerp(base_dark, base_light, t))

    # 핑크 글로우 원 (업종별 위치 변화)
    cx = 200 + (idx * 137) % 880
    cy = 140 + (idx * 211) % 440
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(280, 0, -6):
        alpha = int(3 + (280 - r) * 0.10)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*PINK, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(img, "RGBA")

    # 은은한 그리드 라인 (sentient 레퍼런스 무드)
    for gx in range(0, W, 160):
        d.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 10))
    for gy in range(0, H, 160):
        d.line([(0, gy), (W, gy)], fill=(255, 255, 255, 10))

    # 핑크 액센트 바
    d.rounded_rectangle([64, H - 214, 64 + 56, H - 206], radius=4, fill=PINK)

    # 업종 라벨
    font_big = ImageFont.truetype(FONT, 72, index=2)
    font_small = ImageFont.truetype(FONT, 30, index=1)
    d.text((64, H - 186), label, font=font_big, fill=(255, 255, 255))
    d.text((64, H - 92), "루비AI 체험단 캠페인", font=font_small, fill=(163, 163, 163))

    # 우상단 로고 타입
    font_logo = ImageFont.truetype(FONT, 34, index=3)
    logo = "Ruby AI"
    lw = d.textlength(logo, font=font_logo)
    d.text((W - 64 - lw, 56), logo, font=font_logo, fill=(229, 229, 229))
    d.ellipse([W - 64 - lw - 26, 66, W - 64 - lw - 12, 80], fill=PINK)

    img.save(os.path.join(OUT, f"{slug}.png"), optimize=True)
    print(slug, "OK")

print("완료:", len(INDUSTRIES), "장")
