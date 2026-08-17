"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getWatchlists,
  createWatchlist,
  toggleWatchlistSymbol,
  deleteWatchlist,
  getMarketStocks,
  WatchlistResponse,
  MarketStockItem,
  getPortfolios,
  createTransaction
} from "@/lib/api";
import {
  Star,
  Plus,
  Trash2,
  Search,
  Zap,
  Briefcase,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useMarketFeed } from "@/lib/useMarketFeed";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function WatchlistPage() {
  const toast = useToast();
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmWatchlist, setDeleteConfirmWatchlist] = useState<{ id: string; name: string } | null>(null);
  const [deletingWatchlist, setDeletingWatchlist] = useState(false);

  // Active Watchlist for live tick stream
  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || (watchlists.length > 0 ? watchlists[0] : null);
  const streamSymbols = React.useMemo(() => {
    return activeWatchlist ? activeWatchlist.stocks.map(s => s.symbol) : [];
  }, [activeWatchlist]);

  const { ticks, connectionStatus, activeBadge, flashStates } = useMarketFeed(streamSymbols);

  // New Watchlist modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [creating, setCreating] = useState(false);

  // Quick Symbol Search & Add
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MarketStockItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Quick Trade Modal
  const [tradeStock, setTradeStock] = useState<MarketStockItem | null>(null);
  const [tradeShares, setTradeShares] = useState(10);
  const [tradePortfolioId, setTradePortfolioId] = useState("");
  const [userPortfolios, setUserPortfolios] = useState<{ id: string; name: string }[]>([]);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  // 1. Fetch Watchlists
  const loadWatchlists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [wlData, portData] = await Promise.all([
        getWatchlists(),
        getPortfolios().catch(() => [])
      ]);
      setWatchlists(wlData);
      setUserPortfolios(portData.map(p => ({ id: p.id, name: p.name })));
      if (portData.length > 0) {
        setTradePortfolioId(portData[0].id);
      }
      if (wlData.length > 0) {
        setActiveWatchlistId(prev => prev || wlData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load watchlists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  // 2. Search Autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await getMarketStocks({ query: searchQuery, limit: 6 });
        setSearchResults(res.stocks);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Create Custom Watchlist
  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      setCreating(true);
      const name = newWatchlistName.trim();
      const created = await createWatchlist(name);
      setWatchlists(prev => [...prev, created]);
      setActiveWatchlistId(created.id);
      setNewWatchlistName("");
      setShowCreateModal(false);
      toast.success("Watchlist Created", `Watchlist "${name}" is now ready.`);
    } catch (err: unknown) {
      toast.error("Error Creating Watchlist", (err as Error).message || "Failed to create watchlist.");
    } finally {
      setCreating(false);
    }
  };

  // 4. Toggle/Remove Stock from Active Watchlist
  const handleToggleStock = async (symbol: string) => {
    if (!activeWatchlistId) return;
    try {
      const isRemoving = activeWatchlist?.symbols.includes(symbol) || activeWatchlist?.symbols.includes(symbol.replace(/\.NS$/, ""));
      const updated = await toggleWatchlistSymbol(activeWatchlistId, symbol);
      setWatchlists(prev => prev.map(w => w.id === updated.id ? updated : w));
      if (isRemoving) {
        toast.info("Removed from Watchlist", `${symbol} was removed from ${activeWatchlist?.name || "your list"}.`);
      } else {
        toast.success("Added to Watchlist", `${symbol} added to ${activeWatchlist?.name || "your list"}.`);
      }
    } catch (err: unknown) {
      toast.error("Watchlist Error", (err as Error).message || "Failed to update watchlist symbol.");
    }
  };

  // 5. Delete Watchlist
  const handleDeleteWatchlist = (id: string, name: string) => {
    if (watchlists.length <= 1) {
      toast.warning("Action Not Permitted", "Cannot delete your only remaining watchlist.");
      return;
    }
    setDeleteConfirmWatchlist({ id, name });
  };

  const handleConfirmDeleteWatchlist = async () => {
    if (!deleteConfirmWatchlist) return;
    try {
      setDeletingWatchlist(true);
      await deleteWatchlist(deleteConfirmWatchlist.id);
      const remaining = watchlists.filter(w => w.id !== deleteConfirmWatchlist.id);
      setWatchlists(remaining);
      setActiveWatchlistId(remaining[0]?.id || "");
      toast.success("Watchlist Deleted", `Watchlist "${deleteConfirmWatchlist.name}" was removed.`);
      setDeleteConfirmWatchlist(null);
    } catch (err: unknown) {
      toast.error("Error Deleting Watchlist", (err as Error).message || "Failed to delete watchlist.");
    } finally {
      setDeletingWatchlist(false);
    }
  };

  // 6. Quick Execute Buy Order
  const handleExecuteQuickTrade = async () => {
    if (!tradeStock || !tradePortfolioId) return;
    try {
      setExecutingTrade(true);
      await createTransaction({
        portfolio_id: tradePortfolioId,
        transaction_type: "BUY",
        symbol: tradeStock.symbol,
        quantity: tradeShares,
        price: tradeStock.current_price,
        notes: "Quick order executed from Watchlist Hub"
      });
      toast.success("Order Executed", `Recorded BUY of ${tradeShares} shares of ${tradeStock.base_symbol}.`);
      setTradeSuccess(`Successfully recorded BUY of ${tradeShares} shares of ${tradeStock.base_symbol}!`);
      setTimeout(() => {
        setTradeStock(null);
        setTradeSuccess(null);
      }, 1500);
      loadWatchlists();
    } catch (err: unknown) {
      toast.error("Trade Execution Error", (err as Error).message || "Trade execution failed.");
    } finally {
      setExecutingTrade(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="Watchlist Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Watchlists Toolbar: Selector Tabs & Search & Add */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            {/* Watchlist Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {watchlists.map(w => (
                <button
                  key={w.id}
                  onClick={() => setActiveWatchlistId(w.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeWatchlistId === w.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border border-indigo-400/30"
                      : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Star size={13} className={activeWatchlistId === w.id ? "fill-white" : ""} />
                  {w.name}
                  <span className="text-[10px] opacity-70">({w.symbols.length})</span>
                </button>
              ))}

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} />
                New List
              </button>
            </div>

            {/* Quick Add Symbol Search */}
            <div className="relative w-full md:w-80">
              {searchLoading ? (
                <RefreshCw size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              ) : (
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                placeholder="Add stock to watchlist..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-30 p-1.5 space-y-1 animate-fadeIn">
                  {searchResults.map(s => {
                    const isAlreadyIn = activeWatchlist?.symbols.includes(s.symbol) || activeWatchlist?.symbols.includes(s.base_symbol);
                    return (
                      <div
                        key={s.symbol}
                        onClick={() => {
                          handleToggleStock(s.symbol);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{s.base_symbol}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{s.company_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">₹{s.current_price}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isAlreadyIn ? "bg-amber-500/20 text-amber-300" : "bg-indigo-500/20 text-indigo-300"
                          }`}>
                            {isAlreadyIn ? "Remove" : "+ Add"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
              <p className="text-xs font-semibold">Loading your monitored watchlists & live valuations...</p>
            </div>
          )}

          {/* Active Watchlist Overview & Table */}
          {!loading && activeWatchlist && (
            <div className="space-y-6">
              {/* Stats Summary Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase font-bold text-slate-400">Watchlist & Pedigree</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg font-black text-white">{activeWatchlist.name}</p>
                      <DataPedigreeBadge badge={activeBadge || "REFERENCE"} size="sm" />
                    </div>
                  </div>
                  {watchlists.length > 1 && (
                    <button
                      onClick={() => handleDeleteWatchlist(activeWatchlist.id, activeWatchlist.name)}
                      className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                      title="Delete this watchlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-[11px] uppercase font-bold text-slate-400">Monitored Assets</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-lg font-black text-indigo-400">{activeWatchlist.stocks.length} Tickers</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      }`} />
                      <span>{connectionStatus === "connected" ? "SSE Live" : connectionStatus}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase font-bold text-slate-400">Average Day Change</p>
                  <p className={`text-lg font-black mt-0.5 flex items-center gap-1 ${
                    activeWatchlist.avg_day_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {activeWatchlist.avg_day_change_pct >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    {activeWatchlist.avg_day_change_pct >= 0 ? `+${activeWatchlist.avg_day_change_pct}%` : `${activeWatchlist.avg_day_change_pct}%`}
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  {watchlists.length > 1 && (
                    <button
                      onClick={() => handleDeleteWatchlist(activeWatchlist.id, activeWatchlist.name)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Delete Watchlist
                    </button>
                  )}
                </div>
              </div>

              {/* Watchlist Table */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Symbol & Name</th>
                        <th className="py-3 px-4">Sector</th>
                        <th className="py-3 px-4 text-right">Price (₹)</th>
                        <th className="py-3 px-4 text-right">Day Change</th>
                        <th className="py-3 px-4 text-center">Watchlist Intelligence (Exposure)</th>
                        <th className="py-3 px-4 text-center">Quick Trade</th>
                        <th className="py-3 px-4 text-center w-10">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeWatchlist.stocks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No stocks in this watchlist yet. Use the search bar above to add your first stock!
                          </td>
                        </tr>
                      ) : (
                        activeWatchlist.stocks.map(stock => {
                          const liveTick = ticks[stock.symbol] || ticks[stock.symbol.replace(/\.NS$/i, "")];
                          const price = liveTick ? liveTick.price : stock.current_price;
                          const chgPct = liveTick ? liveTick.day_change_pct : stock.day_change_pct;
                          const isUp = chgPct >= 0;
                          const flash = flashStates[stock.symbol] || flashStates[stock.symbol.replace(/\.NS$/i, "")];
                          const priceFlashClass = flash === "up" ? "bg-emerald-500/20 text-emerald-300 rounded px-1.5 py-0.5 transition-all" : flash === "down" ? "bg-rose-500/20 text-rose-300 rounded px-1.5 py-0.5 transition-all" : "";

                          return (
                            <tr key={stock.symbol} className="hover:bg-slate-900/40 transition-colors">
                              {/* Symbol & Name */}
                              <td className="py-3 px-4">
                                <Link
                                  href={`/markets/${encodeURIComponent(stock.symbol)}`}
                                  className="font-bold text-slate-200 hover:text-indigo-400 transition-colors"
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

                              {/* Watchlist Intelligence Exposure */}
                              <td className="py-3 px-4 text-center">
                                {stock.is_in_portfolio ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 inline-flex items-center gap-1">
                                    <Briefcase size={11} />
                                    {stock.portfolio_weight_pct ? `${stock.portfolio_weight_pct}% Portfolio Weight` : "In Portfolio"}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 font-medium text-[10px] border border-indigo-500/20 inline-flex items-center gap-1">
                                    <Plus size={11} />
                                    New Exposure (+{stock.sector})
                                  </span>
                                )}
                              </td>

                              {/* Quick Trade Button */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setTradeStock(stock)}
                                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/30 inline-flex items-center gap-1"
                                >
                                  <Zap size={12} />
                                  Trade
                                </button>
                              </td>

                              {/* Remove Star */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleToggleStock(stock.symbol)}
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                  title="Remove from watchlist"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Quick Trade Modal */}
          {tradeStock && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Record Buy Order</h3>
                    <p className="text-xs text-slate-400">{tradeStock.company_name} ({tradeStock.base_symbol})</p>
                  </div>
                  <button
                    onClick={() => setTradeStock(null)}
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
                        ₹{tradeStock.current_price}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Order Value:</span>
                    <span className="text-sm font-black text-white font-mono">
                      ₹{(tradeShares * tradeStock.current_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {tradeSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                      {tradeSuccess}
                    </div>
                  )}

                  <button
                    onClick={handleExecuteQuickTrade}
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

          {/* Create Watchlist Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <form onSubmit={handleCreateWatchlist} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Create New Watchlist</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Watchlist Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Momentum Picks, Dividend Bluechips"
                    value={newWatchlistName}
                    onChange={e => setNewWatchlistName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40"
                  >
                    {creating ? "Creating..." : "Create List"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Institutional Delete Watchlist Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmWatchlist}
        title="Delete Watchlist?"
        description={`Are you sure you want to delete "${deleteConfirmWatchlist?.name}"? All pinned ticker tracking in this list will be removed.`}
        confirmText="Delete Watchlist"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingWatchlist}
        onConfirm={handleConfirmDeleteWatchlist}
        onCancel={() => setDeleteConfirmWatchlist(null)}
      />
    </div>
  );
}
