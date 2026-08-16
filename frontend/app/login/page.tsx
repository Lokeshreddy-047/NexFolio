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
  HelpCircle,
  Radio
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
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
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

  // 1. Email/Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      setErrorMessage(mapFirebaseError(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Email/Password Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter your email and a secure password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setIsSubmitting(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update display name if provided
      if (displayName.trim() && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });
      }

      setSuccessMessage("Account created successfully! Redirecting to Command Center...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      setErrorMessage(mapFirebaseError(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
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
      setSuccessMessage("Password reset link has been dispatched to your email!");
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      setErrorMessage(mapFirebaseError(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Google Single Sign-On
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Google sign in error:", err);
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      if (code !== "auth/popup-closed-by-user") {
        setErrorMessage(mapFirebaseError(code));
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // Fast test credential filler
  const fillDemoAccount = () => {
    setEmail("lokeshreddy2378@gmail.com");
    setPassword("NexFolio2026!");
    setErrorMessage(null);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-widest text-slate-400">INITIALIZING SECURITY ENGINE...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
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
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            NSE Live Stream Active
          </span>
          <a
            href="https://upstox.com"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors hidden md:block"
          >
            Upstox API v2 Verified
          </a>
        </div>
      </header>

      {/* Center Main Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Visual Feature Showcase (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
                <Sparkles size={13} />
                <span>INSTITUTIONAL GRADE RISK PLATFORM</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Intelligence for Modern Portfolios.
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Real-time valuation across Indian equities, backed by transparent TreeSHAP explainability and zero-mutation risk simulations.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Sub-5ms Fast Loop Valuation</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live Upstox ticks revalue holdings, Day P&L, and portfolio weights instantaneously with zero ML lag.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">4-Pillar Health Scorecard</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Rigorous quantitative scoring spanning diversification, beta moderation, return efficiency, and drawdowns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">What-If Risk Simulation Sandbox</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Simulate capital injections and rebalancing scenarios without modifying historical records or live holdings.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Data Badge */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Radio size={12} className="animate-pulse" />
                LIVE UPSTOX REST & SSE
              </span>
              <span>•</span>
              <span>28 Institutional Factors</span>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden">
              
              {/* Top ambient shine */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />

              {/* Card Header & Tab Switcher */}
              {authMode !== "FORGOT_PASSWORD" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        {authMode === "SIGN_IN" ? "Welcome Back" : "Create Account"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {authMode === "SIGN_IN"
                          ? "Enter your credentials to access your intelligence dashboard."
                          : "Join NexFolio to analyze and safeguard your investments."}
                      </p>
                    </div>
                  </div>

                  {/* Mode Tab Switcher */}
                  <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("SIGN_IN");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`flex-1 py-2.5 rounded-xl transition-all ${
                        authMode === "SIGN_IN"
                          ? "bg-slate-800/90 text-emerald-400 shadow-md border border-slate-700/60"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("REGISTER");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`flex-1 py-2.5 rounded-xl transition-all ${
                        authMode === "REGISTER"
                          ? "bg-slate-800/90 text-emerald-400 shadow-md border border-slate-700/60"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("SIGN_IN");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                  <h3 className="text-2xl font-black text-white tracking-tight">Reset Password</h3>
                  <p className="text-xs text-slate-400">
                    We will send a secure password recovery link to your email address.
                  </p>
                </div>
              )}

              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="mt-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Form Body */}
              {authMode !== "FORGOT_PASSWORD" ? (
                <div className="mt-6 space-y-4">
                  {/* Google SSO Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleSubmitting || isSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGoogleSubmitting ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
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
                    )}
                    <span>Continue with Google</span>
                  </button>

                  {/* Or Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-[1px] bg-slate-800" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Or with email
                    </span>
                    <div className="flex-1 h-[1px] bg-slate-800" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={authMode === "SIGN_IN" ? handleEmailSignIn : handleEmailRegister} className="space-y-3.5">
                    
                    {/* Display Name (Register Mode Only) */}
                    {authMode === "REGISTER" && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Full Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Madupu Lokesh Reddy"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="investor@nexfolio.ai"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                            className="text-[11px] text-emerald-400 hover:underline font-semibold"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {/* Live Password Strength (Register Mode Only) */}
                      {authMode === "REGISTER" && password.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Strength:</span>
                            <span className={`font-bold ${pwdStrength.label === "Strong" ? "text-emerald-400" : pwdStrength.label === "Medium" ? "text-amber-400" : "text-rose-400"}`}>
                              {pwdStrength.label}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pwdStrength.color} transition-all duration-300`}
                              style={{ width: `${pwdStrength.score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password (Register Mode Only) */}
                    {authMode === "REGISTER" && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Remember me / Terms */}
                    {authMode === "SIGN_IN" ? (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span>Keep me signed in</span>
                        </label>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                        By registering, you agree to NexFolio’s institutional terms of intelligence analysis.
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || isGoogleSubmitting}
                      className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{authMode === "SIGN_IN" ? "Access Command Center" : "Create Account & Start"}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Forgot Password Form */
                <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Your Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="investor@nexfolio.ai"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Developer / Demo Quick Fill Button */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-slate-400" />
                  Quick test?
                </span>
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="font-bold text-emerald-400 hover:underline font-mono"
                >
                  Autofill Active User
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Footer Bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400 border-t border-slate-900">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 NexFolio AI Intelligence Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
            <span>256-bit AES Firebase Encryption</span>
            <span>•</span>
            <span>Upstox API v2 Live</span>
            <span>•</span>
            <span>TreeSHAP Powered</span>
          </div>
        </div>
      </footer>
    </main>
  );
}