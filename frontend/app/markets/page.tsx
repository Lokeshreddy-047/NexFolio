"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getMarketOverview,
  getMarketStocks,
  toggleWatchlistSymbol,
  getWatchlists,
  MarketOverviewResponse,
  MarketStockItem,
  WatchlistResponse
} from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Search,
  SlidersHorizontal,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Layers,
  Activity,
  Zap,
  Briefcase
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useMarketFeed } from "@/lib/useMarketFeed";

export default function MarketsPage() {
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [stocks, setStocks] = useState<MarketStockItem[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Screener Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [selectedPreset, setSelectedPreset] = useState("ALL");
  const [sortBy, setSortBy] = useState("day_change_pct");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Real-time market feed hook
  const streamSymbols = React.useMemo(() => {
    const syms = ["^NSEI", "^BSESN", "^NSEBANK"];
    stocks.slice(0, 40).forEach(s => syms.push(s.symbol));
    return syms;
  }, [stocks]);

  const { ticks, connectionStatus, activeBadge, flashStates } = useMarketFeed(streamSymbols);

  // Active Watchlist for 1-click star toggling
  const primaryWatchlistId = watchlists.length > 0 ? watchlists[0].id : null;

  // 1. Initial Load: Market Overview & Watchlists
  const loadMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovRes, wlRes] = await Promise.all([
        getMarketOverview(),
        getWatchlists().catch(() => [])
      ]);
      setOverview(ovRes);
      setWatchlists(wlRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load market intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // 2. Fetch Screener Stocks when filters change
  const loadScreenerStocks = useCallback(async () => {
    try {
      setStocksLoading(true);
      const res = await getMarketStocks({
        query: searchQuery,
        sector: selectedSector,
        preset: selectedPreset,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100
      });
      setStocks(res.stocks);
    } catch (err: unknown) {
      console.error("Failed to load screener stocks:", err);
    } finally {
      setStocksLoading(false);
    }
  }, [searchQuery, selectedSector, selectedPreset, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadScreenerStocks();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadScreenerStocks]);

  // 3. Quick Watchlist Toggle
  const handleToggleWatchlist = async (symbol: string) => {
    if (!primaryWatchlistId) return;
    try {
      const updatedWl = await toggleWatchlistSymbol(primaryWatchlistId, symbol);
      setWatchlists(prev => prev.map(w => w.id === updatedWl.id ? updatedWl : w));
      // Update local stock item
      setStocks(prev => prev.map(s => {
        if (s.symbol === symbol) {
          return { ...s, is_in_watchlist: !s.is_in_watchlist };
        }
        return s;
      }));
    } catch (err: unknown) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="Market Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Top Context Bar: Market Pulse & Freshness Pedigree */}
          {overview && (
            <div className="p-4 lg:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${
                    overview.pulse.mood === "BULLISH"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : overview.pulse.mood === "BEARISH"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>
                    <Activity size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">NSE Market Pulse</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        overview.pulse.mood === "BULLISH"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : overview.pulse.mood === "BEARISH"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}>
                        {overview.pulse.mood} MOOD
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {overview.pulse.benchmark_trend}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-emerald-400 font-bold">▲ {overview.pulse.advances_count} Advances</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-400 font-bold">▼ {overview.pulse.declines_count} Declines</span>
                  </div>

                  <DataPedigreeBadge
                    badge={activeBadge || overview.data_badge}
                    provider={overview.provider}
                    session={overview.market_session}
                    isStale={overview.is_stale}
                    fallbackReason={overview.fallback_reason}
                    marketDate={overview.market_date}
                  />

                  {/* Real-time Streaming Pulse */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-medium text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${
                      connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" :
                      connectionStatus === "connecting" || connectionStatus === "reconnecting" ? "bg-amber-400 animate-ping" : "bg-slate-500"
                    }`} />
                    <span className="capitalize">{connectionStatus === "connected" ? "Stream Live" : connectionStatus}</span>
                  </div>

                  <button
                    onClick={loadMarketData}
                    disabled={loading}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="Refresh market data"
                  >
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Major Indices Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {overview.indices.map((idx) => {
                  const idxTick = ticks[idx.symbol];
                  const level = idxTick ? idxTick.price : idx.current_level;
                  const chgPct = idxTick ? idxTick.day_change_pct : idx.day_change_pct;
                  const isUp = chgPct >= 0;
                  const flash = flashStates[idx.symbol];
                  const flashClass = flash === "up" ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : flash === "down" ? "border-rose-500/60 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "border-slate-800/80 bg-slate-950/60";

                  return (
                    <div
                      key={idx.symbol}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 space-y-1 ${flashClass}`}
                    >
                      <span className="text-[11px] font-semibold text-slate-400">{idx.name}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-black text-white font-mono">
                          {level.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs font-extrabold flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {isUp ? `+${chgPct}%` : `${chgPct}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Gainers, Losers, & Sector Heatmap Bento Grid */}
          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Gainers Today (4 cols) */}
              <div className="lg:col-span-4 p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    Top Gainers Today
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">NSE 292</span>
                </div>

                <div className="space-y-2">
                  {overview.top_gainers.slice(0, 5).map((stock) => (
                    <Link
                      key={stock.symbol}
                      href={`/markets/${encodeURIComponent(stock.symbol)}`}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-emerald-500/40 hover:bg-slate-950 transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                          {stock.base_symbol}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{stock.company_name}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-white font-mono">₹{stock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[11px] font-bold text-emerald-400 font-mono">+{stock.day_change_pct}%</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Top Losers Today (4 cols) */}
              <div className="lg:col-span-4 p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingDown size={16} className="text-rose-400" />
                    Top Losers Today
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">NSE 292</span>
                </div>

                <div className="space-y-2">
                  {overview.top_losers.slice(0, 5).map((stock) => (
                    <Link
                      key={stock.symbol}
                      href={`/markets/${encodeURIComponent(stock.symbol)}`}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-rose-500/40 hover:bg-slate-950 transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition-colors truncate">
                          {stock.base_symbol}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{stock.company_name}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-white font-mono">₹{stock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[11px] font-bold text-rose-400 font-mono">
                          {stock.day_change_pct > 0 ? `+${stock.day_change_pct}%` : `${stock.day_change_pct}%`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sector Performance Breadth (4 cols) */}
              <div className="lg:col-span-4 p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-indigo-400" />
                    Sector Breadth
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Avg % Change</span>
                </div>

                <div className="space-y-2">
                  {overview.sector_performance.slice(0, 5).map((sec) => (
                    <div
                      key={sec.name}
                      onClick={() => setSelectedSector(sec.name)}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-indigo-500/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-200 truncate">{sec.name}</p>
                        <p className="text-[10px] text-slate-400">Top: {sec.top_performer} (+{sec.top_performer_gain_pct}%)</p>
                      </div>

                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                        sec.avg_change_pct >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {sec.avg_change_pct >= 0 ? `+${sec.avg_change_pct}%` : `${sec.avg_change_pct}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive 292-Stock Screener Hub */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-emerald-400" />
                  Institutional Stock Screener
                </h3>
                <p className="text-xs text-slate-400">
                  Search, filter, and discover candidates across the entire 289+ NSE security universe
                </p>
              </div>

              {/* Screener Search Bar */}
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ticker, company, or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Presets Pills */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
              {[
                { key: "ALL", label: "All Stocks" },
                { key: "TOP_GAINERS", label: "🔥 Top Gainers" },
                { key: "TOP_LOSERS", label: "📉 Top Losers" },
                { key: "MOST_ACTIVE", label: "⚡ Most Active" },
                { key: "NEAR_52W_HIGH", label: "🚀 Near 52W High" },
                { key: "NEAR_52W_LOW", label: "🎯 Near 52W Low" },
                { key: "MY_HOLDINGS", label: "💼 My Holdings" },
                { key: "MY_WATCHLIST", label: "★ My Watchlist" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPreset(p.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    selectedPreset === p.key
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Screener Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-10">★</th>
                    <th onClick={() => handleSort("symbol")} className="py-3 px-4 cursor-pointer hover:text-white">
                      Company & Symbol
                    </th>
                    <th className="py-3 px-4">Sector</th>
                    <th onClick={() => handleSort("current_price")} className="py-3 px-4 text-right cursor-pointer hover:text-white">
                      Price (₹)
                    </th>
                    <th onClick={() => handleSort("day_change_pct")} className="py-3 px-4 text-right cursor-pointer hover:text-white">
                      Day Change
                    </th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">52W Range</th>
                    <th className="py-3 px-4 text-center">Portfolio Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stocksLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-400" />
                        Filtering NSE stock universe...
                      </td>
                    </tr>
                  ) : stocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No stocks found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    stocks.map((stock) => {
                      const liveTick = ticks[stock.symbol] || ticks[stock.symbol.replace(/\.NS$/i, "")];
                      const price = liveTick ? liveTick.price : stock.current_price;
                      const chgPct = liveTick ? liveTick.day_change_pct : stock.day_change_pct;
                      const isUp = chgPct >= 0;
                      const flash = flashStates[stock.symbol] || flashStates[stock.symbol.replace(/\.NS$/i, "")];
                      const priceFlashClass = flash === "up" ? "bg-emerald-500/20 text-emerald-300 rounded px-1.5 py-0.5 transition-all" : flash === "down" ? "bg-rose-500/20 text-rose-300 rounded px-1.5 py-0.5 transition-all" : "";

                      return (
                        <tr key={stock.symbol} className="hover:bg-slate-900/40 transition-colors">
                          {/* Star Watchlist */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleWatchlist(stock.symbol)}
                              className="text-slate-500 hover:text-amber-400 transition-colors"
                              title={stock.is_in_watchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              <Star
                                size={15}
                                className={stock.is_in_watchlist ? "text-amber-400 fill-amber-400" : ""}
                              />
                            </button>
                          </td>

                          {/* Symbol & Name */}
                          <td className="py-3 px-4">
                            <Link
                              href={`/markets/${encodeURIComponent(stock.symbol)}`}
                              className="font-bold text-slate-200 hover:text-emerald-400 transition-colors"
                            >
                              {stock.base_symbol}
                            </Link>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{stock.company_name}</p>
                          </td>

                          {/* Sector */}
                          <td className="py-3 px-4 text-slate-300">{stock.sector}</td>

                          {/* Price */}
                          <td className="py-3 px-4 text-right font-black text-white font-mono">
                            <span className={priceFlashClass}>
                              ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Day Change */}
                          <td className="py-3 px-4 text-right">
                            <span className={`font-bold font-mono px-2 py-0.5 rounded-md ${
                              isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {isUp ? `+${chgPct}%` : `${chgPct}%`}
                            </span>
                          </td>

                          {/* 52W Range */}
                          <td className="py-3 px-4 hidden md:table-cell text-center">
                            <div className="w-28 mx-auto space-y-1">
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                                  style={{
                                    width: `${Math.max(5, Math.min(100, ((price - stock.low_52w) / (stock.high_52w - stock.low_52w || 1)) * 100))}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono tracking-tight">
                                <span>₹{stock.low_52w >= 1000 ? Math.round(stock.low_52w).toLocaleString("en-IN") : stock.low_52w.toFixed(1)}</span>
                                <span className="text-slate-600 font-sans text-[8px]">•</span>
                                <span>₹{stock.high_52w >= 1000 ? Math.round(stock.high_52w).toLocaleString("en-IN") : stock.high_52w.toFixed(1)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Portfolio Presence */}
                          <td className="py-3 px-4 text-center">
                            {stock.is_in_portfolio ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                                <Briefcase size={10} />
                                {stock.portfolio_weight_pct ? `${stock.portfolio_weight_pct}% Weight` : "In Portfolio"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/markets/${encodeURIComponent(stock.symbol)}`}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-bold transition-all inline-flex items-center gap-1"
                            >
                              <Zap size={12} />
                              Detail
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
