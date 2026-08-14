"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function TestRiskPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);

    try {
      const response = await apiRequest<any>("/api/v1/explain-risk", {
        method: "POST",
        body: JSON.stringify({
          annualized_return: 0.18,
          annualized_volatility: 0.22,
          portfolio_beta: 1.05,
          asset_count: 8,
          sector_count: 5,
          portfolio_sharpe_ratio: 1.25,
          portfolio_sortino_ratio: 1.6,
          portfolio_calmar_ratio: 0.9,
          diversification_score: 78,
          portfolio_max_drawdown: -0.14,
          return_1M: 0.03,
          return_3M: 0.08,
          return_6M: 0.15,
          return_1Y: 0.22,
        }),
      });

      setResult(response);
    } catch (err) {
      console.error(err);
      alert("Risk analysis failed. Check FastAPI terminal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold">NexFolio Risk Intelligence Test</h1>

        <button
          onClick={runTest}
          disabled={loading}
          className="mt-6 rounded-lg bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Run Risk Analysis"}
        </button>

        {result && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Prediction</h2>
              <p className="mt-2">
  Risk Level:{" "}
  <span className="font-bold text-emerald-400">
    {result.risk_category}
  </span>
</p>
              <p>
                Confidence: <span className="font-bold">{(result.confidence * 100).toFixed(2)}%</span>
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Top Positive Contributors</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {result.top_positive_contributors?.map((item: any) => {
  const value =
  item.impact ??
  item.shap_value ??
  item.value ??
  item.contribution ??
  0;

  return (
    <li key={item.feature}>
      {item.feature}: {Number(value).toFixed(4)}
    </li>
  );
})}
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Top Negative Contributors</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {result.top_negative_contributors?.map((item: any) => {
  const value =
  item.impact ??
  item.shap_value ??
  item.value ??
  item.contribution ??
  0;

  return (
    <li key={item.feature}>
      {item.feature}: {Number(value).toFixed(4)}
    </li>
  );
})}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}