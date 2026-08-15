"use client";

interface RiskProbabilitiesProps {
  probabilities?: Record<string, number>;
}


export default function RiskProbabilities({
  probabilities,
}: RiskProbabilitiesProps) {


  if (!probabilities) {
    return null;
  }


  const levels = [
    {
      name: "LOW",
      value: probabilities.LOW ?? 0,
    },
    {
      name: "MEDIUM",
      value: probabilities.MEDIUM ?? 0,
    },
    {
      name: "HIGH",
      value: probabilities.HIGH ?? 0,
    },
  ];



  return (
    <div className="rounded-xl bg-slate-800 p-4">

      <h3 className="mb-4 font-semibold">
        Risk Probability
      </h3>


      <div className="space-y-4">

        {levels.map((item) => (

          <div key={item.name}>


            <div className="mb-1 flex justify-between text-sm">

              <span>
                {item.name}
              </span>


              <span>
                {(item.value * 100).toFixed(2)}%
              </span>

            </div>



            <div className="h-3 rounded bg-slate-700">

              <div

                className={
                  `
                  h-3
                  rounded
                  ${
                    item.name === "HIGH"
                    ?
                    "bg-red-500"
                    :
                    item.name === "MEDIUM"
                    ?
                    "bg-yellow-400"
                    :
                    "bg-emerald-500"
                  }
                  `
                }


                style={{
                  width:
                  `${Math.min(item.value * 100,100)}%`,
                }}

              />


            </div>


          </div>

        ))}


      </div>


    </div>
  );
}