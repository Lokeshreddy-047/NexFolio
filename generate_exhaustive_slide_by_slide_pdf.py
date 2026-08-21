import os
import sys

def build_complete_slide_by_slide_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT

    pdf_path = "d:/nexfolio/NexFolio_Complete_Slide_by_Slide_Explanation_Guide.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    PRIMARY = colors.HexColor("#1e1b4b")   # Deep Indigo
    SECONDARY = colors.HexColor("#4338ca") # Indigo
    ACCENT = colors.HexColor("#0d9488")    # Teal
    DANGER = colors.HexColor("#b91c1c")    # Dark Red
    DARK_TEXT = colors.HexColor("#0f172a") # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")# Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")  # Slate 50
    CARD_BORDER = colors.HexColor("#cbd5e1")

    # Typography Styles
    cover_title_style = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=28,
        textColor=PRIMARY,
        alignment=TA_CENTER
    )

    cover_sub_style = ParagraphStyle(
        'CoverSub',
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER
    )

    h1_style = ParagraphStyle(
        'H1',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'H3',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=ACCENT,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=5
    )

    script_box_style = ParagraphStyle(
        'ScriptBox',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=3,
        spaceAfter=4
    )

    qa_question_style = ParagraphStyle(
        'QAQuestion',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=DANGER,
        spaceBefore=4,
        spaceAfter=2
    )

    qa_answer_style = ParagraphStyle(
        'QAAnswer',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=DARK_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )

    table_cell = ParagraphStyle(
        'TblCell',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=DARK_TEXT
    )

    table_cell_bold = ParagraphStyle(
        'TblCellB',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=PRIMARY
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 30))
    story.append(Paragraph("CHAITANYA BHARATHI INSTITUTE OF TECHNOLOGY (A)", ParagraphStyle('College', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Paragraph("Department of Computer Science and Engineering", cover_sub_style))
    story.append(Spacer(1, 20))

    story.append(Paragraph("MAJOR PROJECT REVIEW 1 (PHASE 1)", ParagraphStyle('RevTag', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=ACCENT, alignment=TA_CENTER)))
    story.append(Paragraph("COMPLETE SLIDE-BY-SLIDE TECHNICAL EXPLANATION GUIDE", cover_title_style))
    story.append(Paragraph("An Exhaustive Word-by-Word Technical Breakdown, Conceptual Explanations, Presentation Scripts, and Examiner Defense Manual", cover_sub_style))
    story.append(Spacer(1, 15))

    story.append(HRFlowable(width="90%", thickness=2, color=SECONDARY, spaceBefore=5, spaceAfter=15))

    story.append(Paragraph("<b>Project Title:</b><br/>NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization", ParagraphStyle('ProjTitle', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=PRIMARY, alignment=TA_CENTER)))
    story.append(Spacer(1, 20))

    meta_table_data = [
        [
            Paragraph("<b>Presented By:</b><br/>M. Lokesh Reddy (160122733047)<br/>Patil Tejas (160123733321)", body_style),
            Paragraph("<b>Project Supervisor:</b><br/>Mr. Banothu Sai Kumar<br/>Assistant Professor, Dept. of CSE, CBIT", body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[250, 250])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, CARD_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 30))
    story.append(Paragraph("Academic Year 2025–2026 | Hyderabad, India", cover_sub_style))
    story.append(PageBreak())

    # ==================== SLIDE-BY-SLIDE WALKTHROUGH ====================

    slides_data = [
        {
            "num": "1",
            "title": "TITLE SLIDE: Major Project Presentation",
            "concept": "Sets the formal academic identity of the project. It defines the scope as a multi-disciplinary Computer Science engineering capstone combining Machine Learning, Distributed Systems, and Financial Engineering.",
            "terms": [
                ("NexFolio", "Brand name derived from 'Next-Generation' + 'Portfolio Intelligence'. It reflects institutional-grade analytics made accessible to all."),
                ("Explainable AI (XAI)", "A branch of artificial intelligence where algorithms explain the mathematical rationale behind their predictions rather than acting as opaque black-boxes."),
                ("Portfolio Risk Profiling", "A multi-factor classification framework assessing capital danger using 36 statistical market features beyond simple profit-and-loss."),
                ("Real-Time Market Analytics", "A distributed streaming architecture capable of computing in-memory portfolio valuations in under 1 millisecond on live NSE market ticks."),
                ("Institutional Tax Optimization", "Native algorithmic compliance with the newly enacted Income-tax Act, 2025, optimizing post-tax net yield through STCG, LTCG, and tax-loss harvesting.")
            ],
            "script": "\"Good morning respected panel members and our project supervisor, Mr. Banothu Sai Kumar. I am M. Lokesh Reddy, and along with my partner Patil Tejas, we are presenting our major project titled: NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization.\"",
            "qa": [
                ("Why is your project title so comprehensive?", "Each term represents a non-negotiable software layer: XAI eliminates model opacity, 36-feature profiling handles multi-asset risk, real-time analytics powers live streaming, and statutory tax modeling optimizes actual post-tax returns.")
            ]
        },
        {
            "num": "2",
            "title": "TITLE JUSTIFICATION: The Four Architectural Quadrants",
            "concept": "Proves that every technical term in the title corresponds directly to an active software engineering deliverable in the codebase.",
            "terms": [
                ("Game-Theoretic TreeSHAP", "An algorithm rooted in Lloyd Shapley's cooperative game theory. It treats each of the 36 quantitative features as players in a game and computes their exact positive or negative contribution (phi_i) to the final risk score in polynomial time O(TLD^2)."),
                ("36 Quantitative Features", "A feature set spanning Return Momentum (1M, 3M, 12M), Volatility, Downside Semi-Variance (Rf=6.5%), Market Beta against NIFTY 50, Sharpe/Sortino ratios, and 18 Sector Concentration weights."),
                ("Dual-Loop Architecture", "An asynchronous design pattern decoupling a <1ms in-memory valuation Fast Loop (SSE quote streaming) from a background heavy analytics Slow Loop."),
                ("Income-tax Act, 2025", "The new Indian statutory tax framework (effective TY 2026-27), modeling STCG @ 20%, LTCG @ 12.5% above 1.25 Lakh, buyback taxation, and an 8-year loss carryforward bank.")
            ],
            "script": "\"On Slide 2, we justify the four core pillars of our project: First, Explainable AI replaces black-box predictions with game-theoretic TreeSHAP attributions. Second, Portfolio Risk Profiling evaluates portfolios across 36 quantitative dimensions. Third, Real-Time Analytics decouples sub-millisecond live quote valuation from heavy analytics using our Dual-Loop engine. And fourth, Institutional Tax Optimization provides statutory compliance with the new Income-tax Act, 2025.\"",
            "qa": [
                ("Why can't traditional trading apps provide this?", "Traditional brokerages only calculate static P&L. They do not run multi-factor ML risk models, cannot explain risk drivers with XAI, and do not model statutory tax carryforward banks.")
            ]
        },
        {
            "num": "3",
            "title": "BACKGROUND: Quantitative Intelligence Architecture (Figure 1)",
            "concept": "Presents the industry context (160M+ Demat accounts in India) and introduces the end-to-end data pipeline flow from raw exchange ticks to user-facing dashboards.",
            "terms": [
                ("Modern Portfolio Theory (MPT)", "Harry Markowitz's foundational theory proving that asset diversification maximizes expected return for a given level of risk."),
                ("Raw Financial Market Feeds", "Live Open-High-Low-Close-Volume (OHLCV) ticks streamed from the National Stock Exchange (NSE 500) via Upstox WebSockets."),
                ("Gradient Boosted Trees (XGBoost)", "The supervised ML classification model trained with regularized loss to classify portfolios into Low, Medium, or High risk tiers."),
                ("4-Pillar Health Scorecard & Sandbox", "A 0-100 inspectable scoring system coupled with an in-memory simulation engine for testing trades without database writes."),
                ("Figure 1 Architecture Flow", "The 6-stage quantitative intelligence pipeline linking Market Feeds -> 36 Features -> XGBoost -> TreeSHAP -> Scorecard -> Tax Suite.")
            ],
            "script": "\"Looking at the background on Slide 3, India has over 160 million Demat accounts. Investors urgently need risk-adjusted intelligence beyond simple P&L. As shown in Figure 1, our architecture flows systematically from raw market feeds into a 36-feature quantitative pipeline, trains regularized gradient-boosted trees, extracts local TreeSHAP attributions, and computes deterministic scorecard analytics alongside real-time statutory tax calculations.\"",
            "qa": [
                ("What happens if raw market data feeds fail?", "Our 5-state Market Data Pedigree state machine gracefully transitions quotes from LIVE to DELAYED or REFERENCE, displaying explicit warning badges on the UI.")
            ]
        },
        {
            "num": "4",
            "title": "MOTIVATION: Six Real-World Industry Triggers",
            "concept": "Demonstrates why this project is critically needed in 2026 by mapping technological, regulatory, and market challenges.",
            "terms": [
                ("Retail Capital Exposure", "Millions of first-time retail investors deploying capital into volatile markets without institutional risk hedging tools."),
                ("Black-Box AI Distrust", "Investors and wealth managers reject AI recommendations when algorithms cannot explain the mathematical reason behind them."),
                ("Budget 2026–27 Tax Overhaul", "Statutory capital gains tax changes under the Income-tax Act, 2025 requiring real-time tax liability tracking."),
                ("Cross-Sector Market Volatility", "Macroeconomic shifts causing extreme rotational drawdowns across sectors (e.g. IT, Banking, Auto)."),
                ("High-Latency System Freezes", "Compute bottlenecks during high-volume trading sessions that cause conventional platforms to freeze."),
                ("Audit & Regulatory Filings", "Compliance mandates requiring algorithmic investment platforms to maintain auditable explanation trails.")
            ],
            "script": "\"Our project is driven by six urgent motivations on Slide 4: First, unprecedented retail capital exposure; Second, distrust in black-box AI; Third, the statutory tax overhaul under the Income-tax Act, 2025; Fourth, severe cross-sector volatility spikes; Fifth, high-latency system freezes during live market hours; And sixth, the necessity of transparent audit trails for regulatory filings.\"",
            "qa": [
                ("Which motivation is the most critical?", "Black-box distrust and latency freezes. If an AI model cannot explain its reasoning in under a millisecond during live market swings, it is unusable in production.")
            ]
        },
        {
            "num": "5",
            "title": "THE CORE CHALLENGE: Model Benchmark Matrix (Figure 2)",
            "concept": "Presents the central trade-off matrix comparing linear baselines, deep neural networks (Base Paper), and NexFolio's proposed champion architecture.",
            "terms": [
                ("Logistic Regression Baseline", "Linear model achieving 78.5% accuracy with ~0.2ms latency. While interpretable, it fails to capture non-linear market co-movements."),
                ("Deep CNN-LSTM (Base Paper)", "Hybrid deep learning model from Singh et al. (IEEE Access, 2023). Achieves 84.0% accuracy, but suffers from ~45ms latency and total black-box opacity."),
                ("NexFolio XGBoost + TreeSHAP", "Our champion architecture achieving 97.0% accuracy, sub-millisecond (~0.9ms) inference, and exact game-theoretic feature explainability."),
                ("Feature Multi-Collinearity", "The statistical condition where financial ratios are highly correlated. Solved in NexFolio via Dual L1 (Lasso) and L2 (Ridge) regularization.")
            ],
            "script": "\"Slide 5 illustrates the primary technical dilemma we address: As benchmarked in Figure 2, linear models like Logistic Regression achieve only 78.5% accuracy on non-linear market shocks. Deep models like CNN-LSTM achieve 84% accuracy but act as uninterpretable black-boxes with 45ms latencies. In NexFolio, our proposed regularized XGBoost with TreeSHAP achieves state-of-the-art 97% accuracy while delivering sub-millisecond (0.9ms) inference and exact game-theoretic explainability.\"",
            "qa": [
                ("Why does XGBoost outperform CNN-LSTM on tabular data?", "Deep networks require massive spatial/temporal homogeneity. Tabular financial ratios lack spatial structure and have high feature noise. Regularized tree ensembles partition feature space with lower sample complexity and zero tensor latency.")
            ]
        },
        {
            "num": "6",
            "title": "LITERATURE SURVEY: 4 Verified Peer-Reviewed Papers",
            "concept": "Establishes academic rigor by reviewing 4 verified publications from IEEE Access and Intelligent Decision Technologies (IDT Journal).",
            "terms": [
                ("P. Singh et al. (IEEE Access, 2023) [Base Paper]", "Combined 1D-CNN and LSTM for stock selection on the NSE. Proved ML beats Markowitz models, but suffered from black-box opacity and high compute latency (~45ms)."),
                ("I. Aruleba & Y. Sun (IEEE Access, 2024)", "Proved tree ensembles (Random Forest, XGBoost) combined with TreeSHAP outperform neural networks on tabular credit risk data."),
                ("I. Aruleba & Y. Sun (IEEE Access, 2025)", "Employed SMOTE-ENN hybrid data resampling and stacked meta-learners to mitigate extreme class skew on financial data."),
                ("Vijayanand & Smrithy (IDT Journal, 2025)", "Applied voting ensembles with TreeSHAP on 6.36M PaySim mobile records, proving XAI satisfies institutional regulatory audit requirements.")
            ],
            "script": "\"Our literature survey benchmarks four recent peer-reviewed publications: Our Base Paper by Priya Singh et al. (IEEE Access, 2023) used CNN-LSTM for stock selection, but suffered from model opacity. Aruleba and Sun (IEEE Access, 2024 & 2025) proved ensemble superiority with TreeSHAP and SMOTE-ENN data resampling on tabular credit risk. And Vijayanand & Smrithy (IDT Journal, 2025) confirmed the critical role of XAI in financial transaction compliance.\"",
            "qa": [
                ("Why is Singh et al. your Base Paper if you use XGBoost?", "Singh et al. formulated the core problem of AI-driven multi-asset portfolio risk prediction. We adopt their problem formulation as our benchmark, but solve their latency and interpretability gaps using XGBoost + TreeSHAP.")
            ]
        },
        {
            "num": "7",
            "title": "RESEARCH GAP: 4-Row Problem-Solution-Outcome Flow",
            "concept": "Maps each surveyed limitation directly to NexFolio's architectural solution and target engineering outcome.",
            "terms": [
                ("Gap 1: Black-Box Neural Models", "Solution: TreeSHAP Attribution Layer -> Outcome: Sub-second game-theoretic risk drivers for every prediction."),
                ("Gap 2: Binary & Narrow Risk Focus", "Solution: 36-Feature Quantitative Pipeline -> Outcome: Multi-asset evaluation across momentum, volatility, and market Beta."),
                ("Gap 3: High Latency & Static Data", "Solution: Dual-Loop Engine (<1ms SSE) -> Outcome: Decouples live quote streaming from background database writes."),
                ("Gap 4: Zero Statutory Tax Modeling", "Solution: Income-tax Act, 2025 Suite -> Outcome: Native STCG (20%), LTCG (12.5%), and 8-year loss carryforward bank.")
            ],
            "script": "\"From our survey, we mapped four research gaps on Slide 7: Black-Box Neural Models are solved via our TreeSHAP Attribution Layer. Binary Narrow Risk Focus is expanded into our 36-Feature Quantitative Pipeline. High Latency and Static Data are eliminated via our Dual-Loop Engine (<1ms SSE). And the Absence of Statutory Tax Modeling in literature is bridged by our Income-tax Act, 2025 Suite.\"",
            "qa": [
                ("How does TreeSHAP compute values in sub-milliseconds?", "Standard Shapley computation is exponential O(2^M). TreeSHAP exploits decision tree paths to compute exact values in polynomial time O(TLD^2), where T is trees, L is leaves, and D is max depth.")
            ]
        },
        {
            "num": "8",
            "title": "PROBLEM STATEMENT: Challenge vs. Proposed Objective",
            "concept": "A single-page, high-contrast formal problem formulation defining current platform deficiencies and NexFolio's technical objectives.",
            "terms": [
                ("The Current Challenge", "Existing portfolio platforms rely on superficial P&L summaries or opaque 'black-box' ML models that lack interpretability, suffer from high latency (>40ms), and ignore statutory tax friction."),
                ("Our Proposed Objective", "To formulate and develop an Explainable AI (XAI) framework combining 36-feature quantitative modeling, sub-second TreeSHAP risk attributions, a deterministic 4-pillar health scorecard, sub-millisecond dual-loop valuation, and an institutional tax suite.")
            ],
            "script": "\"Slide 8 summarizes our problem statement: Current portfolio platforms rely on superficial P&L metrics or opaque black-box models that suffer from high latency and completely ignore tax drag. Our goal in NexFolio is to formulate an Explainable AI framework combining 36-feature quantitative modeling, sub-second TreeSHAP risk attributions, a 4-pillar health scorecard, sub-millisecond live valuations, and statutory tax optimization.\"",
            "qa": [
                ("What is the primary novelty of your problem statement?", "The unified integration of machine learning explainability with sub-millisecond live market streaming and statutory tax compliance on a single platform.")
            ]
        },
        {
            "num": "9",
            "title": "OBJECTIVES: Six Tangible Engineering Deliverables",
            "concept": "Defines the 6 concrete Phase 1 research and software engineering deliverables for the capstone project.",
            "terms": [
                ("01. 36-Feature Pipeline", "Extract return momentum, downside semi-variance (Rf=6.5%), and 18 sector concentration weights."),
                ("02. XGBoost & TreeSHAP", "Train regularized gradient-boosted trees (>95% accuracy) with sub-second local XAI attributions."),
                ("03. 4-Pillar Scorecard", "Formulate an inspectable 0–100 score across Diversification, Volatility, Efficiency, and Drawdown."),
                ("04. What-If Sandbox", "Enable in-memory trade simulations with instant risk delta calculation without database writes."),
                ("05. Dual-Loop Engine", "Decouple <1ms live quote streaming from slow persistence with a 5-state Pedigree FSM."),
                ("06. Statutory Tax Suite", "Implement Income-tax Act, 2025 STCG @ 20%, LTCG @ 12.5%, Buybacks, and 8-Year Loss Bank.")
            ],
            "script": "\"We have structured our Phase 1 research into six core objectives on Slide 9: 01. Extract 36 quantitative features across momentum, downside risk, and sector allocations. 02. Train regularized gradient-boosted trees with sub-second local XAI attributions. 03. Formulate an inspectable 0–100 health score. 04. Build an in-memory What-If simulation engine. 05. Decouple live quote streaming from database writes with a 5-state Pedigree FSM. 06. Implement Income-tax Act, 2025 rules including STCG @ 20%, LTCG @ 12.5%, and an 8-year Loss Bank.\"",
            "qa": [
                ("How does the What-If Sandbox calculate risk delta without saving to database?", "The server clones the portfolio state in-memory, re-runs feature extraction, and computes Delta_Score = Score_new - Score_old in under 5ms without executing MongoDB write transactions.")
            ]
        },
        {
            "num": "10",
            "title": "CONCLUSION: Phase 1 Formulation & Future Milestones",
            "concept": "Summarizes the achievements of Review 1 (Phase 1) using rigorous forward-looking engineering action verbs.",
            "terms": [
                ("Investigate", "Investigate black-box limitations in portfolio risk models and formulate an explainable 36-feature quantitative engineering pipeline."),
                ("Develop", "Develop a high-accuracy machine learning framework combining regularized XGBoost with TreeSHAP for sub-second risk attributions."),
                ("Formulate", "Formulate a deterministic 4-pillar health scorecard (0–100) and an interactive in-memory What-If trade simulation sandbox."),
                ("Implement", "Implement a Dual-Loop valuation architecture to decouple sub-millisecond (<1ms) live quote streaming from slow persistence."),
                ("Integrate", "Integrate statutory tax optimization compliant with the Income-tax Act, 2025 featuring STCG @ 20%, LTCG @ 12.5%, and an 8-year Loss Bank.")
            ],
            "script": "\"In conclusion, for Review 1: We have completed a comprehensive literature survey, mathematically formulated our 36-feature quantitative pipeline, established our system architecture, and benchmarked our core models. In the subsequent phase, we will proceed with end-to-end multi-class dataset validation, live market WebSocket integration, and comprehensive stress-testing.\"",
            "qa": [
                ("What is your immediate next deliverable for Review 2?", "Completing live WebSocket streaming from Upstox, building MongoDB snapshot timeline pipelines, and backtesting on historical market crash datasets.")
            ]
        },
        {
            "num": "11 & 12",
            "title": "REFERENCES & THANK YOU: Academic Citations & Defense Opening",
            "concept": "Provides full IEEE citations for all academic papers and opens the floor for committee examination.",
            "terms": [
                ("[1] P. Singh et al. (IEEE Access, 2023)", "Base Paper on Hybrid CNN-LSTM portfolio performance."),
                ("[2] I. Aruleba & Y. Sun (IEEE Access, 2024)", "Ensemble classifiers with TreeSHAP model explanation."),
                ("[3] I. Aruleba & Y. Sun (IEEE Access, 2025)", "Improved ensemble method with SMOTE-ENN data resampling."),
                ("[4] D. Vijayanand & G. S. Smrithy (IDT Journal, 2025)", "Explainable AI ensemble learning in financial transactions."),
                ("[5] S. M. Lundberg & S.-I. Lee (NeurIPS, 2017)", "Foundational paper on unified Shapley additive explanations (TreeSHAP)."),
                ("[6] Ministry of Finance, Govt of India (2026)", "The Income-tax Act, 2025 and Union Budget 2026–27 Statutory Code.")
            ],
            "script": "\"Our research is grounded in standard IEEE Access, NeurIPS, and statutory government publications as listed on Slide 11. Thank you to our supervisor, Mr. Banothu Sai Kumar, and the respected review committee. We are now open for your valuable questions and feedback.\"",
            "qa": [
                ("Are all papers verified peer-reviewed?", "Yes sir, citations [1], [2], and [3] are published in IEEE Access, citation [4] in IDT Journal (SAGE), and citation [5] in NeurIPS.")
            ]
        }
    ]

    for s in slides_data:
        story.append(Paragraph(f"SLIDE {s['num']}: {s['title']}", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=SECONDARY, spaceBefore=1, spaceAfter=6))
        
        story.append(Paragraph("<b>1. Conceptual Purpose:</b>", h2_style))
        story.append(Paragraph(s['concept'], body_style))

        story.append(Paragraph("<b>2. Detailed Breakdown of Every Word & Technical Component:</b>", h2_style))
        for term_title, term_desc in s['terms']:
            story.append(Paragraph(f"• <b>{term_title}:</b> {term_desc}", body_style))

        story.append(Paragraph("<b>3. Word-by-Word Presentation Script:</b>", h2_style))
        story.append(Paragraph(s['script'], script_box_style))

        story.append(Paragraph("<b>4. Examiner Defense Q&A on This Slide:</b>", h2_style))
        for q_txt, a_txt in s['qa']:
            story.append(Paragraph(f"<b>{q_txt}</b>", qa_question_style))
            story.append(Paragraph(a_txt, qa_answer_style))

        story.append(Spacer(1, 10))
        story.append(PageBreak())

    doc.build(story)
    print(f"Exhaustive Slide-by-Slide Guide PDF generated: {pdf_path}")

if __name__ == "__main__":
    build_complete_slide_by_slide_pdf()
