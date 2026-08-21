"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./auth-provider";
import {
  getPortfolios,
  PortfolioSummary,
  createPortfolio,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem
} from "@/lib/api";
import { useTheme } from "./theme-provider";
import { useToast } from "./toast-provider";
import { MarketTicker } from "./market-ticker";
import {
  Briefcase,
  Plus,
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Shield,
  Sun,
  Moon,
  Laptop,
  Search
} from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  activePortfolioId?: string;
  onPortfolioChange?: (portfolioId: string) => void;
}

export function Header({
  title = "Command Center",
  subtitle = "AI Intelligence & Portfolio Risk Cockpit",
  activePortfolioId,
  onPortfolioChange,
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const toast = useToast();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      getNotifications()
        .then((data) => {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleMarkSingleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const onPortfolioChangeRef = React.useRef(onPortfolioChange);
  const activePortfolioIdRef = React.useRef(activePortfolioId);
  useEffect(() => {
    onPortfolioChangeRef.current = onPortfolioChange;
    activePortfolioIdRef.current = activePortfolioId;
  }, [onPortfolioChange, activePortfolioId]);

  useEffect(() => {
    if (user?.uid) {
      getPortfolios()
        .then((data) => {
          setPortfolios(data);
          if (data.length > 0 && !activePortfolioIdRef.current && onPortfolioChangeRef.current) {
            onPortfolioChangeRef.current(data[0].id);
          }
        })
        .catch((err) => console.warn("Failed loading portfolios in header:", err));
    }
  }, [user?.uid]);

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;

    try {
      setIsSubmitting(true);
      const createdName = newPortfolioName.trim();
      const created = await createPortfolio({ name: createdName });
      setPortfolios([created, ...portfolios]);
      if (onPortfolioChange) {
        onPortfolioChange(created.id);
      }
      setNewPortfolioName("");
      setIsCreateModalOpen(false);
      setIsDropdownOpen(false);
      toast.success("Portfolio Created", `Switched active portfolio to "${createdName}".`);
    } catch (err: unknown) {
      toast.error("Error Creating Portfolio", (err as Error).message || "Failed to create portfolio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Real-Time Market Ticker Ribbon */}
      <MarketTicker />

      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-[#030712]/85 backdrop-blur-2xl border-b border-white/[0.08]">
        {/* Left: Title & Subtitle */}
        <div className="flex flex-col min-w-0 pl-12 lg:pl-0">
          <h1 className="text-lg md:text-xl font-black tracking-tight text-white truncate flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Portfolio Selector & Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Spotlight Search Trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
              );
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs transition-all shadow-inner"
            title="Search commands, stocks & actions (⌘K)"
          >
            <Search size={14} className="text-slate-400" />
            <span className="text-[11px] font-medium hidden md:inline">Quick Search</span>
            <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Active Portfolio Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setIsProfileOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold hover:border-emerald-500/40 hover:bg-white/[0.07] transition-all shadow-sm"
            >
              <Briefcase size={14} className="text-emerald-400 shrink-0" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">
                {activePortfolio?.name || "Select Portfolio"}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsDropdownOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#070c1a]/95 border border-white/[0.08] shadow-2xl p-2 z-50 backdrop-blur-xl"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Your Portfolios
                      </p>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {portfolios.map((p) => {
                        const isSelected = p.id === activePortfolio?.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (onPortfolioChange) onPortfolioChange(p.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`
                              w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors
                              ${
                                isSelected
                                  ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                                  : "text-slate-300 hover:bg-white/[0.04]"
                              }
                            `}
                          >
                            <div className="min-w-0 flex-1 mr-2">
                              <p className="truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {p.holdings_count || 0} holdings · ₹
                                {p.current_value?.toLocaleString("en-IN") || 0}
                              </p>
                            </div>
                            {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-1 border-t border-white/[0.08]">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                      >
                        <Plus size={14} />
                        <span>New Portfolio</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Market Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold shadow-[0_0_15px_rgba(16,231,157,0.1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NSE: ACTIVE</span>
          </div>

          {/* Notification Icon & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsDropdownOpen(false);
                setIsProfileOpen(false);
                setIsThemeOpen(false);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-colors relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationOpen && (
                <>
                  <div
                    onClick={() => setIsNotificationOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#070c1a]/95 border border-white/[0.08] shadow-2xl p-3 z-50 backdrop-blur-xl space-y-2"
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <Bell size={14} className="text-emerald-400" />
                        <p className="text-xs font-bold text-white">Alerts & Notifications</p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">
                          No notifications at this time.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 transition-colors ${
                              n.is_read
                                ? "bg-black/30 border-white/[0.04] text-slate-400"
                                : "bg-white/[0.03] border-white/[0.08] text-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                                n.severity === "CRITICAL"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : n.severity === "WARNING"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              }`}>
                                {n.severity}
                              </span>

                              {!n.is_read && (
                                <button
                                  onClick={() => handleMarkSingleRead(n.id)}
                                  className="text-[10px] text-slate-500 hover:text-white"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>

                            <p className="font-bold text-white text-xs">{n.title}</p>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>

                            {n.action_link && (
                              <div className="pt-1">
                                <Link
                                  href={n.action_link}
                                  onClick={() => setIsNotificationOpen(false)}
                                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                                >
                                  View Action ➔
                                </Link>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Selector Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsNotificationOpen(false);
                setIsDropdownOpen(false);
                setIsProfileOpen(false);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-colors"
              title={`Active Theme: ${theme.toUpperCase()} (${resolvedTheme} mode)`}
            >
              {resolvedTheme === "light" ? (
                <Sun size={18} className="text-amber-400" />
              ) : theme === "system" ? (
                <Laptop size={18} className="text-indigo-400" />
              ) : (
                <Moon size={18} className="text-teal-400" />
              )}
            </button>

            <AnimatePresence>
              {isThemeOpen && (
                <>
                  <div
                    onClick={() => setIsThemeOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#070c1a]/95 border border-white/[0.08] shadow-2xl p-2 z-50 backdrop-blur-xl space-y-1"
                  >
                    <div className="px-3 py-1.5 border-b border-white/[0.08] mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        UI Theme
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setTheme("dark");
                        setIsThemeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        theme === "dark"
                          ? "bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20"
                          : "text-slate-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Moon size={14} className="text-teal-400" />
                        <span>Dark (Obsidian)</span>
                      </div>
                      {theme === "dark" && <Check size={14} className="text-teal-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTheme("light");
                        setIsThemeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        theme === "light"
                          ? "bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20"
                          : "text-slate-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sun size={14} className="text-amber-500" />
                        <span>Light (Clean)</span>
                      </div>
                      {theme === "light" && <Check size={14} className="text-amber-500" />}
                    </button>

                    <button
                      onClick={() => {
                        setTheme("system");
                        setIsThemeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        theme === "system"
                          ? "bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20"
                          : "text-slate-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Laptop size={14} className="text-indigo-400" />
                        <span>System Sync</span>
                      </div>
                      {theme === "system" && <Check size={14} className="text-indigo-400" />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsDropdownOpen(false);
                setIsThemeOpen(false);
                setIsNotificationOpen(false);
              }}
              className="p-1 rounded-full ring-2 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all focus:outline-none"
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center">
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div
                    onClick={() => setIsProfileOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="absolute right-0 mt-2 w-64 rounded-3xl bg-[#070c1a]/95 border border-white/[0.08] shadow-2xl p-2.5 z-50 backdrop-blur-xl space-y-1.5"
                  >
                    {/* User Profile Header Card */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] mb-1 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white truncate">
                            {user?.displayName || "Investor"}
                          </p>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-extrabold text-[9px] border border-emerald-500/20 shrink-0">
                            PRO
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-0.5">
                      <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <Shield size={15} className="text-emerald-400" />
                        <span>Account & Security Settings</span>
                      </Link>

                      <Link
                        href="/portfolios"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <Briefcase size={15} className="text-indigo-400" />
                        <span>Manage Portfolios</span>
                      </Link>

                      <Link
                        href="/holdings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <Check size={15} className="text-teal-400" />
                        <span>Holdings & Allocations</span>
                      </Link>

                      <Link
                        href="/watchlist"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <Bell size={15} className="text-amber-400" />
                        <span>My Watchlist</span>
                      </Link>
                    </div>

                    {/* Theme Quick Switcher in Profile Dropdown */}
                    <div className="pt-2 border-t border-white/[0.08] px-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1 font-medium">
                        <span>Appearance</span>
                        <span className="capitalize font-bold text-slate-300">{resolvedTheme}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08]">
                        <button
                          onClick={() => setTheme("dark")}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            theme === "dark" ? "bg-slate-800 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Moon size={11} /> Dark
                        </button>
                        <button
                          onClick={() => setTheme("light")}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            theme === "light" ? "bg-slate-800 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Sun size={11} /> Light
                        </button>
                        <button
                          onClick={() => setTheme("system")}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            theme === "system" ? "bg-slate-800 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Laptop size={11} /> Auto
                        </button>
                      </div>
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-1.5 border-t border-white/[0.08]">
                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors font-semibold"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Quick Create Portfolio Modal with Framer Motion */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-[#070c1a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase size={20} className="text-emerald-400" />
                  Create New Portfolio
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/[0.05]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Retirement Alpha, Tech Growth"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-semibold hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPortfolioName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create Portfolio"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
