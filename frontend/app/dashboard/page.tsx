"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  apiRequest,
  savePrediction,
} from "@/lib/api";

import {
  getPredictionHistory,
  type PredictionHistoryItem
} from "@/lib/api";

import { useAuth } from "@/components/auth-provider";


interface RiskContributor {
  feature: string;
  impact: number;
}


interface RiskResult {
  risk_category: string;
  confidence: number;
  top_positive_contributors?: RiskContributor[];
  top_negative_contributors?: RiskContributor[];
}


const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];


export default function DashboardPage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    equity_pct: 55,
    etf_pct: 20,
    debt_pct: 15,
    gold_pct: 5,
    crypto_pct: 5,

    asset_count: 8,
    sector_count: 5,

    annualized_return: 0.18,
    annualized_volatility: 0.22,
    portfolio_beta: 1.05,

    portfolio_sharpe_ratio: 1.25,
    portfolio_sortino_ratio: 1.6,
    portfolio_calmar_ratio: 0.9,

    diversification_score: 78,
    portfolio_max_drawdown: -0.14,

    return_1M: 0.03,
    return_3M: 0.08,
    return_6M: 0.15,
    return_1Y: 0.22,
  });


  const [result, setResult] =
  useState<RiskResult | null>(null);


const [history, setHistory] =
  useState<PredictionHistoryItem[]>([]);
  
  const [loading, setLoading] = useState(false);



  const allocationData = useMemo(
    () => [
      {
        name: "Equity",
        value: form.equity_pct,
      },
      {
        name: "ETF",
        value: form.etf_pct,
      },
      {
        name: "Debt",
        value: form.debt_pct,
      },
      {
        name: "Gold",
        value: form.gold_pct,
      },
      {
        name: "Crypto",
        value: form.crypto_pct,
      },
    ],
    [form],
  );



  async function loadHistory() {
    try {
      const data = await getPredictionHistory();
      setHistory(data);
    } catch (error) {
      console.error(
        "Failed loading prediction history",
        error,
      );
    }
  }



  useEffect(() => {
    loadHistory();
  }, []);




  async function analyzePortfolio() {

    setLoading(true);


    const cryptoRisk =
      form.crypto_pct / 100;

    const equityRisk =
      form.equity_pct / 100;

    const debtWeight =
      form.debt_pct / 100;



    const payload = {

      annualized_return:
        0.08 +
        equityRisk * 0.15 +
        cryptoRisk * 0.35,


      annualized_volatility:
        0.10 +
        equityRisk * 0.25 +
        cryptoRisk * 0.60 -
        debtWeight * 0.05,


      portfolio_beta:
        0.70 +
        equityRisk * 0.80 +
        cryptoRisk * 1.50,


      asset_count:
        Math.max(1, form.asset_count),


      sector_count:
        Math.max(1, form.sector_count),



      portfolio_sharpe_ratio:
        1.40 -
        cryptoRisk * 0.50 +
        debtWeight * 0.20,


      portfolio_sortino_ratio:
        1.80 -
        cryptoRisk * 0.70 +
        debtWeight * 0.30,


      portfolio_calmar_ratio:
        1.00 -
        cryptoRisk * 0.40 +
        debtWeight * 0.10,


      diversification_score:
        Math.max(
          10,
          100 - form.crypto_pct * 0.8,
        ),


      portfolio_max_drawdown:
        -(
          0.05 +
          equityRisk * 0.12 +
          cryptoRisk * 0.30
        ),


      return_1M:
        0.01 + cryptoRisk * 0.05,

      return_3M:
        0.03 + cryptoRisk * 0.10,

      return_6M:
        0.06 + cryptoRisk * 0.18,

      return_1Y:
        0.10 + cryptoRisk * 0.30,

    };



    try {

      const response =
  await apiRequest<RiskResult>(
          "/api/v1/explain-risk",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );


      setResult(response);



      await savePrediction({

        user_id:
          user?.uid ||
          "test_user_001",


        portfolio_id:
          "PORTFOLIO_001",


        portfolio_data:
          payload,

      });



      await loadHistory();



    } catch(error) {

      console.error(error);

      alert(
        "Risk analysis failed. Check backend terminal.",
      );


    } finally {

      setLoading(false);

    }

  }





  function updateField(
    name:string,
    value:number,
  ) {

    setForm(
      previous => ({
        ...previous,
        [name]:value,
      }),
    );

  }





  return (

    <main className="min-h-screen bg-slate-950 p-6 text-white">


      <div className="mx-auto max-w-7xl space-y-6">


        <header>

          <h1 className="text-3xl font-bold">
            NexFolio Dashboard
          </h1>

          <p className="text-slate-400">
            Explainable AI portfolio risk intelligence
          </p>

        </header>





        <div className="grid gap-6 lg:grid-cols-3">



          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">


            <h2 className="text-xl font-semibold">
              Portfolio Allocation
            </h2>


            <div className="mt-6 space-y-4">


              {[
                ["equity_pct","Equity %"],
                ["etf_pct","ETF %"],
                ["debt_pct","Debt %"],
                ["gold_pct","Gold %"],
                ["crypto_pct","Crypto %"],

              ].map(([key,label]) => (

                <div key={key}>

                  <div className="flex justify-between text-sm">

                    <span>
                      {label}
                    </span>

                    <span>
                      {form[key as keyof typeof form]}%
                    </span>

                  </div>


                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={
                      Number(
                        form[key as keyof typeof form],
                      )
                    }
                    onChange={
                      e =>
                      updateField(
                        key,
                        Number(e.target.value),
                      )
                    }
                    className="w-full"
                  />

                </div>

              ))}


            </div>



            <button

              onClick={analyzePortfolio}

              disabled={loading}

              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-black"

            >

              {
                loading
                ?
                "Analyzing..."
                :
                "Analyze Portfolio"
              }

            </button>



          </section>





          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">


            <h2 className="text-xl font-semibold">
              Asset Allocation
            </h2>


            <div className="mt-6 h-72">


              <ResponsiveContainer width="100%" height="100%">

                <PieChart>

                  <Pie
                    data={allocationData}
                    dataKey="value"
                    outerRadius={100}
                    label
                  >

                    {
                      allocationData.map(
                        (entry,index)=>(

                        <Cell
                          key={entry.name}
                          fill={
                            COLORS[
                              index %
                              COLORS.length
                            ]
                          }
                        />

                        )
                      )
                    }


                  </Pie>


                  <Tooltip />


                </PieChart>


              </ResponsiveContainer>


            </div>


          </section>





          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">


            <h2 className="text-xl font-semibold">
              Risk Intelligence
            </h2>



            {
              result ?

              <div className="mt-6 space-y-4">


                <div className="rounded-xl bg-slate-800 p-4">

                  <p className="text-sm text-slate-400">
                    Risk Level
                  </p>

                  <p className="text-2xl font-bold text-red-400">
                    {result.risk_category}
                  </p>

                </div>



                <div className="rounded-xl bg-slate-800 p-4">

                  <p className="text-sm text-slate-400">
                    Confidence
                  </p>

                  <p className="text-2xl font-bold">
                    {
                      (
                        result.confidence *
                        100
                      ).toFixed(2)
                    }%
                  </p>

                </div>





                <div className="rounded-xl bg-slate-800 p-4">


                  <h3 className="font-semibold">
                    Positive Risk Contributors
                  </h3>


                  {
                    result.top_positive_contributors?.map(
(item: RiskContributor)=>(

                      <div
                        key={item.feature}
                        className="flex justify-between text-sm mt-2"
                      >

                        <span>
                          {item.feature}
                        </span>

                        <span>
                          {item.impact.toFixed(4)}
                        </span>


                      </div>

                      )
                    )
                  }


                </div>





                <div className="rounded-xl bg-slate-800 p-4">


                  <h3 className="font-semibold">
                    Negative Contributors
                  </h3>


                  {
                    result.top_negative_contributors?.map(
(item: RiskContributor)=>(

                      <div
                        key={item.feature}
                        className="flex justify-between text-sm mt-2"
                      >

                        <span>
                          {item.feature}
                        </span>

                        <span>
                          {item.impact.toFixed(4)}
                        </span>


                      </div>

                      )
                    )
                  }


                </div>


              </div>


              :

              <p className="mt-6 text-slate-400">
                Run analysis to generate AI insights.
              </p>

            }


          </section>



        </div>





        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">


          <h2 className="text-xl font-semibold">
            Prediction History
          </h2>


          <div className="mt-4 space-y-3">


          {
            history.map(
              item => (

              <div
                key={item.prediction_id}
                className="rounded-xl bg-slate-800 p-4 flex justify-between"
              >

                <div>

                  <p>
                    {item.risk_category}
                  </p>

                  <p className="text-sm text-slate-400">
                    {item.portfolio_id}
                  </p>

                </div>


                <div>

                  {
                    (
                      item.confidence *
                      100
                    ).toFixed(2)
                  }%

                </div>


              </div>

              )
            )
          }


          </div>


        </section>




      </div>


    </main>

  );

}