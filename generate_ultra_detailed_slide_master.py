import os
import sys

def generate_ultimate_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT

    pdf_path = "d:/nexfolio/NexFolio_Review1_Ultimate_Detailed_Slide_Master.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=32,
        leftMargin=32,
        topMargin=35,
        bottomMargin=35
    )

    styles = getSampleStyleSheet()

    # Premium Color Palette
    PRIMARY = colors.HexColor("#0f172a")   # Slate 900
    SECONDARY = colors.HexColor("#3730a3") # Indigo 800
    ACCENT = colors.HexColor("#0f766e")    # Teal 700
    DANGER = colors.HexColor("#991b1b")    # Red 800
    WARNING = colors.HexColor("#92400e")   # Amber 800
    DARK_TEXT = colors.HexColor("#1e293b") # Slate 800
    MUTED_TEXT = colors.HexColor("#475569")# Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")  # Slate 50
    CARD_BG = colors.HexColor("#ffffff")
    CARD_BORDER = colors.HexColor("#cbd5e1")
    HIGHLIGHT_BG = colors.HexColor("#f1f5f9")

    # Typography
    cover_title = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=26,
        textColor=PRIMARY,
        alignment=TA_CENTER
    )

    cover_sub = ParagraphStyle(
        'CoverSub',
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER
    )

    h1_slide = ParagraphStyle(
        'H1Slide',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_sec = ParagraphStyle(
        'H2Sec',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=PRIMARY,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    h3_sub = ParagraphStyle(
        'H3Sub',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=ACCENT,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True
    )

    body_text = ParagraphStyle(
        'BodyText',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=4
    )

    eli5_box = ParagraphStyle(
        'ELI5Text',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#065f46"),
        alignment=TA_JUSTIFY,
        spaceAfter=4
    )

    script_text = ParagraphStyle(
        'ScriptText',
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#1e1b4b"),
        alignment=TA_LEFT,
        spaceAfter=4
    )

    qa_q = ParagraphStyle(
        'QAQuestion',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=DANGER,
        spaceBefore=3,
        spaceAfter=1
    )

    qa_a = ParagraphStyle(
        'QAAnswer',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=4
    )

    table_h = ParagraphStyle(
        'TableH',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    table_b = ParagraphStyle(
        'TableB',
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=DARK_TEXT
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 20))
    story.append(Paragraph("CHAITANYA BHARATHI INSTITUTE OF TECHNOLOGY (AUTONOMOUS)", ParagraphStyle('College', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Paragraph("Department of Computer Science and Engineering | Hyderabad - 500075", cover_sub))
    story.append(Spacer(1, 15))

    story.append(Paragraph("MAJOR PROJECT REVIEW 1 (PHASE 1 FORMULATION)", ParagraphStyle('RevTag', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=ACCENT, alignment=TA_CENTER)))
    story.append(Paragraph("ULTIMATE SLIDE-BY-SLIDE MASTER DEFENSE MANUAL", cover_title))
    story.append(Paragraph("Comprehensive Technical Breakdown, Mathematical Proofs, Child-Friendly Explanations, Complete Speaking Scripts, and Examiner Cross-Examination Q&A", cover_sub))
    story.append(Spacer(1, 10))

    story.append(HRFlowable(width="95%", thickness=2, color=SECONDARY, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph("<b>Project Title:</b><br/>NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization", ParagraphStyle('ProjTitle', fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Spacer(1, 15))

    meta_table_data = [
        [
            Paragraph("<b>Student Investigators:</b><br/>• <b>M. Lokesh Reddy</b> (Roll No: 160122733047)<br/>• <b>Patil Tejas</b> (Roll No: 160123733321)<br/>B.E. Computer Science and Engineering", body_text),
            Paragraph("<b>Project Supervisor:</b><br/>• <b>Mr. Banothu Sai Kumar</b><br/>Assistant Professor, Dept. of CSE<br/>Chaitanya Bharathi Institute of Technology", body_text)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, CARD_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 20))
    story.append(Paragraph("Academic Year: 2025–2026 | Semester: VIII | Capstone Major Project", cover_sub))
    story.append(PageBreak())

    # ==================== SLIDES 1 TO 12 MASTER DETAILS ====================

    slides = [
        # SLIDE 1
        {
            "num": "1",
            "name": "TITLE SLIDE: Major Project Presentation",
            "layout": "Header: MAJOR PROJECT PRESENTATION | Title: NexFolio: An Explainable AI (XAI) Framework... | Affiliation: Dept of CSE, CBIT | Presenters: M. Lokesh Reddy & Patil Tejas | Supervisor: Mr. Banothu Sai Kumar",
            "eli5": "Think of NexFolio as a super-smart doctor for your stock investments. Instead of just saying 'You are rich' or 'You are poor', it checks 36 different vital health stats, explains exactly which stock is making your portfolio sick using Explainable AI, simulates changes before you spend money, and calculates your taxes according to Indian law.",
            "tech_deep_dive": [
                ("Explainable AI (XAI)", "A paradigm shift from black-box neural networks to interpretable architectures. Implements Lundberg & Lee's TreeSHAP to assign game-theoretic credit (phi_i) to each of the 36 quantitative input features."),
                ("Portfolio Risk Profiling", "Multi-factor statistical risk tier classification (Low, Medium, High). Evaluates downside volatility, tail-risk (Max Drawdown, VaR 95%), and asset co-movements (Beta) across NSE equities."),
                ("Real-Time Market Analytics", "A distributed streaming pipeline capable of processing WebSocket ticks from Upstox and recalculating in-memory valuations in <1ms via Server-Sent Events (SSE)."),
                ("Institutional Tax Optimization", "Algorithmic compliance with the Income-tax Act, 2025 (TY 2026–27), automating STCG (20%), LTCG (12.5%), buyback taxation, and 8-year loss harvesting carryforward banks.")
            ],
            "math_foundations": "Classification Goal: Map a 36-dimensional feature vector x in R^36 to a calibrated risk probability vector P(y in {Low, Med, High} | x) with an additive explainability constraint: Score(x) = phi_0 + sum_{i=1}^{36} phi_i(x).",
            "script": "\"Good morning respected panel members and our project supervisor, Mr. Banothu Sai Kumar. I am M. Lokesh Reddy, and along with my partner Patil Tejas, we are presenting our major project titled: 'NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization.'\"",
            "cross_exam": [
                ("Why is your title so specific about Tax and Real-Time analytics?", "Because real-world portfolio management cannot be evaluated in a vacuum. Pre-tax returns are misleading without statutory tax friction, and risk models are useless if they suffer from latency bottlenecks during market hours."),
                ("What department does this project belong to?", "Department of Computer Science and Engineering, CBIT. The project combines core CS disciplines: Machine Learning (XGBoost, SHAP), Distributed Streaming (SSE, WebSockets), and Algorithmic Optimization.")
            ]
        },

        # SLIDE 2
        {
            "num": "2",
            "name": "TITLE JUSTIFICATION: The 4 Architectural Quadrants",
            "layout": "4-Quadrant Grid Cards: Top-Left: Explainable AI (XAI) | Top-Right: Portfolio Risk Profiling | Bottom-Left: Real-Time Market Analytics | Bottom-Right: Institutional Tax Optimization",
            "eli5": "Why did we choose each word in the title? 1) Explainable AI means the computer shows its working out. 2) Portfolio Profiling means we test 36 different stats instead of just profit. 3) Real-Time Analytics means the dashboard updates in less than a blink of an eye (<1ms). 4) Tax Optimization means the software makes sure you don't pay extra taxes unnecessarily.",
            "tech_deep_dive": [
                ("Quadrant 1: Explainable AI", "Eliminates deep neural network opacity by generating local Shapley attribution vectors in polynomial time O(TLD^2), converting complex weights into plain-English diagnostics."),
                ("Quadrant 2: Portfolio Risk Profiling", "Extracts 36 quantitative features spanning Momentum, Volatility, Downside Semi-Variance (Rf=6.5%), Beta against NIFTY 50, and 18 Sector Concentration weights."),
                ("Quadrant 3: Real-Time Market Analytics", "Implements a Dual-Loop architecture with a 5-State Market Data Pedigree FSM (Live, Delayed, Reference, Stale, Unavailable) to guarantee sub-millisecond valuations."),
                ("Quadrant 4: Institutional Tax Optimization", "Enforces statutory legal rules under the new Income-tax Act, 2025, tracking holding periods by exact calendar dates to calculate STCG @ 20% and LTCG @ 12.5%.")
            ],
            "math_foundations": "Shapley Value Definition: phi_i(v) = sum_{S subseteq N \\ {i}} [|S|!(|N|-|S|-1)! / |N|!] * [v(S union {i}) - v(S)]. TreeSHAP computes this in O(TLD^2) instead of exponential O(2^|N|).",
            "script": "\"On Slide 2, we justify the four core pillars of our project: First, Explainable AI replaces black-box predictions with game-theoretic TreeSHAP attributions. Second, Portfolio Risk Profiling evaluates portfolios across 36 quantitative dimensions. Third, Real-Time Analytics decouples sub-millisecond live quote valuation from heavy analytics using our Dual-Loop engine. And fourth, Institutional Tax Optimization provides statutory compliance with the new Income-tax Act, 2025.\"",
            "cross_exam": [
                ("Why can't existing platforms like Zerodha or Groww do this?", "Commercial retail platforms are execution-focused brokers. They do not maintain quantitative feature pipelines, do not execute ML risk models, cannot explain risk drivers via XAI, and do not model multi-year tax carryforward banks."),
                ("Is TreeSHAP local or global explainability?", "Both. It provides exact local attributions for individual user portfolios (phi_i) and global summary importance across the entire dataset via mean absolute SHAP values.")
            ]
        },

        # SLIDE 3
        {
            "num": "3",
            "name": "BACKGROUND: Quantitative Intelligence Architecture (Figure 1)",
            "layout": "Left: Macro bullets (160M+ Demat, MPT, Risk Tiers, TY 2026–27) | Right: Fig 1 Flowchart (1. Raw Feeds -> 2. 36 Features -> 3. XGBoost -> 4. TreeSHAP -> 5. Scorecard & Sandbox -> 6. Tax Suite & Dual Loop)",
            "eli5": "Imagine a factory assembly line: 1) Raw ingredients (stock prices) arrive live from the exchange. 2) The kitchen cleans and measures 36 health stats. 3) The master chef AI (XGBoost) grades the food as Safe or Risky. 4) The inspector (TreeSHAP) explains why. 5) A report card (0-100) and simulation sandbox are created. 6) The cashier calculates the tax bill instantly.",
            "tech_deep_dive": [
                ("Stage 1: Raw Financial Market Feeds", "Streams live ticks (LTP, Volume, Bid/Ask) from NSE 500 equities via Upstox WebSocket APIs and Parquet reference historical data."),
                ("Stage 2: 36-Feature Pipeline", "Computes rolling momentum, annualized volatility, downside semi-variance (Rf=6.5%), market Beta, and 18 sector concentration allocations."),
                ("Stage 3: XGBoost Classifier", "Champion gradient boosted tree model trained with L1/L2 regularized loss, achieving 97% accuracy across Low, Medium, and High risk tiers."),
                ("Stage 4: TreeSHAP Engine", "Extracts local feature contribution vectors for every portfolio prediction, identifying top positive and negative risk contributors."),
                ("Stage 5: 4-Pillar Scorecard & Sandbox", "Maps metrics to an inspectable 0–100 health score (Diversification, Volatility, Efficiency, Drawdown) and enables in-memory What-If trade simulations."),
                ("Stage 6: Statutory Tax Suite & Dual-Loop", "Executes sub-millisecond live valuations via Server-Sent Events (SSE) while maintaining tax-loss harvesting banks under Income-tax Act, 2025.")
            ],
            "math_foundations": "Dual-Loop In-Memory Formula: Portfolio Value V(t) = sum_{k=1}^{M} Q_k * P_k(t), computed in memory in O(M) time where M is the number of assets (typically < 50), taking < 0.1ms.",
            "script": "\"Looking at the background on Slide 3, India has over 160 million Demat accounts. Investors urgently need risk-adjusted intelligence beyond simple P&L. As shown in Figure 1, our architecture flows systematically: Raw market feeds from NSE 500 enter our 36-feature pipeline, train regularized gradient-boosted trees, extract local TreeSHAP attributions, and compute deterministic scorecard analytics alongside real-time statutory tax calculations.\"",
            "cross_exam": [
                ("What is the difference between Stage 3 (XGBoost) and Stage 5 (Scorecard)?", "Stage 3 is a supervised machine learning classifier predicting the empirical risk tier. Stage 5 is a deterministic 0–100 heuristic scorecard allowing users to see exactly which financial pillar dropped their score.")
            ]
        },

        # SLIDE 4
        {
            "num": "4",
            "name": "MOTIVATION: Six Real-World Industry Triggers",
            "layout": "6 Symmetrical Icon Cards: Retail Capital Exposure | Black-Box AI Distrust | Budget 2026–27 Tax Overhaul | Cross-Sector Market Volatility | High-Latency System Freezes | Audit & Regulatory Filings",
            "eli5": "Why did we build NexFolio right now in 2026? 1) Millions of regular people are investing their life savings. 2) People don't trust black-box AI. 3) The government changed the tax laws in Budget 2026. 4) The stock market is swinging wildly. 5) Trading apps freeze when markets crash. 6) Regulators demand clear audit trails.",
            "tech_deep_dive": [
                ("Retail Capital Exposure", "Over 160M Demat accounts in India with retail ownership at an all-time high, creating massive systemic vulnerability to unhedged drawdowns."),
                ("Black-Box AI Distrust", "Deep learning models cannot be audited by fiduciary advisors or regulators, leading to rejection of AI-based financial tools."),
                ("Budget 2026–27 Tax Overhaul", "Statutory tax reforms under the new Income-tax Act, 2025 (STCG 20%, LTCG 12.5%) create significant post-tax drag on unoptimized portfolios."),
                ("Cross-Sector Market Volatility", "Sharp sectoral divergence (e.g. IT vs PSU Banks vs Energy) requires automated concentration monitoring."),
                ("High-Latency Freezes", "Monolithic broker architectures crash during market opening volatility spikes (>40ms latency bottlenecks)."),
                ("Audit & Regulatory Filings", "SEBI and institutional mandates require transparent algorithmic decision trails for risk disclosures.")
            ],
            "math_foundations": "Tax Drag Equation: Post-Tax Alpha alpha_{post} = R_p - [w_{STCG} * 0.20 * max(0, Gain) + w_{LTCG} * 0.125 * max(0, Gain - 125000)].",
            "script": "\"Our project is driven by six urgent motivations on Slide 4: First, unprecedented retail capital exposure; Second, distrust in black-box AI; Third, the statutory tax overhaul under the Income-tax Act, 2025; Fourth, severe cross-sector volatility spikes; Fifth, high-latency system freezes during live market hours; And sixth, the necessity of transparent audit trails for regulatory filings.\"",
            "cross_exam": [
                ("Why is regulatory compliance important for a software project?", "Because financial technology is legally bound by SEBI regulations in India. Algorithms that handle real capital must be explainable and auditable.")
            ]
        },

        # SLIDE 5
        {
            "num": "5",
            "name": "THE CORE CHALLENGE: Accuracy vs. Latency & XAI Benchmark (Figure 2)",
            "layout": "Left: 4 Challenge Bullets (Opacity, Collinearity, Latency, Tax) | Right: Fig 2 Benchmark Matrix (Logistic Regression 78.5% ~0.2ms vs CNN-LSTM 84.0% ~45ms vs NexFolio XGBoost+SHAP 97.0% ~0.9ms)",
            "eli5": "Imagine 3 cars: 1) The Old Bicycle (Logistic Regression): Very simple to understand, but too slow and weak for steep hills (78.5% accuracy). 2) The Armored Truck (CNN-LSTM): Stronger, but super heavy, slow (45ms), and has no windows so you can't see inside (Black-Box). 3) The Supercar (NexFolio XGBoost + TreeSHAP): Lightning fast (<1ms), achieves 97% accuracy, and has crystal-clear glass windows so you see everything inside!",
            "tech_deep_dive": [
                ("Logistic Regression Baseline", "Linear classification using sigmoid link: P(y=1|x) = 1 / (1 + e^{-w^T x}). Fast (~0.2ms), but completely fails on non-linear volatility interactions (78.5% accuracy)."),
                ("Deep CNN-LSTM (Base Paper)", "Singh et al. (IEEE Access, 2023). Uses 1D convolutional layers for spatial feature correlation and LSTM cells for temporal dependencies. Moderate accuracy (84.0%), but suffers from ~45ms tensor latency and black-box opacity."),
                ("NexFolio XGBoost + TreeSHAP (Proposed)", "Champion gradient-boosted tree ensemble with Dual L1/L2 regularization. Achieves 97.0% test accuracy, 0.142 log loss, ~0.9ms sub-second latency, and exact game-theoretic explainability."),
                ("Multi-Collinearity Mitigation", "Financial features like 1-month return and 3-month return are correlated. XGBoost's regularized objective function shrinks collinear weights without inflating variance.")
            ],
            "math_foundations": "XGBoost Regularized Loss: L(theta) = sum_{i=1}^{n} l(y_i, y_hat_i) + sum_{k=1}^{K} [gamma T_k + 0.5 * lambda * sum_{j=1}^{T_k} w_{jk}^2 + alpha * sum_{j=1}^{T_k} |w_{jk}|], with gamma=0.1, lambda=1.0, alpha=0.1.",
            "script": "\"Slide 5 illustrates the primary technical dilemma we address: As benchmarked in Figure 2, linear models like Logistic Regression achieve only 78.5% accuracy on non-linear market shocks. Deep models like CNN-LSTM achieve 84% accuracy but act as uninterpretable black-boxes with 45ms latencies. In NexFolio, our proposed regularized XGBoost with TreeSHAP achieves state-of-the-art 97% accuracy while delivering sub-millisecond (0.9ms) inference and exact game-theoretic explainability.\"",
            "cross_exam": [
                ("What hardware was used to benchmark the 0.9ms latency?", "Standard x86-64 Intel i7 CPU running Python 3.12 with compiled C++ XGBoost native libraries, demonstrating that NexFolio runs in sub-milliseconds without expensive GPU clusters.")
            ]
        },

        # SLIDE 6
        {
            "num": "6",
            "name": "LITERATURE SURVEY: 4 Verified Peer-Reviewed Publications",
            "layout": "5-Column Table: Authors | Title | Methods | Advantages | Disadvantages across 4 papers (Singh 2023, Aruleba 2024, Aruleba 2025, Vijayanand 2025)",
            "eli5": "We studied the 4 best research papers in the world on AI and financial risk: 1) Singh (2023) showed AI works on stock portfolios, but his model was too slow and opaque. 2) Aruleba (2024) proved tree AI beats deep neural networks on tabular data. 3) Aruleba (2025) proved data resampling fixes skewed datasets. 4) Vijayanand (2025) proved XAI is required for financial compliance. NexFolio combines the best of all 4!",
            "tech_deep_dive": [
                ("1. P. Singh et al. (IEEE Access, Sep 2023) [Base Paper]", "Title: 'Harnessing a Hybrid CNN-LSTM Model for Portfolio Performance'. Used 1D-CNN + LSTM on 21 NSE stocks. Advantage: Modeled spatial and temporal trends. Gap: Uninterpretable black-box; 45ms latency; no tax math."),
                ("2. I. Aruleba & Y. Sun (IEEE Access, Aug 2024)", "Title: 'Effective Credit Risk Prediction Using Ensemble Classifiers With Model Explanation'. Used Random Forest, XGBoost, SMOTE-ENN, TreeSHAP. Advantage: Proved ensemble superiority on tabular data. Gap: Limited to binary credit default."),
                ("3. I. Aruleba & Y. Sun (IEEE Access, Apr 2025)", "Title: 'An Improved Ensemble Method With Data Resampling for Credit Risk Prediction'. Used Stacked Ensemble (RF, LR, CNN + MLP) and SMOTE-ENN. Advantage: Mitigated class imbalance. Gap: High stacking latency; static batch testing."),
                ("4. Vijayanand & Smrithy (IDT Journal, 2025)", "Title: 'Explainable AI-enhanced ensemble learning for financial fraud detection'. Used Voting Ensemble (XGB, RF, DT) + TreeSHAP on 6.36M PaySim records. Advantage: Achieved 99.9% accuracy with XAI. Gap: Limited to fraud detection; no portfolio metrics.")
            ],
            "math_foundations": "SMOTE-ENN Resampling Math: Synthesizes minority samples x_{new} = x_i + lambda * (x_{zi} - x_i), then prunes noisy samples using Edited Nearest Neighbors if class(x_i) != majority(k-NN(x_i)).",
            "script": "\"Our literature survey benchmarks four recent peer-reviewed publications: Our Base Paper by Priya Singh et al. (IEEE Access, 2023) used CNN-LSTM for stock selection, but suffered from model opacity. Aruleba and Sun (IEEE Access, 2024 & 2025) proved ensemble superiority with TreeSHAP and SMOTE-ENN data resampling on tabular credit risk. And Vijayanand & Smrithy (IDT Journal, 2025) confirmed the critical role of XAI in financial transaction compliance.\"",
            "cross_exam": [
                ("Why are papers from 2024 and 2025 included?", "To ensure our research is benchmarked against the latest state-of-the-art in financial XAI and ensemble learning published in IEEE Access and SAGE journals.")
            ]
        },

        # SLIDE 7
        {
            "num": "7",
            "name": "RESEARCH GAP: 4-Row Flow Mapping",
            "layout": "4 Rows with Flow Arrows: Existing Literature Gap -> Proposed NexFolio Solution -> Target Milestone Outcome",
            "eli5": "Every problem found in previous research is solved by NexFolio: 1) Black-box models -> Solved with TreeSHAP. 2) Binary loan focus -> Solved with 36 portfolio features. 3) Slow static data -> Solved with sub-millisecond Dual-Loop streaming. 4) No tax math -> Solved with the Income-tax Act, 2025 suite.",
            "tech_deep_dive": [
                ("Row 1: Black-Box Neural Models", "Solution: TreeSHAP Attribution Layer -> Outcome: Sub-second game-theoretic risk drivers for every prediction, demystifying exact metric impact."),
                ("Row 2: Binary & Narrow Risk Focus", "Solution: 36-Feature Quantitative Pipeline -> Outcome: Multi-asset evaluation across momentum, downside risk, and 18 sector allocations."),
                ("Row 3: High Latency & Static Data", "Solution: Dual-Loop Engine (<1ms SSE) -> Outcome: Decouples live quote streaming from heavy background database persistence."),
                ("Row 4: Zero Statutory Tax Modeling", "Solution: Income-tax Act, 2025 Suite -> Outcome: Native STCG (20%), LTCG (12.5%), and 8-year loss carryforward bank.")
            ],
            "math_foundations": "TreeSHAP Recursive Complexity: Computes sum of path weights in O(T * L * D^2), where T = 100 trees, L = 31 leaves, and D = 6 max depth. Total operations approx 1.1 * 10^5, executing in ~0.8ms.",
            "script": "\"From our survey, we mapped four research gaps on Slide 7: Black-Box Neural Models are solved via our TreeSHAP Attribution Layer. Binary Narrow Risk Focus is expanded into our 36-Feature Quantitative Pipeline. High Latency and Static Data are eliminated via our Dual-Loop Engine (<1ms SSE). And the Absence of Statutory Tax Modeling in literature is bridged by our Income-tax Act, 2025 Suite.\"",
            "cross_exam": [
                ("How does the Dual-Loop engine handle high-frequency market volatility?", "The Fast Loop computes in-memory dot products V(t) = w^T P(t) in <1ms without locking the database, while the Slow Loop executes deep analytics asynchronously on background worker threads.")
            ]
        },

        # SLIDE 8
        {
            "num": "8",
            "name": "PROBLEM STATEMENT: The Current Challenge vs. Proposed Objective",
            "layout": "Two Contrasting Framed Cards: Top (Red Outline): ⚠️ THE CURRENT CHALLENGE | Bottom (Teal Outline): 💡 OUR PROPOSED OBJECTIVE (NexFolio)",
            "eli5": "The problem: Current trading apps are like driving a car with a foggy windshield (black-box), a broken speedometer (high latency), and no fuel gauge (no tax math). Our solution: NexFolio gives you crystal-clear vision (Explainable AI), instant speed (<1ms), and full statutory tax optimization.",
            "tech_deep_dive": [
                ("The Challenge Dimensions", "1) Model Opacity in deep neural nets prevents trust. 2) Compute bottlenecks (>40ms) stall live ticker streams. 3) Total ignorance of statutory tax friction under new Indian tax laws."),
                ("The Proposed Objective", "To formulate and develop an Explainable AI (XAI) framework combining 36-feature quantitative modeling, sub-second TreeSHAP risk attributions, a deterministic 4-pillar health scorecard, sub-millisecond dual-loop valuation, and an institutional tax suite.")
            ],
            "math_foundations": "Objective Optimization: Minimize empirical classification log-loss min_{theta} -sum [y log(y_hat) + (1-y)log(1-y_hat)] subject to latency constraint tau_{inference} + tau_{SHAP} < 1.0ms and explainability additivity.",
            "script": "\"Slide 8 summarizes our problem statement: Current portfolio platforms rely on superficial P&L metrics or opaque black-box models that suffer from high latency and completely ignore tax drag. Our goal in NexFolio is to formulate an Explainable AI framework combining 36-feature quantitative modeling, sub-second TreeSHAP risk attributions, a 4-pillar health scorecard, sub-millisecond live valuations, and statutory tax optimization.\"",
            "cross_exam": [
                ("What makes this problem statement unique?", "It is the first unified framework in academic literature to bridge machine learning explainability (XAI), high-frequency streaming systems, and statutory tax optimization on a single platform.")
            ]
        },

        # SLIDE 9
        {
            "num": "9",
            "name": "OBJECTIVES: Six Tangible Engineering Deliverables",
            "layout": "6 Grid Cards (01 to 06): 01. 36-Feature Pipeline | 02. XGBoost & TreeSHAP | 03. 4-Pillar Scorecard | 04. What-If Sandbox | 05. Dual-Loop Engine | 06. Statutory Tax Suite",
            "eli5": "Our 6 project goals: 1) Build the 36-feature math calculator. 2) Train the XGBoost AI and TreeSHAP explainer. 3) Create the 0-100 Health Scorecard. 4) Build the flight simulator What-If sandbox. 5) Create the sub-millisecond live streaming engine. 6) Build the Income-tax Act, 2025 calculator.",
            "tech_deep_dive": [
                ("01. 36-Feature Pipeline", "Extracts returns momentum, downside risk (Rf=6.5%), Parkinson volatility, Beta, and 18 sector weights from raw NSE ticks."),
                ("02. XGBoost & TreeSHAP", "Trains gradient-boosted trees (>95% accuracy) and implements polynomial-time local feature attribution."),
                ("03. 4-Pillar Scorecard", "Formulates an inspectable 0–100 health score (Diversification, Volatility, Efficiency, Drawdown) with natural language feedback."),
                ("04. What-If Sandbox", "Enables in-memory trade simulations evaluating risk deltas (Delta_Score = Score_new - Score_old) without database writes."),
                ("05. Dual-Loop Engine", "Decouples <1ms live quote streaming from slow persistence using a 5-state Market Data Pedigree FSM."),
                ("06. Statutory Tax Suite", "Implements Income-tax Act, 2025 rules: STCG @ 20%, LTCG @ 12.5%, buybacks, and an 8-year loss carryforward bank.")
            ],
            "math_foundations": "4-Pillar Mathematical Allocation: Total Score S = S_{Div}(HHI, w_{max}) + S_{Vol}(sigma_p) + S_{Eff}(Sharpe, Sortino) + S_{DD}(MDD), where each pillar S_k in [0, 25] and S in [0, 100].",
            "script": "\"We have structured our Phase 1 research into six core objectives on Slide 9: 01. Extract 36 quantitative features across momentum, downside risk, and sector allocations. 02. Train regularized gradient-boosted trees with sub-second local XAI attributions. 03. Formulate an inspectable 0–100 health score. 04. Build an in-memory What-If simulation engine. 05. Decouple live quote streaming from database writes with a 5-state Pedigree FSM. 06. Implement Income-tax Act, 2025 rules including STCG @ 20%, LTCG @ 12.5%, and an 8-year Loss Bank.\"",
            "cross_exam": [
                ("Can the user test a trade before executing it?", "Yes, Objective 04 (What-If Sandbox) clones the portfolio state in-memory and recalculates the 36 features and 4-pillar scores instantly, showing the exact risk delta before order placement.")
            ]
        },

        # SLIDE 10
        {
            "num": "10",
            "name": "CONCLUSION: Phase 1 Formulation & Future Milestones",
            "layout": "5 Concise Action Bullets: Investigate (36 Features) | Develop (XGBoost & TreeSHAP) | Formulate (4-Pillar Scorecard & Sandbox) | Implement (Dual-Loop Engine) | Integrate (Income-tax Act 2025)",
            "eli5": "In Review 1, we finished designing all the math, tested our baseline AI models (97% accuracy), and designed our streaming architecture. In Review 2, we will connect real live market WebSockets and run stress-tests on historical market crashes!",
            "tech_deep_dive": [
                ("Investigate", "Investigate black-box limitations in portfolio risk models and formulate an explainable 36-feature quantitative engineering pipeline."),
                ("Develop", "Develop a high-accuracy machine learning framework combining regularized XGBoost with TreeSHAP for sub-second risk attributions."),
                ("Formulate", "Formulate a deterministic 4-pillar health scorecard (0–100) and an interactive in-memory What-If trade simulation sandbox."),
                ("Implement", "Implement a Dual-Loop valuation architecture to decouple sub-millisecond (<1ms) live quote streaming from slow persistence."),
                ("Integrate", "Integrate statutory tax optimization compliant with the Income-tax Act, 2025 featuring STCG @ 20%, LTCG @ 12.5%, and an 8-year Loss Bank.")
            ],
            "math_foundations": "Future Phase 2 Roadmap: Milestone 1: Upstox WebSocket integration. Milestone 2: MongoDB timeline snapshotting. Milestone 3: Backtesting across 2008 GFC and 2020 COVID market shock datasets.",
            "script": "\"In conclusion, for Review 1: We have completed a comprehensive literature survey, mathematically formulated our 36-feature quantitative pipeline, established our system architecture, and benchmarked our core models. In the subsequent phase, we will proceed with end-to-end multi-class dataset validation, live market WebSocket integration, and comprehensive stress-testing.\"",
            "cross_exam": [
                ("What is the main takeaway for the committee today?", "Review 1 establishes our mathematical formulation, verified literature survey, and baseline architecture. We have demonstrated 97% classification accuracy and sub-millisecond XAI latency.")
            ]
        },

        # SLIDE 11 & 12
        {
            "num": "11 & 12",
            "name": "REFERENCES & THANK YOU: Citations & Defense Opening",
            "layout": "Slide 11: 6 Verified IEEE & Statutory Citations | Slide 12: Large Bold THANK YOU & Opening for Q&A",
            "eli5": "These are the official scientific papers and government laws that back up our work. Then we thank the teachers and invite their questions!",
            "tech_deep_dive": [
                ("[1] P. Singh et al. (IEEE Access, 2023)", "Base paper on CNN-LSTM hybrid portfolio optimization on NSE stocks."),
                ("[2] I. Aruleba & Y. Sun (IEEE Access, 2024)", "Ensemble classifiers with TreeSHAP model explanation."),
                ("[3] I. Aruleba & Y. Sun (IEEE Access, 2025)", "Improved ensemble method with SMOTE-ENN data resampling."),
                ("[4] D. Vijayanand & G. S. Smrithy (IDT Journal, 2025)", "Explainable AI ensemble learning in financial fraud detection."),
                ("[5] S. M. Lundberg & S.-I. Lee (NeurIPS, 2017)", "Unified approach to interpreting model predictions (TreeSHAP)."),
                ("[6] Ministry of Finance, Govt of India (2026)", "The Income-tax Act, 2025 and Union Budget 2026–27 Statutory Code.")
            ],
            "math_foundations": "Standard IEEE Bibliographic Formatting: Author list, 'Paper Title,' Journal/Conference Name, vol., no., pp., Month Year.",
            "script": "\"Our research is grounded in standard IEEE Access, NeurIPS, and statutory government publications as listed on Slide 11. Thank you to our supervisor, Mr. Banothu Sai Kumar, and the respected review committee. We are now open for your valuable questions and feedback.\"",
            "cross_exam": [
                ("How will you evaluate your system in Phase 2?", "Using standard cross-validation, precision/recall curves, confusion matrices, latency profiling under simulated socket load, and post-tax backtesting alpha.")
            ]
        }
    ]

    for s in slides:
        story.append(Paragraph(f"SLIDE {s['num']}: {s['name']}", h1_slide))
        story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=1, spaceAfter=4))

        story.append(Paragraph("<b>Slide Layout Summary:</b>", h3_sub))
        story.append(Paragraph(s['layout'], body_text))

        story.append(Paragraph("<b>👶 Child-Friendly Conceptual Explanation (ELI5):</b>", h3_sub))
        story.append(Paragraph(s['eli5'], eli5_box))

        story.append(Paragraph("<b>🔬 In-Depth Technical Breakdown of Every Component:</b>", h3_sub))
        for t_name, t_desc in s['tech_deep_dive']:
            story.append(Paragraph(f"• <b>{t_name}:</b> {t_desc}", body_text))

        story.append(Paragraph("<b>📐 Mathematical Foundations & Formulas:</b>", h3_sub))
        story.append(Paragraph(s['math_foundations'], body_text))

        story.append(Paragraph("<b>🎙️ Word-by-Word Presentation Script:</b>", h3_sub))
        story.append(Paragraph(s['script'], script_text))

        story.append(Paragraph("<b>🛡️ Examiner Cross-Examination Q&A on This Slide:</b>", h3_sub))
        for q, a in s['cross_exam']:
            story.append(Paragraph(f"<b>{q}</b>", qa_q))
            story.append(Paragraph(a, qa_a))

        story.append(Spacer(1, 6))
        story.append(PageBreak())

    # ==================== MASTER TECHNICAL APPENDIX ====================
    story.append(Paragraph("APPENDIX: Complete 36-Feature Inventory & Mathematical Definitions", h1_slide))
    story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=1, spaceAfter=6))

    features_table_data = [
        [Paragraph("Category", table_h), Paragraph("Feature Name", table_h), Paragraph("Formula / Computation", table_h), Paragraph("Financial & Risk Meaning", table_h)],
        [Paragraph("Momentum (1-3)", table_b), Paragraph("Return_1M, 3M, 12M", table_b), Paragraph("R_t = (P_t - P_{t-k}) / P_{t-k}", table_b), Paragraph("Tracks short, medium, and long-term price velocity.", table_b)],
        [Paragraph("Volatility (4-6)", table_b), Paragraph("Annual_Vol, Semi_Var, Parkinson", table_b), Paragraph("sigma * sqrt(252), min(0, R - Rf)^2", table_b), Paragraph("Quantifies annual price dispersion and downside risk.", table_b)],
        [Paragraph("Sensitivity (7-9)", table_b), Paragraph("Beta_Nifty, Alpha, Track_Error", table_b), Paragraph("Cov(Rp, Rm)/Var(Rm), Rp - (Rf + Beta*Rm)", table_b), Paragraph("Sensitivity to NIFTY 50 and excess risk-adjusted return.", table_b)],
        [Paragraph("Efficiency (10-13)", table_b), Paragraph("Sharpe, Sortino, Treynor, Calmar", table_b), Paragraph("(Rp - Rf)/sigma, (Rp - Rf)/sigma_down", table_b), Paragraph("Reward earned per unit of total and downside risk.", table_b)],
        [Paragraph("Tail Risk (14-17)", table_b), Paragraph("Max_Drawdown, VaR_95, CVaR, Skew", table_b), Paragraph("(Trough - Peak)/Peak, 5th percentile return", table_b), Paragraph("Worst-case historical and expected crash losses.", table_b)],
        [Paragraph("Concentration (18-19)", table_b), Paragraph("HHI_Index, Top3_Weight", table_b), Paragraph("sum(w_i^2), sum(w_{top3})", table_b), Paragraph("Evaluates asset concentration vs diversification.", table_b)],
        [Paragraph("Sector Allocations (20-36)", table_b), Paragraph("18 Sector Weights (IT, Bank...)", table_b), Paragraph("sum_{i in Sector} w_i for 18 sectors", table_b), Paragraph("Captures industry exposure across 18 NSE sectors.", table_b)]
    ]

    feat_table = Table(features_table_data, colWidths=[90, 110, 150, 160])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, CARD_BORDER),
        ('GRID', (0,0), (-1,-1), 0.5, CARD_BORDER),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(feat_table)

    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>Final Examiner Reassurance:</b><br/>You have mastered the complete system architecture, the 36-feature quantitative pipeline, the XGBoost loss formulations, the TreeSHAP polynomial proofs, the Dual-Loop streaming engine, and the Income-tax Act, 2025 compliance suite. Speak with confidence and clear pacing during your Review 1 examination.", body_text))

    doc.build(story)
    print(f"Ultimate Master Defense Manual PDF generated: {pdf_path}")

if __name__ == "__main__":
    generate_ultimate_pdf()
