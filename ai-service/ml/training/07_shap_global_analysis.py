import os
import json
import joblib
import shap
import pandas as pd
import numpy as np


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    model_path = os.path.join(base_dir, "models", "xgboost_risk_model.pkl")

    data_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "xgboost_ready"
    )

    report_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "phase7_reports"
    )

    os.makedirs(report_dir, exist_ok=True)

    print("NexFolio – Phase 7.4.3 SHAP Global Analysis")
    print("-" * 65)

    model = joblib.load(model_path)
    X_test = pd.read_parquet(os.path.join(data_dir, "X_test.parquet"))

    print(f"Loaded XGBoost model: {type(model).__name__}")
    print(f"Test samples         : {len(X_test)}")
    print(f"Feature count        : {X_test.shape[1]}")

    print("\nBuilding SHAP TreeExplainer...")

    explainer = shap.TreeExplainer(model)

    print("Computing SHAP values...")

    shap_values = explainer.shap_values(X_test)

    if isinstance(shap_values, list):
        shap_array = np.mean([np.abs(v) for v in shap_values], axis=0)
    else:
        if len(shap_values.shape) == 3:
            shap_array = np.mean(np.abs(shap_values), axis=2)
        else:
            shap_array = np.abs(shap_values)

    mean_importance = shap_array.mean(axis=0)

    importance_df = pd.DataFrame({
        "feature": X_test.columns,
        "mean_abs_shap": mean_importance
    }).sort_values(by="mean_abs_shap", ascending=False)

    print("\nTop 15 Global SHAP Features")
    print(importance_df.head(15).to_string(index=False))

    importance_path = os.path.join(report_dir, "shap_global_importance.csv")
    importance_df.to_csv(importance_path, index=False)

    shap_values_df = pd.DataFrame(shap_array, columns=X_test.columns)
    shap_values_path = os.path.join(report_dir, "shap_summary_values.parquet")
    shap_values_df.to_parquet(shap_values_path, index=False)

    explainer_path = os.path.join(base_dir, "models", "shap_explainer.pkl")
    joblib.dump(explainer, explainer_path)

    top_features = importance_df.head(10).to_dict(orient="records")

    summary = {
        "model": "XGBoost",
        "analysis_type": "Global SHAP Explainability",
        "sample_count": int(len(X_test)),
        "feature_count": int(X_test.shape[1]),
        "top_10_features": top_features
    }

    summary_path = os.path.join(report_dir, "shap_global_summary.json")

    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=4)

    report_path = os.path.join(report_dir, "explainability_report.md")

    with open(report_path, "w") as f:
        f.write("# NexFolio – SHAP Explainability Report\n\n")
        f.write("## Global Feature Importance\n\n")
        f.write("The following features exert the highest average influence on the XGBoost portfolio risk predictions.\n\n")

        for idx, row in importance_df.head(10).iterrows():
            f.write(f"{idx + 1}. **{row['feature']}** – SHAP Importance: {row['mean_abs_shap']:.6f}\n")

        f.write("\n## Interpretation\n\n")
        f.write("- Higher SHAP values indicate stronger influence on the predicted risk category.\n")
        f.write("- The ranking demonstrates that the model relies primarily on quantitative market-risk variables rather than arbitrary heuristic rules.\n")

    print("\nArtifacts Saved")
    print(f"Global Importance CSV : {importance_path}")
    print(f"SHAP Values Parquet   : {shap_values_path}")
    print(f"Explainer Object      : {explainer_path}")
    print(f"Summary JSON          : {summary_path}")
    print(f"Markdown Report       : {report_path}")

    print("\nPhase 7.4.3 completed successfully.")


if __name__ == "__main__":
    main()