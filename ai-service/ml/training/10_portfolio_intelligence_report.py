import os
import pandas as pd


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    portfolio_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    recommendation_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "phase7_reports",
        "investor_recommendations.csv"
    )

    report_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "phase7_reports"
    )

    portfolios = pd.read_parquet(portfolio_path)
    recommendations = pd.read_csv(recommendation_path)

    recommendations = recommendations.drop(
        columns=[
            "annualized_volatility",
            "portfolio_beta",
            "diversification_score"
        ],
        errors="ignore"
    )

    merged = portfolios.merge(
        recommendations,
        on=["portfolio_id", "risk_category"]
    )

    sample_portfolios = pd.concat([
        merged[merged["risk_category"] == "LOW"].head(1),
        merged[merged["risk_category"] == "MEDIUM"].head(1),
        merged[merged["risk_category"] == "HIGH"].head(1)
    ])

    report_path = os.path.join(report_dir, "sample_investor_reports.md")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# NexFolio – Sample Investor Intelligence Reports\n\n")

        for _, row in sample_portfolios.iterrows():
            f.write(f"## Portfolio: {row['portfolio_id']}\n\n")
            f.write(f"- **Risk Category:** {row['risk_category']}\n")
            f.write(f"- **Annualized Return:** {row['annualized_return']:.2%}\n")
            f.write(f"- **Annualized Volatility:** {row['annualized_volatility']:.2%}\n")
            f.write(f"- **Portfolio Beta:** {row['portfolio_beta']:.2f}\n")
            f.write(f"- **Diversification Score:** {row['diversification_score']:.2f}\n")
            f.write(f"- **Asset Count:** {int(row['asset_count'])}\n\n")

            f.write("### AI Recommendations\n")

            for rec in row["recommendations"].split(" | "):
                f.write(f"- {rec}\n")

            f.write("\n---\n\n")

    print(f"Sample investor intelligence report generated: {report_path}")


if __name__ == "__main__":
    main()