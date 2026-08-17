"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import {
  getPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  PortfolioSummary
} from "@/lib/api";
import {
  Briefcase,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Trash2,
  Edit2
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function PortfoliosPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioSummary | null>(null);
  const [deleteConfirmPortfolio, setDeleteConfirmPortfolio] = useState<{ id: string; name: string } | null>(null);
  const [deletingPortfolio, setDeletingPortfolio] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [submitting, setSubmitting] = useState(false);

  const fetchPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPortfolios();
      setPortfolios(data);
    } catch (err) {
      console.error("Failed fetching portfolios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPortfolios();
    }
  }, [user, fetchPortfolios]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const createdName = name.trim();
      await createPortfolio({
        name: createdName,
        description: description.trim() || undefined,
        currency,
      });
      setName("");
      setDescription("");
      setIsCreateOpen(false);
      toast.success("Portfolio Created", `Portfolio "${createdName}" was successfully initialized.`);
      await fetchPortfolios();
    } catch (err: unknown) {
      toast.error("Error Creating Portfolio", (err as Error).message || "Failed to create portfolio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPortfolio || !name.trim()) return;

    try {
      setSubmitting(true);
      const updatedName = name.trim();
      await updatePortfolio(editingPortfolio.id, {
        name: updatedName,
        description: description.trim() || undefined,
      });
      setEditingPortfolio(null);
      setName("");
      setDescription("");
      toast.success("Portfolio Updated", `Portfolio settings for "${updatedName}" saved.`);
      await fetchPortfolios();
    } catch (err: unknown) {
      toast.error("Error Updating Portfolio", (err as Error).message || "Failed to update portfolio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, portName: string) => {
    setDeleteConfirmPortfolio({ id, name: portName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPortfolio) return;
    try {
      setDeletingPortfolio(true);
      await deletePortfolio(deleteConfirmPortfolio.id);
      toast.success("Portfolio Deleted", `Portfolio "${deleteConfirmPortfolio.name}" and all associated holdings were removed.`);
      setDeleteConfirmPortfolio(null);
      await fetchPortfolios();
    } catch (err: unknown) {
      toast.error("Error Deleting Portfolio", (err as Error).message || "Failed to delete portfolio.");
    } finally {
      setDeletingPortfolio(false);
    }
  };

  // Aggregate totals
  const totalInvested = portfolios.reduce((acc, p) => acc + (p.total_invested || 0), 0);
  const totalCurrentValue = portfolios.reduce((acc, p) => acc + (p.current_value || 0), 0);
  const totalUnrealizedPnl = totalCurrentValue - totalInvested;
  const totalRealizedPnl = portfolios.reduce((acc, p) => acc + (p.realized_pnl || 0), 0);
  const totalRoi = totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <Briefcase size={36} className="mx-auto text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-sm text-slate-400">
            Please sign in to access and manage your investment portfolios.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="Portfolio Management"
          subtitle="Organize, track, and analyze your multi-strategy investment accounts"
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Aggregate KPI Summary Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Valuation
              </span>
              <p className="text-2xl font-black text-white mt-1.5">
                ₹{totalCurrentValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Across {portfolios.length} accounts</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Invested Capital
              </span>
              <p className="text-2xl font-black text-slate-200 mt-1.5">
                ₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Cost basis</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Unrealized P&L
              </span>
              <p
                className={`text-2xl font-black mt-1.5 flex items-center gap-1 ${
                  totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalUnrealizedPnl >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                ₹{Math.abs(totalUnrealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {totalRoi >= 0 ? "+" : ""}
                {totalRoi.toFixed(2)}% ROI
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Realized Gains
              </span>
              <p
                className={`text-2xl font-black mt-1.5 ${
                  totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                ₹{totalRealizedPnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">From closed positions</p>
            </div>
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Your Portfolios</h2>
              <p className="text-xs text-slate-400">
                Separate portfolios allow isolated risk modeling and tax categorization
              </p>
            </div>
            <button
              onClick={() => {
                setName("");
                setDescription("");
                setIsCreateOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/30 transition-colors"
            >
              <Plus size={16} />
              <span>Create Portfolio</span>
            </button>
          </div>

          {/* Portfolio Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-3xl bg-slate-900/40 border border-slate-800/80 animate-pulse" />
              ))}
            </div>
          ) : portfolios.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-4">
              <Briefcase size={40} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-200">No Portfolios Created Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first investment portfolio to start tracking holdings, recording transactions, and running AI risk explainers.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                Create First Portfolio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((p) => {
                const pnl = p.unrealized_pnl || 0;
                const pnlPct = p.unrealized_pnl_pct || 0;
                const isProfitable = pnl >= 0;

                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-lg hover:shadow-xl group"
                  >
                    <div>
                      {/* Top Row: Title & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base truncate">
                              {p.name}
                            </h3>
                            {p.is_default && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Primary
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingPortfolio(p);
                              setName(p.name);
                              setDescription(p.description || "");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Valuation & P&L */}
                      <div className="mt-6 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Current Valuation
                        </span>
                        <p className="text-2xl font-black text-white">
                          ₹{p.current_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "0"}
                        </p>
                        <div className="flex items-center gap-2 pt-1 text-xs font-semibold">
                          <span
                            className={`flex items-center gap-0.5 ${
                              isProfitable ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isProfitable ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            ₹{Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ({isProfitable ? "+" : ""}
                            {pnlPct.toFixed(2)}%)
                          </span>
                          <span className="text-slate-400">unrealized</span>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-800/80 text-xs">
                        <div>
                          <span className="text-slate-400">Invested:</span>
                          <p className="font-semibold text-slate-300">
                            ₹{p.total_invested?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "0"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Positions:</span>
                          <p className="font-semibold text-slate-300">
                            {p.holdings_count || 0} Assets
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Links */}
                    <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-800/80">
                      <Link
                        href={`/holdings?portfolio_id=${p.id}`}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <Layers size={14} />
                        <span>Holdings</span>
                      </Link>
                      <Link
                        href={`/dashboard?portfolio_id=${p.id}`}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                      >
                        <Sparkles size={14} />
                        <span>AI Analytics</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit Portfolio Modal */}
      {(isCreateOpen || editingPortfolio) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={20} className="text-emerald-400" />
                {editingPortfolio ? "Edit Portfolio" : "Create New Portfolio"}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingPortfolio(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingPortfolio ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Retirement 2040, High Growth Tech"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Strategy notes or portfolio target allocation"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {!editingPortfolio && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingPortfolio(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingPortfolio ? "Save Changes" : "Create Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institutional Delete Portfolio Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmPortfolio}
        title="Permanently Delete Portfolio?"
        description={`Are you sure you want to delete "${deleteConfirmPortfolio?.name}"? All associated holdings, transaction ledgers, and valuation histories will be permanently wiped.`}
        confirmText="Delete Portfolio"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingPortfolio}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmPortfolio(null)}
      />
    </div>
  );
}
