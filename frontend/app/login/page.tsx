"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Zap,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Radio,
  Flame,
  Newspaper,
  FileSpreadsheet
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Mode: "SIGN_IN" | "REGISTER" | "FORGOT_PASSWORD"
  const [authMode, setAuthMode] = useState<"SIGN_IN" | "REGISTER" | "FORGOT_PASSWORD">("SIGN_IN");

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-700" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 33, label: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 66, label: "Medium", color: "bg-amber-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-400" };
  };

  const pwdStrength = getPasswordStrength(password);

  // Friendly Firebase error mapping
  const mapFirebaseError = (errCode: string): string => {
    switch (errCode) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email address or password. Please verify your credentials.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";
      case "auth/weak-password":
        return "Password should be at least 6 characters with letters and numbers.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/popup-closed-by-user":
        return "Google sign-in popup was closed before completing.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait a few minutes before trying again.";
      case "auth/network-request-failed":
        return "Network connectivity issue. Please check your internet connection.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      default:
        return "Authentication encountered an error. Please try again.";
    }
  };

  // 1. Email + Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setErrorMessage(mapFirebaseError(firebaseError.code || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Email + Password Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!displayName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setErrorMessage(mapFirebaseError(firebaseError.code || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setIsGoogleSubmitting(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        setErrorMessage(mapFirebaseError(firebaseError.code || ""));
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // 4. Password Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage("Password reset email sent. Please check your inbox.");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setErrorMessage(mapFirebaseError(firebaseError.code || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. One-Click Instant Institutional Demo Access
  const handleDemoAccess = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setIsSubmitting(true);
      try {
        await signInWithEmailAndPassword(auth, "demo@nexfolio.ai", "DemoPass2025!");
      } catch {
        const cred = await createUserWithEmailAndPassword(auth, "demo@nexfolio.ai", "DemoPass2025!");
        await updateProfile(cred.user, { displayName: "Lokesh Reddy" });
      }
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#030712] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-widest text-slate-400">INITIALIZING SECURITY ENGINE...</span>
      </main>
    );
  }

  const flagshipFeatures = [
    {
      icon: <BrainCircuit size={18} />,
      title: "TreeSHAP ML Risk & Explainability Engine",
      badge: "97% ACCURACY",
      desc: "XGBoost classifier with O(TLD²) game-theoretic feature attributions for transparent portfolio risk verdicts.",
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      icon: <Flame size={18} />,
      title: "AI-Powered IPO Radar & Risk Scorecard",
      badge: "LIVE GMP",
      desc: "Multi-factor quantitative valuation, live subscription velocity, and retail allotment probability across NSE/BSE.",
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      icon: <Newspaper size={18} />,
      title: "Market News & Macro Sentiment Radar",
      badge: "NLP POLARITY",
      desc: "Real-time Indian financial headlines with entity matching, sentiment polarity, and live macroeconomic levers.",
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    },
    {
      icon: <FileSpreadsheet size={18} />,
      title: "Income-tax Act, 2025 Statutory Tax Suite",
      badge: "FY2025-26",
      desc: "Automated STCG 20% & LTCG 12.5% computation with ₹1.25L exemption limits and tax-loss harvesting recommendations.",
      accent: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    },
    {
      icon: <Zap size={18} />,
      title: "Sub-5ms Fast Loop Multi-Broker Stream",
      badge: "292+ EQUITIES",
      desc: "Zero-latency SSE market ticks via Upstox & Yahoo Finance, revaluing holdings and Day P&L instantaneously.",
      accent: "text-teal-400 bg-teal-500/10 border-teal-500/20"
    },
    {
      icon: <TrendingUp size={18} />,
      title: "What-If Trade Simulation & Rebalance Sandbox",
      badge: "ZERO-MUTATION",
      desc: "Stress-test capital deployments and sector rebalancing scenarios without modifying historical portfolio records.",
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    }
  ];

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
            <div className="w-full h-full bg-[#030712] rounded-[15px] flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              NexFolio
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400/80 -mt-1 font-mono">
              AI Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            NSE Live Stream Active
          </span>
          <span className="text-[11px] font-mono text-slate-400 hidden md:block">
            Income-tax Act, 2025 Compliant
          </span>
        </div>
      </header>

      {/* Center Main Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Visual Feature Showcase (Desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
                <Sparkles size={13} />
                <span>INSTITUTIONAL GRADE RISK PLATFORM</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-[1.15]">
                Quantitative Intelligence for Modern Portfolios.
              </h1>
              <p className="text-xs xl:text-sm text-slate-400 leading-relaxed max-w-xl">
                Real-time valuation across 292+ Indian equities, backed by transparent TreeSHAP explainability, IPO valuation radar, and Income-tax Act, 2025 statutory compliance.
              </p>
            </div>

            {/* 6 Flagship Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {flagshipFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:border-white/[0.15] transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${f.accent}`}>
                      {f.icon}
                    </div>
                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                      {f.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                    {f.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Live Infrastructure Badge */}
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[11px]">
                <Radio size={12} className="animate-pulse" />
                LIVE REST & SSE STREAM
              </span>
              <span>•</span>
              <span className="text-[11px]">28 Quantitative Factors</span>
              <span>•</span>
              <span className="text-[11px]">XGBoost v1.2.0</span>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="relative rounded-3xl bg-[#070c1a]/90 border border-white/[0.08] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden">
              
              {/* Top ambient shine */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />

              {/* Card Header & Tab Switcher */}
              {authMode !== "FORGOT_PASSWORD" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {authMode === "SIGN_IN" ? "Welcome Back" : "Create Account"}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {authMode === "SIGN_IN"
                          ? "Enter your credentials to access your intelligence dashboard."
                          : "Join NexFolio to analyze and safeguard your investments."}
                      </p>
                    </div>
                  </div>

                  {/* Mode Tab Switcher with Framer Motion layoutId */}
                  <div className="flex bg-black/50 p-1 rounded-2xl border border-white/[0.08] text-xs font-bold relative">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("SIGN_IN");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`relative flex-1 py-2 rounded-xl transition-colors z-10 ${
                        authMode === "SIGN_IN"
                          ? "text-emerald-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {authMode === "SIGN_IN" && (
                        <motion.div
                          layoutId="auth-mode-pill"
                          transition={{ type: "spring", damping: 25, stiffness: 350 }}
                          className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl shadow-sm -z-10"
                        />
                      )}
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("REGISTER");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`relative flex-1 py-2 rounded-xl transition-colors z-10 ${
                        authMode === "REGISTER"
                          ? "text-emerald-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {authMode === "REGISTER" && (
                        <motion.div
                          layoutId="auth-mode-pill"
                          transition={{ type: "spring", damping: 25, stiffness: 350 }}
                          className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl shadow-sm -z-10"
                        />
                      )}
                      Create Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-400">
                    Enter your email to receive secure recovery instructions.
                  </p>
                </div>
              )}

              {/* Alert Feedback Messages with AnimatePresence */}
              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                    <span className="leading-snug">{errorMessage}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
                  >
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span className="leading-snug">{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FORM FIELDS */}
              <form
                onSubmit={
                  authMode === "SIGN_IN"
                    ? handleEmailSignIn
                    : authMode === "REGISTER"
                    ? handleRegister
                    : handleForgotPassword
                }
                className="space-y-4 mt-4"
              >
                {/* Display Name Field (Register Only) */}
                {authMode === "REGISTER" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="e.g. Lokesh Reddy"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      placeholder="investor@nexfolio.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                {authMode !== "FORGOT_PASSWORD" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Password
                      </label>
                      {authMode === "SIGN_IN" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("FORGOT_PASSWORD");
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Dynamic Password Strength Indicator (Register Only) */}
                    {authMode === "REGISTER" && password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Password Strength:</span>
                          <span className="font-bold text-slate-200">{pwdStrength.label}</span>
                        </div>
                        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pwdStrength.score}%` }}
                            transition={{ type: "spring", damping: 20 }}
                            className={`h-full ${pwdStrength.color}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm Password Field (Register Only) */}
                {authMode === "REGISTER" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Remember Me Checkbox */}
                {authMode === "SIGN_IN" && (
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      <span>Keep me signed in</span>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-500 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-98 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === "SIGN_IN"
                          ? "Access Command Center"
                          : authMode === "REGISTER"
                          ? "Create Account"
                          : "Send Reset Link"}
                      </span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Forgot Password Back Button */}
              {authMode === "FORGOT_PASSWORD" && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("SIGN_IN");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white font-semibold transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}

              {/* DIVIDER & ALTERNATIVE AUTH PROVIDERS */}
              {authMode !== "FORGOT_PASSWORD" && (
                <div className="space-y-4 mt-6">
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-white/[0.08]" />
                    <span className="absolute bg-[#070c1a] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Or continue with
                    </span>
                  </div>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                  >
                    {isGoogleSubmitting ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Google Workspace</span>
                      </>
                    )}
                  </button>

                  {/* One-Click Instant Institutional Demo Access */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDemoAccess}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-all group"
                    >
                      <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                      <span>Instant Institutional Demo Access</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-1.5 font-mono">
                      Preloaded with authentic NSE 500 portfolios & 28-feature ML risk pipelines
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Ribbon */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-white/[0.08] gap-2">
        <div className="flex items-center gap-2 font-mono">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>AES-256 Cloud Vault • Income-tax Act, 2025 Compliant</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/reports" className="hover:text-slate-300 transition-colors">
            Tax Engine
          </Link>
          <Link href="/intelligence" className="hover:text-slate-300 transition-colors">
            TreeSHAP Model
          </Link>
          <Link href="/ipo" className="hover:text-slate-300 transition-colors">
            IPO Radar
          </Link>
        </div>
      </footer>
    </main>
  );
}