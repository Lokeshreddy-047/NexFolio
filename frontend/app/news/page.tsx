"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
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
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("Just now");

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioOnly, setPortfolioOnly] = useState(false);

  const fetchNewsData = useCallback(async (isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [allNews, macros, userPorts] = await Promise.all([
        getMarketNews(undefined, undefined, undefined, undefined, isBackground),
        getMacroIndicators(isBackground),
        getPortfolios().catch(() => [])
      ]);

      setArticles(allNews);
      setMacroIndicators(macros);
      setPortfolios(userPorts);
      setLastSyncedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (userPorts.length > 0) {
        const portId = activePortfolioId || userPorts[0].id;
        if (!activePortfolioId) setActivePortfolioId(portId);
        try {
          const impact = await getPortfolioNews(portId);
          setPortfolioImpact(impact);
        } catch {
          // ignore if portfolio news empty
        }
      }
    } catch (err: unknown) {
      if (!isBackground) {
        toast.error("Failed to load market news", (err as Error).message || "Please check backend connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePortfolioId, toast]);

  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

  // Real-Time Background Stream Auto-Sync (every 25s when streaming is active)
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      fetchNewsData(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [isLiveStreaming, fetchNewsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsData(true);
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

  const breakingArticles = useMemo(() => articles.filter((a) => a.is_breaking), [articles]);

  const portfolioArticleIds = useMemo(() => {
    if (!portfolioImpact) return new Set<string>();
    return new Set(portfolioImpact.articles.map((a) => a.id));
  }, [portfolioImpact]);

  const filteredArticles = useMemo(() => {
    let list = articles;

    if (portfolioOnly && portfolioImpact) {
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
  }, [articles, portfolioOnly, portfolioImpact, portfolioArticleIds, selectedCategory, selectedSentiment, searchQuery]);

  const getSentimentBadge = (sentiment: NewsSentiment) => {
    switch (sentiment) {
      case "BULLISH":
        return {
          label: "Bullish ▲",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <TrendingUp size={12} className="text-emerald-400" />
        };
      case "BEARISH":
        return {
          label: "Bearish ▼",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <TrendingDown size={12} className="text-rose-400" />
        };
      case "NEUTRAL":
        return {
          label: "Neutral •",
          badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/30",
          icon: <Zap size={12} className="text-slate-400" />
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-150">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="Market News & Sentiment Radar"
          subtitle="Real-time financial intelligence, macro radar, and active portfolio impact mapping"
          activePortfolioId={activePortfolioId}
          onPortfolioChange={(id) => handlePortfolioChange(id)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full min-w-0 mx-auto">
          <MotionContainer className="space-y-6 min-w-0">
          {/* Header Sub-Section */}
          <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 min-w-0">
            <div className="max-w-2xl min-w-0">
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

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all ${
                  isLiveStreaming
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20"
                    : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200"
                }`}
                title={isLiveStreaming ? "Streaming active (auto-polling every 25s)" : "Stream paused. Click to resume"}
              >
                <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                {isLiveStreaming ? "STREAMING LIVE" : "STREAM PAUSED"}
              </button>
              <div className="flex flex-col text-left sm:text-right pr-1">
                <span className="text-[10px] text-slate-500 font-mono">Last Synced</span>
                <span className="text-[11px] text-slate-300 font-mono font-bold">{lastSyncedAt}</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Force Refresh
              </button>
            </div>
          </div>

          {/* Real-time Breaking Wire Alert Ribbon */}
          {breakingArticles.length > 0 && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 flex items-center gap-3 overflow-hidden shadow-lg backdrop-blur-md w-full min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider shrink-0 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <Zap size={13} className="fill-rose-400" />
                Breaking Wire
              </div>
              <div className="flex items-center gap-6 overflow-x-auto text-xs text-slate-200 whitespace-nowrap scrollbar-none font-medium py-0.5 flex-1 min-w-0">
                {breakingArticles.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-2 shrink-0">
                    <span className="text-amber-400 font-bold">[{b.source}]</span>
                    <span className="text-white">{b.headline}</span>
                    <span className="text-slate-400 text-[11px] font-mono">({b.time_ago})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

      {/* Top Macroeconomic Intermarket Radar Ribbon */}
      {macroIndicators.length > 0 && (
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Globe size={13} />
              <span>Macroeconomic & Sovereign Levers</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Synchronized via Live Feeds</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 min-w-0">
            {macroIndicators.map((macro) => (
              <div
                key={macro.id}
                className="p-3.5 rounded-2xl bg-[#0a101f]/90 border border-white/[0.08] hover:border-white/[0.16] shadow-lg backdrop-blur-xl transition-all"
              >
                <div className="text-[11px] font-semibold text-slate-400 truncate">
                  {macro.name}
                </div>
                <div className="text-base font-black text-white font-mono mt-1 tracking-tight">
                  {macro.current_value}
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1.5 font-mono">
                  <span className={macro.day_change_pct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {macro.day_change_pct >= 0 ? "+" : ""}{macro.day_change_pct}%
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    macro.trend === "BULLISH"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : macro.trend === "BEARISH"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md w-full min-w-0">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,231,157,0.2)]">
              <Briefcase size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate">
                  Portfolio News Radar: {portfolioImpact.portfolio_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  {portfolioImpact.total_relevant_news_count} Relevant Articles
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Overall Sentiment on your holdings:{" "}
                <span className="font-bold text-emerald-400">
                  {portfolioImpact.overall_portfolio_sentiment} (+{(portfolioImpact.sentiment_score * 100).toFixed(0)}% Score)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {portfolios.length > 1 && (
              <select
                value={activePortfolioId}
                onChange={(e) => handlePortfolioChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#070c18] text-white border border-white/[0.12] rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setPortfolioOnly(!portfolioOnly)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap border shrink-0 ${
                portfolioOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10"
                  : "bg-[#070c18] border-white/[0.08] text-slate-300 hover:border-white/[0.2] hover:text-white"
              }`}
            >
              {portfolioOnly ? "Showing Holdings Only ✓" : "Filter by My Holdings"}
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3.5 bg-[#0a101f]/90 p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] shadow-lg backdrop-blur-md w-full min-w-0">
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full flex-wrap sm:flex-nowrap">
          {(
            [
              { id: "ALL", label: "All News" },
              { id: "EARNINGS", label: "Earnings" },
              { id: "DEALS_MA", label: "Deals & Capex" },
              { id: "SECTOR_TRENDS", label: "Sector Trends" },
              { id: "REGULATORY", label: "Regulatory & SEBI" },
              { id: "MACRO_POLICY", label: "Macro Policy" }
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap border shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-blue-600/25 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/10"
                  : "border-white/[0.06] text-slate-400 hover:text-slate-200 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sentiment Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06] w-full min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Sentiment:</span>
            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-semibold">
              {(["ALL", "BULLISH", "BEARISH", "NEUTRAL"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSentiment(s)}
                  className={`px-3 py-1 rounded-lg transition-all text-xs font-bold ${
                    selectedSentiment === s
                      ? "bg-white/[0.12] text-white shadow-sm border border-white/[0.12]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400 ml-2">
              {filteredArticles.length} {filteredArticles.length === 1 ? "story" : "stories"}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker, company, news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#070c18] text-white placeholder:text-slate-500 border border-white/[0.08] rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main News Feed Stream */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={28} className="animate-spin text-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Synthesizing real-time market news and sentiment tags...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0a101f]/80 border border-white/[0.08]">
          <AlertTriangle size={32} className="mx-auto text-amber-400 mb-3" />
          <h3 className="text-sm font-bold text-white">No articles match your criteria</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query to see full market wire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
          {filteredArticles.map((item) => {
            const sentiment = getSentimentBadge(item.sentiment);
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl bg-[#0a101f]/90 border border-white/[0.08] p-5 shadow-xl hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/5 transition-all backdrop-blur-xl group min-w-0"
              >
                <div className="space-y-3.5 min-w-0">
                  {/* Card Meta Top Header */}
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-slate-300">
                        {item.source}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-mono text-[11px]">{item.time_ago}</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {portfolioArticleIds.has(item.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          ★ Holding
                        </span>
                      )}
                      {item.is_breaking && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                          ● BREAKING
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sentiment.badgeClass}`}>
                        {sentiment.icon}
                        {sentiment.label}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors break-words">
                    {item.headline}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed font-normal break-words">
                    {item.summary}
                  </p>

                  {/* AI Actionable Takeaway Callout */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      <Sparkles size={12} />
                      <span>AI Market Takeaway</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      {item.ai_takeaway}
                    </p>
                  </div>
                </div>

                {/* Related Stocks & Source Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.related_stocks.length > 0 && (
                      <>
                        <span className="text-[11px] text-slate-400 font-medium">Tickers:</span>
                        {item.related_stocks.map((stk) => (
                          <Link
                            key={stk.symbol}
                            href={`/markets/${encodeURIComponent(stk.symbol)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/15 hover:text-emerald-300 border border-white/[0.08] text-xs font-mono font-bold transition-colors text-slate-200"
                          >
                            <span>{stk.base_symbol}</span>
                            <span className={stk.day_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {stk.day_change_pct >= 0 ? "+" : ""}{stk.day_change_pct}%
                            </span>
                            <ArrowUpRight size={11} className="text-slate-400" />
                          </Link>
                        ))}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                      >
                        Read Story <ArrowUpRight size={11} />
                      </a>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                      {item.impact_severity} IMPACT
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
          </MotionContainer>
        </main>
      </div>
    </div>
  );
}
