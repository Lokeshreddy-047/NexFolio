import os
from PIL import Image, ImageDraw, ImageFont

def generate_clean_fig1():
    themes = [
        ("dark", (15, 23, 42), (30, 41, 59), (248, 250, 252), (148, 163, 184), (56, 189, 248), "d:/nexfolio/fig1_architecture_flow.png"),
        ("light", (255, 255, 255), (248, 250, 252), (15, 23, 42), (71, 85, 105), (79, 70, 229), "d:/nexfolio/fig1_architecture_flow_light.png")
    ]

    steps = [
        ("1. Raw Financial Market Feeds", "OHLCV Ticks - NSE 500 Equities - Sector Indices - Upstox Stream", (59, 130, 246)),
        ("2. 36-Feature Quantitative Pipeline", "Momentum - Volatility - Downside Risk (Rf=6.5%) - Beta - 18 Sectors", (6, 182, 212)),
        ("3. Gradient Boosted Tree Classifier", "Champion XGBoost v1.2.0 - Dual L1/L2 Regularization - 97% Accuracy", (16, 185, 129)),
        ("4. Game-Theoretic Explainability", "TreeSHAP Local Attributions (phi_i) - Lundberg-Lee O(TLD^2) Time", (139, 92, 246)),
        ("5. 4-Pillar Health Scorecard & Sandbox", "0-100 Inspectable Formats - In-Memory Trade Delta Simulation", (245, 158, 11)),
        ("6. Statutory Tax Suite & Dual-Loop Engine", "Income-tax Act, 2025 - STCG 20% / LTCG 12.5% - <1ms Fast SSE Stream", (236, 72, 153))
    ]

    width, height = 1200, 1400

    for theme_name, bg_col, card_col, text_col, sub_col, arrow_col, out_file in themes:
        img = Image.new("RGBA", (width, height), bg_col)
        draw = ImageDraw.Draw(img)

        try:
            font_title = ImageFont.truetype("arialbd.ttf", 32)
            font_header = ImageFont.truetype("arialbd.ttf", 22)
            font_card_title = ImageFont.truetype("arialbd.ttf", 24)
            font_card_sub = ImageFont.truetype("arial.ttf", 18)
            font_caption = ImageFont.truetype("ariali.ttf", 19)
            font_num = ImageFont.truetype("arialbd.ttf", 26)
        except:
            font_title = font_header = font_card_title = font_card_sub = font_caption = font_num = ImageFont.load_default()

        # Titles
        draw.text((width // 2, 50), "PORTFOLIO RISK & INTELLIGENCE ARCHITECTURE FLOW", fill=arrow_col, font=font_title, anchor="mm")
        draw.text((width // 2, 95), "End-to-End Quantitative Machine Learning & Explainability Pipeline", fill=text_col, font=font_header, anchor="mm")

        card_w, card_h = 1040, 130
        card_x = (width - card_w) // 2
        start_y = 150
        spacing = 190

        for i, (title, subtitle, accent_color) in enumerate(steps):
            y = start_y + i * spacing
            draw.rounded_rectangle([card_x, y, card_x + card_w, y + card_h], radius=16, fill=card_col, outline=accent_color, width=3)

            badge_size = 70
            bx = card_x + 30
            by = y + (card_h - badge_size) // 2
            draw.rounded_rectangle([bx, by, bx + badge_size, by + badge_size], radius=14, fill=accent_color)
            draw.text((bx + badge_size // 2, by + badge_size // 2), str(i + 1), fill=(255, 255, 255), font=font_num, anchor="mm")

            draw.text((card_x + 130, y + 38), title, fill=text_col, font=font_card_title, anchor="lm")
            draw.text((card_x + 130, y + 85), subtitle, fill=sub_col, font=font_card_sub, anchor="lm")

            if i < len(steps) - 1:
                arrow_start_y = y + card_h + 10
                arrow_end_y = arrow_start_y + 40
                ax_center = width // 2
                draw.line([(ax_center, arrow_start_y), (ax_center, arrow_end_y)], fill=arrow_col, width=5)
                draw.polygon([
                    (ax_center, arrow_end_y + 12),
                    (ax_center - 12, arrow_end_y),
                    (ax_center + 12, arrow_end_y)
                ], fill=arrow_col)

        draw.text((width // 2, height - 40), "Fig 1: Quantitative Portfolio Intelligence Architecture", fill=sub_col, font=font_caption, anchor="mm")
        img.save(out_file)
        print(f"Generated clean Fig 1: {out_file}")

def generate_clean_fig2():
    themes = [
        ("dark", (15, 23, 42), (30, 41, 59), (248, 250, 252), (148, 163, 184), (56, 189, 248), (14, 116, 144), (51, 65, 85), "d:/nexfolio/fig2_shap_mechanism.png"),
        ("light", (255, 255, 255), (248, 250, 252), (15, 23, 42), (71, 85, 105), (79, 70, 229), (79, 70, 229), (203, 213, 225), "d:/nexfolio/fig2_shap_mechanism_light.png")
    ]

    width, height = 1200, 800

    for theme_name, bg_col, card_col, text_col, sub_col, header_col, center_col, border_col, out_file in themes:
        img = Image.new("RGBA", (width, height), bg_col)
        draw = ImageDraw.Draw(img)

        try:
            font_title = ImageFont.truetype("arialbd.ttf", 26)
            font_query = ImageFont.truetype("ariali.ttf", 22)
            font_center = ImageFont.truetype("arialbd.ttf", 24)
            font_node_title = ImageFont.truetype("arialbd.ttf", 17)
            font_node_val = ImageFont.truetype("arialbd.ttf", 15)
            font_bottom = ImageFont.truetype("arialbd.ttf", 20)
            font_caption = ImageFont.truetype("ariali.ttf", 16)
        except:
            font_title = font_query = font_center = font_node_title = font_node_val = font_bottom = font_caption = ImageFont.load_default()

        draw.text((width // 2, 45), "TreeSHAP Local Attribution for Contextual Risk", fill=header_col, font=font_title, anchor="mm")
        draw.text((width // 2, 85), "\"Why is the portfolio classified as HIGH Risk?\"", fill=text_col, font=font_query, anchor="mm")

        # Center Node
        cx, cy = width // 2, 280
        cw, ch = 240, 80
        draw.rounded_rectangle([cx - cw//2, cy - ch//2, cx + cw//2, cy + ch//2], radius=16, fill=center_col, outline=(255, 255, 255) if theme_name=="dark" else header_col, width=2)
        draw.text((cx, cy - 12), "PREDICTED RISK", fill=(224, 231, 255), font=font_node_val, anchor="mm")
        draw.text((cx, cy + 14), "HIGH RISK", fill=(255, 255, 255), font=font_center, anchor="mm")

        # Nodes (No broken emojis or unicode symbols)
        nodes = [
            ("Annualized Volatility (24.5%)", "phi = +0.428", "VERY HIGH IMPACT [CRITICAL]", (220, 38, 38), (220, 180)),
            ("Portfolio Beta (1.34)", "phi = +0.384", "HIGH IMPACT", (234, 88, 12), (220, 380)),
            ("Maximum Drawdown (-28%)", "phi = +0.312", "HIGH IMPACT", (234, 88, 12), (220, 280)),

            ("Sharpe Ratio (1.65)", "phi = -0.265", "MITIGATING [LOW RISK]", (16, 185, 129), (980, 180)),
            ("IT Sector Weight (42.5%)", "phi = +0.210", "MODERATE RISK", (217, 119, 6), (980, 280)),
            ("Asset Count (18 Equities)", "phi = -0.138", "DIVERSIFYING OFFSET", (6, 182, 212), (980, 380)),
        ]

        nw, nh = 310, 68

        for title, val_str, badge_text, badge_col, (nx, ny) in nodes:
            draw.rounded_rectangle([nx - nw//2, ny - nh//2, nx + nw//2, ny + nh//2], radius=12, fill=card_col, outline=border_col, width=2)
            draw.text((nx, ny - 14), title, fill=text_col, font=font_node_title, anchor="mm")

            bw, bh = 220, 24
            bx, by = nx, ny + 15
            draw.rounded_rectangle([bx - bw//2, by - bh//2, bx + bw//2, by + bh//2], radius=6, fill=badge_col)
            draw.text((bx, by), f"{val_str}  |  {badge_text}", fill=(255, 255, 255), font=font_node_val, anchor="mm")

            if nx < cx:
                start_pt = (nx + nw//2, ny)
                end_pt = (cx - cw//2, cy)
            else:
                start_pt = (nx - nw//2, ny)
                end_pt = (cx + cw//2, cy)

            draw.line([start_pt, end_pt], fill=badge_col, width=3)
            draw.ellipse([start_pt[0]-4, start_pt[1]-4, start_pt[0]+4, start_pt[1]+4], fill=badge_col)

        # Bottom Formula & Summary Card
        bot_y = 520
        draw.rounded_rectangle([120, bot_y, width - 120, bot_y + 180], radius=16, fill=card_col, outline=border_col, width=2)
        draw.text((width // 2, bot_y + 38), "Risk Score(x) = Base_Risk + Sum( phi_i )", fill=header_col, font=font_bottom, anchor="mm")
        draw.text((width // 2, bot_y + 88), "Strong positive push from: \"Volatility\" + \"Portfolio Beta\"", fill=text_col, font=font_bottom, anchor="mm")
        draw.text((width // 2, bot_y + 135), "Risk mitigating offsets from: \"Sharpe Ratio\" + \"Diversified Asset Count\"", fill=sub_col, font=font_node_title, anchor="mm")

        draw.text((width // 2, height - 35), "Fig 2: TreeSHAP Feature Attribution for Contextual Risk Resolution", fill=sub_col, font=font_caption, anchor="mm")
        img.save(out_file)
        print(f"Generated clean Fig 2: {out_file}")

if __name__ == "__main__":
    generate_clean_fig1()
    generate_clean_fig2()
