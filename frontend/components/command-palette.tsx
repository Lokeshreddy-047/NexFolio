"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Flame,
  Newspaper,
  Layers,
  Eye,
  TrendingUp,
  FileText,
  Settings,
  Sun,
  Moon,
  ArrowRight,
  X
} from "lucide-react";
import { useTheme } from "./theme-provider";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Actions" | "Tools";
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  badge?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { toggleTheme, theme } = useTheme();

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Reset query and selected index on modal open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      title: "Command Center",
      subtitle: "Consolidated portfolio overview & live asset allocation",
      category: "Navigation",
      icon: LayoutDashboard,
      href: "/dashboard"
    },
    {
      id: "intelligence",
      title: "AI TreeSHAP Risk Engine",
      subtitle: "Explainable machine learning risk attributions (97% Acc)",
      category: "Tools",
      icon: Sparkles,
      href: "/intelligence",
      badge: "AI"
    },
    {
      id: "ipo",
      title: "IPO Radar & GMP Tracker",
      subtitle: "Live grey market premiums, subscription velocity & health scores",
      category: "Tools",
      icon: Flame,
      href: "/ipo",
      badge: "HOT"
    },
    {
      id: "news",
      title: "Financial News Wire",
      subtitle: "Real-time market sentiment & macroeconomic tracking",
      category: "Navigation",
      icon: Newspaper,
      href: "/news",
      badge: "LIVE"
    },
    {
      id: "markets",
      title: "NSE Screener & Markets",
      subtitle: "292+ live Indian equities with technical indicators",
      category: "Navigation",
      icon: TrendingUp,
      href: "/markets"
    },
    {
      id: "holdings",
      title: "Holdings Ledger",
      subtitle: "Real-time valuations, unrealized P&L & sector breakdown",
      category: "Navigation",
      icon: Layers,
      href: "/holdings"
    },
    {
      id: "watchlist",
      title: "Watchlist Intelligence",
      subtitle: "Curated tracking with instant price alerts",
      category: "Navigation",
      icon: Eye,
      href: "/watchlist"
    },
    {
      id: "reports",
      title: "Tax Suite (Income-tax Act, 2025)",
      subtitle: "Statutory STCG 20% / LTCG 12.5% computation & ITR exports",
      category: "Tools",
      icon: FileText,
      href: "/reports",
      badge: "TAX 2025"
    },
    {
      id: "settings",
      title: "System & Governance Settings",
      subtitle: "Risk thresholds, API connectors & profile management",
      category: "Navigation",
      icon: Settings,
      href: "/settings"
    },
    {
      id: "theme-toggle",
      title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`,
      subtitle: "Toggle between Obsidian Dark and Alabaster Light modes",
      category: "Actions",
      icon: theme === "dark" ? Sun : Moon,
      action: () => toggleTheme()
    }
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  return (
    <>
      {/* Global Command Palette Trigger listener */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", damping: 26, stiffness: 350 }}
              className="relative w-full max-w-xl bg-[#070c1a] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDownList}
                  placeholder="Type a command or jump to page... (e.g. TreeSHAP, IPO, Tax)"
                  autoFocus
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Command List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  filteredCommands.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-white shadow-sm"
                            : "hover:bg-white/[0.04] border border-transparent text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/[0.04] text-slate-400"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate flex items-center gap-2">
                              {item.title}
                              {item.badge && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {item.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                            {item.category}
                          </span>
                          {isSelected && <ArrowRight size={14} className="text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer navigation cues */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-t border-white/[0.06] text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-3">
                  <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400">↑↓</kbd> Navigate</span>
                  <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400">↵</kbd> Select</span>
                  <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400">ESC</kbd> Close</span>
                </div>
                <span className="text-emerald-400 font-semibold">NexFolio Spotlight</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
