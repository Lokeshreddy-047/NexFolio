"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, ShieldAlert } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const iconContainerClass = isDanger
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : isWarning
    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

  const confirmBtnClass = isDanger
    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30"
    : isWarning
    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/30"
    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30";

  const Icon = isDanger ? Trash2 : isWarning ? AlertTriangle : ShieldAlert;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-md bg-[#070c1a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-5 relative"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/[0.06] transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl border ${iconContainerClass} shrink-0`}>
                <Icon size={24} />
              </div>
              <div className="space-y-1 pr-4">
                <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors border border-white/[0.08]"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 ${confirmBtnClass}`}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
