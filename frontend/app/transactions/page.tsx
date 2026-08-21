"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
import {
  getPortfolios,
  getTransactions,
  createTransaction,
  deleteTransaction,
  searchStocks,
  TransactionItem,
  StockSearchItem
} from "@/lib/api";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<string | null>(null);
  const [deletingTx, setDeletingTx] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modal State
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stock search inside modal
  const [stockSearch, setStockSearch] = useState("");
  const [stockResults, setStockResults] = useState<StockSearchItem[]>([]);

  // Form states
  const [txType, setTxType] = useState<"BUY" | "SELL">("BUY");
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("Other");
  const [assetType, setAssetType] = useState("Equity");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

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

  // 2. Fetch transactions whenever portfolio changes
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTransactions({
        portfolio_id: selectedPortfolioId || undefined,
      });
      setTransactions(data);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedPortfolioId, fetchTransactions]);

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
    setPrice(stk.reference_price.toString());
    setStockSearch("");
    setStockResults([]);
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolioId || !symbol.trim() || !quantity || !price) return;

    try {
      setSubmitting(true);
      await createTransaction({
        portfolio_id: selectedPortfolioId,
        symbol: symbol.trim().toUpperCase(),
        company_name: companyName.trim() || undefined,
        transaction_type: txType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        asset_type: assetType,
        sector: sector || undefined,
        notes: notes.trim() || undefined,
      });

      // Reset modal state
      setIsRecordOpen(false);
      const recordedSym = symbol.trim().toUpperCase();
      const recordedType = txType;
      setSymbol("");
      setCompanyName("");
      setQuantity("");
      setPrice("");
      setNotes("");

      toast.success("Transaction Recorded", `${recordedType} order for ${recordedSym} was successfully logged.`);
      await fetchTransactions();
    } catch (err: unknown) {
      toast.error("Error Recording Transaction", (err as Error).message || "Failed to record transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTx = (id: string) => {
    setDeleteConfirmTx(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTx) return;
    try {
      setDeletingTx(true);
      await deleteTransaction(deleteConfirmTx);
      toast.success("Transaction Deleted", "Transaction record removed from ledger.");
      setDeleteConfirmTx(null);
      await fetchTransactions();
    } catch (err: unknown) {
      toast.error("Error Deleting Transaction", (err as Error).message || "Failed to delete transaction.");
    } finally {
      setDeletingTx(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || t.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate totals
  const totalVolume = transactions.reduce((acc, t) => acc + t.total_amount, 0);
  const totalBuys = transactions.filter((t) => t.transaction_type === "BUY").length;
  const totalSells = transactions.filter((t) => t.transaction_type === "SELL").length;

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Authenticating...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <ArrowLeftRight size={36} className="mx-auto text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-sm text-slate-400">Please sign in to view and record transactions.</p>
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
          title="Transaction Ledger"
          subtitle="Audit trail of buy and sell orders feeding portfolio cost-basis & realized returns"
          activePortfolioId={selectedPortfolioId}
          onPortfolioChange={(id) => setSelectedPortfolioId(id)}
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Transactions</span>
              <p className="text-2xl font-black text-white mt-1">{transactions.length} Orders</p>
              <p className="text-xs text-slate-400 mt-1">{totalBuys} Buys · {totalSells} Sells</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Traded Volume</span>
              <p className="text-2xl font-black text-slate-200 mt-1">
                ₹{totalVolume.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Cumulative order value</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ledger Health</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">Synchronized</p>
              <p className="text-xs text-slate-400 mt-1">Automated position re-weighting</p>
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

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Order Types</option>
                  <option value="BUY">BUY Only</option>
                  <option value="SELL">SELL Only</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href={`/holdings?portfolio_id=${selectedPortfolioId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
              >
                <Layers size={15} />
                <span>View Holdings</span>
              </Link>
              <button
                onClick={() => {
                  setSymbol("");
                  setCompanyName("");
                  setQuantity("");
                  setPrice("");
                  setNotes("");
                  setIsRecordOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/30 transition-colors"
              >
                <Plus size={16} />
                <span>Record Order</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 text-center text-slate-400 animate-pulse">Loading transaction ledger...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <ArrowLeftRight size={40} className="mx-auto text-slate-400" />
                <h3 className="text-base font-bold text-slate-200">No Transactions Recorded</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Record your first BUY or SELL transaction to automatically calculate average prices and track position history.
                </p>
                <button
                  onClick={() => setIsRecordOpen(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                >
                  Record First Order
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Instrument</th>
                      <th className="py-3.5 px-4 text-right">Quantity</th>
                      <th className="py-3.5 px-4 text-right">Price</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-center">Sector</th>
                      <th className="py-3.5 px-4">Notes</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredTransactions.map((t) => {
                      const isBuy = t.transaction_type === "BUY";
                      const formattedDate = new Date(t.transaction_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition-colors group">
                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-400 font-medium whitespace-nowrap">
                            {formattedDate}
                          </td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                isBuy
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {t.transaction_type}
                            </span>
                          </td>

                          {/* Symbol & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white tracking-wide">{t.symbol}</span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {t.company_name}
                              </span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                            {t.quantity}
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            ₹{t.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            ₹{t.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>

                          {/* Sector Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                              {t.sector}
                            </span>
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 text-slate-400 italic max-w-[140px] truncate">
                            {t.notes || "—"}
                          </td>

                          {/* Delete Action */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteTx(t.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                              title="Delete Transaction Record"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* Record Transaction Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowLeftRight size={20} className="text-emerald-400" />
                Record Transaction
              </h3>
              <button
                onClick={() => setIsRecordOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* BUY / SELL Toggle */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setTxType("BUY")}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                  txType === "BUY"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                BUY ORDER
              </button>
              <button
                type="button"
                onClick={() => setTxType("SELL")}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                  txType === "SELL"
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                SELL ORDER
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

            <form onSubmit={handleRecordTransaction} className="space-y-4">
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
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    Execution Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="3400.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Order notes, trade rationale or broker reference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !symbol.trim() || !quantity || !price}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                    txType === "BUY"
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-rose-500 text-white hover:bg-rose-400"
                  }`}
                >
                  {submitting ? "Recording..." : `Record ${txType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institutional Delete Transaction Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmTx}
        title="Delete Transaction Record?"
        description="Are you sure you want to permanently delete this transaction entry from your portfolio ledger? This will recalculate historical trade volumes and realized P&L."
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingTx}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTx(null)}
      />
    </div>
  );
}
