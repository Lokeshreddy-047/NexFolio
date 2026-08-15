import os
import pandas as pd


def assign_risk_category(row):
    volatility = row["annualized_volatility"]
    hhi = row["hhi"]

    if volatility <= 0.185 and hhi <= 0.18:
        return "LOW"

    if volatility >= 0.225 or hhi >= 0.36:
        return "HIGH"

    return "MEDIUM"


def assign_risk_score(category):
    mapping = {
        "LOW": 3.0,
        "MEDIUM": 6.5,
        "HIGH": 9.0
    }
    return mapping[category]


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    dataset_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    df = pd.read_parquet(dataset_path)

    print("Original Distribution")
    print(df["risk_category"].value_counts())

    df["risk_category"] = df.apply(assign_risk_category, axis=1)
    df["risk_score"] = df["risk_category"].apply(assign_risk_score)

    df.to_parquet(dataset_path, index=False)

    print("\nRebalanced Distribution")
    print(df["risk_category"].value_counts())

    print(f"\nUpdated dataset saved to: {dataset_path}")


if __name__ == "__main__":
    main()