"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MotionContainer } from "@/components/ui/motion";
import {
  getPortfolioIntelligence,
  simulateWhatIfRisk,
  savePrediction,
  getPredictionHistory,
  PredictionHistoryItem,
  PortfolioIntelligenceResponse,
  WhatIfSimulationResponse,
  PortfolioSummary,
  HealthScorePillar,
  getPortfolios,
  getPortfolioRebalancePlan,
  RebalancePlanResponse,
  RebalanceTradeItem
} from "@/lib/api";
import { OrderExecutionModal } from "@/components/order-execution-modal";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Sliders,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Award,
  History,
  HelpCircle,
  BarChart3,
  Check,
  X,
  BookmarkCheck,
  Clock,
  Scale,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Wallet,
  CheckCircle2,
  Zap
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";

export default function IntelligencePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [intelligence, setIntelligence] = useState<PortfolioIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prediction History Drawer state (FIX-15)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingPrediction, setSavingPrediction] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Authentication guard (FIX-14)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Recommendations filter
  const [recFilter, setRecFilter] = useState<string>("ALL");
  const [showMathDetails, setShowMathDetails] = useState(false);

  // Explain the Score Drawer/Modal state
  const [inspectedPillar, setInspectedPillar] = useState<HealthScorePillar | null>(null);

  // What-If Simulation State
  const [activePreset, setActivePreset] = useState<string>("CUSTOM");
  const [simAllocations, setSimAllocations] = useState<{
    equity_pct: number;
    etf_pct: number;
    debt_pct: number;
    gold_pct: number;
    crypto_pct: number;
  }>({
    equity_pct: 60,
    etf_pct: 20,
    debt_pct: 10,
    gold_pct: 10,
    crypto_pct: 0
  });

  const [simResult, setSimResult] = useState<WhatIfSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const totalSimPct = Object.values(simAllocations).reduce((a, b) => a + b, 0);

  // AI Portfolio Rebalancer Studio State
  const [rebalanceObjective, setRebalanceObjective] = useState<"MAXIMIZE_HEALTH" | "LOW_RISK" | "SECTOR_BALANCED" | "TAX_AWARE">("MAXIMIZE_HEALTH");
  const [maxSingleWeight, setMaxSingleWeight] = useState<number>(18);
  const [maxSectorWeight, setMaxSectorWeight] = useState<number>(30);
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlanResponse | null>(null);
  const [loadingRebalance, setLoadingRebalance] = useState(false);
  const [rebalanceError, setRebalanceError] = useState<string | null>(null);
  const [rebalanceTradeModal, setRebalanceTradeModal] = useState<{
    isOpen: boolean;
    trade?: RebalanceTradeItem;
  }>({ isOpen: false });

  const handleGenerateRebalancePlan = useCallback(async (
    obj: "MAXIMIZE_HEALTH" | "LOW_RISK" | "SECTOR_BALANCED" | "TAX_AWARE" = rebalanceObjective,
    singleW: number = maxSingleWeight,
    sectorW: number = maxSectorWeight
  ) => {
    if (!selectedPortfolioId) return;
    try {
      setLoadingRebalance(true);
      setRebalanceError(null);
      const plan = await getPortfolioRebalancePlan(selectedPortfolioId, {
        objective: obj,
        max_single_weight_pct: singleW,
        max_sector_weight_pct: sectorW
      });
      setRebalancePlan(plan);
    } catch (err: unknown) {
      setRebalanceError(err instanceof Error ? err.message : "Failed to compute portfolio rebalance plan.");
    } finally {
      setLoadingRebalance(false);
    }
  }, [selectedPortfolioId, rebalanceObjective, maxSingleWeight, maxSectorWeight]);

  // Auto-generate rebalance plan on portfolio or objective change
  useEffect(() => {
    if (selectedPortfolioId) {
      handleGenerateRebalancePlan(rebalanceObjective, maxSingleWeight, maxSectorWeight);
    }
  }, [selectedPortfolioId, rebalanceObjective, maxSingleWeight, maxSectorWeight, handleGenerateRebalancePlan]);

  // 1. Initial Load: Fetch Portfolios
  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPortfolios();
      setPortfolios(res);
      if (res.length > 0) {
        const defaultPort = res.find(p => p.is_default) || res[0];
        setSelectedPortfolioId(defaultPort.id);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load portfolios.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPortfolios();
    }
  }, [user, loadPortfolios]);

  // Save current evaluation to prediction history (FIX-15)
  const handleSaveEvaluation = async () => {
    if (!selectedPortfolioId || !intelligence) return;
    try {
      setSavingPrediction(true);
      const m = intelligence.quantitative_metrics;
      const portfolioData: Record<string, number> = {
        annualized_return: m.annualized_return,
        annualized_volatility: m.annualized_volatility,
        portfolio_beta: m.portfolio_beta,
        portfolio_sharpe_ratio: m.portfolio_sharpe_ratio,
        portfolio_sortino_ratio: m.portfolio_sortino_ratio,
        portfolio_calmar_ratio: m.portfolio_calmar_ratio,
        portfolio_max_drawdown: m.portfolio_max_drawdown,
        asset_count: m.asset_count,
        sector_count: m.sector_count,
        diversification_score: m.diversification_score,
      };

      await savePrediction({
        portfolio_id: selectedPortfolioId,
        portfolio_data: portfolioData,
      });

      setSavedSuccess(true);
      toast.success("Saved!", "Risk evaluation archived to prediction history.");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      toast.error("Save Failed", err instanceof Error ? err.message : "Failed to archive evaluation.");
    } finally {
      setSavingPrediction(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    try {
      setLoadingHistory(true);
      const items = await getPredictionHistory();
      setPredictionHistory(items);
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to load prediction history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. Fetch Intelligence when Selected Portfolio Changes
  const loadIntelligence = useCallback(async (portId: string) => {
    if (!portId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPortfolioIntelligence(portId);
      setIntelligence(data);
      setSimResult(null);
      if (data.health_scorecard.pillars.length > 0) {
        setInspectedPillar(data.health_scorecard.pillars[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze portfolio intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPortfolioId) {
      loadIntelligence(selectedPortfolioId);
    }
  }, [selectedPortfolioId, loadIntelligence]);

  // 3. Preset selector
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (!intelligence?.scenario_presets) return;

    if (presetKey === "DEFENSIVE_SHIFT" && intelligence.scenario_presets.DEFENSIVE_SHIFT) {
      const p = intelligence.scenario_presets.DEFENSIVE_SHIFT;
      setSimAllocations({
        equity_pct: p.equity_pct ?? 30,
        etf_pct: p.etf_pct ?? 30,
        debt_pct: p.debt_pct ?? 25,
        gold_pct: p.gold_pct ?? 15,
        crypto_pct: p.crypto_pct ?? 0
      });
    } else if (presetKey === "MAX_DIVERSIFICATION" && intelligence.scenario_presets.MAX_DIVERSIFICATION) {
      const p = intelligence.scenario_presets.MAX_DIVERSIFICATION;
      setSimAllocations({
        equity_pct: p.equity_pct ?? 40,
        etf_pct: p.etf_pct ?? 30,
        debt_pct: p.debt_pct ?? 15,
        gold_pct: p.gold_pct ?? 15,
        crypto_pct: p.crypto_pct ?? 0
      });
    } else if (presetKey === "CONCENTRATION_TAPER" && intelligence.scenario_presets.CONCENTRATION_TAPER) {
      const p = intelligence.scenario_presets.CONCENTRATION_TAPER;
      setSimAllocations({
        equity_pct: p.equity_pct ?? 50,
        etf_pct: p.etf_pct ?? 30,
        debt_pct: p.debt_pct ?? 10,
        gold_pct: p.gold_pct ?? 10,
        crypto_pct: p.crypto_pct ?? 0
      });
    }
  };

  // 4. Handle What-If Simulation
  const handleRunSimulation = async () => {
    if (!selectedPortfolioId) return;
    if (totalSimPct !== 100) {
      setSimError(`Total allocation must equal 100% (currently ${totalSimPct}%).`);
      return;
    }

    try {
      setSimulating(true);
      setSimError(null);
      const res = await simulateWhatIfRisk(selectedPortfolioId, simAllocations);
      setSimResult(res);
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : "Simulation calculation failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleSliderChange = (key: keyof typeof simAllocations, val: number) => {
    setActivePreset("CUSTOM");
    setSimAllocations(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // Helpers
  const getRiskBadge = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "LOW":
        return { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: ShieldCheck, label: "LOW RISK" };
      case "HIGH":
        return { bg: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: ShieldAlert, label: "HIGH RISK" };
      default:
        return { bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: AlertTriangle, label: "MODERATE RISK" };
    }
  };

  const getPillarRatingBadge = (rating: string) => {
    switch (rating?.toUpperCase()) {
      case "EXCELLENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "GOOD":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "MODERATE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const filteredRecs = intelligence?.recommendations.filter(r => {
    if (recFilter === "ALL") return true;
    return r.category === recFilter;
  }) || [];

  // Combine SHAP drivers for Diverging Ranking Chart
  const allDriversSorted = React.useMemo(() => {
    if (!intelligence) return [];
    const mit = intelligence.risk_mitigators.map(d => ({ ...d, score: Math.abs(d.impact_score), isMitigator: true }));
    const amp = intelligence.risk_amplifiers.map(d => ({ ...d, score: -Math.abs(d.impact_score), isMitigator: false }));
    return [...mit, ...amp].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }, [intelligence]);

  const maxDriverMag = React.useMemo(() => {
    if (allDriversSorted.length === 0) return 1.0;
    return Math.max(...allDriversSorted.map(d => Math.abs(d.score)), 0.1);
  }, [allDriversSorted]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-150">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="AI Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
          {/* Top Context Bar: Active Portfolio, Model Provenance & Data Pedigree */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl cyber-card backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Target Portfolio:
              </label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="px-4 py-2 rounded-xl bg-black/60 border border-white/[0.12] text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.currency})
                  </option>
                ))}
              </select>

              {intelligence?.provenance && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                    <Sparkles size={13} className="text-indigo-400" />
                    {intelligence.provenance.model_name} ({intelligence.provenance.model_version})
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08] font-bold">
                    Dataset: {intelligence.provenance.feature_dataset_version}
                  </span>
                  <DataPedigreeBadge badge={intelligence.provenance.data_quality_badge} />
                  <span className={`px-3 py-1.5 rounded-xl font-black border ${
                    intelligence.provenance.data_sufficiency_status === "READY"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,231,157,0.2)]"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}>
                    ● {intelligence.provenance.data_sufficiency_status}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={handleSaveEvaluation}
                disabled={savingPrediction || !intelligence}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                title="Save current risk evaluation to prediction history"
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck size={14} className={savingPrediction ? "animate-spin text-emerald-400" : "text-emerald-400"} />
                    <span>{savingPrediction ? "Saving..." : "Save Evaluation"}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenHistory}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all active:scale-95 shadow-sm"
                title="View past prediction evaluations"
              >
                <History size={14} className="text-indigo-400" />
                <span>History</span>
              </button>


              <button
                onClick={() => loadIntelligence(selectedPortfolioId)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-bold border border-white/[0.1] transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : "text-emerald-400"} />
                Re-Analyze
              </button>
            </div>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin shadow-[0_0_20px_rgba(16,231,157,0.3)]" />
              <p className="text-sm font-black tracking-wide text-slate-300">Executing explainable AI risk inference & SHAP attributions...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 backdrop-blur-xl">
              <AlertTriangle size={20} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Insufficient Holdings Notice */}
          {!loading && !error && intelligence?.provenance.data_sufficiency_status !== "READY" && (
            <div className="p-10 rounded-3xl cyber-card text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Layers size={28} />
              </div>
              <h3 className="text-lg font-black text-white">Insufficient Portfolio Data</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {intelligence?.provenance.data_sufficiency_notes || "Add stock holdings to your portfolio to enable machine learning risk classification and SHAP driver analysis."}
              </p>
            </div>
          )}

          {/* Main Intelligence Engine */}
          {!loading && !error && intelligence && intelligence.provenance.data_sufficiency_status === "READY" && (
            <>
              {/* Row 1: AI Risk Profile & 4-Pillar Health Scorecard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. AI Risk Profile (5 cols) */}
                <div className="lg:col-span-5 p-6 rounded-3xl cyber-card cyber-card-iris backdrop-blur-2xl flex flex-col justify-between space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,231,157,0.2)]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white">AI Risk Classification</h2>
                        <p className="text-[11px] text-slate-400">Institutional Multiclass XGBoost Model</p>
                      </div>
                    </div>

                    {(() => {
                      const badge = getRiskBadge(intelligence.risk_category);
                      const Icon = badge.icon;
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black ${badge.bg}`}>
                          <Icon size={14} />
                          {badge.label}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Confidence & Institutional Metrics */}
                  <div className="flex items-center justify-around py-4 px-2 rounded-2xl bg-black/40 border border-white/[0.08]">
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-bold text-slate-400">Model Confidence</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1 drop-shadow-[0_0_8px_rgba(16,231,157,0.3)]">
                        {(intelligence.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-10 w-px bg-white/[0.08]" />
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-bold text-slate-400">Portfolio Beta</p>
                      <p className="text-2xl font-black text-white mt-1 font-mono">
                        {intelligence.quantitative_metrics.portfolio_beta.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-10 w-px bg-white/[0.08]" />
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-bold text-slate-400">Annualized Vol</p>
                      <p className="text-2xl font-black text-white mt-1 font-mono">
                        {(intelligence.quantitative_metrics.annualized_volatility * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Probability Breakdown Distribution */}
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Class Probability Distribution</p>
                    <div className="space-y-2">
                      {Object.entries(intelligence.probabilities).map(([cat, prob]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">{cat} Risk</span>
                            <span className="text-slate-400 font-mono">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat === "LOW" ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,231,157,0.6)]" : cat === "HIGH" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                              }`}
                              style={{ width: `${Math.max(5, prob * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. 4-Pillar Health Scorecard (7 cols) */}
                <div className="lg:col-span-7 p-6 rounded-3xl cyber-card cyber-card-mint backdrop-blur-2xl flex flex-col justify-between space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/25 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <Award size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white">4-Pillar Portfolio Health Scorecard</h2>
                        <p className="text-[11px] text-slate-400">Click any pillar below to inspect exact scoring formulas</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,231,157,0.4)]">
                        {intelligence.health_scorecard.overall_score}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black shadow-[0_0_10px_rgba(16,231,157,0.2)]">
                        Grade {intelligence.health_scorecard.grade}
                      </span>
                    </div>
                  </div>

                  {/* 4 Interactive Pillar Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {intelligence.health_scorecard.pillars.map((pillar) => {
                      const isSelected = inspectedPillar?.name === pillar.name;
                      return (
                        <div
                          key={pillar.name}
                          onClick={() => setInspectedPillar(pillar)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? "bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-950/30"
                              : "bg-slate-950/60 border-slate-800/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                              {pillar.name}
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getPillarRatingBadge(pillar.rating)}`}>
                              {pillar.rating}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">{pillar.key_metric_label}: <strong className="text-slate-200">{pillar.key_metric_value}</strong></span>
                              <span className="font-bold text-emerald-400">{pillar.score}/{pillar.max_score}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                                style={{ width: `${(pillar.score / pillar.max_score) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span className="truncate">{pillar.description}</span>
                            <span className="text-indigo-400 font-semibold shrink-0 ml-1">Inspect ➔</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* "Explain the Score" Detail Drawer */}
                  {inspectedPillar && (
                    <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HelpCircle size={15} className="text-indigo-400" />
                          <h4 className="text-xs font-bold text-indigo-200">
                            Scoring Inspector: {inspectedPillar.name} ({inspectedPillar.score}/25 pts)
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Formula Breakdown</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {inspectedPillar.scoring_logic || inspectedPillar.description}
                      </p>

                      {inspectedPillar.formula && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-emerald-400">
                          {inspectedPillar.formula}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: AI Decision Timeline */}
              {intelligence.ai_decision_timeline && intelligence.ai_decision_timeline.length > 0 && (
                <div className="p-6 rounded-3xl cyber-card cyber-card-cyan backdrop-blur-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <History size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">AI Decision & Trajectory Timeline</h3>
                        <p className="text-[11px] text-slate-400">
                          Historical portfolio risk, health score evolution, and the primary driving factors
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 font-bold px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      {intelligence.ai_decision_timeline.length} Checkpoints Tracked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {intelligence.ai_decision_timeline.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2 flex flex-col justify-between hover:border-cyan-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 font-mono">{pt.checkpoint_date}</span>
                          <span className="text-xs font-black text-emerald-400">{pt.health_score}/100</span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 font-mono">Valuation: <strong className="text-slate-100">₹{pt.portfolio_value.toLocaleString("en-IN")}</strong></p>
                          <p className="text-[11px] text-slate-400 truncate">Driver: <span className="text-cyan-300 font-bold">{pt.primary_driver}</span></p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 uppercase font-bold">Risk:</span>
                          <span className="font-black text-white">{pt.risk_category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: Bidirectional SHAP Driver Ranking Scale */}
              <div className="p-6 rounded-3xl cyber-card backdrop-blur-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Explainable AI: TreeSHAP Feature Impact Attribution</h3>
                      <p className="text-[11px] text-slate-400">
                        Ranked mathematical contributions on a continuous visual scale (Red = Elevates Risk, Green = Downside Stabilizer)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMathDetails(!showMathDetails)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    {showMathDetails ? "Hide Mathematical Details" : "Show Mathematical Details"}
                    {showMathDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Diverging Bar Chart Grid */}
                <div className="space-y-2.5 pt-2">
                  {allDriversSorted.map((d) => {
                    const widthPct = Math.min(100, (Math.abs(d.score) / maxDriverMag) * 100);
                    return (
                      <div
                        key={d.feature_key}
                        className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5 hover:border-white/[0.15] transition-all"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200 flex items-center gap-2">
                            {d.isMitigator ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,231,157,0.8)] shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)] shrink-0" />
                            )}
                            {d.headline} ({d.feature_name})
                          </span>
                          <span className={`font-mono font-black ${d.isMitigator ? "text-emerald-400" : "text-rose-400"}`}>
                            {d.isMitigator ? `+${d.score.toFixed(3)}` : `${d.score.toFixed(3)}`}
                          </span>
                        </div>

                        {/* Visual Diverging Bar */}
                        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              d.isMitigator ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,231,157,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                            }`}
                            style={{ width: `${Math.max(5, widthPct)}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-300">{d.narrative}</p>

                        {showMathDetails && (
                          <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Observed Value: {d.observed_value}</span>
                            <span>Benchmark Baseline: {d.benchmark_baseline}</span>
                            <span>Context: {d.contextual_effect}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Traceable Recommendations Matrix */}
              <div className="p-6 rounded-3xl cyber-card backdrop-blur-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" />
                      Traceable Portfolio Optimization Opportunities
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Every recommendation is strictly tied to a specific quantitative metric trigger and affected holdings
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/[0.08] text-xs">
                    {["ALL", "SECTOR_REBALANCING", "ASSET_DIVERSIFICATION", "DEFENSIVE_ALLOCATION", "VOLATILITY_MITIGATION"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setRecFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                          recFilter === cat
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat === "ALL" ? "All Recommendations" : cat.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommendations Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRecs.length === 0 ? (
                    <div className="col-span-2 text-center py-10 text-slate-400 text-xs">
                      No recommendations matching this category filter.
                    </div>
                  ) : (
                    filteredRecs.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-white/[0.06] text-slate-200 font-black text-[10px] flex items-center justify-center">
                                #{rec.priority_rank}
                              </span>
                              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                                {rec.category.replace("_", " ")}
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              rec.severity === "HIGH"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                                : rec.severity === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            }`}>
                              {rec.severity} PRIORITY
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                        </div>

                        {/* Trigger & Affected Holdings */}
                        <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Trigger Condition:</span>
                            <span className="font-mono text-amber-400 font-bold">{rec.trigger_condition}</span>
                          </div>

                          {rec.affected_holdings.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="text-slate-400">Affected:</span>
                              {rec.affected_holdings.map((sym) => (
                                <span key={sym} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-200 font-mono font-bold">
                                  {sym}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                            ✦ {rec.suggested_review_action}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 5: AI-Driven Portfolio Rebalancer Studio */}
              <div className="p-6 rounded-3xl cyber-card backdrop-blur-2xl space-y-6 relative overflow-hidden border border-emerald-500/20 shadow-[0_0_30px_rgba(16,231,157,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,231,157,0.25)]">
                      <Scale size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">AI-Driven Portfolio Rebalancer Studio</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Automated Trade Optimizer
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Multi-objective engine that calculates target weights, capital reallocation, and an itemized execution schedule
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateRebalancePlan()}
                    disabled={loadingRebalance}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loadingRebalance ? "animate-spin text-emerald-400" : ""} />
                    <span>Recalculate Schedule</span>
                  </button>
                </div>

                {/* 1. Objective Selector Cards */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Strategic Rebalancing Objective:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        key: "MAXIMIZE_HEALTH" as const,
                        title: "Health 90+ Optimizer",
                        badge: "Recommended",
                        desc: "Alleviates single-stock & sector concentration to push the 4-pillar scorecard above 90.",
                        icon: Target,
                        accent: "emerald"
                      },
                      {
                        key: "LOW_RISK" as const,
                        title: "Conservative Defense",
                        badge: "Preservation",
                        desc: "Trims high-beta equity positions and reallocates into defensive anchors to target LOW risk.",
                        icon: ShieldCheck,
                        accent: "blue"
                      },
                      {
                        key: "SECTOR_BALANCED" as const,
                        title: "Sector Equal-Weight",
                        badge: "Diversification",
                        desc: "Caps any sector at 25-30% to prevent cyclical over-exposure in Financials or IT.",
                        icon: Layers,
                        accent: "indigo"
                      },
                      {
                        key: "TAX_AWARE" as const,
                        title: "Tax-Aware Growth",
                        badge: "ITR Efficient",
                        desc: "Prioritizes long-term holdings for trims to minimize short-term capital gains tax (STCG).",
                        icon: Wallet,
                        accent: "purple"
                      }
                    ].map((opt) => {
                      const isSelected = rebalanceObjective === opt.key;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setRebalanceObjective(opt.key);
                          }}
                          className={`p-4 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between border ${
                            isSelected
                              ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,231,157,0.15)] ring-1 ring-emerald-500/40"
                              : "bg-black/40 border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`p-1.5 rounded-lg ${isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.04] text-slate-400"}`}>
                                <Icon size={16} />
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isSelected ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/[0.04] text-slate-400 border-white/[0.06]"
                              }`}>
                                {opt.badge}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-white">{opt.title}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{opt.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <CheckCircle2 size={13} />
                              <span>Active Objective</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Guardrail Constraints Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Max Single Stock Weight Cap</span>
                      <span className="font-mono font-bold text-emerald-400">{maxSingleWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="35"
                      step="1"
                      value={maxSingleWeight}
                      onChange={(e) => setMaxSingleWeight(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg bg-slate-800 accent-emerald-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">Limits maximum capital permitted in any single company holding.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Max Sector Exposure Cap</span>
                      <span className="font-mono font-bold text-teal-400">{maxSectorWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="50"
                      step="1"
                      value={maxSectorWeight}
                      onChange={(e) => setMaxSectorWeight(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg bg-slate-800 accent-teal-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">Caps cumulative exposure in any one industrial or economic sector.</p>
                  </div>
                </div>

                {/* Loading / Error State */}
                {loadingRebalance && (
                  <div className="p-8 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col items-center justify-center gap-3 text-center">
                    <RefreshCw size={24} className="animate-spin text-emerald-400" />
                    <p className="text-xs font-bold text-white">Computing Multi-Objective Quadratic Optimization...</p>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Evaluating concentration bounds, risk attribution covariance, and generating statutory-compliant order quantities.
                    </p>
                  </div>
                )}

                {rebalanceError && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <p className="font-bold">Optimization Error</p>
                    <p>{rebalanceError}</p>
                  </div>
                )}

                {/* 3. Rebalance Plan Results */}
                {rebalancePlan && !loadingRebalance && (
                  <div className="space-y-6">
                    {/* Before vs After Delta Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Health Score */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Health Score</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-white font-mono">{rebalancePlan.current_health_score}</span>
                          <span className="text-slate-500 text-xs">➔</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">{rebalancePlan.projected_health_score}</span>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 font-mono">
                          +{rebalancePlan.health_score_delta} pts Improvement
                        </span>
                      </div>

                      {/* Risk Category */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Risk Profile</span>
                        <div className="flex items-baseline gap-2 text-xs font-black">
                          <span className="text-slate-300">{rebalancePlan.current_risk_category}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-indigo-400">{rebalancePlan.projected_risk_category}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {rebalancePlan.current_risk_category === rebalancePlan.projected_risk_category
                            ? "Within Safe Tier"
                            : "Risk Level Shifted"}
                        </span>
                      </div>

                      {/* Volatility */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Ann. Volatility</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-slate-300 font-mono">{rebalancePlan.current_volatility_pct}%</span>
                          <span className="text-slate-500 text-xs">➔</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">{rebalancePlan.projected_volatility_pct}%</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          {(rebalancePlan.projected_volatility_pct - rebalancePlan.current_volatility_pct).toFixed(2)}% Δ
                        </span>
                      </div>

                      {/* Portfolio Beta */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Portfolio Beta</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-slate-300 font-mono">{rebalancePlan.current_beta.toFixed(2)}</span>
                          <span className="text-slate-500 text-xs">➔</span>
                          <span className="text-sm font-bold text-teal-400 font-mono">{rebalancePlan.projected_beta.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-teal-400 font-semibold block">
                          {(rebalancePlan.projected_beta - rebalancePlan.current_beta).toFixed(2)} vs Nifty 50
                        </span>
                      </div>
                    </div>

                    {/* Capital Liquidity Reallocation Pill */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-400" />
                        <span className="font-bold text-white">Rebalancing Capital Flow:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-6 font-mono">
                        <div>
                          <span className="text-slate-400">Capital Freed (Trims): </span>
                          <strong className="text-rose-400 font-bold">₹{rebalancePlan.capital_freed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Capital Deployed (Adds): </span>
                          <strong className="text-emerald-400 font-bold">₹{rebalancePlan.capital_deployed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Net Cash Impact: </span>
                          <strong className={`font-bold ${rebalancePlan.net_cash_impact >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                            {rebalancePlan.net_cash_impact >= 0 ? "+₹" : "-₹"}{Math.abs(rebalancePlan.net_cash_impact).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Proposed Trades Execution Schedule Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <SlidersHorizontal size={14} className="text-emerald-400" />
                          Proposed Trades Execution Schedule ({rebalancePlan.trades.length} Actions)
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Click &quot;Execute Order&quot; to open the simulated ledger order ticket
                        </span>
                      </div>

                      {rebalancePlan.trades.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-black/40 border border-white/[0.06] text-center text-xs text-slate-400">
                          Portfolio is already optimally balanced according to the selected objective constraints!
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4">Action</th>
                                <th className="py-3 px-4">Instrument</th>
                                <th className="py-3 px-4">Weight Shift</th>
                                <th className="py-3 px-4">Quantity Δ</th>
                                <th className="py-3 px-4 text-right">Est. Trade Value</th>
                                <th className="py-3 px-4">Quantitative Rationale</th>
                                <th className="py-3 px-4 text-center">Execute</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.06]">
                              {rebalancePlan.trades.map((t) => {
                                const isSell = t.action === "SELL";
                                const isBuy = t.action === "BUY";
                                return (
                                  <tr key={t.symbol} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3.5 px-4">
                                      <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider border uppercase flex items-center gap-1 w-max ${
                                        isBuy
                                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                          : isSell
                                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                          : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                                      }`}>
                                        {isBuy ? <ArrowUpRight size={12} /> : isSell ? <ArrowDownRight size={12} /> : null}
                                        {t.action}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-white block">{t.symbol}</span>
                                        <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{t.company_name}</span>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 font-mono text-xs">
                                      <span className="text-slate-400">{t.current_weight_pct.toFixed(1)}%</span>
                                      <span className="text-slate-600 mx-1.5">➔</span>
                                      <span className="font-bold text-white">{t.target_weight_pct.toFixed(1)}%</span>
                                    </td>

                                    <td className="py-3.5 px-4 font-mono font-bold">
                                      <span className={isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-slate-400"}>
                                        {t.delta_quantity > 0 ? `+${t.delta_quantity}` : `${t.delta_quantity}`} shares
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                                      ₹{t.estimated_trade_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </td>

                                    <td className="py-3.5 px-4 text-[11px] text-slate-300 max-w-xs">
                                      {t.rationale}
                                    </td>

                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRebalanceTradeModal({
                                            isOpen: true,
                                            trade: t
                                          });
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-[11px] uppercase tracking-wider transition-all shadow-md shadow-emerald-950/30 flex items-center gap-1 mx-auto"
                                      >
                                        <Zap size={12} />
                                        Execute
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

                    {/* Strategic Commentary */}
                    <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 space-y-1.5">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-400" />
                        AI Rebalancing Diagnostic:
                      </p>
                      <p className="text-[11px] text-indigo-300 leading-relaxed">
                        {rebalancePlan.rebalancing_notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 6: Interactive "What-If" Portfolio Risk Simulator Sandbox */}
              <div className="p-6 rounded-3xl cyber-card cyber-card-iris backdrop-blur-2xl space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Interactive &quot;What-If&quot; Portfolio Risk Simulator</h3>
                      <p className="text-xs text-slate-400">
                        Simulate hypothetical rebalancing adjustments without modifying your real holdings or ledger
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-sm">
                    ⚡ Sandbox Mode (Zero Database Mutation)
                  </div>
                </div>

                {/* 1-Click Scenario Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-black/60 border border-white/[0.08]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                    Scenario Presets:
                  </span>
                  {[
                    { key: "DEFENSIVE_SHIFT", label: "🛡️ Defensive Shift" },
                    { key: "MAX_DIVERSIFICATION", label: "🌐 Max Diversification" },
                    { key: "CONCENTRATION_TAPER", label: "⚖️ Concentration Taper" },
                    { key: "CUSTOM", label: "🛠️ Custom Sandbox" }
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activePreset === p.key
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 border border-indigo-400/30"
                          : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] border border-white/[0.06]"
                      }`}
                    >
                      {p.label}
                      {activePreset === p.key && <Check size={12} />}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Sliders Form (5 cols) */}
                  <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-black/40 border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Adjust Target Allocations
                      </span>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${
                        totalSimPct === 100
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}>
                        Total: {totalSimPct}% / 100%
                      </span>
                    </div>

                    {/* Individual Sliders */}
                    {[
                      { key: "equity_pct", label: "Direct Equities", color: "from-emerald-500 to-teal-400" },
                      { key: "etf_pct", label: "Index & Sector ETFs", color: "from-teal-500 to-cyan-400" },
                      { key: "debt_pct", label: "Fixed Income & Debt", color: "from-blue-500 to-indigo-400" },
                      { key: "gold_pct", label: "Sovereign Gold / Metals", color: "from-amber-500 to-yellow-400" },
                      { key: "crypto_pct", label: "Alternative / High Beta", color: "from-rose-500 to-pink-400" }
                    ].map((s) => (
                      <div key={s.key} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-300">{s.label}</span>
                          <span className="font-mono font-bold text-white">
                            {simAllocations[s.key as keyof typeof simAllocations]}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={simAllocations[s.key as keyof typeof simAllocations]}
                          onChange={(e) => handleSliderChange(s.key as keyof typeof simAllocations, parseInt(e.target.value))}
                          className="w-full h-2 rounded-lg bg-slate-800 accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    ))}

                    {simError && (
                      <p className="text-xs text-rose-400 font-medium">{simError}</p>
                    )}

                    <button
                      onClick={handleRunSimulation}
                      disabled={simulating || totalSimPct !== 100}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {simulating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {simulating ? "Simulating Machine Learning Engine..." : "Run What-If Simulation"}
                    </button>
                  </div>

                  {/* Side-by-Side Comparison (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    {simResult ? (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Summary Header Pill */}
                        <div className="p-4 rounded-2xl bg-black/40 border border-indigo-500/30 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-white">Simulation Execution Result</p>
                            <p className="text-[11px] text-slate-400">{simResult.simulation_notes}</p>
                          </div>
                          {simResult.risk_level_changed && (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black animate-pulse shadow-[0_0_10px_rgba(16,231,157,0.3)]">
                              Risk Profile Shifted!
                            </span>
                          )}
                        </div>

                        {/* Side-by-Side Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Current Baseline */}
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Baseline</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-bold">Risk Profile:</span>
                              <span className="text-xs font-black text-white">{simResult.current_risk_category}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-bold">Health Score:</span>
                              <span className="text-base font-black text-slate-200 font-mono">{simResult.current_health_score}/100</span>
                            </div>
                          </div>

                          {/* Simulated Outcome */}
                          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/40 space-y-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Simulated Outcome</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-bold">Predicted Risk:</span>
                              <span className="text-xs font-black text-emerald-400">{simResult.simulated_risk_category}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-bold">Health Score:</span>
                              <span className="text-base font-black text-emerald-400 flex items-center gap-1.5 font-mono">
                                {simResult.simulated_health_score}/100
                                <span className={`text-xs font-black px-1.5 py-0.2 rounded ${
                                  simResult.score_delta >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {simResult.score_delta >= 0 ? `+${simResult.score_delta}` : simResult.score_delta} pts
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantitative Metric Deltas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(simResult.metrics_comparison).map(([metricKey, metric]) => (
                            <div key={metricKey} className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-center space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 truncate">
                                {metricKey.replace("_", " ")}
                              </p>
                              <p className="text-sm font-black text-white font-mono">{metric.simulated_value}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                metric.direction === "IMPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : metric.direction === "DEGRADED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-white/[0.04] text-slate-400"
                              }`}>
                                {metric.delta} ({metric.direction})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-black/30 border border-dashed border-white/[0.1] text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                          <ArrowRight size={20} />
                        </div>
                        <p className="text-xs font-black text-white">Ready for Simulation</p>
                        <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                          Select a scenario preset above or adjust sliders on the left, then click &quot;Run What-If Simulation&quot; to evaluate the predicted risk shift.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          </MotionContainer>
        </main>
      </div>

      {/* Prediction History Slide-over Drawer (FIX-15) */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setHistoryOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#0b0f19] border-l border-white/[0.1] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.1]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Prediction History</h3>
                    <p className="text-[11px] text-slate-400">Archived AI risk evaluations</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {loadingHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw size={20} className="animate-spin text-indigo-400" />
                    <span className="text-xs">Loading archived evaluations...</span>
                  </div>
                ) : predictionHistory.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-300">No evaluations saved yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Click &quot;Save Evaluation&quot; on any portfolio analysis to archive its risk state to MongoDB.
                    </p>
                  </div>
                ) : (
                  predictionHistory.map((item) => {
                    const badge = getRiskBadge(item.risk_category);
                    const Icon = badge.icon;
                    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "Recent";

                    return (
                      <div
                        key={item.prediction_id}
                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5 ${badge.bg}`}>
                            <Icon size={12} />
                            {badge.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {(item.confidence * 100).toFixed(1)}% Conf.
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                          <span className="font-mono text-[10px] text-slate-500">ID: {item.prediction_id.slice(-8)}</span>
                          <span className="flex items-center gap-1 text-[10px]">
                            <Clock size={10} className="text-slate-500" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] text-center">
              <button
                onClick={() => setHistoryOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebalance Trade Execution Modal */}
      {rebalanceTradeModal.isOpen && rebalanceTradeModal.trade && (
        <OrderExecutionModal
          isOpen={rebalanceTradeModal.isOpen}
          onClose={() => setRebalanceTradeModal({ isOpen: false })}
          onOrderSettled={() => {
            setRebalanceTradeModal({ isOpen: false });
            toast.success("Order Settled", `Ledger updated for ${rebalanceTradeModal.trade?.symbol}. Recalculating portfolio health...`);
            loadIntelligence(selectedPortfolioId);
            handleGenerateRebalancePlan();
          }}
          defaultPortfolioId={selectedPortfolioId}
          defaultSymbol={rebalanceTradeModal.trade.symbol}
          defaultCompanyName={rebalanceTradeModal.trade.company_name}
          defaultSector={rebalanceTradeModal.trade.sector}
          defaultPrice={rebalanceTradeModal.trade.estimated_price}
          defaultSide={rebalanceTradeModal.trade.action === "SELL" ? "SELL" : "BUY"}
          defaultQuantity={Math.max(1, Math.round(Math.abs(rebalanceTradeModal.trade.delta_quantity)))}
        />
      )}
    </div>
  );
}
