from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.schemas.ipo import (
    IPOItem,
    IPOStatus,
    IPOMarketType,
    IPORiskVerdict,
    IPOSubscription,
    IPOFinancials,
    IPOPeerComparison,
    IPOAnalysisResult,
    ListedIPOPosPerformance,
    IPOOverviewMetrics
)


class IPOService:
    """Institutional IPO Radar & Multi-Factor AI Risk Analyzer Service."""

    def __init__(self):
        self._ipos_database: List[Dict[str, Any]] = [
            # 1. OPEN FOR BIDDING / LIVE
            {
                "id": "ipo_ntpc_green",
                "company_name": "NTPC Green Energy Limited",
                "symbol": "NTPCGREEN",
                "market_type": IPOMarketType.MAINBOARD,
                "sector": "Power & Renewable Energy",
                "logo_initials": "NG",
                "status": IPOStatus.OPEN,
                "price_band_low": 102.0,
                "price_band_high": 108.0,
                "lot_size": 138,
                "total_issue_size_cr": 10000.0,
                "fresh_issue_cr": 10000.0,
                "ofs_cr": 0.0,
                "open_date": "2026-08-18",
                "close_date": "2026-08-22",
                "allotment_date": "2026-08-25",
                "listing_date": "2026-08-27",
                "gmp_inr": 18.5,
                "subscription": {
                    "qib_multiple": 3.82,
                    "nii_multiple": 4.15,
                    "retail_multiple": 2.40,
                    "employee_multiple": 1.10,
                    "total_multiple": 3.12,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "financials": {
                    "revenue_cagr_3yr": 46.8,
                    "ebitda_margin": 88.4,
                    "pat_margin": 17.6,
                    "roe": 12.4,
                    "roce": 10.8,
                    "debt_to_equity": 1.45,
                    "eps": 2.15,
                    "historical_revenue": [
                        {"year": "FY22", "amount_cr": 910.4},
                        {"year": "FY23", "amount_cr": 169.7},
                        {"year": "FY24", "amount_cr": 1962.6}
                    ],
                    "historical_pat": [
                        {"year": "FY22", "amount_cr": 94.7},
                        {"year": "FY23", "amount_cr": 171.2},
                        {"year": "FY24", "amount_cr": 344.7}
                    ]
                },
                "peers": [
                    {"peer_name": "Adani Green Energy Ltd", "pe_ratio": 164.2, "pb_ratio": 24.5, "market_cap_cr": 284500.0},
                    {"peer_name": "Tata Power Renewable", "pe_ratio": 42.8, "pb_ratio": 4.6, "market_cap_cr": 132000.0},
                    {"peer_name": "JSW Energy Ltd", "pe_ratio": 54.1, "pb_ratio": 5.2, "market_cap_cr": 126400.0}
                ],
                "registrar": "KFin Technologies Ltd",
                "registrar_url": "https://ris.kfintech.com/ipostatus/",
                "lead_managers": ["IDBI Capital", "HDFC Bank", "IIFL Securities", "Nuvama Wealth"],
                "industry_median_pe": 54.1,
                "asking_pe": 50.2,
                "catalysts": [
                    "100% Fresh Issue proceeds directly utilized for solar/wind capex and debt repayment.",
                    "Sovereign Maharatna parentage (NTPC Ltd) ensures low cost of debt and guaranteed PPA off-takes.",
                    "Aggressive target of expanding operational green capacity from 3.5 GW to 19 GW by FY27."
                ],
                "red_flags": [
                    "High initial capital intensity requiring heavy continuous debt drawdowns.",
                    "Dependent on government renewable energy procurement policies and tariff bidding."
                ]
            },
            # 2. UPCOMING ISSUE
            {
                "id": "ipo_zinka_logistics",
                "company_name": "Zinka Logistics Solutions Ltd (BlackBuck)",
                "symbol": "BLACKBUCK",
                "market_type": IPOMarketType.MAINBOARD,
                "sector": "Logistics & Fleet Tech",
                "logo_initials": "ZL",
                "status": IPOStatus.UPCOMING,
                "price_band_low": 259.0,
                "price_band_high": 273.0,
                "lot_size": 54,
                "total_issue_size_cr": 1114.7,
                "fresh_issue_cr": 550.0,
                "ofs_cr": 564.7,
                "open_date": "2026-08-25",
                "close_date": "2026-08-28",
                "allotment_date": "2026-09-01",
                "listing_date": "2026-09-03",
                "gmp_inr": 24.0,
                "subscription": {
                    "qib_multiple": 0.0,
                    "nii_multiple": 0.0,
                    "retail_multiple": 0.0,
                    "employee_multiple": 0.0,
                    "total_multiple": 0.0,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "financials": {
                    "revenue_cagr_3yr": 32.5,
                    "ebitda_margin": 14.2,
                    "pat_margin": 8.6,
                    "roe": 14.8,
                    "roce": 16.2,
                    "debt_to_equity": 0.22,
                    "eps": 4.10,
                    "historical_revenue": [
                        {"year": "FY22", "amount_cr": 182.4},
                        {"year": "FY23", "amount_cr": 234.8},
                        {"year": "FY24", "amount_cr": 315.6}
                    ],
                    "historical_pat": [
                        {"year": "FY22", "amount_cr": -84.2},
                        {"year": "FY23", "amount_cr": -12.4},
                        {"year": "FY24", "amount_cr": 28.6}
                    ]
                },
                "peers": [
                    {"peer_name": "Delhivery Ltd", "pe_ratio": 78.4, "pb_ratio": 4.1, "market_cap_cr": 29800.0},
                    {"peer_name": "Mahindra Logistics", "pe_ratio": 48.6, "pb_ratio": 3.4, "market_cap_cr": 3850.0}
                ],
                "registrar": "KFin Technologies Ltd",
                "registrar_url": "https://ris.kfintech.com/ipostatus/",
                "lead_managers": ["Axis Capital", "Morgan Stanley", "JM Financial", "IIFL Securities"],
                "industry_median_pe": 63.5,
                "asking_pe": 66.5,
                "catalysts": [
                    "India's largest digital trucking platform with over 27% market share in digital tolling & FASTag payments.",
                    "Turnaround into bottom-line profitability in FY24 with strong unit operating leverage."
                ],
                "red_flags": [
                    "50.6% of the total issue is an OFS exit by early private equity investors.",
                    "High dependence on commercial vehicle diesel consumption and highway freight corridor volumes."
                ]
            },
            # 3. SME PLATFORM OPEN ISSUE
            {
                "id": "ipo_zenith_aero",
                "company_name": "Zenith Aerospace & Precision Ltd",
                "symbol": "ZENITHAERO",
                "market_type": IPOMarketType.SME,
                "sector": "Defense & Aerospace",
                "logo_initials": "ZA",
                "status": IPOStatus.OPEN,
                "price_band_low": 142.0,
                "price_band_high": 150.0,
                "lot_size": 1000,
                "total_issue_size_cr": 48.5,
                "fresh_issue_cr": 48.5,
                "ofs_cr": 0.0,
                "open_date": "2026-08-16",
                "close_date": "2026-08-20",
                "allotment_date": "2026-08-21",
                "listing_date": "2026-08-26",
                "gmp_inr": 85.0,
                "subscription": {
                    "qib_multiple": 18.4,
                    "nii_multiple": 52.6,
                    "retail_multiple": 64.2,
                    "employee_multiple": 0.0,
                    "total_multiple": 48.8,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "financials": {
                    "revenue_cagr_3yr": 68.4,
                    "ebitda_margin": 26.8,
                    "pat_margin": 18.2,
                    "roe": 34.2,
                    "roce": 38.6,
                    "debt_to_equity": 0.15,
                    "eps": 9.40,
                    "historical_revenue": [
                        {"year": "FY22", "amount_cr": 22.4},
                        {"year": "FY23", "amount_cr": 41.8},
                        {"year": "FY24", "amount_cr": 64.2}
                    ],
                    "historical_pat": [
                        {"year": "FY22", "amount_cr": 3.8},
                        {"year": "FY23", "amount_cr": 7.4},
                        {"year": "FY24", "amount_cr": 11.7}
                    ]
                },
                "peers": [
                    {"peer_name": "Data Patterns (India) Ltd", "pe_ratio": 74.5, "pb_ratio": 12.4, "market_cap_cr": 14200.0},
                    {"peer_name": "MTAR Technologies Ltd", "pe_ratio": 62.1, "pb_ratio": 8.5, "market_cap_cr": 5800.0}
                ],
                "registrar": "Bigshare Services Pvt Ltd",
                "registrar_url": "https://www.bigshareonline.com/ipo_Allotment.html",
                "lead_managers": ["Hem Securities Ltd"],
                "industry_median_pe": 68.3,
                "asking_pe": 16.0,
                "catalysts": [
                    "Deep order book visibility from DRDO, HAL, and global tier-1 aero primes with 2.8x revenue coverage.",
                    "Massive 56.6% Grey Market Premium indicating intense listing day appetite.",
                    "Outstanding return ratios with ROCE > 38% and near zero debt."
                ],
                "red_flags": [
                    "SME Platform liquidity constraints with ₹1,50,000 minimum trade lot size.",
                    "Concentrated customer order execution risks."
                ]
            },
            # 4. CLOSED / ALLOTMENT STAGE
            {
                "id": "ipo_afcons_infra",
                "company_name": "Afcons Infrastructure Limited",
                "symbol": "AFCONS",
                "market_type": IPOMarketType.MAINBOARD,
                "sector": "Infrastructure & Engineering",
                "logo_initials": "AI",
                "status": IPOStatus.CLOSED,
                "price_band_low": 440.0,
                "price_band_high": 463.0,
                "lot_size": 32,
                "total_issue_size_cr": 5430.0,
                "fresh_issue_cr": 1250.0,
                "ofs_cr": 4180.0,
                "open_date": "2026-08-10",
                "close_date": "2026-08-14",
                "allotment_date": "2026-08-18",
                "listing_date": "2026-08-21",
                "gmp_inr": 12.0,
                "subscription": {
                    "qib_multiple": 3.79,
                    "nii_multiple": 5.05,
                    "retail_multiple": 0.94,
                    "employee_multiple": 1.67,
                    "total_multiple": 2.63,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "financials": {
                    "revenue_cagr_3yr": 14.8,
                    "ebitda_margin": 10.4,
                    "pat_margin": 3.5,
                    "roe": 13.8,
                    "roce": 15.4,
                    "debt_to_equity": 0.88,
                    "eps": 12.4,
                    "historical_revenue": [
                        {"year": "FY22", "amount_cr": 11018.9},
                        {"year": "FY23", "amount_cr": 12637.3},
                        {"year": "FY24", "amount_cr": 13267.4}
                    ],
                    "historical_pat": [
                        {"year": "FY22", "amount_cr": 357.6},
                        {"year": "FY23", "amount_cr": 410.8},
                        {"year": "FY24", "amount_cr": 449.7}
                    ]
                },
                "peers": [
                    {"peer_name": "Larsen & Toubro Ltd", "pe_ratio": 36.2, "pb_ratio": 5.1, "market_cap_cr": 485000.0},
                    {"peer_name": "KEC International Ltd", "pe_ratio": 38.4, "pb_ratio": 4.8, "market_cap_cr": 24500.0}
                ],
                "registrar": "Link Intime India Pvt Ltd",
                "registrar_url": "https://linkintime.co.in/initial_offer/public-issues.html",
                "lead_managers": ["ICICI Securities", "DAM Capital", "Jefferies India", "Nomura"],
                "industry_median_pe": 37.3,
                "asking_pe": 37.3,
                "catalysts": [
                    "Flagship Shapoorji Pallonji engineering giant with ₹35,000+ Cr diversified order book.",
                    "Proven complex engineering execution (Chenab Rail Bridge, Atal Tunnel)."
                ],
                "red_flags": [
                    "Heavy 77% OFS component utilized for promoter parent group debt relief.",
                    "Low retail subscription (0.94x) indicating muted retail frenzy."
                ]
            }
        ]

        self._listed_performance: List[Dict[str, Any]] = [
            {
                "id": "listed_waaree",
                "company_name": "Waaree Energies Limited",
                "symbol": "WAAREE.NS",
                "sector": "Solar Energy",
                "listing_date": "2026-07-28",
                "issue_price": 1503.0,
                "listing_price": 2550.0,
                "listing_gain_pct": 69.66,
                "current_price": 3140.50,
                "gain_since_listing_pct": 108.95,
                "status": "STRONG_OUTPERFORMER"
            },
            {
                "id": "listed_premier",
                "company_name": "Premier Energies Limited",
                "symbol": "PREMIERENE.NS",
                "sector": "Solar Cell & Module",
                "listing_date": "2026-07-15",
                "issue_price": 450.0,
                "listing_price": 991.0,
                "listing_gain_pct": 120.22,
                "current_price": 1120.00,
                "gain_since_listing_pct": 148.88,
                "status": "STRONG_OUTPERFORMER"
            },
            {
                "id": "listed_swiggy",
                "company_name": "Swiggy Limited",
                "symbol": "SWIGGY.NS",
                "sector": "Consumer Internet",
                "listing_date": "2026-08-01",
                "issue_price": 390.0,
                "listing_price": 420.0,
                "listing_gain_pct": 7.69,
                "current_price": 462.80,
                "gain_since_listing_pct": 18.67,
                "status": "MODERATE_GAIN"
            },
            {
                "id": "listed_hyundai",
                "company_name": "Hyundai Motor India Ltd",
                "symbol": "HYUNDAI.NS",
                "sector": "Automobile",
                "listing_date": "2026-07-02",
                "issue_price": 1960.0,
                "listing_price": 1934.0,
                "listing_gain_pct": -1.33,
                "current_price": 1812.40,
                "gain_since_listing_pct": -7.53,
                "status": "BELOW_ISSUE_PRICE"
            }
        ]

    def _calculate_ai_analysis(self, raw: Dict[str, Any]) -> IPOAnalysisResult:
        """Evaluates multi-factor institutional AI scoring model."""
        price_high = raw["price_band_high"]
        asking_pe = raw["asking_pe"]
        industry_pe = raw["industry_median_pe"]
        gmp = raw["gmp_inr"]
        lot_size = raw["lot_size"]
        fresh_pct = (raw["fresh_issue_cr"] / raw["total_issue_size_cr"]) * 100.0 if raw["total_issue_size_cr"] > 0 else 100.0
        fin = raw["financials"]
        sub = raw["subscription"]

        # 1. Valuation Score (0-100)
        pe_ratio_diff = (industry_pe - asking_pe) / industry_pe if industry_pe > 0 else 0.0
        val_score = int(max(15, min(98, 55 + (pe_ratio_diff * 75))))

        # 2. Capital Allocation & OFS Score (0-100)
        cap_score = int(max(20, min(100, (fresh_pct * 0.8) + 20)))

        # 3. Financial Health Score (0-100)
        fin_score = int(max(25, min(98, (
            (min(fin["revenue_cagr_3yr"], 50) * 0.7) +
            (min(fin["ebitda_margin"], 40) * 0.8) +
            (min(fin["roce"], 30) * 0.8) +
            (max(0, 100 - (fin["debt_to_equity"] * 25)) * 0.3)
        ))))

        # 4. Demand Momentum Score (0-100)
        gmp_pct = (gmp / price_high) * 100.0 if price_high > 0 else 0.0
        demand_score = int(max(20, min(99, (
            (min(sub["total_multiple"], 20) * 2.5) +
            (min(gmp_pct, 50) * 1.0) +
            25
        ))))

        # Overall Multi-factor Weighted Quality Score
        quality_score = int(
            (0.30 * val_score) +
            (0.25 * cap_score) +
            (0.25 * fin_score) +
            (0.20 * demand_score)
        )
        quality_score = max(5, min(98, quality_score))

        # Verdict assignment
        if quality_score >= 80:
            verdict = IPORiskVerdict.STRONG_SUBSCRIBE
            confidence = 0.92
            summary = f"{raw['company_name']} displays exceptional capital structure and attractive valuation relative to peers, with strong institutional listing appetite."
        elif quality_score >= 65:
            verdict = IPORiskVerdict.SUBSCRIBE_LONG_TERM
            confidence = 0.85
            summary = f"Solid business fundamentals with steady return metrics. Suitable for medium to long term capital compounding."
        elif quality_score >= 50:
            verdict = IPORiskVerdict.NEUTRAL
            confidence = 0.76
            summary = f"Borderline valuation multiples with mixed capital use. Recommended for opportunistic listing day gains only."
        else:
            verdict = IPORiskVerdict.AVOID
            confidence = 0.88
            summary = f"Expensive valuation combined with high promoter exit (OFS) creates unfavorable risk-reward for retail investors."

        # Allotment odds estimation (1 / retail_multiple)
        retail_sub = sub["retail_multiple"]
        allotment_odds = round((100.0 / retail_sub), 1) if retail_sub > 1.0 else 100.0

        profit_per_lot = round(gmp * lot_size, 2)
        val_disc_pct = round(pe_ratio_diff * 100.0, 1)

        return IPOAnalysisResult(
            quality_score=quality_score,
            verdict=verdict,
            confidence=confidence,
            valuation_score=val_score,
            capital_allocation_score=cap_score,
            financial_health_score=fin_score,
            demand_momentum_score=demand_score,
            asking_pe=asking_pe,
            industry_median_pe=industry_pe,
            valuation_discount_pct=val_disc_pct,
            estimated_allotment_odds_pct=allotment_odds,
            estimated_profit_per_lot=profit_per_lot,
            top_catalysts=raw.get("catalysts", []),
            key_red_flags=raw.get("red_flags", []),
            summary_verdict=summary
        )

    def _to_ipo_item(self, raw: Dict[str, Any]) -> IPOItem:
        min_invest = raw["price_band_high"] * raw["lot_size"]
        gmp = raw["gmp_inr"]
        price_high = raw["price_band_high"]
        gmp_pct = round((gmp / price_high) * 100.0, 2) if price_high > 0 else 0.0
        est_listing = price_high + gmp
        fresh_pct = round((raw["fresh_issue_cr"] / raw["total_issue_size_cr"]) * 100.0, 1) if raw["total_issue_size_cr"] > 0 else 100.0

        ai_res = self._calculate_ai_analysis(raw)

        return IPOItem(
            id=raw["id"],
            company_name=raw["company_name"],
            symbol=raw["symbol"],
            market_type=raw["market_type"],
            sector=raw["sector"],
            logo_initials=raw["logo_initials"],
            status=raw["status"],
            price_band_low=raw["price_band_low"],
            price_band_high=raw["price_band_high"],
            lot_size=raw["lot_size"],
            min_investment=min_invest,
            total_issue_size_cr=raw["total_issue_size_cr"],
            fresh_issue_cr=raw["fresh_issue_cr"],
            ofs_cr=raw["ofs_cr"],
            fresh_issue_pct=fresh_pct,
            open_date=raw["open_date"],
            close_date=raw["close_date"],
            allotment_date=raw["allotment_date"],
            listing_date=raw["listing_date"],
            gmp_inr=gmp,
            gmp_pct=gmp_pct,
            estimated_listing_price=est_listing,
            subscription=IPOSubscription(**raw["subscription"]),
            financials=IPOFinancials(**raw["financials"]),
            peers=[IPOPeerComparison(**p) for p in raw.get("peers", [])],
            registrar=raw["registrar"],
            registrar_url=raw["registrar_url"],
            lead_managers=raw.get("lead_managers", []),
            ai_analysis=ai_res
        )

    async def get_all_ipos(
        self,
        status: Optional[IPOStatus] = None,
        market_type: Optional[IPOMarketType] = None,
        verdict: Optional[IPORiskVerdict] = None
    ) -> List[IPOItem]:
        results = []
        for raw in self._ipos_database:
            item = self._to_ipo_item(raw)
            if status and item.status != status:
                continue
            if market_type and item.market_type != market_type:
                continue
            if verdict and item.ai_analysis.verdict != verdict:
                continue
            results.append(item)
        return results

    async def get_ipo_by_id(self, ipo_id: str) -> Optional[IPOItem]:
        for raw in self._ipos_database:
            if raw["id"] == ipo_id or raw["symbol"].lower() == ipo_id.lower():
                return self._to_ipo_item(raw)
        return None

    async def get_overview_metrics(self) -> IPOOverviewMetrics:
        all_items = [self._to_ipo_item(r) for r in self._ipos_database]
        active_count = sum(1 for i in all_items if i.status == IPOStatus.OPEN)
        upcoming_count = sum(1 for i in all_items if i.status == IPOStatus.UPCOMING)
        total_raised = sum(i.total_issue_size_cr for i in all_items)
        
        # Calculate average listing gain from listed cohort
        avg_gain = sum(l["listing_gain_pct"] for l in self._listed_performance) / len(self._listed_performance) if self._listed_performance else 0.0

        # Top GMP item
        sorted_gmp = sorted(all_items, key=lambda x: x.gmp_pct, reverse=True)
        top_pick = sorted_gmp[0].company_name if sorted_gmp else "N/A"
        top_gmp = sorted_gmp[0].gmp_pct if sorted_gmp else 0.0

        return IPOOverviewMetrics(
            active_bidding_count=active_count,
            upcoming_count=upcoming_count,
            total_capital_raised_cr=round(total_raised, 1),
            average_listing_gain_pct=round(avg_gain, 2),
            top_gmp_pick=top_pick,
            top_gmp_pct=round(top_gmp, 2)
        )

    async def get_listed_performance(self) -> List[ListedIPOPosPerformance]:
        return [ListedIPOPosPerformance(**item) for item in self._listed_performance]


# Global singleton instance
ipo_service = IPOService()
