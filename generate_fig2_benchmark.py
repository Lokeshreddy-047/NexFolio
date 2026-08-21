import os
from PIL import Image, ImageDraw, ImageFont

def generate_benchmark_figures():
    themes = [
        ("dark", (15, 23, 42), (30, 41, 59), (248, 250, 252), (148, 163, 184), (56, 189, 248), (51, 65, 85), "d:/nexfolio/fig2_benchmark_tradeoff.png"),
        ("light", (255, 255, 255), (248, 250, 252), (15, 23, 42), (71, 85, 105), (79, 70, 229), (203, 213, 225), "d:/nexfolio/fig2_benchmark_tradeoff_light.png")
    ]

    width, height = 1000, 720

    models = [
        {
            "name": "Logistic Regression (Linear Baseline)",
            "acc_text": "78.5% Accuracy",
            "acc_val": 0.785,
            "latency": "Latency: ~0.2 ms",
            "xai": "Explainable (Linear Only)",
            "xai_badge_color": (59, 130, 246),
            "summary": "Fails complex non-linear financial interactions & volatility spikes.",
            "border_color": (148, 163, 184)
        },
        {
            "name": "Deep CNN-LSTM (Base Paper Model)",
            "acc_text": "84.0% Accuracy",
            "acc_val": 0.840,
            "latency": "Latency: ~45.0 ms (Slow)",
            "xai": "Black-Box (Uninterpretable)",
            "xai_badge_color": (220, 38, 38),
            "summary": "High analytical compute latency with zero local feature transparency.",
            "border_color": (239, 68, 68)
        },
        {
            "name": "NexFolio: XGBoost + TreeSHAP (Proposed)",
            "acc_text": "97.0% Accuracy [Champion]",
            "acc_val": 0.970,
            "latency": "Latency: ~0.9 ms (Sub-second)",
            "xai": "Exact Game-Theoretic SHAP",
            "xai_badge_color": (16, 185, 129),
            "summary": "Dual L1/L2 Regularization + Instant local game-theoretic risk drivers.",
            "border_color": (16, 185, 129)
        }
    ]

    for theme_name, bg_col, card_col, text_col, sub_col, header_col, border_col, out_file in themes:
        img = Image.new("RGBA", (width, height), bg_col)
        draw = ImageDraw.Draw(img)

        try:
            font_title = ImageFont.truetype("arialbd.ttf", 22)
            font_sub = ImageFont.truetype("arial.ttf", 15)
            font_card_title = ImageFont.truetype("arialbd.ttf", 18)
            font_stat = ImageFont.truetype("arialbd.ttf", 14)
            font_desc = ImageFont.truetype("arial.ttf", 14)
            font_badge = ImageFont.truetype("arialbd.ttf", 12)
            font_caption = ImageFont.truetype("ariali.ttf", 15)
        except:
            font_title = font_sub = font_card_title = font_stat = font_desc = font_badge = font_caption = ImageFont.load_default()

        # Header Title
        draw.text((width // 2, 40), "MODEL BENCHMARK & TRADE-OFF MATRIX", fill=header_col, font=font_title, anchor="mm")
        draw.text((width // 2, 70), "Accuracy vs. Latency vs. Game-Theoretic Explainability", fill=sub_col, font=font_sub, anchor="mm")

        card_w, card_h = 900, 165
        card_x = (width - card_w) // 2
        start_y = 110
        spacing = 185

        for i, m in enumerate(models):
            y = start_y + i * spacing

            is_champion = (i == 2)
            current_card_bg = (236, 253, 245) if (is_champion and theme_name == "light") else ((6, 78, 59) if (is_champion and theme_name == "dark") else card_col)
            current_border = m["border_color"] if is_champion else border_col

            draw.rounded_rectangle([card_x, y, card_x + card_w, y + card_h], radius=14, fill=current_card_bg, outline=current_border, width=2 if not is_champion else 3)

            # Row 1: Model Name (Left) + Explainability Badge (Right)
            draw.text((card_x + 25, y + 28), m["name"], fill=text_col, font=font_card_title, anchor="lm")

            badge_w, badge_h = 220, 28
            bx = card_x + card_w - badge_w - 25
            by = y + 15
            draw.rounded_rectangle([bx, by, bx + badge_w, by + badge_h], radius=6, fill=m["xai_badge_color"])
            draw.text((bx + badge_w // 2, by + badge_h // 2), m["xai"], fill=(255, 255, 255), font=font_badge, anchor="mm")

            # Row 2: Accuracy Progress Bar + Accuracy Stat + Latency Stat (Spaced without overlap)
            bar_x = card_x + 25
            bar_y = y + 68
            bar_w = 400
            bar_h = 16
            draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=8, fill=(203, 213, 225) if theme_name == "light" else (51, 65, 85))

            fill_w = int(bar_w * m["acc_val"])
            draw.rounded_rectangle([bar_x, bar_y, bar_x + fill_w, bar_y + bar_h], radius=8, fill=m["xai_badge_color"])

            # Accuracy Text (Placed right next to the bar)
            draw.text((bar_x + bar_w + 20, bar_y + 8), m["acc_text"], fill=text_col, font=font_stat, anchor="lm")

            # Latency Text (Placed towards the right edge)
            draw.text((card_x + card_w - 240, bar_y + 8), m["latency"], fill=header_col if is_champion else sub_col, font=font_stat, anchor="lm")

            # Row 3: Summary / Key Trade-Off Verdict
            draw.text((card_x + 25, y + 125), m["summary"], fill=sub_col if not is_champion else text_col, font=font_desc, anchor="lm")

        # Bottom Caption
        draw.text((width // 2, height - 30), "Fig 2: Accuracy vs. Explainability Benchmark", fill=sub_col, font=font_caption, anchor="mm")

        img.save(out_file)
        print(f"Generated cleanly spaced benchmark figure: {out_file}")

if __name__ == "__main__":
    generate_benchmark_figures()
