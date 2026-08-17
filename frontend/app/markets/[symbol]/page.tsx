"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getStockDetail,
  toggleWatchlistSymbol,
  getWatchlists,
  createTransaction,
  getPortfolios,
  getStockNews,
  StockDetailResponse,
  WatchlistResponse,
  NewsItem
} from "@/lib/api";
import {
  ArrowLeft,
  Star,
  Zap,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Sparkles,
  RefreshCw,
  Newspaper,
  X
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useToast } from "@/components/toast-provider";

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const rawSymbol = decodeURIComponent(resolvedParams.symbol);
  const toast = useToast();

  const [stock, setStock] = useState<StockDetailResponse | null>(null);
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [timeframe, setTimeframe] = useState<"1W" | "1M" | "3M" | "1Y" | "ALL">("1Y");
  const [showSMA, setShowSMA] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Trade Modal
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeShares, setTradeShares] = useState(10);
  const [tradePortfolioId, setTradePortfolioId] = useState("");
  const [userPortfolios, setUserPortfolios] = useState<{ id: string; name: string }[]>([]);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const primaryWatchlistId = watchlists.length > 0 ? watchlists[0].id : null;

  // 1. Fetch Stock Detail & Watchlists
  const loadStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [detailRes, wlRes, portRes, newsRes] = await Promise.all([
        getStockDetail(rawSymbol),
        getWatchlists().catch(() => []),
        getPortfolios().catch(() => []),
        getStockNews(rawSymbol).catch(() => [])
      ]);
      setStock(detailRes);
      setWatchlists(wlRes);
      setStockNews(newsRes);
      setUserPortfolios(portRes.map(p => ({ id: p.id, name: p.name })));
      if (portRes.length > 0) {
        setTradePortfolioId(portRes[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stock details.");
    } finally {
      setLoading(false);
    }
  }, [rawSymbol]);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  // 2. Toggle Watchlist
  const handleToggleWatchlist = async () => {
    if (!primaryWatchlistId || !stock) return;
    try {
      await toggleWatchlistSymbol(primaryWatchlistId, stock.symbol);
      setStock(prev => prev ? { ...prev, is_in_watchlist: !prev.is_in_watchlist } : null);
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  // 3. Execute Trade
  const handleExecuteTrade = async () => {
    if (!stock || !tradePortfolioId) return;
    try {
      setExecutingTrade(true);
      await createTransaction({
        portfolio_id: tradePortfolioId,
        transaction_type: "BUY",
        symbol: stock.symbol,
        quantity: tradeShares,
        price: stock.current_price,
        notes: `Order executed from ${stock.base_symbol} Detail page`
      });
      toast.success("Order Executed", `Purchased ${tradeShares} shares of ${stock.base_symbol}.`);
      setTradeSuccess(`Successfully purchased ${tradeShares} shares of ${stock.base_symbol}!`);
      setTimeout(() => {
        setShowTradeModal(false);
        setTradeSuccess(null);
      }, 1500);
      loadStockData();
    } catch (err: unknown) {
      toast.error("Trade Execution Error", err instanceof Error ? err.message : "Trade recording failed.");
    } finally {
      setExecutingTrade(false);
    }
  };

  // 4. Sliced Price History according to selected timeframe
  const filteredHistory = React.useMemo(() => {
    if (!stock || !stock.price_history) return [];
    const h = stock.price_history;
    if (timeframe === "1W") return h.slice(-5);
    if (timeframe === "1M") return h.slice(-22);
    if (timeframe === "3M") return h.slice(-66);
    if (timeframe === "1Y") return h.slice(-252);
    return h;
  }, [stock, timeframe]);

  // SVG Chart Metrics
  const chartPoints = React.useMemo(() => {
    if (filteredHistory.length === 0) return { line: "", sma20: "", sma50: "", minP: 0, maxP: 1 };
    const prices = filteredHistory.map(p => p.close);
    const minP = Math.min(...prices) * 0.98;
    const maxP = Math.max(...prices) * 1.02;
    const range = maxP - minP || 1;

    const width = 800;
    const height = 240;

    const getX = (idx: number) => (idx / (filteredHistory.length - 1 || 1)) * width;
    const getY = (price: number) => height - ((price - minP) / range) * height;

    const line = filteredHistory.map((p, i) => `${getX(i)},${getY(p.close)}`).join(" ");

    const sma20Pts = filteredHistory
      .map((p, i) => p.sma_20 ? `${getX(i)},${getY(p.sma_20)}` : null)
      .filter(Boolean)
      .join(" ");

    const sma50Pts = filteredHistory
      .map((p, i) => p.sma_50 ? `${getX(i)},${getY(p.sma_50)}` : null)
      .filter(Boolean)
      .join(" ");

    return { line, sma20: sma20Pts, sma50: sma50Pts, minP, maxP };
  }, [filteredHistory]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="Stock Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to NSE Screener
            </Link>

            {stock && (
              <DataPedigreeBadge
                badge={stock.data_badge}
                provider={stock.provider}
                session={stock.market_session}
                isStale={stock.is_stale}
                fallbackReason={stock.fallback_reason}
              />
            )}
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-emerald-400" />
              <p className="text-sm font-semibold">Extracting institutional price trajectory & fundamentals...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Main Stock Detail Body */}
          {!loading && !error && stock && (
            <>
              {/* Header Card: Symbol, Price, Day Change, 52W Progress, Action Buttons */}
              <div className="p-6 lg:p-8 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Symbol & Name */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl lg:text-3xl font-black text-white">{stock.base_symbol}</h1>
                      <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                        {stock.sector}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium">
                        NSE / Equity
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">{stock.company_name}</p>
                  </div>

                  {/* Price & Day Change */}
                  <div className="flex items-baseline md:items-end flex-col">
                    <div className="text-3xl lg:text-4xl font-black text-white font-mono">
                      ₹{stock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${
                      stock.day_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {stock.day_change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{stock.day_change_pct >= 0 ? `+₹${stock.day_change}` : `₹${stock.day_change}`}</span>
                      <span>({stock.day_change_pct >= 0 ? `+${stock.day_change_pct}%` : `${stock.day_change_pct}%`})</span>
                      <span className="text-slate-500 text-xs font-normal">Today</span>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleToggleWatchlist}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
                        stock.is_in_watchlist
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-950 text-slate-300 border-slate-700 hover:text-white"
                      }`}
                    >
                      <Star size={16} className={stock.is_in_watchlist ? "fill-amber-400" : ""} />
                      {stock.is_in_watchlist ? "Watching" : "Watchlist"}
                    </button>

                    <button
                      onClick={() => setShowTradeModal(true)}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
                    >
                      <Zap size={16} />
                      Trade / Buy
                    </button>
                  </div>
                </div>

                {/* 52-Week Range Slider Indicator */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">52W Low: <strong className="text-slate-200 font-mono">₹{stock.low_52w}</strong></span>
                    <span className="text-indigo-300 font-bold">52W Range Position ({stock.position_in_52w_range_pct}% of Range)</span>
                    <span className="text-slate-400">52W High: <strong className="text-slate-200 font-mono">₹{stock.high_52w}</strong></span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 rounded-full"
                      style={{ width: `${Math.max(5, Math.min(100, stock.position_in_52w_range_pct))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Price Chart & Moving Averages (8 cols) & Key Fundamentals (4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Price History Chart Card (8 cols) */}
                <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Historical Price Trajectory</h3>
                      <p className="text-xs text-slate-400">
                        Institutional OHLC series with SMA-20 and SMA-50 technical trend overlays
                      </p>
                    </div>

                    {/* Timeframe selector */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      {(["1W", "1M", "3M", "1Y", "ALL"] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            timeframe === tf
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Price Chart */}
                  <div className="relative w-full h-64 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden">
                    {chartPoints.line ? (
                      <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="stockPriceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="0" y1="60" x2="800" y2="60" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                        <line x1="0" y1="120" x2="800" y2="120" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                        <line x1="0" y1="180" x2="800" y2="180" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

                        {/* SMA 50 Line (Indigo) */}
                        {showSMA && chartPoints.sma50 && (
                          <polyline
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            points={chartPoints.sma50}
                          />
                        )}

                        {/* SMA 20 Line (Teal) */}
                        {showSMA && chartPoints.sma20 && (
                          <polyline
                            fill="none"
                            stroke="#2dd4bf"
                            strokeWidth="1.5"
                            points={chartPoints.sma20}
                          />
                        )}

                        {/* Main Close Price Line (Emerald) */}
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={chartPoints.line}
                        />
                      </svg>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                        No historical candle observations available for this timeframe.
                      </div>
                    )}

                    {/* Chart Legend & Toggles */}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-2.5 h-0.5 bg-emerald-400" /> Close Price
                        </span>
                        <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                          <span className="w-2.5 h-0.5 bg-teal-400" /> SMA-20
                        </span>
                        <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                          <span className="w-2.5 h-0.5 bg-indigo-400" /> SMA-50
                        </span>
                      </div>

                      <button
                        onClick={() => setShowSMA(!showSMA)}
                        className="text-slate-400 hover:text-white font-semibold transition-colors"
                      >
                        {showSMA ? "Hide Overlays" : "Show Overlays"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Key Fundamentals Grid Card (4 cols) */}
                <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 flex flex-col justify-between">
                  <h3 className="text-base font-bold text-white">Security Fundamentals</h3>

                  <div className="space-y-3">
                    {[
                      { label: "Day Range", value: `₹${stock.low} - ₹${stock.high}` },
                      { label: "Open Price", value: `₹${stock.open}` },
                      { label: "Trading Volume", value: stock.volume.toLocaleString("en-IN") },
                      { label: "52-Week High", value: `₹${stock.high_52w}` },
                      { label: "52-Week Low", value: `₹${stock.low_52w}` },
                      { label: "Stock Beta (vs NIFTY 50)", value: stock.beta.toFixed(2) },
                      { label: "Annualized Volatility", value: `${(stock.annualized_volatility * 100).toFixed(1)}%` },
                    ].map(f => (
                      <div key={f.label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                        <span className="text-slate-400 font-medium">{f.label}</span>
                        <span className="font-bold text-white font-mono">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Portfolio Exposure & AI Bridge Context */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Cross-Portfolio Exposure Card (6 cols) */}
                <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Briefcase size={18} className="text-emerald-400" />
                      Your Portfolio Exposure
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {stock.portfolio_exposure.portfolio_name || "Active Portfolio"}
                    </span>
                  </div>

                  {stock.portfolio_exposure.has_position ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Shares Held</p>
                          <p className="text-base font-black text-white mt-0.5">{stock.portfolio_exposure.quantity}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Buy Price</p>
                          <p className="text-base font-black text-slate-200 mt-0.5 font-mono">₹{stock.portfolio_exposure.avg_buy_price}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Valuation</p>
                          <p className="text-base font-black text-emerald-400 mt-0.5 font-mono">₹{stock.portfolio_exposure.current_valuation.toLocaleString("en-IN")}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Portfolio Weight</p>
                          <p className="text-base font-black text-indigo-400 mt-0.5">{stock.portfolio_exposure.portfolio_weight_pct}%</p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Unrealized Profit / Loss:</span>
                        <span className={`font-black font-mono flex items-center gap-1 ${
                          stock.portfolio_exposure.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {stock.portfolio_exposure.unrealized_pnl >= 0 ? `+₹${stock.portfolio_exposure.unrealized_pnl}` : `₹${stock.portfolio_exposure.unrealized_pnl}`}
                          ({stock.portfolio_exposure.unrealized_roi_pct >= 0 ? `+${stock.portfolio_exposure.unrealized_roi_pct}%` : `${stock.portfolio_exposure.unrealized_roi_pct}%`})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                      <p className="text-xs font-bold text-white">No Position in Active Portfolio</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        You do not currently own shares of {stock.base_symbol}. Adding this security will introduce exposure to the {stock.sector} sector.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. AI Intelligence Bridge Card (6 cols) */}
                <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/70 border border-indigo-500/30 backdrop-blur-md space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-400" />
                      <h3 className="text-base font-bold text-white">NexFolio Intelligence Context</h3>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {stock.ai_risk_context}
                    </p>

                    <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                      <p className="font-bold">✦ Multiclass ML Risk Impact:</p>
                      <p className="text-[11px] text-indigo-300">
                        Simulate how changing your holding of {stock.base_symbol} affects your portfolio&apos;s 4-pillar health score and SHAP concentration drivers.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/intelligence"
                    className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-indigo-300 text-xs font-bold border border-indigo-500/40 text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
                  >
                    Open What-If Risk Simulator ➔
                  </Link>
                </div>
              </div>

              {/* Row 4: Company Related News & Sentiment Wire */}
              {stockNews.length > 0 && (
                <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Newspaper size={18} className="text-blue-400" />
                      <h3 className="text-base font-bold text-white">
                        Headlines & Sentiment Wire: {stock.company_name}
                      </h3>
                    </div>
                    <Link href="/news" className="text-xs text-blue-400 hover:underline">
                      Explore Full Market Wire ➔
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stockNews.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">{n.source} • {n.time_ago}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            n.sentiment === "BULLISH"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : n.sentiment === "BEARISH"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {n.sentiment}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-xs leading-snug">{n.headline}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{n.summary}</p>
                        <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[10px] text-blue-300 font-medium">
                          <span className="font-bold">✦ AI Takeaway: </span>
                          {n.ai_takeaway}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Modal */}
              {showTradeModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">Record Buy Order</h3>
                        <p className="text-xs text-slate-400">{stock.company_name} ({stock.base_symbol})</p>
                      </div>
                      <button
                        onClick={() => setShowTradeModal(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Target Portfolio</label>
                        <select
                          value={tradePortfolioId}
                          onChange={e => setTradePortfolioId(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                        >
                          {userPortfolios.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Quantity (Shares)</label>
                          <input
                            type="number"
                            min="1"
                            value={tradeShares}
                            onChange={e => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Market Price</label>
                          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-400 font-mono font-bold">
                            ₹{stock.current_price}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Total Order Value:</span>
                        <span className="text-sm font-black text-white font-mono">
                          ₹{(tradeShares * stock.current_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {tradeSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                          {tradeSuccess}
                        </div>
                      )}

                      <button
                        onClick={handleExecuteTrade}
                        disabled={executingTrade}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {executingTrade ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                        {executingTrade ? "Recording Order..." : "Confirm & Add to Portfolio"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
