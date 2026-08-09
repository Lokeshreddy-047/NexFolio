import joblib
import pandas as pd
from pathlib import Path

from app.services.model_loader import get_model, get_feature_metadata
from app.services.prediction_service import predict_portfolio_risk


BASE_DIR = Path(__file__).resolve().parents[2]

EXPLAINER_PATH = BASE_DIR / "ml" / "models" / "shap_explainer.pkl"

_explainer = None


def get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = joblib.load(EXPLAINER_PATH)
    return _explainer


def explain_portfolio_risk(portfolio_data: dict) -> dict:
    model = get_model()
    metadata = get_feature_metadata()
    explainer = get_explainer()

    feature_order = metadata["feature_names"]

    row = {}
    for feature in feature_order:
        row[feature] = portfolio_data.get(feature, 0.0)

    df = pd.DataFrame([row], columns=feature_order)

    prediction_result = predict_portfolio_risk(portfolio_data)

    prediction = int(model.predict(df)[0])

    shap_values = explainer.shap_values(df)

    if isinstance(shap_values, list):
        values = shap_values[prediction][0]
    else:
        if len(shap_values.shape) == 3:
            values = shap_values[0, :, prediction]
        else:        
            values = shap_values[0]

    values = pd.Series(values, index=feature_order)

    feature_impacts = pd.DataFrame({
        "feature": values.index,
        "impact": values.values
        })

    positive = (
        feature_impacts[feature_impacts["impact"] > 0]
        .sort_values("impact", ascending=False)
        .head(5)
    )

    negative = (
        feature_impacts[feature_impacts["impact"] < 0]
        .sort_values("impact")
        .head(5)
    )

    return {
        "risk_category": prediction_result["risk_category"],
        "confidence": prediction_result["confidence"],
        "top_positive_contributors": [
            {
                "feature": row["feature"],
                "impact": round(float(row["impact"]), 4)
            }
            for _, row in positive.iterrows()
        ],
        "top_negative_contributors": [
            {
                "feature": row["feature"],
                "impact": round(float(row["impact"]), 4)
            }
            for _, row in negative.iterrows()
        ]
    }