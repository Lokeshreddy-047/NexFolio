"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Layers,
  ArrowLeftRight,
  Sparkles,
  Eye,
  TrendingUp,
  Flame,
  Newspaper,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolios", href: "/portfolios", icon: Briefcase },
  { label: "Holdings", href: "/holdings", icon: Layers },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "AI Intelligence", href: "/intelligence", icon: Sparkles, badge: "AI" },
  { label: "IPO Radar", href: "/ipo", icon: Flame, badge: "HOT" },
  { label: "Market News", href: "/news", icon: Newspaper, badge: "LIVE" },
  { label: "Watchlist", href: "/watchlist", icon: Eye },
  { label: "Markets", href: "/markets", icon: TrendingUp },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      {/* Mobile Floating Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 shadow-2xl backdrop-blur-md hover:text-white hover:bg-slate-800 transition-all active:scale-95"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 1. Mobile Drawer Navigation with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-md z-40"
            />

            {/* Mobile Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-[#050914] border-r border-white/[0.08] shadow-2xl"
            >
              {/* Mobile Brand Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08]">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                    <span className="text-white font-black text-lg tracking-wider">N</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                      Nex<span className="text-emerald-400">Folio</span>
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 truncate">
                      AI Intelligence
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <div className="px-3 pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Platform
                  </span>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                        ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                        }
                      `}
                    >
                      <Icon
                        size={19}
                        className={`shrink-0 ${isActive ? "text-emerald-400" : "text-slate-400"}`}
                      />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Theme Toggle Section */}
              <div className="p-3 border-t border-white/[0.08] bg-black/40">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {resolvedTheme === "light" ? (
                      <Sun size={15} className="text-amber-400" />
                    ) : (
                      <Moon size={15} className="text-teal-400" />
                    )}
                    <span>Theme</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-white/[0.06]">
                    {theme}
                  </span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 2. Desktop Sticky Sidebar (lg+) with Smooth Layout Animation */}
      <aside
        className={`
          hidden lg:flex sticky top-0 h-screen shrink-0 flex-col bg-[#040714] border-r border-white/[0.08] transition-[width] duration-300 ease-in-out z-30
          ${collapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Desktop Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08]">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 overflow-hidden ${collapsed ? "justify-center w-full" : ""}`}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 border border-white/20">
              <span className="text-white font-black text-lg tracking-wider">N</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Nex<span className="text-emerald-400">Folio</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/15 px-1.5 py-0.2 rounded border border-indigo-500/25">PRO</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 truncate">
                  Institutional AI
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-colors ${collapsed ? "hidden" : "flex"}`}
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* When collapsed, render toggle button in header center */}
        {collapsed && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Quick Search Spotlight Button in Sidebar */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                );
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner group"
            >
              <span className="flex items-center gap-2 text-xs">
                <span>🔍</span> Quick Search...
              </span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400 group-hover:text-emerald-300">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Navigation
              </span>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${
                    isActive
                      ? "text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }
                  ${collapsed ? "justify-center px-0" : "px-3"}
                `}
                title={collapsed ? item.label : undefined}
              >
                {/* Framer Motion Active Indicator Pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    transition={{ type: "spring", damping: 26, stiffness: 350 }}
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(16,231,157,0.15)]"
                  />
                )}

                <Icon
                  size={19}
                  className={`relative z-10 shrink-0 transition-colors ${
                    isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,231,157,0.5)]" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {!collapsed && (
                  <span className="relative z-10 truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="relative z-10 px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}

                {/* Floating Tooltip when Collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-2xl border border-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Live Engine Status Footer */}
        {!collapsed && (
          <div className="px-3 py-2 border-t border-white/[0.06] bg-black/20">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                XGBoost ML v1.2
              </span>
              <span className="text-emerald-400 font-semibold">ONLINE</span>
            </div>
          </div>
        )}

        {/* Desktop Theme Toggle Section */}
        <div className="p-3 border-t border-white/[0.08] bg-black/40">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs text-slate-300 transition-colors ${
              collapsed ? "justify-center" : "justify-between"
            }`}
            title={`Toggle Theme (Current: ${theme})`}
          >
            <div className="flex items-center gap-2">
              {resolvedTheme === "light" ? (
                <Sun size={15} className="text-amber-400 shrink-0" />
              ) : (
                <Moon size={15} className="text-teal-400 shrink-0" />
              )}
              {!collapsed && <span>Theme</span>}
            </div>
            {!collapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-white/[0.06]">
                {theme}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
