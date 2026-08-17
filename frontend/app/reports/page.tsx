"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getPortfolios,
  getPortfolioReport,
  getHistoricalReports,
  getReportById,
  getAuditLogs,
  getPortfolioTaxReport,
  getPortfolioTaxReportCSV,
  PortfolioSummary,
  InvestorReportResponse,
  ReportListItem,
  AuditLogItem,
  TaxReportResponse
} from "@/lib/api";
import {
  Printer,
  Download,
  RefreshCw,
  Layers,
  History,
  TrendingUp,
  FileCheck2,
  Lock,
  PieChart,
  Receipt,
  ShieldCheck,
  Scissors,
  CheckSquare,
  Square,
  Info,
  Building2,
  PiggyBank,
  FileSpreadsheet
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useToast } from "@/components/toast-provider";

export default function ReportsPage() {
  const toast = useToast();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [report, setReport] = useState<InvestorReportResponse | null>(null);
  const [historicalReports, setHistoricalReports] = useState<ReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("LATEST");
  const [activeTab, setActiveTab] = useState<"DOSSIER" | "TAX_HARVESTING" | "AUDIT_LOGS">("DOSSIER");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tax Module States
  const [taxReport, setTaxReport] = useState<TaxReportResponse | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("Tax Year 2026-27");
  const [simulatedHarvestSymbols, setSimulatedHarvestSymbols] = useState<Set<string>>(new Set());

  // 1. Initial Load: Portfolios
  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPortfolios();
      setPortfolios(res);
      if (res.length > 0) {
        const defaultPort = res.find(p => p.is_default) || res[0];
        setSelectedPortfolioId(defaultPort.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load portfolios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  // 2. Fetch Report & Audit Logs
  const loadReport = useCallback(async (portId: string) => {
    if (!portId) return;
    try {
      setGenerating(true);
      setError(null);
      const [repData, histList, auditData] = await Promise.all([
        getPortfolioReport(portId),
        getHistoricalReports(portId).catch(() => []),
        getAuditLogs(portId).catch(() => ({ total_count: 0, events: [] }))
      ]);
      setReport(repData);
      setHistoricalReports(histList);
      setSelectedReportId(repData.id);
      setAuditLogs(auditData.events);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate report dossier.");
    } finally {
      setGenerating(false);
    }
  }, []);

  // 3. Fetch Tax Report
  const loadTaxReport = useCallback(async (portId: string, taxYear?: string) => {
    if (!portId) return;
    try {
      setTaxLoading(true);
      const taxData = await getPortfolioTaxReport(portId, taxYear);
      setTaxReport(taxData);
      // Pre-select all harvesting candidates in the simulator by default
      const allSyms = new Set(taxData.loss_harvesting.candidates.map(c => c.symbol));
      setSimulatedHarvestSymbols(allSyms);
    } catch (err: unknown) {
      console.error("Failed to load tax report:", err);
    } finally {
      setTaxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPortfolioId) {
      loadReport(selectedPortfolioId);
      loadTaxReport(selectedPortfolioId, selectedTaxYear);
    }
  }, [selectedPortfolioId, loadReport, loadTaxReport, selectedTaxYear]);

  // 4. Switch between historical report snapshots
  const handleSelectSnapshot = async (reportId: string) => {
    setSelectedReportId(reportId);
    if (reportId === "LATEST" && selectedPortfolioId) {
      loadReport(selectedPortfolioId);
      return;
    }
    try {
      setGenerating(true);
      const snap = await getReportById(reportId);
      setReport(snap);
      toast.success("Historical Report Loaded", `Integrity Hash: ${snap.report_integrity_hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      toast.error("Report Load Error", err instanceof Error ? err.message : "Failed to load historical report.");
    } finally {
      setGenerating(false);
    }
  };

  // 5. Print / PDF Export
  const handlePrint = () => {
    window.print();
  };

  // 6. Download JSON Export
  const handleDownloadJSON = () => {
    if (activeTab === "TAX_HARVESTING" && taxReport) {
      const blob = new Blob([JSON.stringify(taxReport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NexFolio_Tax_Report_${taxReport.portfolio_name}_${taxReport.rule_set.tax_year.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Tax Report Exported", "Downloaded JSON tax audit report.");
      return;
    }

    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NexFolio_Report_${report.report_integrity_hash}_${report.report_version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Executive Report Exported", "Downloaded JSON investor snapshot.");
  };

  // 7. Download ITR-Compatible CSV Export
  const handleDownloadCSV = async () => {
    if (!selectedPortfolioId) return;
    try {
      const csvStr = await getPortfolioTaxReportCSV(selectedPortfolioId, selectedTaxYear);
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NexFolio_ITR_Schedule_${selectedPortfolioId}_${selectedTaxYear.replace(/\s+/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ITR Schedule Exported", "CSV downloaded for tax filing.");
    } catch (err: unknown) {
      toast.error("Export Error", err instanceof Error ? err.message : "Failed to download tax CSV export.");
    }
  };

  // 8. Toggle Harvest Simulation Candidate
  const toggleHarvestCandidate = (symbol: string) => {
    setSimulatedHarvestSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  // Reactive simulation math
  const simulatedReduction = useMemo(() => {
    if (!taxReport) return 0;
    return taxReport.loss_harvesting.candidates
      .filter(c => simulatedHarvestSymbols.has(c.symbol))
      .reduce((acc, c) => acc + c.estimated_incremental_tax_saving, 0);
  }, [taxReport, simulatedHarvestSymbols]);

  const simulatedPostHarvestTax = useMemo(() => {
    if (!taxReport) return 0;
    const baseTax = taxReport.capital_gains.total_estimated_tax_liability;
    return Math.max(0, baseTax - simulatedReduction);
  }, [taxReport, simulatedReduction]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar hidden during print */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header hidden during print */}
        <div className="print:hidden">
          <Header title="Reports & Tax Intelligence" />
        </div>

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => loadPortfolios()} className="px-2.5 py-1 rounded bg-rose-500/20 font-bold hover:bg-rose-500/30">
                Retry
              </button>
            </div>
          )}

          {loading && !portfolios.length && (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto text-emerald-400 mb-2" />
              Loading portfolio reports & tax intelligence...
            </div>
          )}

          {/* Top Control Bar (Hidden on print) */}
          <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            {/* Target Portfolio & Version Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Portfolio:
              </label>
              <select
                value={selectedPortfolioId}
                onChange={e => setSelectedPortfolioId(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>
                ))}
              </select>

              {activeTab === "DOSSIER" && historicalReports.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Version:
                  </label>
                  <select
                    value={selectedReportId}
                    onChange={e => handleSelectSnapshot(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-indigo-300 font-mono focus:outline-none"
                  >
                    {historicalReports.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.report_version} ({new Date(h.generated_at).toLocaleDateString()}) - Grade {h.grade}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "TAX_HARVESTING" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tax Period:
                  </label>
                  <select
                    value={selectedTaxYear}
                    onChange={e => {
                      setSelectedTaxYear(e.target.value);
                      loadTaxReport(selectedPortfolioId, e.target.value);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-300 font-mono focus:outline-none"
                  >
                    <option value="Tax Year 2026-27">Tax Year 2026-27 · Income-tax Act, 2025</option>
                    <option value="FY 2025-26">FY 2025-26 · Income-tax Act, 1961</option>
                    <option value="FY 2024-25">FY 2024-25 · Income-tax Act, 1961</option>
                    <option value="ALL">All Recorded Tax Years</option>
                  </select>
                </div>
              )}
            </div>

            {/* Actions & Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("DOSSIER")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "DOSSIER" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Executive Dossier
                </button>
                <button
                  onClick={() => setActiveTab("TAX_HARVESTING")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "TAX_HARVESTING" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Receipt size={13} className="text-teal-400" />
                  <span>Tax Intelligence</span>
                </button>
                <button
                  onClick={() => setActiveTab("AUDIT_LOGS")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "AUDIT_LOGS" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Audit Trail ({auditLogs.length})
                </button>
              </div>

              <button
                onClick={() => {
                  if (activeTab === "TAX_HARVESTING") {
                    loadTaxReport(selectedPortfolioId, selectedTaxYear);
                  } else {
                    loadReport(selectedPortfolioId);
                  }
                }}
                disabled={generating || taxLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                title="Refresh report data"
              >
                <RefreshCw size={14} className={generating || taxLoading ? "animate-spin" : ""} />
              </button>

              {activeTab === "TAX_HARVESTING" && (
                <button
                  onClick={handleDownloadCSV}
                  disabled={!taxReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition-all"
                  title="Download ITR Schedule-Compatible CSV"
                >
                  <FileSpreadsheet size={13} />
                  ITR CSV
                </button>
              )}

              <button
                onClick={handleDownloadJSON}
                disabled={!report && !taxReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <Download size={13} />
                JSON
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/30 transition-all"
              >
                <Printer size={13} />
                Print / PDF
              </button>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE INTELLIGENCE DOSSIER */}
          {activeTab === "DOSSIER" && report && (
            <div className="space-y-6 animate-fadeIn">
              {/* Report Header Block */}
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                        Institutional Intelligence Report
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                        {report.report_version}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      {report.portfolio_name}
                    </h1>
                    <p className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Generated: {new Date(report.generated_at).toLocaleString()}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400 truncate max-w-[200px]" title={report.report_integrity_hash}>
                        SHA-256: {report.report_integrity_hash.slice(0, 16)}...
                      </span>
                    </p>
                  </div>

                  {/* Overall Grade Badge */}
                  <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 px-6 rounded-2xl shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Health Score
                      </span>
                      <span className="text-3xl font-black text-white">
                        {report.health_scorecard?.overall_score || 0}<span className="text-sm font-normal text-slate-400">/100</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-black">
                      {report.health_scorecard?.grade || "A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Pillar Scorecard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(report.health_scorecard?.pillars || []).map((p) => (
                  <div key={p.name} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {p.score}<span className="text-xs font-normal text-slate-400">/{p.max_score}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                        style={{ width: `${(p.score / p.max_score) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1">{p.key_metric_label}: {p.key_metric_value}</p>
                  </div>
                ))}
              </div>

              {/* Quantitative Metrics & Asset Allocation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Key Metrics */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    Quantitative Performance Metrics
                  </h3>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Portfolio Beta</span>
                      <span className="font-mono font-bold text-white">{report.benchmark?.portfolio_beta?.toFixed(2) || "1.00"}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Annualized Volatility</span>
                      <span className="font-mono font-bold text-white">{((report.benchmark?.annualized_volatility || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Portfolio Alpha</span>
                      <span className="font-mono font-bold text-emerald-400">{report.benchmark?.alpha_pct ? `${report.benchmark.alpha_pct.toFixed(2)}%` : "N/A"}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Total Valuation</span>
                      <span className="font-mono font-bold text-white">₹{report.summary?.total_valuation?.toLocaleString("en-IN") || "0"}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400">Total Return (ROI)</span>
                      <span className={`font-mono font-bold ${(report.summary?.total_roi_pct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {report.summary?.total_roi_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sector Allocation */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChart size={16} className="text-indigo-400" />
                    Sector Allocation Breakdown
                  </h3>
                  <div className="space-y-3">
                    {(report.sector_allocation || []).slice(0, 5).map(s => (
                      <div key={s.sector} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300 truncate">{s.sector}</span>
                          <span className="font-mono text-emerald-400">{s.weight_pct?.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, s.weight_pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Constituents */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-teal-400" />
                    Top Holdings by Weight
                  </h3>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {(report.holdings || []).slice(0, 5).map(h => (
                      <div key={h.symbol} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{h.symbol}</p>
                          <p className="text-[10px] text-slate-400">{h.company_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-white">₹{h.valuation.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{h.weight_pct?.toFixed(1)}% weight</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traceable Recommendations & Action Plan */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck2 size={16} className="text-emerald-400" />
                  Traceable Recommendation Action Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(report.recommendations || []).map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{rec.category}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                          Priority {rec.priority_rank}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                      <p className="text-xs text-slate-400">{rec.description}</p>
                      <div className="pt-2 text-[11px] font-mono text-indigo-300 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                        Trigger: {rec.trigger_condition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INDIAN CAPITAL GAINS & TAX LOSS HARVESTING COMMAND CENTER */}
          {activeTab === "TAX_HARVESTING" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Statutory Tax Regime Context Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-emerald-500/20 to-indigo-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-950/40 shrink-0">
                    <Receipt size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl font-black text-white tracking-tight">
                        Tax Optimization Command Center
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {taxReport?.rule_set.law || "Income-tax Act, 2025"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {taxReport?.rule_set.tax_year || selectedTaxYear} · Calendar-month FIFO matching: STCG @ 20% (&le;12 mos), Section 112A LTCG @ 12.5% (&gt;12 mos), 4% Cess modeled separately.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  <DataPedigreeBadge badge="LIVE" />
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-300">
                    {taxReport?.rule_set.tax_year || selectedTaxYear}
                  </span>
                </div>
              </div>

              {taxReport && (
                <>
                  {/* Top 4 Core Tax Intelligence Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* STCG Card */}
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Section 111A (STCG)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          Tax @ 20%
                        </span>
                      </div>
                      <p className={`text-2xl font-black mt-1 ${taxReport.capital_gains.net_stcg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹{taxReport.capital_gains.net_stcg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                        <span>Gross: ₹{taxReport.capital_gains.gross_stcg.toLocaleString("en-IN")}</span>
                        <span>Set-off: ₹{taxReport.capital_gains.stcl_setoff_against_stcg.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs font-bold text-indigo-300 pt-1">
                        Base STCG Tax: ₹{taxReport.capital_gains.estimated_stcg_base_tax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Section 112A LTCG Tracker Card */}
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Section 112A (LTCG)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                          Tax @ 12.5%
                        </span>
                      </div>
                      <p className="text-2xl font-black text-emerald-400 mt-1">
                        ₹{taxReport.capital_gains.section_112a.net_112a_ltcg_before_exemption.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                        <span>₹1.25L Exemption Consumed:</span>
                        <span className="font-mono text-emerald-400">₹{taxReport.capital_gains.section_112a.threshold_consumed.toLocaleString("en-IN")}/₹1.25L</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-400 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (taxReport.capital_gains.section_112a.threshold_consumed / 125000) * 100)}%`
                          }}
                        />
                      </div>
                      <p className="text-xs font-bold text-teal-300 pt-0.5">
                        Taxable 112A: ₹{taxReport.capital_gains.section_112a.taxable_112a_ltcg.toLocaleString("en-IN")} (Tax: ₹{taxReport.capital_gains.section_112a.estimated_112a_base_tax.toLocaleString("en-IN")})
                      </p>
                    </div>

                    {/* Consolidated Estimated Tax Liability */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 shadow-sm space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Total Estimated Tax
                      </span>
                      <p className="text-2xl font-black text-amber-400 mt-1">
                        ₹{taxReport.capital_gains.total_estimated_tax_liability.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                        <span>Base Tax: ₹{taxReport.capital_gains.total_base_tax.toLocaleString("en-IN")}</span>
                        <span>4% Cess: ₹{taxReport.capital_gains.cess_amount.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic pt-0.5">
                        Excludes personal surcharge thresholds.
                      </p>
                    </div>

                    {/* Available Tax Loss Bank */}
                    <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                          <PiggyBank size={14} className="text-indigo-400" />
                          Tax Loss Bank
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          8-Yr Window
                        </span>
                      </div>
                      <p className="text-2xl font-black text-indigo-300 mt-1">
                        ₹{taxReport.tax_loss_bank.total_banked_loss.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                        <span>STCL Banked: ₹{taxReport.tax_loss_bank.total_available_stcl.toLocaleString("en-IN")}</span>
                        <span>LTCL: ₹{taxReport.tax_loss_bank.total_available_ltcl.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs text-indigo-400/90 pt-0.5">
                        Carried forward for future set-offs.
                      </p>
                    </div>
                  </div>

                  {/* Corporate Buyback Intelligence (Budget 2026-27 Framework) */}
                  {taxReport.capital_gains.buyback_proceeds > 0 && (
                    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Building2 size={18} className="text-teal-400" />
                          <h2 className="text-sm font-bold text-white">
                            Budget 2026 Corporate Buyback Intelligence
                          </h2>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          Capital Gains Framework (Cost Basis Deductible)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-2">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Total Proceeds</span>
                          <span className="font-bold text-white text-sm">₹{taxReport.capital_gains.buyback_proceeds.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Cost of Acquisition</span>
                          <span className="font-bold text-slate-300 text-sm">₹{taxReport.capital_gains.buyback_cost_basis.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Realized Capital Gain</span>
                          <span className="font-bold text-emerald-400 text-sm">₹{taxReport.capital_gains.buyback_net_gain.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Estimated Buyback Tax</span>
                          <span className="font-bold text-teal-300 text-sm">₹{taxReport.capital_gains.buyback_base_tax.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Tax Loss Harvesting Action Center */}
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <Scissors size={18} className="text-emerald-400" />
                          Interactive Tax Loss Harvesting Simulator
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Toggle candidate positions below to simulate selling in loss and observe your incremental tax savings calculated against available gains.
                        </p>
                      </div>

                      {/* Live Reactive Simulation Bar */}
                      <div className="flex items-center gap-3 p-2.5 px-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                        <span className="text-slate-400">Simulated Tax Savings:</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          -₹{simulatedReduction.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">Post-Harvest Net Tax:</span>
                        <span className="text-sm font-black font-mono text-amber-400">
                          ₹{simulatedPostHarvestTax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {taxReport.loss_harvesting.candidates.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                        <ShieldCheck size={32} className="mx-auto text-emerald-400" />
                        <p className="text-sm font-bold text-white">No Unrealized Losses Detected</p>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          All active portfolio holdings are currently in profit or at breakeven. No tax loss harvesting opportunities are required for this portfolio.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-3">Simulate</th>
                              <th className="py-3 px-3">Instrument</th>
                              <th className="py-3 px-3 text-right">Qty</th>
                              <th className="py-3 px-3 text-right">Avg Buy (₹)</th>
                              <th className="py-3 px-3 text-right">Live LTP (₹)</th>
                              <th className="py-3 px-3 text-right">Unrealized Loss</th>
                              <th className="py-3 px-3 text-center">Holding Period</th>
                              <th className="py-3 px-3 text-right">Weight</th>
                              <th className="py-3 px-3 text-right">Incremental Tax Saving</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {taxReport.loss_harvesting.candidates.map((c) => {
                              const isSelected = simulatedHarvestSymbols.has(c.symbol);
                              return (
                                <tr
                                  key={c.symbol}
                                  onClick={() => toggleHarvestCandidate(c.symbol)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-slate-900/80"
                                  }`}
                                >
                                  <td className="py-3.5 px-3">
                                    <button
                                      type="button"
                                      className="text-emerald-400 focus:outline-none"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleHarvestCandidate(c.symbol);
                                      }}
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={18} className="text-emerald-400" />
                                      ) : (
                                        <Square size={18} className="text-slate-600" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white">{c.symbol}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                        {c.sector}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{c.company_name}</p>
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                                    {c.quantity}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                                    ₹{c.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                                    ₹{c.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-400">
                                    -₹{c.harvestable_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    <span className="block text-[10px] text-rose-400/80 font-normal">
                                      {c.unrealized_pnl_pct.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                      c.loss_classification === "POTENTIAL_STCL"
                                        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                                        : "bg-teal-500/10 text-teal-300 border-teal-500/20"
                                    }`}>
                                      {c.holding_period_months} mos ({c.loss_classification === "POTENTIAL_STCL" ? "STCL" : "LTCL"})
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                                    {c.portfolio_weight_pct.toFixed(1)}%
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400">
                                    +₹{c.estimated_incremental_tax_saving.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Realized Capital Gains & Buyback Ledger (Full Provenance) */}
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <History size={18} className="text-indigo-400" />
                          Realized Capital Gains & Buyback Ledger ({taxReport.realized_lots.length} Matched Lots)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Lot-level audit records with buy/sell timestamps, calendar holding months, cost basis, and classification.
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition-colors"
                      >
                        <FileSpreadsheet size={13} />
                        Export ITR Schedule CSV
                      </button>
                    </div>

                    {taxReport.realized_lots.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400">
                        No realized trade lots recorded for {taxReport.rule_set.tax_year}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-3">Lot ID</th>
                              <th className="py-3 px-3">Instrument</th>
                              <th className="py-3 px-3">Buy Date</th>
                              <th className="py-3 px-3">Sell Date</th>
                              <th className="py-3 px-3 text-right">Holding</th>
                              <th className="py-3 px-3 text-center">Tax Bucket</th>
                              <th className="py-3 px-3 text-right">Cost Basis</th>
                              <th className="py-3 px-3 text-right">Sale Consideration</th>
                              <th className="py-3 px-3 text-right">Realized Gain/Loss</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 font-mono">
                            {taxReport.realized_lots.map((lot) => (
                              <tr key={lot.lot_id} className="hover:bg-slate-900/80 transition-colors">
                                <td className="py-3 px-3 text-indigo-300 font-bold">
                                  {lot.lot_id}
                                </td>
                                <td className="py-3 px-3 font-sans font-bold text-white">
                                  <div className="flex items-center gap-1.5">
                                    <span>{lot.symbol}</span>
                                    {lot.is_buyback && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                                        BUYBACK
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-400 font-sans">
                                  {new Date(lot.buy_date).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-3 text-slate-400 font-sans">
                                  {new Date(lot.sell_date).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-300">
                                  {lot.holding_period_months} mos
                                </td>
                                <td className="py-3 px-3 text-center font-sans">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    lot.classification.includes("STCG")
                                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                      : lot.classification.includes("LTCG")
                                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                      : lot.classification.includes("BUYBACK")
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  }`}>
                                    {lot.classification} ({lot.base_tax_rate > 0 ? `${(lot.base_tax_rate * 100).toFixed(1)}%` : "0%"})
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right text-slate-400">
                                  ₹{lot.cost_basis.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-200 font-bold">
                                  ₹{lot.sale_proceeds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`py-3 px-3 text-right font-bold ${lot.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {lot.realized_pnl >= 0 ? "+" : ""}
                                  ₹{lot.realized_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Statutory Tax Disclaimer Banner */}
                  <div className="p-4 px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-start gap-3">
                    <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Statutory Tax & Reconciliation Note: </span>
                      {taxReport.disclaimer}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeTab === "AUDIT_LOGS" && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Lock size={18} className="text-indigo-400" />
                    System Audit Trail Logs
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable ledger of all portfolio valuations, transactions, risk evaluations, and report snapshots.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                  {auditLogs.length} Events
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No audit events recorded for this portfolio yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-850 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {log.event_type}
                          </span>
                          <span className="font-sans font-semibold text-slate-200">{log.description}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Actor: {log.actor} • Source: {log.source} {log.model_version ? `• Model: ${log.model_version}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
