"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function TestApiPage() {
  const [status, setStatus] = useState("Checking...");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ status: string }>("/api/v1/health")
      .then((data) => setStatus(data.status))
      .catch((err) => {
        setStatus("ERROR");
        setError(err.message);
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold">
          FastAPI Connection Test
        </h1>

        <p className="mt-4">
          Status: <span className="font-semibold">{status}</span>
        </p>

        {error && (
          <p className="mt-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}