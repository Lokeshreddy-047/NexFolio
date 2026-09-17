"use client";

import React, { useState, useEffect, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
import {
  getStockDetail,
  toggleWatchlistSymbol,
  getWatchlists,
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
  BarChart3,
  Activity
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { OrderExecutionModal } from "@/components/order-execution-modal";

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const rawSymbol = decodeURIComponent(resolvedParams.symbol);

  const [stock, setStock] = useState<StockDetailResponse | null>(null);
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [timeframe, setTimeframe] = useState<"1W" | "1M" | "3M" | "1Y" | "ALL">("1Y");
  const [chartMode, setChartMode] = useState<"CANDLESTICK" | "AREA">("CANDLESTICK");
  const [showSMA, setShowSMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order Execution Modal
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");

  const primaryWatchlistId = watchlists.length > 0 ? watchlists[0].id : null;

  // 1. Fetch Stock Detail & Watchlists
  const loadStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [detailRes, wlRes, newsRes] = await Promise.all([
        getStockDetail(rawSymbol),
        getWatchlists().catch(() => []),
        getStockNews(rawSymbol).catch(() => [])
      ]);
      setStock(detailRes);
      setWatchlists(wlRes);
      setStockNews(newsRes);
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

  // 3. Sliced Price History according to selected timeframe
  const filteredHistory = useMemo(() => {
    if (!stock || !stock.price_history) return [];
    const h = stock.price_history;
    if (timeframe === "1W") return h.slice(-5);
    if (timeframe === "1M") return h.slice(-22);
    if (timeframe === "3M") return h.slice(-66);
    if (timeframe === "1Y") return h.slice(-252);
    return h;
  }, [stock, timeframe]);

  // 4. RSI (14-period) calculation
  const rsiSeries = useMemo(() => {
    if (filteredHistory.length < 15) return [];
    const closes = filteredHistory.map(p => p.close);
    const rsi: (number | null)[] = new Array(closes.length).fill(null);
    let gains = 0;
    let losses = 0;
    const period = 14;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }

    return rsi;
  }, [filteredHistory]);

  // 5. SVG Technical Chart Coordinates
  const chartPoints = useMemo(() => {
    if (filteredHistory.length === 0) {
      return {
        line: "",
        area: "",
        sma20: "",
        sma50: "",
        rsiLine: "",
        minP: 0,
        maxP: 1,
        candles: [],
        volumeBars: [],
        width: 800,
        priceHeight: 190,
        totalHeight: showRSI ? 320 : 250
      };
    }

    const width = 800;
    const priceHeight = 185;
    const volumeHeight = 50;
    const volumeYStart = 195;
    const totalHeight = showRSI ? 320 : 250;

    const highs = filteredHistory.map(p => p.high);
    const lows = filteredHistory.map(p => p.low);
    const volumes = filteredHistory.map(p => p.volume);

    const minP = Math.min(...lows) * 0.985;
    const maxP = Math.max(...highs) * 1.015;
    const range = maxP - minP || 1;
    const maxVol = Math.max(...volumes, 1);

    const getX = (idx: number) => (idx / (filteredHistory.length - 1 || 1)) * (width - 40) + 20;
    const getY = (price: number) => priceHeight - ((price - minP) / range) * priceHeight + 10;

    // Line & Area coordinates
    const line = filteredHistory.map((p, i) => `${getX(i)},${getY(p.close)}`).join(" ");
    const area = `${getX(0)},${priceHeight + 10} ` + line + ` ${getX(filteredHistory.length - 1)},${priceHeight + 10}`;

    // Moving Averages
    const sma20Pts = filteredHistory
      .map((p, i) => p.sma_20 ? `${getX(i)},${getY(p.sma_20)}` : null)
      .filter(Boolean)
      .join(" ");

    const sma50Pts = filteredHistory
      .map((p, i) => p.sma_50 ? `${getX(i)},${getY(p.sma_50)}` : null)
      .filter(Boolean)
      .join(" ");

    // Candlesticks
    const candleWidth = Math.max(2, Math.min(10, ((width - 40) / filteredHistory.length) * 0.65));
    const candles = filteredHistory.map((p, i) => {
      const cx = getX(i);
      const isBull = p.close >= p.open;
      const openY = getY(p.open);
      const closeY = getY(p.close);
      const highY = getY(p.high);
      const lowY = getY(p.low);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      return {
        x: cx,
        isBull,
        highY,
        lowY,
        bodyTop,
        bodyHeight,
        candleWidth,
        point: p
      };
    });

    // Volume Bars
    const volumeBars = filteredHistory.map((p, i) => {
      const cx = getX(i);
      const isBull = p.close >= p.open;
      const h = (p.volume / maxVol) * volumeHeight;
      const y = volumeYStart + (volumeHeight - h);
      return {
        x: cx - candleWidth / 2,
        y,
        width: candleWidth,
        height: Math.max(1, h),
        isBull,
        volume: p.volume
      };
    });

    // RSI line (Y from 265 to 315)
    let rsiLine = "";
    if (showRSI && rsiSeries.length > 0) {
      const rsiTop = 265;
      const rsiHeight = 50;
      rsiLine = rsiSeries
        .map((r, i) => (r !== null ? `${getX(i)},${rsiTop + rsiHeight - (r / 100) * rsiHeight}` : null))
        .filter(Boolean)
        .join(" ");
    }

    return {
      line,
      area,
      sma20: sma20Pts,
      sma50: sma50Pts,
      rsiLine,
      minP,
      maxP,
      candles,
      volumeBars,
      width,
      priceHeight,
      totalHeight
    };
  }, [filteredHistory, showRSI, rsiSeries]);

  const activeHoverPoint = hoverIndex !== null && filteredHistory[hoverIndex] ? filteredHistory[hoverIndex] : null;

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="Stock Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
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
                      onClick={() => {
                        setTradeSide("BUY");
                        setShowTradeModal(true);
                      }}
                      className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                    >
                      <Zap size={15} />
                      Buy
                    </button>

                    <button
                      onClick={() => {
                        setTradeSide("SELL");
                        setShowTradeModal(true);
                      }}
                      className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-1.5"
                    >
                      <Zap size={15} />
                      Sell / Short
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

              {/* Row 2: Interactive Price Chart & Moving Averages (8 cols) & Key Fundamentals (4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Interactive Technical Price Chart Card (8 cols) */}
                <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">Interactive Price & Technical Trajectory</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          {chartMode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Institutional OHLC candlesticks with volume histogram, SMA-20/50, and 14-period RSI
                      </p>
                    </div>

                    {/* Chart Mode & Timeframe Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Candlestick vs Area toggle */}
                      <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <button
                          onClick={() => setChartMode("CANDLESTICK")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                            chartMode === "CANDLESTICK"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <BarChart3 size={13} />
                          Candles
                        </button>
                        <button
                          onClick={() => setChartMode("AREA")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                            chartMode === "AREA"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Activity size={13} />
                          Line
                        </button>
                      </div>

                      {/* Timeframe selector */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        {(["1W", "1M", "3M", "1Y", "ALL"] as const).map(tf => (
                          <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
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
                  </div>

                  {/* Active Crosshair Inspection Pill */}
                  {activeHoverPoint ? (
                    <div className="flex flex-wrap items-center gap-4 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs font-mono">
                      <span className="text-slate-300 font-bold">{activeHoverPoint.date}</span>
                      <span>O: <strong className="text-white">₹{activeHoverPoint.open.toFixed(2)}</strong></span>
                      <span>H: <strong className="text-emerald-400">₹{activeHoverPoint.high.toFixed(2)}</strong></span>
                      <span>L: <strong className="text-rose-400">₹{activeHoverPoint.low.toFixed(2)}</strong></span>
                      <span>C: <strong className="text-white font-black">₹{activeHoverPoint.close.toFixed(2)}</strong></span>
                      <span>Vol: <strong className="text-slate-300">{activeHoverPoint.volume.toLocaleString("en-IN")}</strong></span>
                      {activeHoverPoint.sma_20 && (
                        <span className="text-teal-400">SMA20: ₹{activeHoverPoint.sma_20.toFixed(2)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-500 font-medium">
                      <span>Hover along chart to inspect OHLCV candle parameters</span>
                      <span className="font-mono">Current: ₹{stock.current_price.toFixed(2)}</span>
                    </div>
                  )}

                  {/* SVG Technical Canvas */}
                  <div
                    className="relative w-full bg-slate-950/70 rounded-2xl border border-slate-800/80 p-4 overflow-hidden"
                    style={{ height: showRSI ? "360px" : "290px" }}
                  >
                    {filteredHistory.length > 0 ? (
                      <svg
                        viewBox={`0 0 ${chartPoints.width} ${chartPoints.totalHeight}`}
                        className="w-full h-full cursor-crosshair overflow-visible"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const svgX = ((e.clientX - rect.left) / rect.width) * chartPoints.width;
                          const idx = Math.min(
                            filteredHistory.length - 1,
                            Math.max(0, Math.round(((svgX - 20) / (chartPoints.width - 40)) * (filteredHistory.length - 1)))
                          );
                          setHoverIndex(idx);
                        }}
                        onMouseLeave={() => setHoverIndex(null)}
                      >
                        <defs>
                          <linearGradient id="areaStockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        <line x1="20" y1="45" x2="780" y2="45" stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1="20" y1="95" x2="780" y2="95" stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1="20" y1="145" x2="780" y2="145" stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1="20" y1="195" x2="780" y2="195" stroke="#334155" strokeWidth="1" />

                        {/* Volume Histogram Bars */}
                        {chartPoints.volumeBars.map((vb, i) => (
                          <rect
                            key={`vol-${i}`}
                            x={vb.x}
                            y={vb.y}
                            width={vb.width}
                            height={vb.height}
                            fill={vb.isBull ? "#10b981" : "#f43f5e"}
                            opacity={hoverIndex === i ? 0.8 : 0.35}
                            rx={1}
                          />
                        ))}

                        {/* Chart Render: Area or Candlesticks */}
                        {chartMode === "AREA" ? (
                          <>
                            {/* Area Fill */}
                            <polygon fill="url(#areaStockGrad)" points={chartPoints.area} />
                            {/* Main Line */}
                            <polyline
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={chartPoints.line}
                            />
                          </>
                        ) : (
                          /* Candlestick Render */
                          <>
                            {chartPoints.candles.map((c, i) => (
                              <g key={`candle-${i}`}>
                                {/* Wick (High to Low) */}
                                <line
                                  x1={c.x}
                                  y1={c.highY}
                                  x2={c.x}
                                  y2={c.lowY}
                                  stroke={c.isBull ? "#10b981" : "#f43f5e"}
                                  strokeWidth={hoverIndex === i ? 2 : 1.2}
                                />
                                {/* Candle Body */}
                                <rect
                                  x={c.x - c.candleWidth / 2}
                                  y={c.bodyTop}
                                  width={c.candleWidth}
                                  height={c.bodyHeight}
                                  fill={c.isBull ? "#10b981" : "#f43f5e"}
                                  stroke={c.isBull ? "#059669" : "#e11d48"}
                                  strokeWidth={0.5}
                                  rx={1}
                                />
                              </g>
                            ))}
                          </>
                        )}

                        {/* SMA-50 Line (Indigo) */}
                        {showSMA && chartPoints.sma50 && (
                          <polyline
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="1.8"
                            strokeDasharray="4 2"
                            points={chartPoints.sma50}
                          />
                        )}

                        {/* SMA-20 Line (Teal) */}
                        {showSMA && chartPoints.sma20 && (
                          <polyline
                            fill="none"
                            stroke="#2dd4bf"
                            strokeWidth="2"
                            points={chartPoints.sma20}
                          />
                        )}

                        {/* RSI Indicator Pane (when active) */}
                        {showRSI && (
                          <g transform="translate(0, 260)">
                            {/* RSI Divider & Axis Lines */}
                            <line x1="20" y1="0" x2="780" y2="0" stroke="#334155" strokeWidth="1" />
                            {/* Overbought 70 line */}
                            <line x1="20" y1="15" x2="780" y2="15" stroke="#f43f5e" strokeDasharray="3 3" opacity="0.6" />
                            <text x="785" y="18" fill="#f43f5e" fontSize="9" fontFamily="monospace">70</text>
                            {/* Oversold 30 line */}
                            <line x1="20" y1="35" x2="780" y2="35" stroke="#10b981" strokeDasharray="3 3" opacity="0.6" />
                            <text x="785" y="38" fill="#10b981" fontSize="9" fontFamily="monospace">30</text>
                            {/* RSI Line */}
                            {chartPoints.rsiLine && (
                              <polyline
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                points={chartPoints.rsiLine}
                              />
                            )}
                            <text x="25" y="12" fill="#f59e0b" fontSize="10" fontWeight="bold">RSI (14)</text>
                          </g>
                        )}

                        {/* Vertical Crosshair Line */}
                        {hoverIndex !== null && filteredHistory[hoverIndex] && (
                          <line
                            x1={chartPoints.candles[hoverIndex]?.x || 0}
                            y1="10"
                            x2={chartPoints.candles[hoverIndex]?.x || 0}
                            y2={chartPoints.totalHeight - 10}
                            stroke="#e2e8f0"
                            strokeDasharray="2 2"
                            opacity="0.5"
                          />
                        )}
                      </svg>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                        No historical candle observations available for this timeframe.
                      </div>
                    )}
                  </div>

                  {/* Chart Legend & Indicator Toggles */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-2.5 h-0.5 bg-emerald-400" /> Price / Candle
                      </span>
                      {showSMA && (
                        <>
                          <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                            <span className="w-2.5 h-0.5 bg-teal-400" /> SMA-20
                          </span>
                          <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                            <span className="w-2.5 h-0.5 bg-indigo-400" /> SMA-50
                          </span>
                        </>
                      )}
                      {showRSI && (
                        <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                          <span className="w-2.5 h-0.5 bg-amber-400" /> RSI (14)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowSMA(!showSMA)}
                        className={`font-semibold transition-colors ${showSMA ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {showSMA ? "✓ Overlays (SMA)" : "+ Overlays (SMA)"}
                      </button>
                      <button
                        onClick={() => setShowRSI(!showRSI)}
                        className={`font-semibold transition-colors ${showRSI ? "text-amber-400" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {showRSI ? "✓ RSI Pane" : "+ RSI Pane"}
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

              {/* Institutional Order Execution Modal */}
              {stock && (
                <OrderExecutionModal
                  isOpen={showTradeModal}
                  onClose={() => setShowTradeModal(false)}
                  onOrderSettled={loadStockData}
                  defaultSymbol={stock.symbol}
                  defaultCompanyName={stock.company_name}
                  defaultSector={stock.sector}
                  defaultPrice={stock.current_price}
                  defaultSide={tradeSide}
                />
              )}
            </>
          )}
          </MotionContainer>
        </main>
      </div>
    </div>
  );
}
