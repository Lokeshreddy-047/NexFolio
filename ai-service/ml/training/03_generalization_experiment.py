import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, f1_score


def train_models(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logistic = LogisticRegression(max_iter=2000, solver="lbfgs", random_state=42)
    logistic.fit(X_train_scaled, y_train)

    tree = DecisionTreeClassifier(
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42
    )
    tree.fit(X_train, y_train)

    logistic_pred = logistic.predict(X_test_scaled)
    tree_pred = tree.predict(X_test)

    return {
        "logistic_accuracy": round(accuracy_score(y_test, logistic_pred), 4),
        "logistic_f1": round(f1_score(y_test, logistic_pred, average="weighted"), 4),
        "tree_accuracy": round(accuracy_score(y_test, tree_pred), 4),
        "tree_f1": round(f1_score(y_test, tree_pred, average="weighted"), 4)
    }


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    dataset_path = os.path.join(
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

    df = pd.read_parquet(dataset_path)

    label_map = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2
    }

    df["risk_label"] = df["risk_category"].map(label_map)

    drop_base = [
        "portfolio_id",
        "risk_category",
        "risk_score",
        "risk_label",
        "diversification_category"
    ]

    full_X = df.drop(columns=[c for c in drop_base if c in df.columns])
    full_X = full_X.select_dtypes(include=["number"])
    full_X = full_X.fillna(full_X.median())

    reduced_drop = [
        "hhi",
        "diversification_score",
        "largest_sector_pct",
        "top_3_holdings_pct",
        "top_5_holdings_pct",
        "concentration_warning",
        "volatility_warning",
        "diversification_warning"
    ]

    reduced_X = full_X.drop(columns=[c for c in reduced_drop if c in full_X.columns])

    y = df["risk_label"]

    print("Running Full Feature Experiment...")
    full_results = train_models(full_X, y)

    print("Running Reduced Generalization Experiment...")
    reduced_results = train_models(reduced_X, y)

    comparison_df = pd.DataFrame([
        {
            "feature_set": "FULL",
            **full_results
        },
        {
            "feature_set": "REDUCED_GENERALIZATION",
            **reduced_results
        }
    ])

    comparison_path = os.path.join(report_dir, "full_vs_reduced_comparison.csv")
    comparison_df.to_csv(comparison_path, index=False)

    print("\nFull Feature Results")
    print(full_results)

    print("\nReduced Feature Results")
    print(reduced_results)

    print(f"\nComparison report saved to: {comparison_path}")


if __name__ == "__main__":
    main()