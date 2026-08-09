import os
import pandas as pd


def generate_recommendations(row):
    recommendations = []

    if row["annualized_volatility"] > 0.25:
        recommendations.append(
            "Reduce exposure to highly volatile assets and increase allocation to defensive sectors such as FMCG or Healthcare."
        )

    if row["portfolio_beta"] > 1.0:
        recommendations.append(
            "Portfolio beta is above 1.0, indicating elevated market sensitivity. Consider adding lower-beta assets to improve stability."
        )

    if row["asset_count"] < 8:
        recommendations.append(
            "Increase the number of holdings to improve diversification and reduce unsystematic risk."
        )

    if row["sector_count"] < 5:
        recommendations.append(
            "Expand exposure across additional sectors to avoid excessive dependence on a small set of industries."
        )

    if row["portfolio_sharpe_ratio"] < 0.5:
        recommendations.append(
            "Risk-adjusted return is relatively weak. Rebalance toward assets with stronger return-to-risk characteristics."
        )

    if row["portfolio_max_drawdown"] < -0.50:
        recommendations.append(
            "Historical drawdown is severe. Consider implementing capital-preservation constraints and reducing concentration in high-risk sectors."
        )

    if row["diversification_score"] < 60:
        recommendations.append(
            "Diversification score is low. Reduce concentration in the largest holdings and distribute capital more evenly across sectors."
        )

    if not recommendations:
        recommendations.append(
            "Portfolio risk profile appears balanced. Continue periodic monitoring and maintain disciplined rebalancing."
        )

    return recommendations


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    portfolio_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    report_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "phase7_reports"
    )

    os.makedirs(report_dir, exist_ok=True)

    df = pd.read_parquet(portfolio_path)

    recommendation_rows = []

    for _, row in df.iterrows():
        recommendations = generate_recommendations(row)

        recommendation_rows.append({
            "portfolio_id": row["portfolio_id"],
            "risk_category": row["risk_category"],
            "annualized_volatility": round(float(row["annualized_volatility"]), 4),
            "portfolio_beta": round(float(row["portfolio_beta"]), 4),
            "diversification_score": round(float(row["diversification_score"]), 2),
            "recommendation_count": len(recommendations),
            "recommendations": " | ".join(recommendations)
        })

    recommendations_df = pd.DataFrame(recommendation_rows)

    recommendations_df.to_csv(
        os.path.join(report_dir, "investor_recommendations.csv"),
        index=False
    )

    recommendations_df.to_json(
        os.path.join(report_dir, "investor_recommendations.json"),
        orient="records",
        indent=4
    )

    print("Investor Recommendation Engine completed successfully.")


if __name__ == "__main__":
    main()