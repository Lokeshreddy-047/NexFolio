import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    dataset_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    output_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "xgboost_ready"
    )

    os.makedirs(output_dir, exist_ok=True)

    print("NexFolio – Phase 7.4.1 XGBoost Dataset Preparation")
    print("-" * 70)

    df = pd.read_parquet(dataset_path)

    print(f"Loaded dataset: {df.shape}")

    label_map = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2
    }

    df["risk_label"] = df["risk_category"].map(label_map)

    base_drop = [
        "portfolio_id",
        "risk_category",
        "risk_score",
        "risk_label",
        "diversification_category"
    ]

    X = df.drop(columns=[c for c in base_drop if c in df.columns])
    X = X.select_dtypes(include=["number"])

    leakage_columns = [
        "hhi",
        "diversification_score",
        "largest_sector_pct",
        "top_3_holdings_pct",
        "top_5_holdings_pct",
        "concentration_warning",
        "volatility_warning",
        "diversification_warning"
    ]

    removed = [c for c in leakage_columns if c in X.columns]
    X = X.drop(columns=removed)

    print("\nRemoved leakage-sensitive features:")
    for col in removed:
        print(f"  - {col}")

    X = X.fillna(X.median())

    y = df["risk_label"]

    print(f"\nFinal feature count: {X.shape[1]}")
    print(f"Final sample count : {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    print("\nTrain/Test Split")
    print(f"X_train: {X_train.shape}")
    print(f"X_test : {X_test.shape}")

    X_train.to_parquet(os.path.join(output_dir, "X_train.parquet"), index=False)
    X_test.to_parquet(os.path.join(output_dir, "X_test.parquet"), index=False)

    pd.DataFrame({"risk_label": y_train}).to_parquet(
        os.path.join(output_dir, "y_train.parquet"),
        index=False
    )

    pd.DataFrame({"risk_label": y_test}).to_parquet(
        os.path.join(output_dir, "y_test.parquet"),
        index=False
    )

    feature_metadata = {
        "feature_count": int(X.shape[1]),
        "feature_names": list(X.columns),
        "class_mapping": {
            "LOW": 0,
            "MEDIUM": 1,
            "HIGH": 2
        },
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test))
    }

    with open(os.path.join(output_dir, "feature_metadata.json"), "w") as f:
        json.dump(feature_metadata, f, indent=4)

    print("\nArtifacts Generated")
    print(f"X_train.parquet        : {os.path.join(output_dir, 'X_train.parquet')}")
    print(f"X_test.parquet         : {os.path.join(output_dir, 'X_test.parquet')}")
    print(f"y_train.parquet        : {os.path.join(output_dir, 'y_train.parquet')}")
    print(f"y_test.parquet         : {os.path.join(output_dir, 'y_test.parquet')}")
    print(f"feature_metadata.json  : {os.path.join(output_dir, 'feature_metadata.json')}")

    print("\nPhase 7.4.1 completed successfully.")


if __name__ == "__main__":
    main()