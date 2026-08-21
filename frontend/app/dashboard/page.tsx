"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useMarketFeed } from "@/lib/useMarketFeed";
import {
  MotionContainer,
  MotionCard
} from "@/components/ui/motion";
import {
  getPortfolios,
  getCommandCenter,
  getPerformanceTimeline,
  takePortfolioSnapshot,
  getIPOs,
  getMarketNews,
  type PortfolioSummary,
  type CommandCenterOverviewResponse,
  type TimelinePerformanceResponse,
  type HoldingItem,
  type IPOItem,
  type NewsItem,
} from "@/lib/api";

const ALLOCATION_COLORS = [
  "#10b981", // Emerald (Equity)
  "#06b6d4", // Cyan (ETF)
  "#6366f1", // Indigo (Debt)
  "#f59e0b", // Amber (Gold)
  "#ec4899", // Pink (Crypto)
  "#8b5cf6", // Purple (Other)
];

const SECTOR_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#64748b", // Slate
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>("");
  const [overview, setOverview] = useState<CommandCenterOverviewResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelinePerformanceResponse | null>(null);
  const [topIpo, setTopIpo] = useState<IPOItem | null>(null);
  const [breakingNews, setBreakingNews] = useState<NewsItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [takingSnapshot, setTakingSnapshot] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Timeline Controls
  const [timeRange, setTimeRange] = useState<string>("ALL");
  const [timelineMetric, setTimelineMetric] = useState<"VALUE" | "RETURN" | "PNL">("VALUE");
  const [compareBenchmark, setCompareBenchmark] = useState<boolean>(true);

  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Live SSE market tick feed for movers
  const moverSymbols = useMemo(() => {
    if (!overview) return [];
    const symbols = [
      ...overview.top_movers.gainers.map((m) => m.symbol),
      ...overview.top_movers.losers.map((m) => m.symbol),
    ];
    return Array.from(new Set(symbols));
  }, [overview]);

  const { ticks, connectionStatus, activeBadge, flashStates } = useMarketFeed(moverSymbols);

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Load initial portfolio list
  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPortfolios();
      setPortfolios(data);

      if (data.length > 0) {
        const savedId = localStorage.getItem("nexfolio_active_portfolio_id");
        const match = data.find((p) => p.id === savedId);
        const selectedId = match ? match.id : data[0].id;
        setActivePortfolioId(selectedId);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error("Error loading portfolios:", err);
      setError((err as Error).message || "Failed to load portfolios");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPortfolios();
    }
  }, [user, loadPortfolios]);

  // Fetch Command Center Consolidated Data
  const loadCommandCenterData = useCallback(async (portfolioId: string) => {
    if (!portfolioId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getCommandCenter(portfolioId);
      setOverview(data);
    } catch (err: unknown) {
      console.error("Command Center API Error:", err);
      setError((err as Error).message || "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Performance Timeline
  const loadTimelineData = useCallback(async (portfolioId: string, range: string) => {
    if (!portfolioId) return;
    try {
      setTimelineLoading(true);
      const data = await getPerformanceTimeline(portfolioId, range);
      setTimeline(data);
    } catch (err: unknown) {
      console.error("Timeline API Error:", err);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePortfolioId) {
      loadCommandCenterData(activePortfolioId);
      loadTimelineData(activePortfolioId, timeRange);
    }
  }, [activePortfolioId, timeRange, loadCommandCenterData, loadTimelineData]);

  useEffect(() => {
    async function loadIpoAndNews() {
      try {
        const [ipoList, newsList] = await Promise.all([
          getIPOs("OPEN").catch(() => []),
          getMarketNews().catch(() => [])
        ]);
        if (ipoList.length > 0) setTopIpo(ipoList[0]);
        if (newsList.length > 0) setBreakingNews(newsList.slice(0, 2));
      } catch {
        // silent fallback
      }
    }
    loadIpoAndNews();
  }, []);

  // Handle Portfolio Switch
  const handlePortfolioChange = (newId: string) => {
    setActivePortfolioId(newId);
    setSelectedSector(null);
  };

  // Handle On-Demand Valuation Checkpoint Snapshot
  const handleTakeSnapshot = async () => {
    if (!activePortfolioId || takingSnapshot) return;
    try {
      setTakingSnapshot(true);
      await takePortfolioSnapshot(activePortfolioId);
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
      loadTimelineData(activePortfolioId, timeRange);
    } catch (err: unknown) {
      console.error("Snapshot error:", err);
    } finally {
      setTakingSnapshot(false);
    }
  };

  // Filter holdings based on selected sector drilldown
  const displayedHoldings = useMemo(() => {
    if (!overview?.holdings) return [];
    if (!selectedSector) return overview.holdings;
    return overview.holdings.filter((h) => h.sector === selectedSector);
  }, [overview?.holdings, selectedSector]);

  // Format currency in Indian numbering format (₹)
  const formatINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (authLoading || (!overview && loading)) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header activePortfolioId={activePortfolioId} onPortfolioChange={handlePortfolioChange} />
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 animate-pulse">
            <div className="h-32 bg-slate-900/80 rounded-2xl border border-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
              <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
              <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
            </div>
            <div className="h-96 bg-slate-900/80 rounded-2xl border border-slate-800" />
          </main>
        </div>
      </div>
    );
  }

  // Empty State: No Portfolios
  if (portfolios.length === 0 && !loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header activePortfolioId={activePortfolioId} onPortfolioChange={handlePortfolioChange} />
          <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">
              📊
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">Welcome to NexFolio Command Center</h2>
            <p className="text-slate-400 max-w-md text-sm">
              Create your first investment portfolio to activate real-time pulse analytics, institutional risk scoring, and benchmark performance tracking.
            </p>
            <Link
              href="/portfolios"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 text-sm"
            >
              <span>+ Create First Portfolio</span>
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const pulse = overview?.pulse;
  const movers = overview?.top_movers;
  const concentration = overview?.concentration;
  const health = overview?.health;
  const assetAlloc = overview?.asset_allocation || [];
  const sectorAlloc = overview?.sector_allocation || [];
  const recentActivity = overview?.recent_activity || [];

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header activePortfolioId={activePortfolioId} onPortfolioChange={handlePortfolioChange} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between shadow-lg shadow-rose-950/20">
              <span>{error}</span>
              <button
                onClick={() => loadCommandCenterData(activePortfolioId)}
                className="px-3 py-1 bg-rose-500/20 rounded-xl text-xs font-semibold hover:bg-rose-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Sector Concentration Warning Alert Banner */}
          {concentration?.sector_concentration_warning && (
            <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-center gap-3 shadow-lg shadow-amber-500/5 backdrop-blur-md">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <span className="font-semibold text-amber-300">Sector Concentration Warning: </span>
                Your portfolio has <span className="font-bold underline">{concentration.overconcentrated_sector}</span> allocation at{" "}
                <span className="font-bold">{concentration.overconcentrated_sector_pct?.toFixed(1)}%</span>, exceeding the institutional 35% concentration threshold.
              </div>
            </div>
          )}

          <MotionContainer className="space-y-6">
            {/* 1. REAL-TIME PORTFOLIO PULSE (Hero KPI Area) */}
            <MotionCard className="cyber-card cyber-card-mint p-6 sm:p-8 backdrop-blur-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                {/* Left: Net Worth & Active Portfolio Name */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(16,231,157,0.2)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      INSTITUTIONAL COCKPIT
                    </span>
                    <DataPedigreeBadge badge={pulse?.data_badge || activeBadge} />
                    {connectionStatus === "connected" && (
                      <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        5ms STREAM ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                      {formatINR(pulse?.total_value || 0)}
                    </h1>

                    {/* Day P&L Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-black border shadow-lg ${
                        (pulse?.day_pnl || 0) >= 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10"
                      }`}
                    >
                      <span className="text-xs">{(pulse?.day_pnl || 0) >= 0 ? "▲" : "▼"}</span>
                      <span className="font-mono">{formatINR(Math.abs(pulse?.day_pnl || 0))}</span>
                      <span className="text-xs font-semibold opacity-90 font-mono">
                        ({(pulse?.day_pnl_pct || 0) >= 0 ? "+" : ""}
                        {pulse?.day_pnl_pct?.toFixed(2)}% today)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    Active Portfolio: <strong className="text-slate-100 font-bold bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">{overview?.portfolio.name}</strong> • {pulse?.holdings_count || 0} Open Positions
                  </p>
                </div>

                {/* Right: Secondary KPI Grid & Snapshot Checkpoint Button */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/50 p-4 rounded-2xl border border-white/[0.08] backdrop-blur-xl">
                    <div className="px-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invested Capital</div>
                      <div className="text-base font-black text-slate-200 mt-1 font-mono">{formatINR(pulse?.invested_capital || 0)}</div>
                    </div>
                    <div className="px-3 border-l border-white/[0.08]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall ROI</div>
                      <div className={`text-base font-black mt-1 font-mono ${(pulse?.total_pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(pulse?.total_roi_pct || 0) >= 0 ? "+" : ""}
                        {pulse?.total_roi_pct?.toFixed(2)}%
                      </div>
                    </div>
                    <div className="px-3 border-l border-white/[0.08] col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total P&L</div>
                      <div className={`text-base font-black mt-1 font-mono ${(pulse?.total_pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatINR(pulse?.total_pnl || 0)}
                      </div>
                    </div>
                  </div>

                  {/* On-demand snapshot button */}
                  <button
                    onClick={handleTakeSnapshot}
                    disabled={takingSnapshot}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 active:scale-95"
                    title="Records an authentic valuation snapshot checkpoint in MongoDB"
                  >
                    <span>{takingSnapshot ? "Recording..." : snapshotSuccess ? "✓ Checkpoint Saved" : "📸 Checkpoint Snapshot"}</span>
                  </button>
                </div>
              </div>
            </MotionCard>

          {/* 2. PERFORMANCE TIMELINE & BENCHMARK CHART */}
          <section className="cyber-card cyber-card-iris p-6 sm:p-7 backdrop-blur-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span className="text-emerald-400">📈</span> Portfolio Performance Trajectory
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authentic historical valuation timeline with NIFTY 50 comparative benchmark.
                </p>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Metric Mode Switcher */}
                <div className="flex bg-black/60 p-1 rounded-xl border border-white/[0.08] text-xs font-bold">
                  <button
                    onClick={() => setTimelineMetric("VALUE")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timelineMetric === "VALUE" ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ₹ Valuation
                  </button>
                  <button
                    onClick={() => setTimelineMetric("RETURN")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timelineMetric === "RETURN" ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    % Return
                  </button>
                  <button
                    onClick={() => setTimelineMetric("PNL")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timelineMetric === "PNL" ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ₹ P&L
                  </button>
                </div>

                {/* Benchmark Toggle Checkbox */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-black/60 px-3 py-1.5 rounded-xl border border-white/[0.08] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={compareBenchmark}
                    onChange={(e) => setCompareBenchmark(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>Compare NIFTY 50</span>
                </label>

                {/* Range Filters */}
                <div className="flex bg-black/60 p-1 rounded-xl border border-white/[0.08] text-xs font-bold">
                  {["1W", "1M", "3M", "1Y", "ALL"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-2.5 py-1.5 rounded-lg transition-all ${
                        timeRange === range ? "bg-slate-800 text-emerald-400 border border-slate-700" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Area or Honest Empty State */}
            {timelineLoading ? (
              <div className="h-72 w-full flex items-center justify-center text-slate-500 text-sm animate-pulse">
                Loading performance timeline...
              </div>
            ) : timeline && timeline.has_sufficient_history && timeline.data_points.length >= 2 ? (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline.data_points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                      tickFormatter={(v) =>
                        timelineMetric === "RETURN" ? `${v}%` : `₹${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "1rem",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                        fontSize: "12px",
                      }}
                      formatter={(val, name) => {
                        const v = Number(val) || 0;
                        const n = String(name || "");
                        if (n === "portfolio_return_pct" || n === "nifty_return_pct") {
                          return [`${v.toFixed(2)}%`, n === "nifty_return_pct" ? "NIFTY 50" : "Portfolio ROI"];
                        }
                        return [formatINR(v), n === "portfolio_value" ? "Valuation" : "Invested Capital"];
                      }}
                    />
                    {/* Primary Portfolio Area */}
                    {timelineMetric === "VALUE" && (
                      <Area
                        type="monotone"
                        dataKey="portfolio_value"
                        name="portfolio_value"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#portfolioGradient)"
                      />
                    )}
                    {timelineMetric === "RETURN" && (
                      <Area
                        type="monotone"
                        dataKey="portfolio_return_pct"
                        name="portfolio_return_pct"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#portfolioGradient)"
                      />
                    )}
                    {timelineMetric === "PNL" && (
                      <Area
                        type="monotone"
                        dataKey="portfolio_pnl"
                        name="portfolio_pnl"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#portfolioGradient)"
                      />
                    )}

                    {/* Benchmark NIFTY 50 Line */}
                    {compareBenchmark && timeline.benchmark_status === "AVAILABLE" && (
                      <Line
                        type="monotone"
                        dataKey="nifty_return_pct"
                        name="nifty_return_pct"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Honest Empty State for Performance History */
              <div className="h-64 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center bg-slate-950/40">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl mb-3 text-slate-400">
                  📊
                </div>
                <h3 className="text-sm font-semibold text-slate-200">Insufficient Historical Valuation Points</h3>
                <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                  NexFolio tracks genuine historical performance without synthesizing fake values. Snapshots are automatically recorded as you execute BUY/SELL orders or checkpoint milestones.
                </p>
                <button
                  onClick={handleTakeSnapshot}
                  disabled={takingSnapshot}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
                >
                  {takingSnapshot ? "Creating Checkpoint..." : "+ Create First Valuation Checkpoint"}
                </button>
              </div>
            )}
          </section>

          {/* 3. BENTO GRID: TOP MOVERS, CONCENTRATION & HEALTH */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top Movers Widget */}
            <div className="cyber-card cyber-card-mint p-5 sm:p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-emerald-400">🚀</span> Top Movers Today
                  </h3>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    Real-time
                  </span>
                </div>

                <div className="space-y-2.5">
                  {movers?.gainers && movers.gainers.length > 0 ? (
                    movers.gainers.slice(0, 3).map((g) => {
                      const flash = flashStates[g.symbol] || flashStates[`${g.symbol}.NS`];
                      const flashClass = flash === "up" ? "bg-emerald-500/20 shadow-[0_0_15px_rgba(16,231,157,0.3)]" : flash === "down" ? "bg-rose-500/20" : "";
                      const liveTick = ticks[g.symbol] || ticks[`${g.symbol}.NS`];
                      const dayPct = liveTick ? liveTick.day_change_pct : g.day_change_pct;
                      return (
                        <div
                          key={g.symbol}
                          onClick={() => setSelectedSector(g.sector)}
                          className={`flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06] hover:border-emerald-500/40 hover:bg-white/[0.04] cursor-pointer transition-all duration-300 text-xs ${flashClass}`}
                        >
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              {g.symbol}
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">NSE</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{g.company_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-emerald-400 font-mono">+{dayPct.toFixed(2)}%</div>
                            <div className="text-[10px] text-slate-400 font-mono">{formatINR(g.day_pnl_contribution)}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 py-6 text-center">No open holdings to calculate movers</div>
                  )}

                  {movers?.losers && movers.losers.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      {movers.losers.slice(0, 2).map((l) => {
                        const flash = flashStates[l.symbol] || flashStates[`${l.symbol}.NS`];
                        const flashClass = flash === "up" ? "bg-emerald-500/20" : flash === "down" ? "bg-rose-500/20 shadow-[0_0_15px_rgba(255,59,105,0.3)]" : "";
                        const liveTick = ticks[l.symbol] || ticks[`${l.symbol}.NS`];
                        const dayPct = liveTick ? liveTick.day_change_pct : l.day_change_pct;
                        return (
                          <div
                            key={l.symbol}
                            onClick={() => setSelectedSector(l.sector)}
                            className={`flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/[0.04] hover:border-rose-500/40 hover:bg-white/[0.04] cursor-pointer transition-all duration-300 text-xs mb-1.5 ${flashClass}`}
                          >
                            <div>
                              <div className="font-bold text-slate-300">{l.symbol}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{l.company_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-rose-400 font-mono">{dayPct.toFixed(2)}%</div>
                              <div className="text-[10px] text-slate-500 font-mono">{formatINR(l.day_pnl_contribution)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-[10px] font-mono text-slate-500 text-center">Click a mover to filter holdings ledger</div>
            </div>

            {/* Concentration Intelligence Card */}
            <div className="cyber-card cyber-card-cyan p-5 sm:p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-cyan-400">🎯</span> Concentration Intelligence
                  </h3>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    Hedge Metric
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Largest Holding Indicator */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Largest Position</div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <div className="font-black text-slate-100 text-sm">
                        {concentration?.largest_holding_symbol || "None"}
                        <span className="text-xs text-slate-400 font-normal ml-2">
                          ({concentration?.largest_holding_name})
                        </span>
                      </div>
                      <div className="text-sm font-black text-emerald-400 font-mono">
                        {concentration?.largest_holding_pct?.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full shadow-[0_0_10px_rgba(16,231,157,0.5)]"
                        style={{ width: `${Math.min(100, concentration?.largest_holding_pct || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Top-5 Holdings Ratio */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top 5 Positions Ratio</div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <div className="text-xs text-slate-300 font-medium">Cumulative Allocation</div>
                      <div className="text-sm font-black text-cyan-400 font-mono">
                        {concentration?.top_5_concentration_pct?.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        style={{ width: `${Math.min(100, concentration?.top_5_concentration_pct || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Diversification Index:</span>
                <span className="font-black text-slate-200">{health?.diversification_score?.toFixed(2) || "0.00"} / 1.00</span>
              </div>
            </div>

            {/* Portfolio Health Snapshot */}
            <div className="cyber-card cyber-card-iris p-5 sm:p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-indigo-400">🛡️</span> Institutional Health
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                    health?.risk_category === "LOW" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10" :
                    health?.risk_category === "HIGH" ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>
                    {health?.risk_category || "MODERATE"} RISK
                  </span>
                </div>

                <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30">
                    {health?.health_score || 0}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">Health Score</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Multi-factor calibration across Sharpe ratio, beta & downside volatility.
                    </div>
                  </div>
                </div>

                {/* Metric Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Volatility</div>
                    <div className="font-bold text-slate-200 mt-0.5">{health?.volatility_label || "18.2%"}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Sharpe Ratio</div>
                    <div className="font-bold text-slate-200 mt-0.5">{health?.sharpe_ratio?.toFixed(2) || "1.20"}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Max Drawdown</div>
                    <div className="font-bold text-rose-400 mt-0.5">{health?.max_drawdown_label || "-12.5%"}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">AI Confidence</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{(Number(health?.confidence || 0.85) * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              <Link
                href="/intelligence"
                className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-center text-xs font-bold text-emerald-400 transition-all border border-white/[0.08] flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Explore TreeSHAP Explainability</span>
                <span>➔</span>
              </Link>
            </div>
          </div>

          {/* 3.5. PRIMARY MARKETS (IPO) & MARKET NEWS WIRE WIDGETS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: IPO Radar Spotlight */}
            <div className="cyber-card cyber-card-iris p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 px-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-black shadow-[0_0_12px_rgba(168,85,247,0.2)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                      HOT IPO
                    </span>
                    <h3 className="text-sm font-black text-white">Primary Market Radar</h3>
                  </div>
                  <Link href="/ipo" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <span>Explore All</span>
                    <span>➔</span>
                  </Link>
                </div>

                {topIpo ? (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-black text-slate-100 text-sm">{topIpo.company_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ₹{topIpo.price_band_low} - ₹{topIpo.price_band_high} • Lot: {topIpo.lot_size} shares
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                        {topIpo.ai_analysis.verdict.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono">
                      <div className="p-2 rounded-xl bg-white/[0.02]">
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-bold">Live GMP</span>
                        <div className="font-black text-emerald-400 text-xs mt-0.5">+{topIpo.gmp_pct}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.02]">
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-bold">AI Score</span>
                        <div className="font-black text-slate-100 text-xs mt-0.5">{topIpo.ai_analysis.quality_score}/100</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.02]">
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-bold">Velocity</span>
                        <div className="font-black text-cyan-400 text-xs mt-0.5">{topIpo.subscription.total_multiple}x</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active IPOs open for bidding today.
                  </div>
                )}
              </div>

              <Link
                href="/ipo"
                className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold text-center border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>View Full AI Risk Scorecard & GMP</span>
                <span>➔</span>
              </Link>
            </div>

            {/* Right: Live Market News Wire */}
            <div className="cyber-card cyber-card-cyan p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 px-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-black shadow-[0_0_12px_rgba(6,182,212,0.2)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      LIVE WIRE
                    </span>
                    <h3 className="text-sm font-black text-white">Sentiment Radar News</h3>
                  </div>
                  <Link href="/news" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    <span>View Wire</span>
                    <span>➔</span>
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {breakingNews.length > 0 ? (
                    breakingNews.map((n) => (
                      <div
                        key={n.id}
                        className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-xs hover:border-cyan-500/30 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">{n.source} • {n.time_ago}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                            n.sentiment === "BULLISH"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : n.sentiment === "BEARISH"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
                          }`}>
                            {n.sentiment}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100 text-xs line-clamp-1">{n.headline}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{n.summary}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No market news updates recorded.
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/news"
                className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold text-center border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Read Full Market Sentiment Wire</span>
                <span>➔</span>
              </Link>
            </div>
          </div>

          {/* 4. ALLOCATION DRILLDOWN & RECENT ACTIVITY (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Sector & Asset Allocation (2 cols on lg) */}
            <div className="lg:col-span-2 cyber-card p-6 sm:p-7 backdrop-blur-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="text-emerald-400">🍩</span> Asset & Sector Allocation Drill-Down
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any sector below to filter and inspect its individual constituent holdings.
                  </p>
                </div>
                {selectedSector && (
                  <button
                    onClick={() => setSelectedSector(null)}
                    className="self-start sm:self-auto px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-400 rounded-xl border border-emerald-500/30 transition-all"
                  >
                    ✕ Clear Filter ({selectedSector})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Class Allocation Donut */}
                <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.06]">
                  <div className="text-xs font-bold text-slate-300 mb-2">Asset Class Exposure</div>
                  {assetAlloc.length > 0 ? (
                    <div className="h-44 flex items-center">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={assetAlloc}
                              dataKey="percentage"
                              nameKey="name"
                              innerRadius={35}
                              outerRadius={60}
                              paddingAngle={3}
                            >
                              {assetAlloc.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "#070c1a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "0.75rem" }}
                              formatter={(val) => [`${Number(val || 0).toFixed(1)}%`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-1.5 text-xs">
                        {assetAlloc.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }}
                              />
                              {item.name}
                            </span>
                            <span className="font-semibold text-slate-200">{item.percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-500">No asset data</div>
                  )}
                </div>

                {/* Sector Allocation Breakdown */}
                <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.06]">
                  <div className="text-xs font-bold text-slate-300 mb-2">Sector Concentration</div>
                  {sectorAlloc.length > 0 ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {sectorAlloc.map((s, idx) => (
                        <div
                          key={s.name}
                          onClick={() => setSelectedSector(selectedSector === s.name ? null : s.name)}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                            selectedSector === s.name
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,231,157,0.15)]"
                              : "bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                            />
                            <span>{s.name}</span>
                          </div>
                          <div className="font-mono font-black">{s.percentage.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-500">No sector data</div>
                  )}
                </div>
              </div>

              {/* Holdings Constituent Table (Filtered by drilldown) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {selectedSector ? `Constituents in ${selectedSector}` : "All Active Holdings"} ({displayedHoldings.length})
                  </h4>
                  <Link href="/holdings" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
                    Manage All Holdings ➔
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Asset</th>
                        <th className="py-3.5 px-4 font-bold">Quantity</th>
                        <th className="py-3.5 px-4 font-bold">Avg Price</th>
                        <th className="py-3.5 px-4 font-bold">LTP</th>
                        <th className="py-3.5 px-4 font-bold">Current Value</th>
                        <th className="py-3.5 px-4 font-bold">P&L</th>
                        <th className="py-3.5 px-4 text-right font-bold">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {displayedHoldings.length > 0 ? (
                        displayedHoldings.slice(0, 6).map((h: HoldingItem) => (
                          <tr key={h.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-100">{h.symbol}</div>
                              <div className="text-[10px] text-slate-400">{h.company_name}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{h.quantity}</td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{formatINR(h.avg_buy_price)}</td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{formatINR(h.current_price)}</td>
                            <td className="py-3 px-4 font-bold text-slate-100 font-mono">{formatINR(h.current_value)}</td>
                            <td className="py-3 px-4 font-mono">
                              <span className={`font-black ${h.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {h.unrealized_pnl >= 0 ? "+" : ""}
                                {formatINR(h.unrealized_pnl)} ({h.unrealized_pnl_pct.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">
                              {h.weight.toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No holdings match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Recent Transaction Activity Stream */}
            <div className="cyber-card p-6 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">⚡</span> Recent Audit Activity
                  </h3>
                  <Link href="/transactions" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
                    Full Ledger ➔
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs hover:border-white/[0.15] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              tx.transaction_type === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {tx.transaction_type}
                          </span>
                          <div>
                            <div className="font-bold text-slate-100">{tx.symbol}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {tx.quantity} units @ {formatINR(tx.price)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-black text-slate-100">{formatINR(tx.total_amount)}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.transaction_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No recent transactions recorded in this portfolio.
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/transactions"
                className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold text-center border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Record New Transaction</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
          </MotionContainer>
        </main>
      </div>
    </div>
  );
}