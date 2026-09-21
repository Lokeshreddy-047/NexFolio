"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  motion,
  AnimatePresence
} from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import {
  getPortfolios,
  createTransaction,
  searchStocks,
  PortfolioSummary,
  StockSearchItem
} from "@/lib/api";
import { useToast } from "@/components/toast-provider";

export interface OrderExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSettled?: () => void;
  defaultSymbol?: string;
  defaultCompanyName?: string;
  defaultSector?: string;
  defaultPrice?: number;
  defaultSide?: "BUY" | "SELL";
  defaultQuantity?: number;
  defaultPortfolioId?: string;
}

export function OrderExecutionModal({
  isOpen,
  onClose,
  onOrderSettled,
  defaultSymbol = "",
  defaultCompanyName = "",
  defaultSector = "Equity",
  defaultPrice = 0,
  defaultSide = "BUY",
  defaultQuantity = 10,
  defaultPortfolioId = ""
}: OrderExecutionModalProps) {
  const toast = useToast();

  // Form States
  const [side, setSide] = useState<"BUY" | "SELL">(defaultSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP_LOSS">("MARKET");
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [companyName, setCompanyName] = useState<string>(defaultCompanyName);
  const [sector, setSector] = useState<string>(defaultSector);
  const [price, setPrice] = useState<number>(defaultPrice);
  const [limitPrice, setLimitPrice] = useState<number>(defaultPrice);
  const [triggerPrice, setTriggerPrice] = useState<number>(defaultPrice);
  const [quantity, setQuantity] = useState<number>(defaultQuantity);
  const [portfolioId, setPortfolioId] = useState<string>(defaultPortfolioId);

  // Search & Async State
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    orderId: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    total: number;
    timestamp: string;
  } | null>(null);

  // Sync props when opened
  useEffect(() => {
    if (isOpen) {
      setSide(defaultSide);
      setSymbol(defaultSymbol);
      setCompanyName(defaultCompanyName || defaultSymbol);
      setSector(defaultSector || "Equity");
      setPrice(defaultPrice);
      setLimitPrice(defaultPrice);
      setTriggerPrice(defaultPrice > 0 ? Number((defaultPrice * 0.95).toFixed(2)) : 0);
      setQuantity(defaultQuantity || 10);
      setSuccessReceipt(null);

      // Load user portfolios
      getPortfolios()
        .then((res) => {
          setPortfolios(res);
          if (res.length > 0) {
            const def = res.find((p) => p.is_default) || res[0];
            setPortfolioId((prev) => prev || defaultPortfolioId || def.id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultSymbol, defaultCompanyName, defaultPrice, defaultSide, defaultQuantity, defaultPortfolioId, defaultSector]);

  // Stock search debounce
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && !symbol) {
      setSearching(true);
      const timer = setTimeout(() => {
        searchStocks(searchQuery)
          .then((results) => setSearchResults(results))
          .catch(() => setSearchResults([]))
          .finally(() => setSearching(false));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchQuery, symbol]);

  const activePrice = useMemo(() => {
    if (orderType === "MARKET") return price;
    if (orderType === "LIMIT") return limitPrice;
    return triggerPrice;
  }, [orderType, price, limitPrice, triggerPrice]);

  // Gross Trade Value
  const grossTradeValue = useMemo(() => {
    return Math.max(0, quantity * activePrice);
  }, [quantity, activePrice]);

  // Statutory Indian Market Charges Breakdown (Budget 2026/SEBI standard)
  const charges = useMemo(() => {
    if (grossTradeValue <= 0) {
      return { stt: 0, turnover: 0, sebi: 0, stampDuty: 0, gst: 0, total: 0 };
    }
    // STT: 0.1% on delivery trades
    const stt = Number((grossTradeValue * 0.001).toFixed(2));
    // Exchange turnover charge: ~0.00345% (NSE)
    const turnover = Number((grossTradeValue * 0.0000345).toFixed(2));
    // SEBI charges: ₹10 per crore (0.0001%)
    const sebi = Number((grossTradeValue * 0.000001).toFixed(2));
    // Stamp duty: 0.015% on BUY side only
    const stampDuty = side === "BUY" ? Number((grossTradeValue * 0.00015).toFixed(2)) : 0;
    // GST: 18% on (brokerage + turnover charges + sebi charges)
    const gst = Number(((turnover + sebi) * 0.18).toFixed(2));
    const total = Number((stt + turnover + sebi + stampDuty + gst).toFixed(2));

    return { stt, turnover, sebi, stampDuty, gst, total };
  }, [grossTradeValue, side]);

  const netSettlementAmount = useMemo(() => {
    if (side === "BUY") {
      return Number((grossTradeValue + charges.total).toFixed(2));
    } else {
      return Number(Math.max(0, grossTradeValue - charges.total).toFixed(2));
    }
  }, [grossTradeValue, charges, side]);

  // Handle Order Placement
  const handleExecuteOrder = async () => {
    if (!symbol) {
      toast.error("Symbol Required", "Please select an equity symbol to trade.");
      return;
    }
    if (!portfolioId) {
      toast.error("Portfolio Required", "Please select target portfolio for trade settlement.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Invalid Quantity", "Quantity must be at least 1 share.");
      return;
    }
    if (activePrice <= 0) {
      toast.error("Invalid Price", "Execution price must be greater than zero.");
      return;
    }

    try {
      setExecuting(true);
      const res = await createTransaction({
        portfolio_id: portfolioId,
        transaction_type: side,
        symbol: symbol,
        company_name: companyName || symbol,
        asset_type: "Equity",
        sector: sector || "Equity",
        quantity: quantity,
        price: activePrice,
        notes: `Simulated ${orderType} order (${side}) filled via NexFolio Trading Terminal`
      });

      const receipt = {
        orderId: res.id || `ORD-${Date.now().toString().slice(-6)}`,
        symbol: symbol,
        side: side,
        quantity: quantity,
        price: activePrice,
        total: netSettlementAmount,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      };

      setSuccessReceipt(receipt);
      toast.success(
        `Order Filled (${side})`,
        `${quantity} shares of ${symbol} filled at ₹${activePrice.toFixed(2)}.`
      );

      if (onOrderSettled) {
        onOrderSettled();
      }
    } catch (err: unknown) {
      toast.error("Execution Failed", err instanceof Error ? err.message : "Order execution rejected.");
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                side === "BUY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}>
                {side === "BUY" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Order Execution Terminal
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Simulated Fill
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Institutional Ledger Settlement & Lot Accounting</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {successReceipt ? (
              /* Success Receipt View */
              <div className="py-6 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 250 }}
                  className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={32} />
                </motion.div>

                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white">Order Filled Successfully</h4>
                  <p className="text-xs text-slate-400">Transaction settled into portfolio holdings ledger</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-sans">Order ID:</span>
                    <span className="text-slate-200 font-bold">{successReceipt.orderId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-sans">Instrument:</span>
                    <span className="text-emerald-400 font-bold">{successReceipt.symbol} ({successReceipt.side})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-sans">Filled Shares:</span>
                    <span className="text-slate-200 font-bold">{successReceipt.quantity} Shares</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-sans">Execution Price:</span>
                    <span className="text-slate-200 font-bold">₹{successReceipt.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-sans">Net Consideration:</span>
                    <span className="text-white font-black text-sm">₹{successReceipt.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span className="font-sans">Execution Time:</span>
                    <span>{successReceipt.timestamp} (NSE Reference)</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSuccessReceipt(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors"
                  >
                    Place Another Order
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Order Form View */
              <>
                {/* 1. Side & Order Type Switchers */}
                <div className="grid grid-cols-2 gap-3">
                  {/* BUY / SELL Switcher */}
                  <div className="flex p-1 rounded-2xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSide("BUY")}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                        side === "BUY"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide("SELL")}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                        side === "SELL"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      SELL
                    </button>
                  </div>

                  {/* Order Type (Market / Limit / SL) */}
                  <div className="flex p-1 rounded-2xl bg-slate-950 border border-slate-800">
                    {(["MARKET", "LIMIT", "STOP_LOSS"] as const).map((ot) => (
                      <button
                        key={ot}
                        type="button"
                        onClick={() => setOrderType(ot)}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                          orderType === ot
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {ot === "STOP_LOSS" ? "SL" : ot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Portfolio Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Target Portfolio</span>
                    <span className="text-[11px] text-slate-500">Destination ledger</span>
                  </label>
                  <select
                    value={portfolioId}
                    onChange={(e) => setPortfolioId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {portfolios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency}) — ₹{p.current_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Symbol Selection / Display */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Instrument (NSE Equity)</span>
                    {symbol && (
                      <button
                        onClick={() => {
                          setSymbol("");
                          setCompanyName("");
                          setPrice(0);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300"
                      >
                        Change Symbol
                      </button>
                    )}
                  </label>

                  {symbol ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{symbol}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {sector}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-[280px]">{companyName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">₹{price.toFixed(2)}</span>
                        <p className="text-[10px] text-slate-500 uppercase">Current LTP</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search ticker (e.g. RELIANCE, TCS, INFY)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      {searching && (
                        <div className="absolute right-3 top-3 text-xs text-slate-400">Searching...</div>
                      )}

                      {searchResults.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 shadow-xl">
                          {searchResults.map((s) => (
                            <button
                              key={s.symbol}
                              type="button"
                              onClick={() => {
                                setSymbol(s.symbol);
                                setCompanyName(s.company_name);
                                setSector(s.sector || "Equity");
                                const p = s.reference_price || 0;
                                setPrice(p);
                                setLimitPrice(p);
                                setTriggerPrice(p);
                                setSearchResults([]);
                                setSearchQuery("");
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-800/60 flex items-center justify-between border-b border-slate-800/40 last:border-none"
                            >
                              <div>
                                <span className="text-xs font-bold text-white">{s.symbol}</span>
                                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{s.company_name}</p>
                              </div>
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                ₹{(s.reference_price || 0).toFixed(2)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Quantity & Price Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Quantity (Shares)</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    {/* Quick quantity chips */}
                    <div className="flex gap-1.5 pt-1">
                      {[10, 25, 50, 100].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantity(q)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                          +{q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execution / Limit Price Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      {orderType === "MARKET" ? "Market LTP (₹)" : "Limit Price (₹)"}
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      disabled={orderType === "MARKET"}
                      value={orderType === "MARKET" ? price : limitPrice}
                      onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold font-mono focus:outline-none ${
                        orderType === "MARKET" ? "text-slate-400 cursor-not-allowed" : "text-white focus:ring-2 focus:ring-indigo-500/50"
                      }`}
                    />
                    <p className="text-[10px] text-slate-500 pt-1">
                      {orderType === "MARKET" ? "Best execution at current market offer" : "Order fills at limit or better"}
                    </p>
                  </div>
                </div>

                {/* Stop Loss Trigger Price Input if SL selected */}
                {orderType === "STOP_LOSS" && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      Stop-Loss Trigger Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={triggerPrice}
                      onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-sm font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-[10px] text-slate-400">Order automatically activates when market crosses this trigger.</p>
                  </div>
                )}

                {/* 5. Cost Summary & Statutory Charges Card */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Order Value ({quantity} × ₹{activePrice.toFixed(2)})</span>
                    <span className="font-mono text-slate-200 font-bold">₹{grossTradeValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-slate-400 items-center">
                    <span className="flex items-center gap-1 text-[11px]">
                      Statutory Taxes & Exchange Fees (STT, Stamp, SEBI, GST)
                    </span>
                    <span className="font-mono text-slate-400">₹{charges.total.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">
                      {side === "BUY" ? "Estimated Total Payable:" : "Estimated Net Receivable:"}
                    </span>
                    <span className="text-base font-black font-mono text-white">
                      ₹{netSettlementAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 6. Execution Button */}
                <button
                  type="button"
                  disabled={executing || !symbol || quantity <= 0}
                  onClick={handleExecuteOrder}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                    side === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 disabled:bg-emerald-500/50"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25 disabled:bg-rose-500/50"
                  }`}
                >
                  {executing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Executing Order Settlement...
                    </>
                  ) : (
                    <>
                      Confirm & Execute {side} Order
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
