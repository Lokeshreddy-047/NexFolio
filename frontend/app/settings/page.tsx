"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { updateProfile } from "firebase/auth";
import { MotionContainer } from "@/components/ui/motion";
import {
  Settings,
  User,
  Shield,
  Zap,
  Radio,
  SlidersHorizontal,
  Save,
  Check,
  Server,
  Database,
  Download,
  Key,
  LogOut,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { DataPedigreeBadge } from "@/components/data-badge";
import { useToast } from "@/components/toast-provider";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  // Profile Form
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Risk Thresholds (persisted in localStorage)
  const [sectorThreshold, setSectorThreshold] = useState(35);
  const [assetThreshold, setAssetThreshold] = useState(25);
  const [betaThreshold, setBetaThreshold] = useState(1.25);
  const [volatilityThreshold, setVolatilityThreshold] = useState(22);

  // Live Stream Preferences
  const [priceFlashesEnabled, setPriceFlashesEnabled] = useState(true);
  const [autoRebalanceNotifications, setAutoRebalanceNotifications] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSector = localStorage.getItem("nexfolio_sector_threshold");
      const savedAsset = localStorage.getItem("nexfolio_asset_threshold");
      const savedBeta = localStorage.getItem("nexfolio_beta_threshold");
      const savedVol = localStorage.getItem("nexfolio_vol_threshold");
      const savedFlashes = localStorage.getItem("nexfolio_price_flashes");

      if (savedSector) setSectorThreshold(Number(savedSector));
      if (savedAsset) setAssetThreshold(Number(savedAsset));
      if (savedBeta) setBetaThreshold(Number(savedBeta));
      if (savedVol) setVolatilityThreshold(Number(savedVol));
      if (savedFlashes !== null) setPriceFlashesEnabled(savedFlashes === "true");
    }
  }, []);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingProfile(true);
      await updateProfile(user, { displayName });
      setProfileSuccess(true);
      toast.success("Profile Updated", "Your display name was saved.");
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
      toast.error("Profile Error", (err as Error).message || "Failed to update profile name.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexfolio_sector_threshold", String(sectorThreshold));
      localStorage.setItem("nexfolio_asset_threshold", String(assetThreshold));
      localStorage.setItem("nexfolio_beta_threshold", String(betaThreshold));
      localStorage.setItem("nexfolio_vol_threshold", String(volatilityThreshold));
      localStorage.setItem("nexfolio_price_flashes", String(priceFlashesEnabled));
    }
    setSettingsSaved(true);
    toast.success("Preferences Saved", "Risk thresholds and telemetry options updated.");
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title="System & Preferences"
          subtitle="Configure institutional risk limits, live broker feeds, notifications, and profile security"
        />

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <MotionContainer className="space-y-6">
          {/* Top Hero Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/40 shrink-0">
                <Settings size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black text-white tracking-tight">
                    Settings & Governance Hub
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Institutional Tier
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Manage real-time execution parameters, Upstox API connectivity, and custom risk thresholds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <DataPedigreeBadge badge="LIVE" />
              <button
                onClick={handleSavePreferences}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                {settingsSaved ? (
                  <>
                    <Check size={16} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Risk Controls & Broker Feed Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Market Data & Broker Gateway Status */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Radio size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Market Data & Broker Feeds</h2>
                      <p className="text-xs text-slate-400">Upstox API v2 WebSocket & HTTP REST Adapters</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ENGINE ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Provider</span>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" />
                      Upstox API v2 Live
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">NSE Cash & Indices</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valuation Engine</span>
                    <p className="text-sm font-bold text-emerald-400">Fast-Loop (&lt;5ms)</p>
                    <p className="text-[10px] text-slate-400">0 ML Invocations on Ticks</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Degradation Chain</span>
                    <p className="text-sm font-bold text-slate-200">Auto-Fallback Ready</p>
                    <p className="text-[10px] text-slate-400">Live → Delayed → Reference</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Server size={16} className="text-indigo-400" />
                    <span>SSE Streaming Channel: <span className="font-mono text-emerald-400">/api/v1/markets/stream</span></span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">Heartbeat: 2000ms</span>
                </div>
              </div>

              {/* 2. UI Appearance & Color Scheme Selection */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <Palette size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Appearance & UI Theme</h2>
                      <p className="text-xs text-slate-400">Select your preferred color theme across all dashboard tools</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Active: {theme.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Dark Theme Option */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      theme === "dark"
                        ? "bg-slate-950/90 border-teal-500/50 ring-2 ring-teal-500/20 shadow-lg shadow-teal-950/40"
                        : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                        <Moon size={18} />
                      </div>
                      {theme === "dark" && (
                        <div className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white">Dark Mode (Obsidian)</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Deep slate backgrounds with glowing emerald & teal indicators. Default high-contrast mode.
                    </p>
                  </button>

                  {/* Light Theme Option */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      theme === "light"
                        ? "bg-slate-950/90 border-amber-500/50 ring-2 ring-amber-500/20 shadow-lg shadow-amber-950/20"
                        : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <Sun size={18} />
                      </div>
                      {theme === "light" && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white">Light Mode (Clean)</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Crisp white slate with high-contrast typography. Optimal for bright daylight environments.
                    </p>
                  </button>

                  {/* System Theme Option */}
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      theme === "system"
                        ? "bg-slate-950/90 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-950/30"
                        : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Laptop size={18} />
                      </div>
                      {theme === "system" && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white">System Sync</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Automatically synchronizes with your operating system or browser color scheme.
                    </p>
                  </button>
                </div>
              </div>

              {/* 3. Institutional Risk Limits & Concentration Guardrails */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Risk Thresholds & Guardrails</h2>
                      <p className="text-xs text-slate-400">Define automatic warnings on Command Center & AI Intelligence</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sector Concentration Threshold */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Max Sector Allocation Warning
                      </label>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {sectorThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={50}
                      step={1}
                      value={sectorThreshold}
                      onChange={(e) => setSectorThreshold(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Triggers a warning banner if any single industry exceeds this ceiling (e.g. IT &gt; 35%).
                    </p>
                  </div>

                  {/* Single Asset Concentration Threshold */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Single Holding Weight Cap
                      </label>
                      <span className="text-sm font-black font-mono text-cyan-400">
                        {assetThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      step={1}
                      value={assetThreshold}
                      onChange={(e) => setAssetThreshold(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Flags single-stock shock vulnerability when a holding exceeds this weight.
                    </p>
                  </div>

                  {/* Portfolio Beta Tolerance */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Market Beta Tolerance
                      </label>
                      <span className="text-sm font-black font-mono text-indigo-400">
                        {betaThreshold.toFixed(2)}β
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.0}
                      step={0.05}
                      value={betaThreshold}
                      onChange={(e) => setBetaThreshold(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Evaluates high-beta amplifiers in the XGBoost explainability scorecard.
                    </p>
                  </div>

                  {/* Annualized Volatility Ceiling */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Annual Volatility Alert Level
                      </label>
                      <span className="text-sm font-black font-mono text-rose-400">
                        {volatilityThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={35}
                      step={1}
                      value={volatilityThreshold}
                      onChange={(e) => setVolatilityThreshold(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Institutional threshold for dispersion scoring and volatility moderation.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Live UI Streaming & Animation Controls */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Interface & Streaming Behavior</h2>
                    <p className="text-xs text-slate-400">Customize micro-animations, price flashes, and sound alerts</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950/80 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Real-Time Price Flash Highlight</p>
                      <p className="text-[11px] text-slate-400">Flash table rows green/red on incoming SSE market ticks</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={priceFlashesEnabled}
                      onChange={(e) => setPriceFlashesEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500/50"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950/80 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Automated Rebalancing Suggestions</p>
                      <p className="text-[11px] text-slate-400">Show traceable AI recommendations when thresholds are breached</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoRebalanceNotifications}
                      onChange={(e) => setAutoRebalanceNotifications(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500/50"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: User Profile, Data Export & Account */}
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Investor Profile</h2>
                    <p className="text-xs text-slate-400">Identity & Account Details</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  {user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 font-black text-lg text-slate-950 flex items-center justify-center shadow-lg">
                      {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {user?.displayName || "Institutional Investor"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user?.email || "No email"}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      UID: {user?.uid?.slice(0, 10)}...
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {profileSuccess ? (
                      <>
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span>Profile Updated!</span>
                      </>
                    ) : (
                      <span>{savingProfile ? "Saving..." : "Update Profile"}</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Data & Ledger Export */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Data Management</h2>
                    <p className="text-xs text-slate-400">Export transaction audit trails</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      const ledgerExport = {
                        user_id: user?.uid,
                        exported_at: new Date().toISOString(),
                        app_version: "2.4.0",
                        risk_settings: {
                          sectorThreshold,
                          assetThreshold,
                          betaThreshold,
                          volatilityThreshold,
                          priceFlashesEnabled
                        }
                      };
                      const blob = new Blob([JSON.stringify(ledgerExport, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `NexFolio_User_Settings_${new Date().toISOString().slice(0, 10)}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success("Profile & Settings Exported", "Downloaded JSON backup configuration.");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download size={14} className="text-teal-400" />
                      Export Configuration (JSON)
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">Configuration</span>
                  </button>
                </div>
              </div>

              {/* Security & Sign Out */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Session Security</h2>
                    <p className="text-xs text-slate-400">Manage active authentication session</p>
                  </div>
                </div>

                <button
                  onClick={() => signOut()}
                  className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out of NexFolio</span>
                </button>
              </div>
            </div>
          </div>
          </MotionContainer>
        </main>
      </div>
    </div>
  );
}
