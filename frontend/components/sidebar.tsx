"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { useTheme } from "./theme-provider";
import {
  LayoutDashboard,
  Briefcase,
  Layers,
  ArrowLeftRight,
  Sparkles,
  Eye,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
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
  { label: "Watchlist", href: "/watchlist", icon: Eye },
  { label: "Markets", href: "/markets", icon: TrendingUp },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
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
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 shadow-2xl backdrop-blur-md hover:text-white hover:bg-slate-800 transition-all"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* 1. Mobile Drawer Navigation (< lg) */}
      <aside
        className={`
          lg:hidden fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-slate-950 border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}
        `}
      >
        {/* Mobile Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
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
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-inner"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
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

        {/* Mobile Theme & User Profile Section */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/70 text-xs text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              {resolvedTheme === "light" ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-teal-400" />
              )}
              <span>Theme</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
              {theme}
            </span>
          </button>

          {user && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/70">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center ring-2 ring-emerald-500/20 shrink-0">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user.displayName || "Investor"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email || ""}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Desktop Sticky Sidebar (lg+) — Natural flex flow, zero content overlap */}
      <aside
        className={`
          hidden lg:flex sticky top-0 h-screen shrink-0 flex-col bg-slate-950 border-r border-slate-800/80 transition-[width] duration-300 ease-in-out z-30
          ${collapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Desktop Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 overflow-hidden ${collapsed ? "justify-center w-full" : ""}`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
              <span className="text-white font-black text-lg tracking-wider">N</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 animate-fadeIn">
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Nex<span className="text-emerald-400">Folio</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 truncate">
                  AI Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors ${collapsed ? "hidden" : "flex"}`}
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Platform
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
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-inner"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
                  }
                  ${collapsed ? "justify-center px-0" : "px-3"}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={19}
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate flex-1 animate-fadeIn">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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

        {/* Desktop Footer: Theme Quick Toggle & User Profile Section */}
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/70 text-xs text-slate-300 transition-colors ${
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                {theme}
              </span>
            )}
          </button>

          {user && (
            <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 ${collapsed ? "justify-center" : ""}`}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center ring-2 ring-emerald-500/20 shrink-0 text-xs">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}

              {!collapsed && (
                <div className="min-w-0 flex-1 animate-fadeIn">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user.displayName || "Investor"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.email || ""}
                  </p>
                </div>
              )}

              {!collapsed && (
                <button
                  onClick={() => signOut()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
