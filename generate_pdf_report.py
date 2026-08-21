import os
import sys

def create_master_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
    from reportlab.pdfgen import canvas

    pdf_path = "d:/nexfolio/NexFolio_Review1_Master_Handbook.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    PRIMARY = colors.HexColor("#1e1b4b")   # Deep Indigo
    SECONDARY = colors.HexColor("#4338ca") # Indigo
    ACCENT = colors.HexColor("#0d9488")    # Teal
    DARK_TEXT = colors.HexColor("#0f172a") # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")# Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")  # Slate 50
    CARD_BORDER = colors.HexColor("#cbd5e1")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY,
        alignment=TA_CENTER
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=22,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )

    script_style = ParagraphStyle(
        'Script_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=4,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=DARK_TEXT
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=PRIMARY
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 40))
    story.append(Paragraph("CHAITANYA BHARATHI INSTITUTE OF TECHNOLOGY (A)", ParagraphStyle('College', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Paragraph("Department of Computer Science and Engineering", subtitle_style))
    story.append(Spacer(1, 25))

    story.append(Paragraph("MAJOR PROJECT REVIEW 1", ParagraphStyle('Rev1', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=ACCENT, alignment=TA_CENTER)))
    story.append(Paragraph("TECHNICAL REPORT & PRESENTATION MASTER GUIDE", ParagraphStyle('RevSub', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Spacer(1, 20))

    story.append(HRFlowable(width="90%", thickness=2, color=SECONDARY, spaceBefore=5, spaceAfter=20))

    story.append(Paragraph("NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization", title_style))
    story.append(Spacer(1, 25))

    meta_table_data = [
        [
            Paragraph("<b>Presented By:</b><br/>M. Lokesh Reddy (160122733047)<br/>Patil Tejas (160123733321)", body_style),
            Paragraph("<b>Project Supervisor:</b><br/>Mr. Banothu Sai Kumar<br/>Assistant Professor, Dept. of CSE", body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[240, 240])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, CARD_BORDER),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 40))
    story.append(Paragraph("Academic Year 2025–2026 | Hyderabad, India", subtitle_style))
    story.append(PageBreak())

    # ==================== CHAPTER 1: EXECUTIVE SUMMARY ====================
    story.append(Paragraph("1. Executive Summary & Core Innovation", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("<b>NexFolio</b> is an institutional-grade portfolio intelligence framework engineered to solve three fundamental challenges in modern algorithmic finance: <b>Model Opacity (the Black-Box problem)</b>, <b>High Inference Latency during live market hours</b>, and <b>Absence of Statutory Tax Modeling</b>. Developed for retail investors, fund managers, and regulatory compliance audits, NexFolio replaces black-box neural networks with regularized gradient-boosted decision trees (XGBoost) combined with game-theoretic <b>TreeSHAP (Tree-based SHapley Additive exPlanations)</b>, achieving <b>97.0% classification accuracy</b> and <b>sub-millisecond (<1ms)</b> feature attribution.", body_style))
    
    story.append(Paragraph("<b>Key Architectural Innovations:</b>", h2_style))
    story.append(Paragraph("• <b>36-Feature Quantitative Pipeline:</b> Evaluates portfolio risk across Momentum (1M, 3M, 12M), Volatility, Downside Semi-Variance (Rf=6.5%), Beta against NIFTY 50, and 18 Sector Concentration Weights.<br/>• <b>TreeSHAP Explainability Engine:</b> Calculates local Shapley values in polynomial time O(TLD²), translating mathematical weights into human-readable risk drivers.<br/>• <b>Deterministic 4-Pillar Health Scorecard (0–100):</b> Transparently grades Diversification, Volatility Control, Risk-Adjusted Efficiency, and Drawdown Protection.<br/>• <b>Dual-Loop Valuation Engine:</b> Decouples <1ms in-memory quote valuation from heavy background analytics via Server-Sent Events (SSE) and a 5-state Market Data Pedigree FSM.<br/>• <b>Income-tax Act, 2025 Suite:</b> Natively computes STCG @ 20%, LTCG @ 12.5%, and provides automated 8-year tax-loss harvesting.", body_style))
    
    story.append(Spacer(1, 10))

    # ==================== CHAPTER 2: BENCHMARK & LITERATURE SURVEY ====================
    story.append(Paragraph("2. Literature Survey & Benchmark Analysis", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=8))

    lit_data = [
        [Paragraph("Authors & Venue", table_header_style), Paragraph("Paper Title", table_header_style), Paragraph("Methods", table_header_style), Paragraph("Advantages", table_header_style), Paragraph("Research Gaps", table_header_style)],
        [
            Paragraph("<b>P. Singh et al.</b><br/>(IEEE Access, 2023)<br/><i>[Base Paper]</i>", table_cell_bold),
            Paragraph("Harnessing a Hybrid CNN-LSTM Model for Portfolio Performance", table_cell_style),
            Paragraph("1D-CNN, LSTM, Markowitz Mean-Variance", table_cell_style),
            Paragraph("Captures temporal trends & spatial cross-asset correlations.", table_cell_style),
            Paragraph("Opaque black-box; high compute latency (~45ms); no tax math.", table_cell_style)
        ],
        [
            Paragraph("<b>I. Aruleba, Y. Sun</b><br/>(IEEE Access, 2024)", table_cell_bold),
            Paragraph("Effective Credit Risk Prediction Using Ensemble Classifiers", table_cell_style),
            Paragraph("Random Forest, XGBoost, SMOTE-ENN, TreeSHAP", table_cell_style),
            Paragraph("Ensemble superiority on tabular data; exact Shapley values.", table_cell_style),
            Paragraph("Binary credit default focus; lacks multi-class portfolio tiers.", table_cell_style)
        ],
        [
            Paragraph("<b>I. Aruleba, Y. Sun</b><br/>(IEEE Access, 2025)", table_cell_bold),
            Paragraph("An Improved Ensemble Method With Data Resampling", table_cell_style),
            Paragraph("Stacked Ensemble (RF, LR, CNN + MLP), SMOTE-ENN", table_cell_style),
            Paragraph("Mitigates extreme class skew; reduces variance.", table_cell_style),
            Paragraph("High stacking overhead; static batch testing without streaming.", table_cell_style)
        ],
        [
            Paragraph("<b>Vijayanand, Smrithy</b><br/>(IDT Journal, 2025)", table_cell_bold),
            Paragraph("Explainable AI-Enhanced Ensemble Learning for Financial Fraud", table_cell_style),
            Paragraph("Voting Ensemble (XGB, RF, DT) + TreeSHAP", table_cell_style),
            Paragraph("Achieves 99.9% accuracy; provides feature-level audit trust.", table_cell_style),
            Paragraph("Limited to transaction fraud; lacks portfolio metrics or tax rules.", table_cell_style)
        ]
    ]

    lit_table = Table(lit_data, colWidths=[95, 115, 105, 100, 100])
    lit_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, CARD_BORDER),
        ('GRID', (0,0), (-1,-1), 0.5, CARD_BORDER),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(lit_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Model Benchmark Trade-off Summary:</b><br/>• <b>Logistic Regression (Linear):</b> 78.5% Accuracy | ~0.2ms Latency | Explainable, but fails non-linear volatility spikes.<br/>• <b>Deep CNN-LSTM (Base Paper):</b> 84.0% Accuracy | ~45.0ms Latency | High latency bottleneck and uninterpretable black-box.<br/>• <b>NexFolio XGBoost + TreeSHAP (Proposed):</b> 97.0% Accuracy | ~0.9ms Latency | Dual L1/L2 Regularization with sub-second exact Shapley explainability.", body_style))

    story.append(PageBreak())

    # ==================== CHAPTER 3: SLIDE-BY-SLIDE PRESENTATION SCRIPT ====================
    story.append(Paragraph("3. Slide-by-Slide Complete Word-by-Word Script", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=8))

    slides_script = [
        ("Slide 1: Title Slide (25s)", 
         "\"Good morning respected panel members and our project supervisor, Mr. Banothu Sai Kumar. I am M. Lokesh Reddy, and along with my partner Patil Tejas, we are presenting our major project titled: 'NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization.'\""),
        
        ("Slide 2: Title Justification (45s)",
         "\"On Slide 2, we justify the four core pillars of our project: First, Explainable AI replaces black-box predictions with game-theoretic TreeSHAP attributions. Second, Portfolio Risk Profiling evaluates portfolios across 36 quantitative dimensions. Third, Real-Time Analytics decouples sub-millisecond live quote valuation from heavy analytics using our Dual-Loop engine. And fourth, Institutional Tax Optimization provides statutory compliance with the new Income-tax Act, 2025, modeling capital gains and loss harvesting.\""),
        
        ("Slide 3: Background & Architecture (45s)",
         "\"Looking at the background on Slide 3, India has over 160 million Demat accounts. Investors urgently need risk-adjusted intelligence beyond simple P&L. As shown in Figure 1, our architecture flows systematically: Raw market feeds from NSE 500 enter our 36-feature pipeline, train regularized gradient-boosted trees, extract local TreeSHAP attributions, and compute deterministic scorecard analytics alongside real-time statutory tax calculations.\""),
        
        ("Slide 4: Motivation (35s)",
         "\"Our project is driven by six urgent motivations on Slide 4: First, unprecedented retail capital exposure; Second, distrust in black-box AI; Third, the statutory tax overhaul under the Income-tax Act, 2025; Fourth, severe cross-sector volatility spikes; Fifth, high-latency system freezes during live market hours; And sixth, the necessity of transparent audit trails for regulatory filings.\""),
        
        ("Slide 5: The Core Challenge & Model Benchmark (50s)",
         "\"Slide 5 illustrates the primary technical dilemma we address: As benchmarked in Figure 2, linear models like Logistic Regression achieve only 78.5% accuracy on non-linear market shocks. Deep models like CNN-LSTM achieve 84% accuracy but act as uninterpretable black-boxes with 45ms latencies. In NexFolio, our proposed regularized XGBoost with TreeSHAP achieves state-of-the-art 97% accuracy while delivering sub-millisecond (0.9ms) inference and exact game-theoretic explainability.\""),
        
        ("Slide 6: Literature Survey (60s)",
         "\"Our literature survey benchmarks four recent peer-reviewed publications: Our Base Paper by Priya Singh et al. (IEEE Access, 2023) used CNN-LSTM for stock selection, but suffered from model opacity. Aruleba and Sun (IEEE Access, 2024 & 2025) proved ensemble superiority with TreeSHAP and SMOTE-ENN data resampling on tabular credit risk. And Vijayanand & Smrithy (IDT Journal, 2025) confirmed the critical role of XAI in financial transaction compliance.\""),
        
        ("Slide 7: Research Gap (45s)",
         "\"From our survey, we mapped four research gaps on Slide 7: Black-Box Neural Models are solved via our TreeSHAP Attribution Layer. Binary Narrow Risk Focus is expanded into our 36-Feature Quantitative Pipeline. High Latency and Static Data are eliminated via our Dual-Loop Engine (<1ms SSE). And the Absence of Statutory Tax Modeling in literature is bridged by our Income-tax Act, 2025 Suite.\""),
        
        ("Slide 8: Problem Statement (40s)",
         "\"Slide 8 summarizes our problem statement: Current portfolio platforms rely on superficial P&L metrics or opaque black-box models that suffer from high latency and completely ignore tax drag. Our goal in NexFolio is to formulate an Explainable AI framework combining 36-feature quantitative modeling, sub-second TreeSHAP risk attributions, a 4-pillar health scorecard, sub-millisecond live valuations, and statutory tax optimization.\""),
        
        ("Slide 9: Objectives (50s)",
         "\"We have structured our Phase 1 research into six core objectives on Slide 9: 01. Extract 36 quantitative features across momentum, downside risk, and sector allocations. 02. Train regularized gradient-boosted trees with sub-second local XAI attributions. 03. Formulate an inspectable 0–100 health score. 04. Build an in-memory What-If simulation engine. 05. Decouple live quote streaming from database writes with a 5-state Pedigree FSM. 06. Implement Income-tax Act, 2025 rules including STCG @ 20%, LTCG @ 12.5%, and an 8-year Loss Bank.\""),
        
        ("Slide 10: Conclusion (35s)",
         "\"In conclusion, for Review 1: We have completed a comprehensive literature survey, mathematically formulated our 36-feature quantitative pipeline, established our system architecture, and benchmarked our core models. In the subsequent phase, we will proceed with end-to-end multi-class dataset validation, live market WebSocket integration, and comprehensive stress-testing.\""),
        
        ("Slide 11 & 12: References & Thank You (20s)",
         "\"Our research is grounded in standard IEEE Access, NeurIPS, and statutory government publications as listed on Slide 11. Thank you to our supervisor, Mr. Banothu Sai Kumar, and the respected review committee. We are now open for your valuable questions and feedback.\"")
    ]

    for s_title, s_text in slides_script:
        story.append(Paragraph(f"<b>{s_title}</b>", h2_style))
        story.append(Paragraph(s_text, script_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # ==================== CHAPTER 4: EXAMINER DEFENSE QUESTIONS ====================
    story.append(Paragraph("4. Examiner Defense Cheat-Sheet (Top 5 Q&A)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=2, spaceAfter=8))

    qa_list = [
        ("Q1: Why did you choose XGBoost instead of Deep Learning (LSTM / Transformers)?",
         "Sir, multiple peer-reviewed studies (e.g., Grinsztajn et al., Aruleba & Sun 2024) prove that for structured tabular financial features, gradient-boosted tree ensembles consistently outperform deep neural networks. Neural networks overfit on tabular noise, take ~45ms to compute, and are uninterpretable black-boxes. XGBoost provides regularized loss (L1/L2) to prevent collinear overfitting and enables exact TreeSHAP calculations in polynomial time O(TLD²), achieving 97% accuracy with sub-millisecond latency."),
        
        ("Q2: What is your Base Paper and what exact gap are you addressing?",
         "Our base paper is Singh et al. (IEEE Access, 2023), titled 'Harnessing a Hybrid CNN-LSTM Model for Portfolio Performance'. They established multi-asset price trend forecasting using deep learning. However, their paper had two fundamental gaps: first, the model is an uninterpretable black-box; second, it lacks any real-time valuation streaming or statutory tax modeling. We use their problem formulation as our baseline, but replace the opaque network with an explainable, low-latency quantitative framework."),
        
        ("Q3: How does your Dual-Loop valuation architecture achieve sub-millisecond latency?",
         "In traditional platforms, every price tick triggers complex database queries and full-portfolio analytics, causing system latency. In NexFolio, we decouple the process into two independent asynchronous loops: The Fast Loop (<1ms) maintains portfolio weights in-memory and recalculates P&L and market value instantly upon receiving SSE market ticks. The Slow Loop (Background Async) periodically executes the 36-feature pipeline, XGBoost inferences, and deep risk attributions without blocking the client stream."),
        
        ("Q4: Why is Income-tax Act, 2025 included in a Computer Science machine learning project?",
         "Raw pre-tax returns do not reflect real-world portfolio performance. With the Union Budget 2026–27 overhaul, India introduced the new Income-tax Act, 2025, adjusting STCG to 20% and LTCG to 12.5%. By modeling exact holding period calendar math, buyback taxation, and an 8-year loss carryforward bank directly into our quantitative pipeline, our framework optimizes post-tax alpha and simulates tax-harvesting opportunities before order execution."),
        
        ("Q5: Since this is Review 1, what is your current progress and next milestone?",
         "For Review 1, we have completed the problem formulation, full literature survey, mathematical pipeline design, and baseline model benchmarking. Our next milestone for Phase 2 is full end-to-end integration of the live market feeds with our MongoDB historical snapshot engine and conducting stress-testing across diverse market regimes.")
    ]

    for q, a in qa_list:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 4))

    doc.build(story)
    print(f"Master Handbook PDF generated successfully: {pdf_path}")

if __name__ == "__main__":
    create_master_pdf()
