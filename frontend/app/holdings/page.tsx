"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
import {
  getPortfolios,
  getHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  searchStocks,
  HoldingItem,
  StockSearchItem
} from "@/lib/api";
import {
  Layers,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Trash2,
  Edit3,
  ArrowLeftRight,
  Zap
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useMarketFeed } from "@/lib/useMarketFeed";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function HoldingsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmHolding, setDeleteConfirmHolding] = useState<{ id: string; symbol: string } | null>(null);
  const [deletingHolding, setDeletingHolding] = useState(false);

  // Live SSE market tick feed
  const streamSymbols = React.useMemo(() => {
    return holdings.map((h) => h.symbol);
  }, [holdings]);

  const { ticks, connectionStatus, activeBadge, flashStates } = useMarketFeed(streamSymbols);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [pnlFilter, setPnlFilter] = useState("ALL");

  // Add / Edit Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingItem | null>(null);

  // Stock search inside modal
  const [stockSearch, setStockSearch] = useState("");
  const [stockResults, setStockResults] = useState<StockSearchItem[]>([]);

  // Form states
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("Other");
  const [assetType, setAssetType] = useState("Equity");
  const [quantity, setQuantity] = useState<string>("");
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch portfolios on mount
  useEffect(() => {
    if (user) {
      getPortfolios()
        .then((data) => {
          if (data.length > 0) {
            setSelectedPortfolioId(data[0].id);
          } else {
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error loading portfolios:", err);
          setLoading(false);
        });
    }
  }, [user]);

  // 2. Fetch holdings whenever selected portfolio changes
  const fetchHoldings = useCallback(async () => {
    if (!selectedPortfolioId) return;
    try {
      setLoading(true);
      const data = await getHoldings(selectedPortfolioId);
      setHoldings(data);
    } catch (err) {
      console.error("Error loading holdings:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    if (selectedPortfolioId) {
      fetchHoldings();
    }
  }, [selectedPortfolioId, fetchHoldings]);

  // Stock search debounce inside modal
  useEffect(() => {
    if (stockSearch.trim().length > 0) {
      const handler = setTimeout(() => {
        searchStocks(stockSearch.trim())
          .then((res) => setStockResults(res))
          .catch((err) => console.warn(err));
      }, 200);
      return () => clearTimeout(handler);
    } else {
      setStockResults([]);
    }
  }, [stockSearch]);

  const handleSelectStock = (stk: StockSearchItem) => {
    setSymbol(stk.symbol);
    setCompanyName(stk.company_name);
    setSector(stk.sector);
    setAssetType(stk.asset_type || "Equity");
    setBuyPrice(stk.reference_price.toString());
    setCurrentPrice(stk.reference_price.toString());
    setStockSearch("");
    setStockResults([]);
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolioId || !symbol.trim() || !quantity || !buyPrice) return;

    try {
      setSubmitting(true);
      await addHolding({
        portfolio_id: selectedPortfolioId,
        symbol: symbol.trim().toUpperCase(),
        company_name: companyName.trim() || undefined,
        sector: sector || undefined,
        asset_type: assetType,
        quantity: parseFloat(quantity),
        buy_price: parseFloat(buyPrice),
        current_price: currentPrice ? parseFloat(currentPrice) : parseFloat(buyPrice),
      });

      // Reset modal state
      setIsAddOpen(false);
      const addedSym = symbol.trim().toUpperCase();
      setSymbol("");
      setCompanyName("");
      setQuantity("");
      setBuyPrice("");
      setCurrentPrice("");

      toast.success("Holding Added", `${addedSym} was successfully added to your portfolio.`);
      await fetchHoldings();
    } catch (err: unknown) {
      toast.error("Error Adding Holding", (err as Error).message || "Failed to add holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding || !quantity || !buyPrice) return;

    try {
      setSubmitting(true);
      await updateHolding(editingHolding.id, {
        quantity: parseFloat(quantity),
        buy_price: parseFloat(buyPrice),
        current_price: currentPrice ? parseFloat(currentPrice) : undefined,
        sector,
        asset_type: assetType,
      });

      toast.success("Holding Updated", `Updated position details for ${editingHolding.symbol}.`);
      setEditingHolding(null);
      await fetchHoldings();
    } catch (err: unknown) {
      toast.error("Error Updating Holding", (err as Error).message || "Failed to update holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (holdingId: string, sym: string) => {
    setDeleteConfirmHolding({ id: holdingId, symbol: sym });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmHolding) return;
    try {
      setDeletingHolding(true);
      await deleteHolding(deleteConfirmHolding.id);
      toast.success("Holding Removed", `${deleteConfirmHolding.symbol} was removed from this portfolio.`);
      setDeleteConfirmHolding(null);
      await fetchHoldings();
    } catch (err: unknown) {
      toast.error("Error Removing Holding", (err as Error).message || "Failed to remove holding.");
    } finally {
      setDeletingHolding(false);
    }
  };

  // Map live ticks over holdings
  const liveHoldings = React.useMemo(() => {
    const totalCurrentVal = holdings.reduce((sum, h) => {
      const liveTick = ticks[h.symbol] || ticks[`${h.symbol}.NS`];
      const curPrice = liveTick ? liveTick.price : h.current_price;
      return sum + (h.quantity * curPrice);
    }, 0);

    return holdings.map((h) => {
      const liveTick = ticks[h.symbol] || ticks[`${h.symbol}.NS`];
      const currentPrice = liveTick ? liveTick.price : h.current_price;
      const currentValue = h.quantity * currentPrice;
      const unrealizedPnl = currentValue - h.invested_value;
      const unrealizedPnlPct = h.invested_value > 0 ? (unrealizedPnl / h.invested_value) * 100 : 0;
      const weight = totalCurrentVal > 0 ? (currentValue / totalCurrentVal) * 100 : h.weight;

      return {
        ...h,
        current_price: currentPrice,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_pct: unrealizedPnlPct,
        weight: weight,
      };
    });
  }, [holdings, ticks]);

  // Extract unique sectors
  const sectors = Array.from(new Set(liveHoldings.map((h) => h.sector || "Other"))).sort();

  // Filtered holdings
  const filteredHoldings = liveHoldings.filter((h) => {
    const matchesSearch =
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === "ALL" || (h.sector || "Other") === selectedSector;
    const matchesPnl =
      pnlFilter === "ALL" ||
      (pnlFilter === "PROFIT" && h.unrealized_pnl >= 0) ||
      (pnlFilter === "LOSS" && h.unrealized_pnl < 0);
    return matchesSearch && matchesSector && matchesPnl;
  });

  // Calculate totals for active portfolio
  const activePortInvested = liveHoldings.reduce((acc, h) => acc + h.invested_value, 0);
  const activePortValue = liveHoldings.reduce((acc, h) => acc + h.current_value, 0);
  const activePortPnl = activePortValue - activePortInvested;
  const activePortRoi = activePortInvested > 0 ? (activePortPnl / activePortInvested) * 100 : 0;

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Authenticating...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <Layers size={36} className="mx-auto text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-sm text-slate-400">Please sign in to view and manage your holdings.</p>
          <Link href="/login" className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="Portfolio Holdings"
          subtitle="Real-time position tracking, weights, average cost basis & returns"
          activePortfolioId={selectedPortfolioId}
          onPortfolioChange={(id) => setSelectedPortfolioId(id)}
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
          {/* Header Controls & Live Pedigree Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Market Feed:</span>
              <DataPedigreeBadge badge={activeBadge} />
              {connectionStatus === "connected" && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Zap size={11} />
                  LIVE STREAM ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Value</span>
              <p className="text-xl md:text-2xl font-black text-white mt-1">
                ₹{activePortValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Invested Capital</span>
              <p className="text-xl md:text-2xl font-black text-slate-200 mt-1">
                ₹{activePortInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Unrealized P&L</span>
              <p className={`text-xl md:text-2xl font-black mt-1 flex items-center gap-1 ${activePortPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {activePortPnl >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                ₹{Math.abs(activePortPnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ROI / Yield</span>
              <p className={`text-xl md:text-2xl font-black mt-1 ${activePortRoi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {activePortRoi >= 0 ? "+" : ""}{activePortRoi.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by symbol or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Sector Dropdown */}
              <div className="relative">
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Sectors ({holdings.length})</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* PnL Filter */}
              <div className="relative">
                <select
                  value={pnlFilter}
                  onChange={(e) => setPnlFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Positions</option>
                  <option value="PROFIT">In Profit (+)</option>
                  <option value="LOSS">In Loss (-)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href={`/transactions?portfolio_id=${selectedPortfolioId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
              >
                <ArrowLeftRight size={15} />
                <span>Transactions</span>
              </Link>
              <button
                onClick={() => {
                  setSymbol("");
                  setCompanyName("");
                  setQuantity("");
                  setBuyPrice("");
                  setCurrentPrice("");
                  setIsAddOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/30 transition-colors"
              >
                <Plus size={16} />
                <span>Add Holding</span>
              </button>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 text-center text-slate-400 animate-pulse">Loading holdings...</div>
            ) : holdings.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Layers size={40} className="mx-auto text-slate-400" />
                <h3 className="text-base font-bold text-slate-200">No Holdings in this Portfolio</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add your first stock, ETF, or asset position to start tracking average buy cost, weights, and P&L.
                </p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                >
                  Add First Holding
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Instrument</th>
                      <th className="py-3.5 px-4 text-right">Quantity</th>
                      <th className="py-3.5 px-4 text-right">Avg. Buy</th>
                      <th className="py-3.5 px-4 text-right">LTP</th>
                      <th className="py-3.5 px-4 text-right">Invested</th>
                      <th className="py-3.5 px-4 text-right">Current Value</th>
                      <th className="py-3.5 px-4 text-right">P&L (%)</th>
                      <th className="py-3.5 px-4 text-right">Weight</th>
                      <th className="py-3.5 px-4 text-center">Sector</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredHoldings.map((h) => {
                      const isProfit = h.unrealized_pnl >= 0;
                      const flash = flashStates[h.symbol] || flashStates[`${h.symbol}.NS`];
                      const flashClass = flash === "up" ? "bg-emerald-500/20" : flash === "down" ? "bg-rose-500/20" : "";
                      return (
                        <tr key={h.id} className={`hover:bg-slate-800/40 transition-colors duration-500 group ${flashClass}`}>
                          {/* Symbol & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white tracking-wide">
                                {h.symbol}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {h.company_name}
                              </span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                            {h.quantity}
                          </td>

                          {/* Avg Buy Price */}
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            ₹{h.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Current Price */}
                          <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                            ₹{h.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Invested Value */}
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            ₹{h.invested_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>

                          {/* Current Value */}
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            ₹{h.current_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>

                          {/* P&L */}
                          <td className="py-3.5 px-4 text-right">
                            <div className={`flex flex-col items-end ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                              <span className="font-bold">
                                {isProfit ? "+" : ""}₹{Math.abs(h.unrealized_pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-semibold">
                                {isProfit ? "+" : ""}{h.unrealized_pnl_pct.toFixed(2)}%
                              </span>
                            </div>
                          </td>

                          {/* Weight % */}
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-300">
                            {h.weight.toFixed(1)}%
                          </td>

                          {/* Sector Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {h.sector}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingHolding(h);
                                  setQuantity(h.quantity.toString());
                                  setBuyPrice(h.avg_buy_price.toString());
                                  setCurrentPrice(h.current_price.toString());
                                  setSector(h.sector);
                                  setAssetType(h.asset_type);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Edit Position"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(h.id, h.symbol)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Remove Position"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </MotionContainer>
        </main>
      </div>

      {/* Add Holding Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-emerald-400" />
                Add Investment Position
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Stock Search / Autocomplete */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Search Instrument (292 NSE Equities)
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. RELIANCE, TCS, INFY, HDFC..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {stockResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-1 divide-y divide-slate-850">
                  {stockResults.map((stk) => (
                    <button
                      key={stk.symbol}
                      type="button"
                      onClick={() => handleSelectStock(stk)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{stk.symbol}</p>
                        <p className="text-[11px] text-slate-400">{stk.company_name}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold">
                        {stk.sector}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddHolding} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TCS.NS"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Asset Class
                  </label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="Equity">Equity</option>
                    <option value="ETF">ETF</option>
                    <option value="Debt">Debt / Bonds</option>
                    <option value="Gold">Gold / Commodities</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Company Name / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Avg Buy Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="3400.00"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Current LTP (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="3550.00"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Sector Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Information Technology, Financial Services"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !symbol.trim() || !quantity || !buyPrice}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Position"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-emerald-400" />
                Edit {editingHolding.symbol}
              </h3>
              <button
                onClick={() => setEditingHolding(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateHolding} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Avg Buy Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Current LTP (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Sector Classification
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHolding(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institutional Remove Holding Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmHolding}
        title="Remove Position from Portfolio?"
        description={`Are you sure you want to remove ${deleteConfirmHolding?.symbol} from this portfolio? This will remove all position weight, unrealized P&L, and tracking history for this asset.`}
        confirmText="Remove Holding"
        cancelText="Keep Asset"
        variant="danger"
        isLoading={deletingHolding}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmHolding(null)}
      />
    </div>
  );
}
