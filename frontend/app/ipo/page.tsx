"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Calculator,
  RefreshCw,
  X
} from "lucide-react";
import {
  IPOItem,
  IPOStatus,
  IPOMarketType,
  IPORiskVerdict,
  ListedIPOPosPerformance,
  IPOOverviewMetrics,
  getIPOs,
  getIPOOverviewMetrics,
  getListedIPOPerformance
} from "@/lib/api";
import { useToast } from "@/components/toast-provider";

export default function IPOPage() {
  const toast = useToast();
  const [ipos, setIpos] = useState<IPOItem[]>([]);
  const [metrics, setMetrics] = useState<IPOOverviewMetrics | null>(null);
  const [listedIpos, setListedIpos] = useState<ListedIPOPosPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<IPOStatus | "LISTED_PERF">("OPEN");
  const [marketTypeFilter, setMarketTypeFilter] = useState<"ALL" | IPOMarketType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [selectedIPO, setSelectedIPO] = useState<IPOItem | null>(null);
  const [calculatorLots, setCalculatorLots] = useState<number>(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ipoData, metricsData, listedData] = await Promise.all([
        getIPOs(),
        getIPOOverviewMetrics(),
        getListedIPOPerformance()
      ]);
      setIpos(ipoData);
      setMetrics(metricsData);
      setListedIpos(listedData);
    } catch (err: unknown) {
      toast.error("Failed to load IPO data", (err as Error).message || "Please check backend connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredIPOs = useMemo(() => {
    return ipos.filter((item) => {
      if (activeTab !== "LISTED_PERF" && item.status !== activeTab) {
        return false;
      }
      if (marketTypeFilter !== "ALL" && item.market_type !== marketTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.company_name.toLowerCase().includes(q);
        const matchesSymbol = item.symbol.toLowerCase().includes(q);
        const matchesSector = item.sector.toLowerCase().includes(q);
        if (!matchesName && !matchesSymbol && !matchesSector) return false;
      }
      return true;
    });
  }, [ipos, activeTab, marketTypeFilter, searchQuery]);

  const getVerdictBadge = (verdict: IPORiskVerdict) => {
    switch (verdict) {
      case "STRONG_SUBSCRIBE":
        return {
          label: "Strong Subscribe",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <CheckCircle2 size={13} className="text-emerald-500" />
        };
      case "SUBSCRIBE_LONG_TERM":
        return {
          label: "Subscribe (Long Term)",
          badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
          icon: <ShieldCheck size={13} className="text-teal-500" />
        };
      case "NEUTRAL":
        return {
          label: "Neutral / Speculative",
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <HelpCircle size={13} className="text-amber-500" />
        };
      case "AVOID":
        return {
          label: "Avoid (High Risk)",
          badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: <XCircle size={13} className="text-rose-500" />
        };
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="IPO Radar & Risk Analyzer"
          subtitle="Real-time GMP, live subscription velocity, and multi-factor AI risk valuation"
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
          {/* Top Page Sub-Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles size={13} />
                Institutional Primary Markets
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Active & Upcoming Indian Public Offerings
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time GMP, live subscription velocity, and multi-factor TreeSHAP risk explainability across NSE & BSE issues.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.08] shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh Quotes
              </button>
            </div>
          </div>

          {/* KPI Overview Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl cyber-card cyber-card-mint backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Open Bidding Issues</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,231,157,0.8)] animate-ping" />
            </div>
            <div className="text-2xl font-black mt-2 text-white font-mono">
              {metrics.active_bidding_count} Issues Live
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              +{metrics.upcoming_count} upcoming DRHP/RHP pipelines
            </p>
          </div>

          <div className="p-5 rounded-3xl cyber-card cyber-card-iris backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Capital Raising</span>
              <Layers size={16} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-white font-mono">
              ₹{metrics.total_capital_raised_cr.toLocaleString("en-IN")} Cr
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across tracked Mainboard & SME tranches
            </p>
          </div>

          <div className="p-5 rounded-3xl cyber-card cyber-card-mint backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Average Listing Gain</span>
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,231,157,0.4)]">
              +{metrics.average_listing_gain_pct}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across recent debut listings
            </p>
          </div>

          <div className="p-5 rounded-3xl cyber-card cyber-card-iris backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Top GMP Premium</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                HOT
              </span>
            </div>
            <div className="text-2xl font-black mt-2 text-white font-mono">
              +{metrics.top_gmp_pct}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {metrics.top_gmp_pick}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar & Status Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 cyber-card p-3.5 rounded-3xl backdrop-blur-2xl">
        {/* Status Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab("OPEN")}
            className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "OPEN"
                ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,231,157,0.3)]"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse" />
            Open For Bidding
          </button>

          <button
            onClick={() => setActiveTab("UPCOMING")}
            className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "UPCOMING"
                ? "bg-blue-600 text-white font-black shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            <Clock size={13} />
            Upcoming Issues
          </button>

          <button
            onClick={() => setActiveTab("CLOSED")}
            className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "CLOSED"
                ? "bg-purple-600 text-white font-black shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            <CheckCircle2 size={13} />
            Allotment & Closed
          </button>

          <button
            onClick={() => setActiveTab("LISTED_PERF")}
            className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "LISTED_PERF"
                ? "bg-white text-slate-950 font-black shadow-md"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            <BarChart3 size={13} />
            Post-Listing Returns
          </button>
        </div>

        {/* Search & Market Type Filter */}
        <div className="flex items-center gap-2.5">
          {/* Market Type Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/[0.08] text-xs font-bold">
            {(["ALL", "MAINBOARD", "SME"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMarketTypeFilter(t)}
                className={`px-3 py-1 rounded-xl transition-all ${
                  marketTypeFilter === t
                    ? "bg-white/[0.1] text-white shadow-sm font-black border border-white/[0.1]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search company or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/60 border border-white/[0.08] rounded-2xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={28} className="animate-spin text-emerald-500" />
          <p className="text-xs text-slate-500 font-medium">Running multi-factor AI risk valuation on Indian IPOs...</p>
        </div>
      ) : activeTab === "LISTED_PERF" ? (
        /* Post-Listing Performance Table */
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent IPO Performance Tracker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Issue Price vs Listing Day Debut vs Current Market Return
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Live Indian Equities</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Listing Date</th>
                  <th className="py-3 px-4 text-right">Issue Price</th>
                  <th className="py-3 px-4 text-right">Listing Price</th>
                  <th className="py-3 px-4 text-right">Listing Gain</th>
                  <th className="py-3 px-4 text-right">Current LTP</th>
                  <th className="py-3 px-4 text-right">Total Gain Since Issue</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {listedIpos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
                          {item.company_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{item.company_name}</div>
                          <span className="text-[10px] font-mono text-slate-400">{item.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{item.sector}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{item.listing_date}</td>
                    <td className="py-3.5 px-4 text-right font-mono">₹{item.issue_price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">₹{item.listing_price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={item.listing_gain_pct >= 0 ? "text-emerald-500" : "text-rose-500"}>
                        {item.listing_gain_pct >= 0 ? "+" : ""}{item.listing_gain_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{item.current_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span className={item.gain_since_listing_pct >= 0 ? "text-emerald-500" : "text-rose-500"}>
                        {item.gain_since_listing_pct >= 0 ? "+" : ""}{item.gain_since_listing_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.gain_since_listing_pct >= 50
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : item.gain_since_listing_pct >= 0
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      }`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredIPOs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-sm font-bold">No IPOs found</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query to see active issues.</p>
        </div>
      ) : (
        /* Bento Grid of IPO Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIPOs.map((ipo) => {
            const verdict = getVerdictBadge(ipo.ai_analysis.verdict);
            return (
              <div
                key={ipo.id}
                className="flex flex-col justify-between rounded-3xl cyber-card cyber-card-iris p-6 transition-all group backdrop-blur-2xl"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,231,157,0.2)]">
                        {ipo.logo_initials}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white leading-tight group-hover:text-emerald-400 transition-colors">
                          {ipo.company_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">{ipo.symbol}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                            {ipo.market_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.08] shrink-0">
                      {ipo.sector}
                    </span>
                  </div>

                  {/* AI Recommendation Badge */}
                  <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${verdict.badgeClass}`}>
                        {verdict.icon}
                        {verdict.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <span className="text-slate-400">Score:</span>
                      <span className="text-white font-mono font-black">{ipo.ai_analysis.quality_score}/100</span>
                    </div>
                  </div>

                  {/* Pricing & Issue Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/[0.06] text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Price Band</span>
                      <div className="font-black text-white font-mono mt-0.5">
                        ₹{ipo.price_band_low} - ₹{ipo.price_band_high}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Lot Size</span>
                      <div className="font-black text-white font-mono mt-0.5">
                        {ipo.lot_size} sh (₹{ipo.min_investment.toLocaleString("en-IN")})
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Issue Size</span>
                      <div className="font-black text-white font-mono mt-0.5">
                        ₹{ipo.total_issue_size_cr.toLocaleString("en-IN")} Cr
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Fresh Issue</span>
                      <div className="font-black text-emerald-400 font-mono mt-0.5">
                        {ipo.fresh_issue_pct}% Fresh
                      </div>
                    </div>
                  </div>

                  {/* Grey Market Premium (GMP) & Estimated Gain */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 flex items-center justify-between shadow-[0_0_15px_rgba(16,231,157,0.1)]">
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={12} />
                        Live Grey Market Premium
                      </div>
                      <div className="text-sm font-black text-white mt-0.5 font-mono">
                        +₹{ipo.gmp_inr} ({ipo.gmp_pct > 0 ? `+${ipo.gmp_pct}%` : `${ipo.gmp_pct}%`})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold">Est. Gain / Lot</div>
                      <div className="text-sm font-black text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,231,157,0.4)]">
                        +₹{ipo.ai_analysis.estimated_profit_per_lot.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Live Subscription Progress */}
                  {ipo.status === "OPEN" && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Total Subscription Velocity</span>
                        <span className="font-black text-white font-mono">
                          {ipo.subscription.total_multiple}x
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,231,157,0.5)]"
                          style={{
                            width: `${Math.min(100, (ipo.subscription.total_multiple / 10) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>QIB: {ipo.subscription.qib_multiple}x</span>
                        <span>NII: {ipo.subscription.nii_multiple}x</span>
                        <span>Retail: {ipo.subscription.retail_multiple}x</span>
                      </div>
                    </div>
                  )}

                  {/* Bidding Dates */}
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-3 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-indigo-400" />
                      {ipo.open_date} to {ipo.close_date}
                    </span>
                    <span>Allotment: {ipo.allotment_date}</span>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-5 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setSelectedIPO(ipo);
                      setCalculatorLots(1);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-black text-xs border border-white/[0.1] transition-all shadow-sm active:scale-95 group/btn"
                  >
                    <Sparkles size={14} className="text-emerald-400" />
                    <span>View AI Breakdown & Financials</span>
                    <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep-Dive IPO AI Breakdown & Financials Modal */}
      {selectedIPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#070c1a] border border-white/[0.12] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-base flex items-center justify-center shadow-[0_0_15px_rgba(16,231,157,0.2)]">
                  {selectedIPO.logo_initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">
                      {selectedIPO.company_name}
                    </h2>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                      {selectedIPO.market_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedIPO.sector} • Listed on NSE & BSE • Registrar: {selectedIPO.registrar}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedIPO(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* AI Summary Verdict Callout */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    AI Institutional Thesis
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getVerdictBadge(selectedIPO.ai_analysis.verdict).badgeClass}`}>
                  {getVerdictBadge(selectedIPO.ai_analysis.verdict).label}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {selectedIPO.ai_analysis.summary_verdict}
              </p>
            </div>

            {/* AI Factor Scorecard (4 Core Dimensions) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Valuation Score</div>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {selectedIPO.ai_analysis.valuation_score}/100
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Capital Allocation</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                  {selectedIPO.ai_analysis.capital_allocation_score}/100
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Financial Health</div>
                <div className="text-lg font-black text-cyan-400 font-mono mt-1">
                  {selectedIPO.ai_analysis.financial_health_score}/100
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Demand Momentum</div>
                <div className="text-lg font-black text-purple-400 font-mono mt-1">
                  {selectedIPO.ai_analysis.demand_momentum_score}/100
                </div>
              </div>
            </div>

            {/* Catalysts vs Key Red Flags Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Top Structural Catalysts
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedIPO.ai_analysis.top_catalysts.map((cat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{cat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <h4 className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Key Risk Red Flags
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedIPO.ai_analysis.key_red_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3-Year Audited Financial Health */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Audited 3-Year Financial Trajectory
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-400">3Y Revenue CAGR</span>
                  <div className="font-black text-white font-mono mt-1">
                    {selectedIPO.financials.revenue_cagr_3yr}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-400">Operating EBITDA</span>
                  <div className="font-black text-emerald-400 font-mono mt-1">
                    {selectedIPO.financials.ebitda_margin}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-400">Return on Capital (ROCE)</span>
                  <div className="font-black text-cyan-400 font-mono mt-1">
                    {selectedIPO.financials.roce}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-400">Debt to Equity</span>
                  <div className="font-black text-white font-mono mt-1">
                    {selectedIPO.financials.debt_to_equity}x
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Peer Valuation Benchmark */}
            {selectedIPO.peers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Direct Listed Peer Valuation Benchmark
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] text-slate-400 font-bold border-b border-white/[0.06]">
                      <tr>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4 text-right">P/E Ratio</th>
                        <th className="py-3 px-4 text-right">P/B Ratio</th>
                        <th className="py-3 px-4 text-right">Market Cap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] font-medium">
                      <tr className="bg-emerald-500/10 font-black text-emerald-400">
                        <td className="py-3 px-4">{selectedIPO.company_name} (Asking)</td>
                        <td className="py-3 px-4 text-right font-mono">{selectedIPO.ai_analysis.asking_pe.toFixed(1)}x</td>
                        <td className="py-3 px-4 text-right font-mono">-</td>
                        <td className="py-3 px-4 text-right font-mono">₹{selectedIPO.total_issue_size_cr.toLocaleString("en-IN")} Cr</td>
                      </tr>
                      {selectedIPO.peers.map((peer, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-slate-300 font-bold">{peer.peer_name}</td>
                          <td className="py-3 px-4 text-right font-mono text-white">{peer.pe_ratio}x</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{peer.pb_ratio}x</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">₹{peer.market_cap_cr.toLocaleString("en-IN")} Cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Interactive Lot & Profit Calculator */}
            <div className="p-5 rounded-2xl bg-black/60 text-white border border-white/[0.1] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Interactive Application & Listing Gain Calculator
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Number of Lots:</span>
                  <input
                    type="number"
                    min={1}
                    max={13}
                    value={calculatorLots}
                    onChange={(e) => setCalculatorLots(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400">Total Capital Required</span>
                  <div className="text-base font-black font-mono mt-0.5 text-white">
                    ₹{(selectedIPO.min_investment * calculatorLots).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-slate-500">{selectedIPO.lot_size * calculatorLots} Shares</span>
                </div>
                <div>
                  <span className="text-slate-400">Estimated Listing Profit</span>
                  <div className="text-base font-black font-mono mt-0.5 text-emerald-400">
                    +₹{(selectedIPO.ai_analysis.estimated_profit_per_lot * calculatorLots).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">+{selectedIPO.gmp_pct}% Premium</span>
                </div>
                <div>
                  <span className="text-slate-400">Retail Allotment Probability</span>
                  <div className="text-base font-black font-mono mt-0.5 text-blue-400">
                    {selectedIPO.ai_analysis.estimated_allotment_odds_pct}%
                  </div>
                  <span className="text-[10px] text-slate-500">Based on {selectedIPO.subscription.retail_multiple}x Retail</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={selectedIPO.registrar_url}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ExternalLink size={13} />
                Check Allotment on {selectedIPO.registrar}
              </a>

              <button
                onClick={() => setSelectedIPO(null)}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 transition-opacity"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
          </MotionContainer>
        </main>
      </div>
    </div>
  );
}
