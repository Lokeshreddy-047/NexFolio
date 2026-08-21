"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { getMarketOverview, type MarketOverviewResponse } from "@/lib/api";
import { useMarketFeed } from "@/lib/useMarketFeed";

interface TickerItem {
  symbol: string;
  rawSymbol: string;
  name: string;
  price: string;
  numericPrice: number;
  change: string;
  dayChangePct: number;
  isUp: boolean;
  isIndex?: boolean;
}

export function MarketTicker() {
  const router = useRouter();
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);

  // Load initial market overview data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getMarketOverview();
        if (isMounted) {
          setOverview(data);
        }
      } catch (err) {
        console.warn("Could not fetch market ticker overview:", err);
      }
    }
    loadData();

    // Refresh overview periodically (every 60s)
    const interval = setInterval(loadData, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute list of symbols to monitor for live ticks
  const monitoredSymbols = useMemo(() => {
    if (!overview) return ["^NSEI", "^BSESN", "^NSEBANK", "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"];
    const syms = [
      ...overview.indices.map((idx) => idx.symbol),
      ...overview.top_gainers.map((s) => s.symbol),
      ...overview.most_active.map((s) => s.symbol),
      ...overview.top_losers.map((s) => s.symbol),
    ];
    return Array.from(new Set(syms)).slice(0, 16);
  }, [overview]);

  // Hook into live SSE market tick feed
  const { ticks, connectionStatus } = useMarketFeed(monitoredSymbols);

  // Build live ticker items combining overview + live tick overrides
  const tickerItems: TickerItem[] = useMemo(() => {
    if (!overview) {
      return [
        { symbol: "NIFTY 50", rawSymbol: "^NSEI", name: "NSE Benchmark", price: "24,125.00", numericPrice: 24125.0, change: "+0.52%", dayChangePct: 0.52, isUp: true, isIndex: true },
        { symbol: "SENSEX", rawSymbol: "^BSESN", name: "BSE Benchmark", price: "79,480.00", numericPrice: 79480.0, change: "+0.45%", dayChangePct: 0.45, isUp: true, isIndex: true },
        { symbol: "BANKNIFTY", rawSymbol: "^NSEBANK", name: "Banking Index", price: "51,200.00", numericPrice: 51200.0, change: "-0.18%", dayChangePct: -0.18, isUp: false, isIndex: true },
        { symbol: "RELIANCE", rawSymbol: "RELIANCE.NS", name: "Reliance Ind", price: "₹1,345.50", numericPrice: 1345.5, change: "+1.14%", dayChangePct: 1.14, isUp: true },
        { symbol: "TCS", rawSymbol: "TCS.NS", name: "Tata Consultancy", price: "₹3,890.00", numericPrice: 3890.0, change: "-0.51%", dayChangePct: -0.51, isUp: false },
        { symbol: "HDFCBANK", rawSymbol: "HDFCBANK.NS", name: "HDFC Bank", price: "₹1,720.00", numericPrice: 1720.0, change: "+0.70%", dayChangePct: 0.70, isUp: true },
        { symbol: "INFY", rawSymbol: "INFY.NS", name: "Infosys Ltd", price: "₹1,850.50", numericPrice: 1850.5, change: "+1.40%", dayChangePct: 1.40, isUp: true },
      ];
    }

    const items: TickerItem[] = [];

    // 1. Process Benchmark Indices
    for (const idx of overview.indices) {
      const tick = ticks[idx.symbol];
      const level = tick ? tick.price : idx.current_level;
      const changePct = tick ? tick.day_change_pct : idx.day_change_pct;
      const isUp = changePct >= 0;

      items.push({
        symbol: idx.name || idx.symbol.replace("^", ""),
        rawSymbol: idx.symbol,
        name: idx.name,
        price: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(level),
        numericPrice: level,
        change: `${isUp ? "+" : ""}${changePct.toFixed(2)}%`,
        dayChangePct: changePct,
        isUp,
        isIndex: true,
      });
    }

    // 2. Process Top Equities (Gainers, Most Active, Losers)
    const combinedEquities = [
      ...overview.top_gainers,
      ...overview.most_active,
      ...overview.top_losers,
    ];
    const seen = new Set<string>();

    for (const eq of combinedEquities) {
      if (seen.has(eq.symbol)) continue;
      seen.add(eq.symbol);

      const tick = ticks[eq.symbol];
      const price = tick ? tick.price : eq.current_price;
      const changePct = tick ? tick.day_change_pct : eq.day_change_pct;
      const isUp = changePct >= 0;
      const cleanSymbol = eq.base_symbol || eq.symbol.replace(".NS", "").replace(".BO", "");

      items.push({
        symbol: cleanSymbol,
        rawSymbol: eq.symbol,
        name: eq.company_name,
        price: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(price),
        numericPrice: price,
        change: `${isUp ? "+" : ""}${changePct.toFixed(2)}%`,
        dayChangePct: changePct,
        isUp,
        isIndex: false,
      });
    }

    return items;
  }, [overview, ticks]);

  // Double the array for smooth, infinite marquee loop
  const tickerStream = [...tickerItems, ...tickerItems];

  const handleTickerClick = (item: TickerItem) => {
    if (item.isIndex) {
      router.push("/markets");
    } else {
      router.push(`/markets/${encodeURIComponent(item.rawSymbol)}`);
    }
  };

  return (
    <div className="w-full bg-[#02050e]/95 border-b border-white/[0.08] backdrop-blur-md overflow-hidden select-none py-1.5 flex items-center relative z-20">
      {/* Left Station Badge */}
      <div className="shrink-0 flex items-center gap-2 pl-4 pr-3 border-r border-white/[0.08] bg-[#02050e] z-10 text-[11px] font-bold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-400 font-mono uppercase tracking-wider">
          {connectionStatus === "connected" ? "LIVE" : "MARKET"}
        </span>
        <span className="text-slate-500 font-normal hidden sm:inline">NSE / BSE</span>
      </div>

      {/* Marquee Track */}
      <div className="overflow-hidden flex-1 relative flex">
        <div className="animate-ticker flex items-center gap-6 text-xs whitespace-nowrap pl-4">
          {tickerStream.map((item, idx) => (
            <button
              key={`${item.symbol}-${idx}`}
              onClick={() => handleTickerClick(item)}
              className="inline-flex items-center gap-2 py-0.5 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] transition-all cursor-pointer text-left"
            >
              <span className="font-bold text-slate-200">{item.symbol}</span>
              <span className="font-mono text-slate-300 font-semibold">{item.price}</span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded ${
                  item.isUp
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                }`}
              >
                {item.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {item.change}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Intelligence Pill */}
      <div className="shrink-0 hidden md:flex items-center gap-3 pr-4 pl-3 border-l border-white/[0.08] bg-[#02050e] z-10 text-[11px]">
        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
          <Sparkles size={13} className="text-indigo-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-wide uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            TreeSHAP 97% Acc
          </span>
        </div>
      </div>
    </div>
  );
}
