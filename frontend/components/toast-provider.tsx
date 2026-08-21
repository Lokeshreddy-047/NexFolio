"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast("success", title, description, duration),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast("error", title, description, duration),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast("warning", title, description, duration),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast("info", title, description, duration),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      {/* Toast Notification Container with Framer Motion */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            const isError = toast.type === "error";
            const isWarning = toast.type === "warning";

            const borderBgClass = isSuccess
              ? "border-emerald-500/30 bg-[#070c1a]/95 text-emerald-400 shadow-emerald-950/20"
              : isError
              ? "border-rose-500/30 bg-[#070c1a]/95 text-rose-400 shadow-rose-950/20"
              : isWarning
              ? "border-amber-500/30 bg-[#070c1a]/95 text-amber-400 shadow-amber-950/20"
              : "border-indigo-500/30 bg-[#070c1a]/95 text-indigo-400 shadow-indigo-950/20";

            const icon = isSuccess ? (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            ) : isError ? (
              <AlertOctagon size={20} className="text-rose-400 shrink-0" />
            ) : isWarning ? (
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            ) : (
              <Info size={20} className="text-indigo-400 shrink-0" />
            );

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.92 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${borderBgClass}`}
                role="alert"
              >
                <div className="mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-sm font-bold text-white leading-snug">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors shrink-0"
                  aria-label="Close notification"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
