"use client";

import { useAuth } from "@/components/auth-provider";
import { SignOutButton } from "@/components/sign-out-button";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="text-center">
        {user ? (
          <>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              NexFolio
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Welcome to NexFolio
            </h1>

            <p className="mt-3 text-slate-400">
              Signed in as {user.email}
            </p>

            <div className="mt-6 flex justify-center">
              <SignOutButton />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              NexFolio
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Investment Intelligence
            </h1>

            <p className="mt-3 text-slate-400">
              You are not signed in.
            </p>
          </>
        )}
      </div>
    </main>
  );
}