"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Globe,
  Briefcase,
  AlertTriangle
} from "lucide-react";
import {
  NewsItem,
  NewsCategory,
  NewsSentiment,
  MacroIndicator,
  PortfolioNewsImpact,
  PortfolioSummary,
  getMarketNews,
  getMacroIndicators,
  getPortfolioNews,
  getPortfolios
} from "@/lib/api";
import { useToast } from "@/components/toast-provider";

export default function MarketNewsPage() {
  const toast = useToast();
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [portfolioImpact, setPortfolioImpact] = useState<PortfolioNewsImpact | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioOnly, setPortfolioOnly] = useState(false);

  const fetchNewsData = useCallback(async () => {
    try {
      setLoading(true);
      const [allNews, macros, userPorts] = await Promise.all([
        getMarketNews(),
        getMacroIndicators(),
        getPortfolios().catch(() => [])
      ]);

      setArticles(allNews);
      setMacroIndicators(macros);
      setPortfolios(userPorts);

      if (userPorts.length > 0) {
        const defaultPortId = userPorts[0].id;
        setActivePortfolioId(defaultPortId);
        try {
          const impact = await getPortfolioNews(defaultPortId);
          setPortfolioImpact(impact);
        } catch {
          // ignore if portfolio news empty
        }
      }
    } catch (err: unknown) {
      toast.error("Failed to load market news", (err as Error).message || "Please check backend connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsData();
  };

  const handlePortfolioChange = async (portId: string) => {
    setActivePortfolioId(portId);
    try {
      const impact = await getPortfolioNews(portId);
      setPortfolioImpact(impact);
    } catch {
      setPortfolioImpact(null);
    }
  };

  const filteredArticles = useMemo(() => {
    let list = articles;

    if (portfolioOnly && portfolioImpact) {
      const portfolioArticleIds = new Set(portfolioImpact.articles.map((a) => a.id));
      list = list.filter((item) => portfolioArticleIds.has(item.id));
    }

    return list.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSentiment !== "ALL" && item.sentiment !== selectedSentiment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHeadline = item.headline.toLowerCase().includes(q);
        const matchesSummary = item.summary.toLowerCase().includes(q);
        const matchesStock = item.related_stocks.some(
          (s) => s.symbol.toLowerCase().includes(q) || s.company_name.toLowerCase().includes(q)
        );
        if (!matchesHeadline && !matchesSummary && !matchesStock) return false;
      }
      return true;
    });
  }, [articles, portfolioOnly, portfolioImpact, selectedCategory, selectedSentiment, searchQuery]);

  const getSentimentBadge = (sentiment: NewsSentiment) => {
    switch (sentiment) {
      case "BULLISH":
        return {
          label: "Bullish ▲",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <TrendingUp size={12} className="text-emerald-500" />
        };
      case "BEARISH":
        return {
          label: "Bearish ▼",
          badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: <TrendingDown size={12} className="text-rose-500" />
        };
      case "NEUTRAL":
        return {
          label: "Neutral •",
          badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
          icon: <Zap size={12} className="text-slate-500" />
        };
    }
  };

  const getCategoryLabel = (cat: NewsCategory) => {
    switch (cat) {
      case "MACRO_POLICY":
        return "Macro Policy";
      case "EARNINGS":
        return "Earnings & Results";
      case "DEALS_MA":
        return "Deals & Capex";
      case "SECTOR_TRENDS":
        return "Sector Trends";
      case "REGULATORY":
        return "Regulatory & SEBI";
      case "MARKET_PULSE":
        return "Market Pulse";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="Market News & Sentiment Radar"
          subtitle="Real-time financial intelligence, macro radar, and active portfolio impact mapping"
          activePortfolioId={activePortfolioId}
          onPortfolioChange={(id) => handlePortfolioChange(id)}
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Header Sub-Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Newspaper size={13} />
                Institutional Intelligence Wire
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Live Indian Financial Headlines & Sector Signals
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Curated Indian equity market intelligence with NLP sentiment polarity, macroeconomic tracking, and active portfolio impact mapping.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh Feed
              </button>
            </div>
          </div>

      {/* Top Macroeconomic Intermarket Radar Ribbon */}
      {macroIndicators.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Globe size={13} />
              <span>Macroeconomic & Sovereign Levers</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Synchronized via Live Feeds</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {macroIndicators.map((macro) => (
              <div
                key={macro.id}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {macro.name}
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                  {macro.current_value}
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1 font-mono">
                  <span className={macro.day_change_pct >= 0 ? "text-emerald-500" : "text-rose-500"}>
                    {macro.day_change_pct >= 0 ? "+" : ""}{macro.day_change_pct}%
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    macro.trend === "BULLISH"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : macro.trend === "BEARISH"
                      ? "bg-rose-500/10 text-rose-500"
                      : "bg-slate-500/10 text-slate-500"
                  }`}>
                    {macro.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Impact Spotlight Banner */}
      {portfolioImpact && portfolioImpact.total_relevant_news_count > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Portfolio News Radar: {portfolioImpact.portfolio_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {portfolioImpact.total_relevant_news_count} Relevant Articles
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Overall Sentiment on your holdings:{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {portfolioImpact.overall_portfolio_sentiment} (+{(portfolioImpact.sentiment_score * 100).toFixed(0)}% Score)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {portfolios.length > 1 && (
              <select
                value={activePortfolioId}
                onChange={(e) => handlePortfolioChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setPortfolioOnly(!portfolioOnly)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                portfolioOnly
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              {portfolioOnly ? "Showing Holdings Only ✓" : "Filter by My Holdings"}
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {(
            [
              { id: "ALL", label: "All News" },
              { id: "EARNINGS", label: "Earnings" },
              { id: "DEALS_MA", label: "Deals & Capex" },
              { id: "SECTOR_TRENDS", label: "Sector Trends" },
              { id: "REGULATORY", label: "Regulatory" },
              { id: "MACRO_POLICY", label: "Macro Policy" }
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sentiment Filter & Search */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(["ALL", "BULLISH", "BEARISH", "NEUTRAL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSentiment(s)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedSentiment === s
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker, company, news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Main News Feed Stream */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={28} className="animate-spin text-blue-500" />
          <p className="text-xs text-slate-500 font-medium">Synthesizing real-time market news and sentiment tags...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-sm font-bold">No articles match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query to see full market wire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((item) => {
            const sentiment = getSentimentBadge(item.sentiment);
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all backdrop-blur-md group"
              >
                <div className="space-y-3.5">
                  {/* Card Meta Top Header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {item.source}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-400 font-mono text-[11px]">{item.time_ago}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sentiment.badgeClass}`}>
                        {sentiment.icon}
                        {sentiment.label}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-500 transition-colors">
                    {item.headline}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* AI Actionable Takeaway Callout */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      <Sparkles size={12} />
                      <span>AI Market Takeaway</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {item.ai_takeaway}
                    </p>
                  </div>
                </div>

                {/* Related Stocks Footer */}
                {item.related_stocks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-medium">Impacted Tickers:</span>
                      {item.related_stocks.map((stk) => (
                        <Link
                          key={stk.symbol}
                          href={`/markets/${encodeURIComponent(stk.symbol)}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-500 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold transition-colors"
                        >
                          <span>{stk.base_symbol}</span>
                          <span className={stk.day_change_pct >= 0 ? "text-emerald-500" : "text-rose-500"}>
                            {stk.day_change_pct >= 0 ? "+" : ""}{stk.day_change_pct}%
                          </span>
                          <ArrowUpRight size={11} className="text-slate-400" />
                        </Link>
                      ))}
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {item.impact_severity} IMPACT
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
