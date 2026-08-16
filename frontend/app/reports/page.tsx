"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getPortfolios,
  getPortfolioReport,
  getHistoricalReports,
  getReportById,
  getAuditLogs,
  PortfolioSummary,
  InvestorReportResponse,
  ReportListItem,
  AuditLogItem
} from "@/lib/api";
import {
  Printer,
  Download,
  RefreshCw,
  Award,
  Layers,
  History,
  TrendingUp,
  FileCheck2,
  Lock,
  PieChart
} from "lucide-react";

export default function ReportsPage() {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [report, setReport] = useState<InvestorReportResponse | null>(null);
  const [historicalReports, setHistoricalReports] = useState<ReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("LATEST");
  const [activeTab, setActiveTab] = useState<"DOSSIER" | "AUDIT_LOGS">("DOSSIER");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 2. Fetch or Generate Report when Target Portfolio Changes
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

  useEffect(() => {
    if (selectedPortfolioId) {
      loadReport(selectedPortfolioId);
    }
  }, [selectedPortfolioId, loadReport]);

  // 3. Switch between historical report snapshots
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load historical report.");
    } finally {
      setGenerating(false);
    }
  };

  // 4. Print / PDF Export
  const handlePrint = () => {
    window.print();
  };

  // 5. Download JSON Export
  const handleDownloadJSON = () => {
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
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar hidden during print */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header hidden during print */}
        <div className="print:hidden">
          <Header title="Investor Reports & Audit Trail" />
        </div>

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
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

              {historicalReports.length > 0 && (
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
            </div>

            {/* Actions & Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("DOSSIER")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === "DOSSIER" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400"
                  }`}
                >
                  Executive Dossier
                </button>
                <button
                  onClick={() => setActiveTab("AUDIT_LOGS")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === "AUDIT_LOGS" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400"
                  }`}
                >
                  Audit Trail ({auditLogs.length})
                </button>
              </div>

              <button
                onClick={() => loadReport(selectedPortfolioId)}
                disabled={generating}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                title="Generate new report version snapshot"
              >
                <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
              </button>

              <button
                onClick={handleDownloadJSON}
                disabled={!report}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <Download size={13} />
                JSON
              </button>

              <button
                onClick={handlePrint}
                disabled={!report}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
              >
                <Printer size={13} />
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Loading & Error States */}
          {(loading || generating) && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 print:hidden">
              <RefreshCw size={28} className="animate-spin text-emerald-400" />
              <p className="text-sm font-semibold">
                {loading ? "Loading investor portfolios..." : "Generating immutable Investor Intelligence Dossier & audit hash..."}
              </p>
            </div>
          )}

          {error && !generating && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs print:hidden">
              {error}
            </div>
          )}

          {/* Main Tab 1: Executive Dossier */}
          {!generating && !error && report && activeTab === "DOSSIER" && (
            <div className="space-y-6 bg-slate-900/60 print:bg-white print:text-black border border-slate-800/80 print:border-none rounded-3xl p-6 lg:p-10 shadow-2xl">
              {/* Institutional Header */}
              <div className="border-b border-slate-800 print:border-black/20 pb-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCheck2 size={24} className="text-emerald-400 print:text-black" />
                      <h2 className="text-2xl font-black tracking-tight text-white print:text-black uppercase">
                        NexFolio Investor Intelligence Report
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 print:text-slate-600">
                      Portfolio: <strong className="text-white print:text-black">{report.portfolio_name}</strong> | Generated: {new Date(report.generated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      <Lock size={12} className="text-emerald-400 print:text-black" />
                      <span className="font-mono font-bold text-xs text-emerald-400 print:text-black">
                        {report.report_integrity_hash}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 print:text-slate-600">
                      Version: {report.report_version} | Pedigree: {report.data_pedigree}
                    </p>
                  </div>
                </div>

                {/* Model Provenance Banner */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] p-2.5 rounded-xl bg-slate-950/80 print:bg-slate-100 border border-slate-800 print:border-slate-300">
                  <span className="font-bold text-indigo-300 print:text-indigo-900">
                    Engine: {report.provenance.model_name} ({report.provenance.model_version})
                  </span>
                  <span className="text-slate-600 print:text-slate-400">|</span>
                  <span className="text-slate-300 print:text-slate-700">Dataset: {report.provenance.feature_dataset_version}</span>
                  <span className="text-slate-600 print:text-slate-400">|</span>
                  <span className="text-emerald-400 print:text-emerald-800 font-bold">Confidence: {(report.risk_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* KPI Executive Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Portfolio Valuation</p>
                  <p className="text-xl font-black text-white print:text-black font-mono mt-1">
                    ₹{report.summary.total_valuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Total Unrealized ROI</p>
                  <p className={`text-xl font-black font-mono mt-1 ${
                    report.summary.total_roi_pct >= 0 ? "text-emerald-400 print:text-emerald-700" : "text-rose-400 print:text-rose-700"
                  }`}>
                    {report.summary.total_roi_pct >= 0 ? `+${report.summary.total_roi_pct}%` : `${report.summary.total_roi_pct}%`}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Health Score & Grade</p>
                  <p className="text-xl font-black text-white print:text-black mt-1 flex items-center gap-2">
                    {report.health_scorecard.overall_score}/100
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 print:text-black text-xs font-black">
                      Grade {report.health_scorecard.grade}
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">XGBoost Risk Category</p>
                  <p className={`text-xl font-black mt-1 ${
                    report.risk_category === "LOW" ? "text-emerald-400 print:text-emerald-700" : report.risk_category === "HIGH" ? "text-rose-400 print:text-rose-700" : "text-amber-400 print:text-amber-700"
                  }`}>
                    {report.risk_category} RISK
                  </p>
                </div>
              </div>

              {/* Benchmark Comparison & 4-Pillar Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Benchmark Section */}
                <div className="p-5 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400 print:text-black" />
                    Benchmark Comparison ({report.benchmark.benchmark_name})
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 print:text-slate-600">Portfolio Return:</span>
                      <span className="font-bold font-mono text-white print:text-black">{report.benchmark.portfolio_roi_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 print:text-slate-600">NIFTY 50 Benchmark:</span>
                      <span className="font-bold font-mono text-slate-300 print:text-slate-800">+{report.benchmark.benchmark_roi_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 print:text-slate-600">Generated Alpha (vs NIFTY):</span>
                      <span className={`font-bold font-mono ${
                        report.benchmark.alpha_pct >= 0 ? "text-emerald-400 print:text-emerald-800" : "text-rose-400 print:text-rose-800"
                      }`}>
                        {report.benchmark.alpha_pct >= 0 ? `+${report.benchmark.alpha_pct}%` : `${report.benchmark.alpha_pct}%`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 print:text-slate-600">Portfolio Beta:</span>
                      <span className="font-bold font-mono text-white print:text-black">{report.benchmark.portfolio_beta.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. 4-Pillar Health Scorecard Breakdown */}
                <div className="p-5 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <Award size={16} className="text-teal-400 print:text-black" />
                    4-Pillar Health Scorecard
                  </h3>
                  <div className="space-y-2">
                    {report.health_scorecard.pillars.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 print:text-slate-800 font-medium">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 print:text-slate-600 text-[11px]">{p.key_metric_label}: {p.key_metric_value}</span>
                          <span className="font-bold font-mono text-emerald-400 print:text-emerald-800">{p.score}/25</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Asset & Sector Allocation Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sector Allocation */}
                <div className="p-5 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <Layers size={16} className="text-indigo-400 print:text-black" />
                    Sector Weight Distribution
                  </h3>
                  <div className="space-y-2">
                    {report.sector_allocation.map(s => (
                      <div key={s.sector} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 print:text-slate-800 font-medium">{s.sector}</span>
                          <span className="font-mono font-bold text-white print:text-black">{s.weight_pct}% (₹{s.valuation.toLocaleString("en-IN")})</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 print:bg-slate-300 overflow-hidden">
                          <div className="h-full bg-indigo-500 print:bg-black rounded-full" style={{ width: `${Math.min(100, s.weight_pct)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asset Allocation */}
                <div className="p-5 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <PieChart size={16} className="text-amber-400 print:text-black" />
                    Asset Class Distribution
                  </h3>
                  <div className="space-y-2">
                    {report.asset_allocation.map(a => (
                      <div key={a.asset_type} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 print:text-slate-800 font-medium">{a.asset_type}</span>
                          <span className="font-mono font-bold text-white print:text-black">{a.weight_pct}% (₹{a.valuation.toLocaleString("en-IN")})</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 print:bg-slate-300 overflow-hidden">
                          <div className="h-full bg-emerald-500 print:bg-black rounded-full" style={{ width: `${Math.min(100, a.weight_pct)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Holdings Ledger Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white print:text-black">Portfolio Constituents & Position Ledger</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-slate-300 bg-slate-950/60 print:bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 print:border-slate-300 bg-slate-900 print:bg-slate-100 text-slate-400 print:text-black uppercase font-semibold">
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Sector</th>
                        <th className="py-2.5 px-3 text-right">Shares</th>
                        <th className="py-2.5 px-3 text-right">Avg Buy</th>
                        <th className="py-2.5 px-3 text-right">Current Price</th>
                        <th className="py-2.5 px-3 text-right">Valuation</th>
                        <th className="py-2.5 px-3 text-right">Weight</th>
                        <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                      {report.holdings.map(h => (
                        <tr key={h.symbol} className="print:text-black">
                          <td className="py-2 px-3 font-bold text-slate-200 print:text-black">{h.base_symbol}</td>
                          <td className="py-2 px-3 text-slate-400 print:text-slate-700">{h.sector}</td>
                          <td className="py-2 px-3 text-right font-mono">{h.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{h.avg_buy_price}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">₹{h.current_price}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">₹{h.valuation.toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-400 print:text-black font-bold">{h.weight_pct}%</td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${
                            h.unrealized_pnl >= 0 ? "text-emerald-400 print:text-emerald-800" : "text-rose-400 print:text-rose-800"
                          }`}>
                            {h.unrealized_pnl >= 0 ? `+₹${h.unrealized_pnl}` : `₹${h.unrealized_pnl}`} ({h.unrealized_roi_pct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Explainable SHAP Drivers */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white print:text-black">Explainable AI: Key Mathematical Drivers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mitigators */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-emerald-400 print:text-emerald-800 uppercase tracking-wider">
                      ✓ Downside Stabilizers
                    </p>
                    {report.risk_mitigators.slice(0, 3).map(m => (
                      <div key={m.feature_key} className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-200 print:text-black">{m.headline} ({m.feature_name})</p>
                        <p className="text-[11px] text-slate-400 print:text-slate-600">{m.narrative}</p>
                      </div>
                    ))}
                  </div>

                  {/* Amplifiers */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-rose-400 print:text-rose-800 uppercase tracking-wider">
                      ⚠ Risk Amplifiers
                    </p>
                    {report.risk_amplifiers.slice(0, 3).map(a => (
                      <div key={a.feature_key} className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-200 print:text-black">{a.headline} ({a.feature_name})</p>
                        <p className="text-[11px] text-slate-400 print:text-slate-600">{a.narrative}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traceable Recommendations */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white print:text-black">Traceable Recommendations</h3>
                <div className="space-y-2">
                  {report.recommendations.map(r => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white print:text-black">{r.title}</span>
                        <span className="text-[10px] font-bold uppercase text-amber-400 print:text-black">{r.severity} Priority</span>
                      </div>
                      <p className="text-slate-300 print:text-slate-700">{r.description}</p>
                      <p className="text-[11px] text-emerald-400 print:text-emerald-800 font-medium">✦ {r.suggested_review_action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="pt-4 border-t border-slate-800 print:border-slate-300 text-[10px] text-slate-500 print:text-slate-600 leading-relaxed text-center">
                {report.disclaimer}
              </div>
            </div>
          )}

          {/* Main Tab 2: Rich Audit Trail & Provenance Ledger */}
          {!generating && !error && activeTab === "AUDIT_LOGS" && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Immutable Audit Trail & Provenance Ledger</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{auditLogs.length} Events Logged</span>
              </div>

              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No audit logs recorded for this portfolio yet.
                  </div>
                ) : (
                  auditLogs.map(evt => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold font-mono text-[10px]">
                          {evt.event_type}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(evt.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                        </span>
                      </div>

                      <p className="font-bold text-slate-200">{evt.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Actor: <strong className="text-slate-300">{evt.actor}</strong></span>
                        <span>Source: <strong className="text-slate-300">{evt.source}</strong></span>
                        {evt.model_version && <span>Model: <strong className="text-indigo-300">{evt.model_version}</strong></span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
