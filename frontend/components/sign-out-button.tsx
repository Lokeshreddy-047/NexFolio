"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function SignOutButton() {
  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
    >
      Sign out
    </button>
  );
}