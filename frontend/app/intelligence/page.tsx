"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getPortfolioIntelligence,
  simulateWhatIfRisk,
  PortfolioIntelligenceResponse,
  WhatIfSimulationResponse,
  PortfolioSummary,
  HealthScorePillar,
  getPortfolios
} from "@/lib/api";
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
  Check
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";

export default function IntelligencePage() {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [intelligence, setIntelligence] = useState<PortfolioIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    loadPortfolios();
  }, [loadPortfolios]);

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
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header title="AI Intelligence" />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Top Context Bar: Active Portfolio, Model Provenance & Data Pedigree */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Portfolio:
              </label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.currency})
                  </option>
                ))}
              </select>

              {intelligence?.provenance && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-400" />
                    {intelligence.provenance.model_name} ({intelligence.provenance.model_version})
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    Dataset: {intelligence.provenance.feature_dataset_version}
                  </span>
                  <DataPedigreeBadge badge={intelligence.provenance.data_quality_badge} />
                  <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                    intelligence.provenance.data_sufficiency_status === "READY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    ● {intelligence.provenance.data_sufficiency_status}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => loadIntelligence(selectedPortfolioId)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start md:self-auto"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Re-Analyze Portfolio
            </button>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-sm font-medium">Executing explainable AI risk inference & SHAP attributions...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Insufficient Holdings Notice */}
          {!loading && !error && intelligence?.provenance.data_sufficiency_status !== "READY" && (
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <Layers size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Insufficient Portfolio Data</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
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
                <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">AI Risk Classification</h2>
                        <p className="text-[11px] text-slate-400">Institutional Multiclass XGBoost Model</p>
                      </div>
                    </div>

                    {(() => {
                      const badge = getRiskBadge(intelligence.risk_category);
                      const Icon = badge.icon;
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${badge.bg}`}>
                          <Icon size={14} />
                          {badge.label}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Confidence & Institutional Metrics */}
                  <div className="flex items-center justify-around py-4 px-2 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-semibold text-slate-400">Model Confidence</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1">
                        {(intelligence.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-semibold text-slate-400">Portfolio Beta</p>
                      <p className="text-2xl font-black text-white mt-1">
                        {intelligence.quantitative_metrics.portfolio_beta.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[11px] uppercase font-semibold text-slate-400">Annualized Vol</p>
                      <p className="text-2xl font-black text-white mt-1">
                        {(intelligence.quantitative_metrics.annualized_volatility * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Probability Breakdown Distribution */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Class Probability Distribution</p>
                    <div className="space-y-2">
                      {Object.entries(intelligence.probabilities).map(([cat, prob]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-300">{cat} Risk</span>
                            <span className="text-slate-400">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat === "LOW" ? "bg-emerald-500" : cat === "HIGH" ? "bg-rose-500" : "bg-amber-500"
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
                <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <Award size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">4-Pillar Portfolio Health Scorecard</h2>
                        <p className="text-[11px] text-slate-400">Click any pillar below to inspect exact scoring formulas</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {intelligence.health_scorecard.overall_score}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
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
                <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <History size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">AI Decision & Trajectory Timeline</h3>
                        <p className="text-[11px] text-slate-400">
                          Historical portfolio risk, health score evolution, and the primary driving factors
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      {intelligence.ai_decision_timeline.length} Checkpoints Tracked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {intelligence.ai_decision_timeline.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">{pt.checkpoint_date}</span>
                          <span className="text-xs font-black text-emerald-400">{pt.health_score}/100</span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400">Valuation: <strong className="text-slate-200">₹{pt.portfolio_value.toLocaleString("en-IN")}</strong></p>
                          <p className="text-[11px] text-slate-400 truncate">Primary Driver: <span className="text-indigo-300 font-medium">{pt.primary_driver}</span></p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Risk Profile:</span>
                          <span className="font-bold text-white">{pt.risk_category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: Bidirectional SHAP Driver Ranking Scale */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Explainable AI: SHAP Feature Impact Ranking</h3>
                      <p className="text-[11px] text-slate-400">
                        Ranked mathematical contributions on a continuous visual scale (Red = Elevates Risk, Green = Downside Stabilizer)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMathDetails(!showMathDetails)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
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
                        className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1.5 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-200 flex items-center gap-2">
                            {d.isMitigator ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                            )}
                            {d.headline} ({d.feature_name})
                          </span>
                          <span className={`font-mono font-bold ${d.isMitigator ? "text-emerald-400" : "text-rose-400"}`}>
                            {d.isMitigator ? `+${d.score.toFixed(3)}` : `${d.score.toFixed(3)}`}
                          </span>
                        </div>

                        {/* Visual Diverging Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              d.isMitigator ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.max(5, widthPct)}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-300">{d.narrative}</p>

                        {showMathDetails && (
                          <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
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
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" />
                      Traceable Portfolio Optimization Opportunities
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every recommendation is strictly tied to a specific quantitative metric trigger and affected holdings
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    {["ALL", "SECTOR_REBALANCING", "ASSET_DIVERSIFICATION", "DEFENSIVE_ALLOCATION", "VOLATILITY_MITIGATION"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setRecFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          recFilter === cat
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
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
                        className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px] flex items-center justify-center">
                                #{rec.priority_rank}
                              </span>
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                                {rec.category.replace("_", " ")}
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              rec.severity === "HIGH"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                : rec.severity === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            }`}>
                              {rec.severity} PRIORITY
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                        </div>

                        {/* Trigger & Affected Holdings */}
                        <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Trigger Condition:</span>
                            <span className="font-mono text-amber-400 font-semibold">{rec.trigger_condition}</span>
                          </div>

                          {rec.affected_holdings.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="text-slate-400">Affected:</span>
                              {rec.affected_holdings.map((sym) => (
                                <span key={sym} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">
                                  {sym}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                            ✦ {rec.suggested_review_action}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 5: Interactive "What-If" Portfolio Risk Simulator Sandbox */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-indigo-500/30 backdrop-blur-md space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Interactive &quot;What-If&quot; Portfolio Risk Simulator</h3>
                      <p className="text-xs text-slate-400">
                        Simulate hypothetical rebalancing adjustments without modifying your real holdings or ledger
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                    ⚡ Sandbox Mode (Zero Database Mutation)
                  </div>
                </div>

                {/* 1-Click Scenario Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800/80">
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
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      {p.label}
                      {activePreset === p.key && <Check size={12} />}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Sliders Form (5 cols) */}
                  <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
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
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">Simulation Execution Result</p>
                            <p className="text-[11px] text-slate-400">{simResult.simulation_notes}</p>
                          </div>
                          {simResult.risk_level_changed && (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold animate-pulse">
                              Risk Profile Shifted!
                            </span>
                          )}
                        </div>

                        {/* Side-by-Side Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Current Baseline */}
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Baseline</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Risk Profile:</span>
                              <span className="text-xs font-extrabold text-white">{simResult.current_risk_category}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Health Score:</span>
                              <span className="text-base font-black text-slate-200">{simResult.current_health_score}/100</span>
                            </div>
                          </div>

                          {/* Simulated Outcome */}
                          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/40 space-y-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Simulated Outcome</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Predicted Risk:</span>
                              <span className="text-xs font-extrabold text-emerald-400">{simResult.simulated_risk_category}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Health Score:</span>
                              <span className="text-base font-black text-emerald-400 flex items-center gap-1.5">
                                {simResult.simulated_health_score}/100
                                <span className={`text-xs font-bold px-1.5 py-0.2 rounded ${
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
                            <div key={metricKey} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 truncate">
                                {metricKey.replace("_", " ")}
                              </p>
                              <p className="text-sm font-black text-white">{metric.simulated_value}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                metric.direction === "IMPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : metric.direction === "DEGRADED"
                                  ? "bg-rose-500/10 text-rose-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}>
                                {metric.delta} ({metric.direction})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                          <ArrowRight size={20} />
                        </div>
                        <p className="text-xs font-bold text-white">Ready for Simulation</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Select a scenario preset above or adjust sliders on the left, then click &quot;Run What-If Simulation&quot; to evaluate the predicted risk shift.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
