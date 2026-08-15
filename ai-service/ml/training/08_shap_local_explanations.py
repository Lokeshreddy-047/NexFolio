import os
import json
import joblib
import shap
import pandas as pd
import numpy as np


LABEL_MAP = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH"
}


def extract_top_contributors(feature_names, shap_row, top_n=5):
    contributions = pd.DataFrame({
        "feature": feature_names,
        "shap_value": shap_row
    })

    positive = contributions.sort_values(by="shap_value", ascending=False).head(top_n)
    negative = contributions.sort_values(by="shap_value", ascending=True).head(top_n)

    return positive, negative


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    model_path = os.path.join(base_dir, "models", "xgboost_risk_model.pkl")
    explainer_path = os.path.join(base_dir, "models", "shap_explainer.pkl")

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

    print("NexFolio – Phase 7.4.4 Local SHAP Explanations")
    print("-" * 70)

    model = joblib.load(model_path)
    explainer = joblib.load(explainer_path)

    X_test = pd.read_parquet(os.path.join(data_dir, "X_test.parquet"))
    y_test = pd.read_parquet(os.path.join(data_dir, "y_test.parquet"))["risk_label"]

    probabilities = model.predict_proba(X_test)
    predictions = model.predict(X_test)

    shap_values = explainer.shap_values(X_test)

    if isinstance(shap_values, list):
        shap_array = np.stack(shap_values, axis=2)
    else:
        shap_array = shap_values

    selected_indices = []

    for label in [0, 1, 2]:
        matching = np.where(predictions == label)[0]
        if len(matching) > 0:
            selected_indices.append(matching[0])

    explanation_rows = []

    for idx in selected_indices:
        predicted_label = predictions[idx]
        predicted_name = LABEL_MAP[predicted_label]

        confidence = float(probabilities[idx][predicted_label])

        feature_vector = X_test.iloc[idx]

        shap_row = shap_array[idx, :, predicted_label]

        positive, negative = extract_top_contributors(
            X_test.columns,
            shap_row,
            top_n=5
        )

        print(f"\nPortfolio Sample: TEST_{idx}")
        print(f"Predicted Risk : {predicted_name}")
        print(f"Confidence     : {confidence:.4f}")

        print("\nTop Positive Contributors")
        print(positive.to_string(index=False))

        print("\nTop Negative Contributors")
        print(negative.to_string(index=False))

        explanation_rows.append({
            "portfolio_sample": f"TEST_{idx}",
            "predicted_risk": predicted_name,
            "confidence": round(confidence, 4),
            "top_positive_feature_1": positive.iloc[0]["feature"],
            "top_positive_value_1": round(float(positive.iloc[0]["shap_value"]), 6),
            "top_positive_feature_2": positive.iloc[1]["feature"],
            "top_positive_value_2": round(float(positive.iloc[1]["shap_value"]), 6),
            "top_negative_feature_1": negative.iloc[0]["feature"],
            "top_negative_value_1": round(float(negative.iloc[0]["shap_value"]), 6),
            "top_negative_feature_2": negative.iloc[1]["feature"],
            "top_negative_value_2": round(float(negative.iloc[1]["shap_value"]), 6)
        })

    explanations_df = pd.DataFrame(explanation_rows)

    csv_path = os.path.join(report_dir, "portfolio_local_explanations.csv")
    explanations_df.to_csv(csv_path, index=False)

    json_path = os.path.join(report_dir, "portfolio_local_explanations.json")
    explanations_df.to_json(json_path, orient="records", indent=4)

    markdown_path = os.path.join(report_dir, "local_explainability_examples.md")

    with open(markdown_path, "w") as f:
        f.write("# NexFolio – Local SHAP Explainability Examples\n\n")

        for row in explanation_rows:
            f.write(f"## {row['portfolio_sample']}\n\n")
            f.write(f"- **Predicted Risk:** {row['predicted_risk']}\n")
            f.write(f"- **Confidence:** {row['confidence']}\n\n")
            f.write("### Strongest Positive Drivers\n")
            f.write(f"- {row['top_positive_feature_1']} ({row['top_positive_value_1']})\n")
            f.write(f"- {row['top_positive_feature_2']} ({row['top_positive_value_2']})\n\n")
            f.write("### Strongest Negative Drivers\n")
            f.write(f"- {row['top_negative_feature_1']} ({row['top_negative_value_1']})\n")
            f.write(f"- {row['top_negative_feature_2']} ({row['top_negative_value_2']})\n\n---\n\n")

    print("\nArtifacts Saved")
    print(f"CSV Report      : {csv_path}")
    print(f"JSON Report     : {json_path}")
    print(f"Markdown Report : {markdown_path}")

    print("\nPhase 7.4.4 completed successfully.")


if __name__ == "__main__":
    main()