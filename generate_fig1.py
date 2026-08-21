import os
from PIL import Image, ImageDraw, ImageFont

def create_flowchart(theme="light"):
    width, height = 1200, 1400
    
    if theme == "dark":
        bg_color = (15, 23, 42)        # Slate 900
        card_bg = (30, 41, 59)         # Slate 800
        text_main = (248, 250, 252)    # Slate 50
        text_sub = (148, 163, 184)     # Slate 400
        header_color = (56, 189, 248)  # Cyan 400
        arrow_color = (56, 189, 248)
        out_file = "d:/nexfolio/fig1_architecture_flow.png"
    else:
        bg_color = (255, 255, 255)     # White
        card_bg = (248, 250, 252)      # Slate 50
        text_main = (15, 23, 42)       # Slate 900
        text_sub = (71, 85, 105)       # Slate 600
        header_color = (79, 70, 229)   # Indigo 600
        arrow_color = (79, 70, 229)
        out_file = "d:/nexfolio/fig1_architecture_flow_light.png"

    img = Image.new("RGBA", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Try loading system font or fallback
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 34)
        font_header = ImageFont.truetype("arialbd.ttf", 26)
        font_card_title = ImageFont.truetype("arialbd.ttf", 24)
        font_card_sub = ImageFont.truetype("arial.ttf", 18)
        font_caption = ImageFont.truetype("ariali.ttf", 20)
        font_num = ImageFont.truetype("arialbd.ttf", 26)
    except:
        font_title = font_header = font_card_title = font_card_sub = font_caption = font_num = ImageFont.load_default()

    # Draw Main Title
    draw.text((width // 2, 50), "PORTFOLIO RISK & INTELLIGENCE ARCHITECTURE FLOW", fill=header_color, font=font_title, anchor="mm")
    draw.text((width // 2, 95), "End-to-End Quantitative Machine Learning & Explainability Pipeline", fill=text_main, font=font_header, anchor="mm")

    steps = [
        ("1. Raw Financial Market Feeds", "OHLCV Ticks · NSE 500 Equities · Sector Indices · Upstox Live Stream", (59, 130, 246)),
        ("2. 36-Feature Quantitative Pipeline", "Momentum · Volatility · Downside Risk (Rf=6.5%) · Beta · 18 Sector Allocations", (6, 182, 212)),
        ("3. Gradient Boosted Tree Classifier", "Champion XGBoost v1.2.0 · Dual L1/L2 Regularization · 97% Accuracy", (16, 185, 129)),
        ("4. Game-Theoretic Explainability", "TreeSHAP Local Attributions (phi_i) · Lundberg-Lee O(TLD^2) Polynomial Time", (139, 92, 246)),
        ("5. 4-Pillar Health Scorecard & Sandbox", "0-100 Inspectable Formats · In-Memory Trade Delta Simulation", (245, 158, 11)),
        ("6. Statutory Tax Suite & Dual-Loop Engine", "Income-tax Act, 2025 · STCG 20% / LTCG 12.5% · <1ms Fast SSE Stream", (236, 72, 153))
    ]

    card_w, card_h = 1040, 130
    card_x = (width - card_w) // 2
    start_y = 150
    spacing = 190

    for i, (title, subtitle, accent_color) in enumerate(steps):
        y = start_y + i * spacing

        # Draw card rounded rectangle
        draw.rounded_rectangle([card_x, y, card_x + card_w, y + card_h], radius=16, fill=card_bg, outline=accent_color, width=3)

        # Draw number badge
        badge_size = 70
        bx = card_x + 30
        by = y + (card_h - badge_size) // 2
        draw.rounded_rectangle([bx, by, bx + badge_size, by + badge_size], radius=14, fill=accent_color)
        draw.text((bx + badge_size // 2, by + badge_size // 2), str(i + 1), fill=(255, 255, 255), font=font_num, anchor="mm")

        # Draw Title
        draw.text((card_x + 130, y + 38), title, fill=text_main, font=font_card_title, anchor="lm")

        # Draw Subtitle
        draw.text((card_x + 130, y + 85), subtitle, fill=text_sub, font=font_card_sub, anchor="lm")

        # Draw Arrow down
        if i < len(steps) - 1:
            arrow_start_y = y + card_h + 10
            arrow_end_y = arrow_start_y + 40
            ax_center = width // 2
            
            # Line
            draw.line([(ax_center, arrow_start_y), (ax_center, arrow_end_y)], fill=arrow_color, width=5)
            # Arrow head
            draw.polygon([
                (ax_center, arrow_end_y + 12),
                (ax_center - 12, arrow_end_y),
                (ax_center + 12, arrow_end_y)
            ], fill=arrow_color)

    # Caption at bottom
    draw.text((width // 2, height - 40), "Fig 1: Quantitative Portfolio Intelligence Architecture", fill=text_sub, font=font_caption, anchor="mm")

    img.save(out_file)
    print(f"Flowchart generated: {out_file}")

if __name__ == "__main__":
    create_flowchart("dark")
    create_flowchart("light")
