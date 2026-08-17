"use client";

import React from "react";
import { MarketDataBadge, MarketSession } from "@/lib/api";
import { Clock, Database, AlertTriangle, Radio } from "lucide-react";

interface DataBadgeProps {
  badge: MarketDataBadge | string;
  provider?: string;
  session?: MarketSession | string;
  isStale?: boolean;
  fallbackReason?: string;
  marketDate?: string;
  size?: "sm" | "md" | "lg";
}

export function DataPedigreeBadge({
  badge,
  provider,
  session,
  isStale = false,
  fallbackReason,
  marketDate,
  size = "md"
}: DataBadgeProps) {
  const norm = (badge || "REFERENCE").toUpperCase();

  const getStyle = () => {
    const isClosedSession = session === "CLOSED" || session === "POST_CLOSE" || session === "WEEKEND" || session === "HOLIDAY";

    if (isClosedSession && (norm === "LIVE" || norm === "REFERENCE")) {
      return {
        bg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
        dot: "bg-teal-400",
        icon: <Clock size={size === "sm" ? 11 : 13} className="shrink-0" />,
        label: "OFFICIAL CLOSING"
      };
    }

    if (isStale && norm === "LIVE" && !isClosedSession) {
      return {
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dot: "bg-amber-400",
        icon: <Clock size={size === "sm" ? 11 : 13} className="shrink-0" />,
        label: "DELAYED / STALE"
      };
    }
    switch (norm) {
      case "LIVE":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400 animate-pulse",
          icon: <Radio size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "LIVE FEED"
        };
      case "SIMULATED":
        return {
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
          dot: "bg-cyan-400 animate-pulse",
          icon: <Radio size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "SIMULATED (TEST)"
        };
      case "DELAYED":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dot: "bg-amber-400",
          icon: <Clock size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "DELAYED (15M)"
        };
      case "FALLBACK_REFERENCE":
        return {
          bg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
          dot: "bg-orange-400",
          icon: <AlertTriangle size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "FALLBACK REFERENCE"
        };
      case "UNAVAILABLE":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          dot: "bg-rose-400",
          icon: <AlertTriangle size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "FEED UNAVAILABLE"
        };
      case "REFERENCE":
      default:
        return {
          bg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
          dot: "bg-indigo-400",
          icon: <Database size={size === "sm" ? 11 : 13} className="shrink-0" />,
          label: "REFERENCE"
        };
    }
  };

  const style = getStyle();
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border font-bold font-mono tracking-tight transition-all ${style.bg} ${padding}`}
      title={
        fallbackReason
          ? `Fallback: ${fallbackReason}`
          : `Provider: ${provider || "default"} | Session: ${session || "active"}`
      }
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.icon}
      <span>{style.label}</span>
      {marketDate && norm === "REFERENCE" && (
        <span className="text-[10px] opacity-70 font-sans">({marketDate})</span>
      )}
      {session && (
        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/20 border border-white/10 font-sans hidden sm:inline">
          {session}
        </span>
      )}
    </div>
  );
}
