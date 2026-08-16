"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading authentication...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            NexFolio
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Investment Intelligence
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to access portfolio risk analysis,
            explainable AI insights, and investment analytics.
          </p>

          <div className="mt-8 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </section>
    </main>
  );
}