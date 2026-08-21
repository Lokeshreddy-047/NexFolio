import os
from PIL import Image, ImageDraw, ImageFont

def create_fig2_shap_mechanism(theme="light"):
    width, height = 1200, 800
    
    if theme == "dark":
        bg_color = (15, 23, 42)        # Slate 900
        card_bg = (30, 41, 59)         # Slate 800
        text_main = (248, 250, 252)    # Slate 50
        text_sub = (148, 163, 184)     # Slate 400
        header_color = (56, 189, 248)  # Cyan 400
        center_node_bg = (14, 116, 144)# Cyan 700
        border_col = (51, 65, 85)
        out_file = "d:/nexfolio/fig2_shap_mechanism.png"
    else:
        bg_color = (255, 255, 255)     # White
        card_bg = (248, 250, 252)      # Slate 50
        text_main = (15, 23, 42)       # Slate 900
        text_sub = (71, 85, 105)       # Slate 600
        header_color = (79, 70, 229)   # Indigo 600
        center_node_bg = (79, 70, 229) # Indigo 600
        border_col = (203, 213, 225)
        out_file = "d:/nexfolio/fig2_shap_mechanism_light.png"

    img = Image.new("RGBA", (width, height), bg_color)
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

    # Subheading
    draw.text((width // 2, 45), "TreeSHAP Local Attribution for Contextual Risk", fill=header_color, font=font_title, anchor="mm")
    
    # Query Prompt at Top
    draw.text((width // 2, 85), '“Why is the portfolio classified as HIGH Risk?”', fill=text_main, font=font_query, anchor="mm")

    # Center Node (The Prediction "HIGH RISK")
    cx, cy = width // 2, 280
    cw, ch = 240, 80
    draw.rounded_rectangle([cx - cw//2, cy - ch//2, cx + cw//2, cy + ch//2], radius=16, fill=center_node_bg, outline=(255, 255, 255) if theme=="dark" else header_color, width=2)
    draw.text((cx, cy - 12), "PREDICTED RISK", fill=(224, 231, 255), font=ImageFont.truetype("arial.ttf", 13) if "arial.ttf" in locals() else font_node_val, anchor="mm")
    draw.text((cx, cy + 14), "HIGH RISK", fill=(255, 255, 255), font=font_center, anchor="mm")

    # Nodes around the center
    # Format: (Title, Sub/Val, Badge Text, Badge Color, (x, y), is_left_or_right)
    nodes = [
        # Top Left: Volatility (Very High Risk Impact)
        ("Annualized Volatility (24.5%)", "phi = +0.428", "VERY HIGH 🔴", (220, 38, 38), (220, 180)),
        # Bottom Left: Portfolio Beta (High Risk Impact)
        ("Portfolio Beta (1.34)", "phi = +0.384", "HIGH IMPACT 🟠", (234, 88, 12), (220, 380)),
        # Far Left: Max Drawdown (High Risk Impact)
        ("Maximum Drawdown (-28%)", "phi = +0.312", "HIGH IMPACT 🟠", (234, 88, 12), (220, 280)),

        # Top Right: Sharpe Ratio (Mitigating / Dampening)
        ("Sharpe Ratio (1.65)", "phi = -0.265", "MITIGATING 🟢", (16, 185, 129), (980, 180)),
        # Far Right: IT Sector Concentration (Risk Add)
        ("IT Sector Weight (42.5%)", "phi = +0.210", "MODERATE 🟡", (217, 119, 6), (980, 280)),
        # Bottom Right: Asset Count (Diversification Dampener)
        ("Asset Count (18 Equities)", "phi = -0.138", "DIVERSIFYING 🔵", (6, 182, 212), (980, 380)),
    ]

    nw, nh = 290, 68

    for title, val_str, badge_text, badge_col, (nx, ny) in nodes:
        # Draw node box
        draw.rounded_rectangle([nx - nw//2, ny - nh//2, nx + nw//2, ny + nh//2], radius=12, fill=card_bg, outline=border_col, width=2)
        
        # Draw Title
        draw.text((nx, ny - 14), title, fill=text_main, font=font_node_title, anchor="mm")
        
        # Draw Badge
        bw, bh = 180, 24
        bx, by = nx, ny + 15
        draw.rounded_rectangle([bx - bw//2, by - bh//2, bx + bw//2, by + bh//2], radius=6, fill=badge_col)
        draw.text((bx, by), f"{val_str}  ·  {badge_text}", fill=(255, 255, 255), font=font_node_val, anchor="mm")

        # Draw connecting line / arrow to center node
        if nx < cx:
            start_pt = (nx + nw//2, ny)
            end_pt = (cx - cw//2, cy)
        else:
            start_pt = (nx - nw//2, ny)
            end_pt = (cx + cw//2, cy)
            
        draw.line([start_pt, end_pt], fill=badge_col, width=3)
        # Small anchor circle at start
        draw.ellipse([start_pt[0]-4, start_pt[1]-4, start_pt[0]+4, start_pt[1]+4], fill=badge_col)

    # Bottom Takeaway Card
    bot_y = 520
    draw.rounded_rectangle([150, bot_y, width - 150, bot_y + 180], radius=16, fill=card_bg, outline=border_col, width=2)
    
    # Equation
    draw.text((width // 2, bot_y + 40), "Risk Score(x) = Base Risk + sum( phi_i )", fill=header_color, font=font_bottom, anchor="mm")
    
    # Strong Focus Text
    draw.text((width // 2, bot_y + 90), "Strong positive push from: “Volatility” + “Portfolio Beta”", fill=text_main, font=font_bottom, anchor="mm")
    draw.text((width // 2, bot_y + 135), "Risk mitigating offsets from: “Sharpe Ratio” + “Diversified Asset Count”", fill=text_sub, font=ImageFont.truetype("arial.ttf", 17) if "arial.ttf" in locals() else font_node_title, anchor="mm")

    # Caption
    draw.text((width // 2, height - 35), "Fig 2: TreeSHAP Feature Attribution for Contextual Risk Resolution", fill=text_sub, font=font_caption, anchor="mm")

    img.save(out_file)
    print(f"Saved {theme} Fig 2 to: {out_file}")

if __name__ == "__main__":
    create_fig2_shap_mechanism("dark")
    create_fig2_shap_mechanism("light")
