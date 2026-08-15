import pandas as pd
from app.services.model_loader import get_model, get_feature_metadata


RISK_MAPPING = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH"
}


def extract_feature_order(metadata: dict):
    if "feature_names" in metadata:
        return metadata["feature_names"]

    if "feature_columns" in metadata:
        return metadata["feature_columns"]

    if "features" in metadata:
        return metadata["features"]

    if "columns" in metadata:
        return metadata["columns"]

    raise ValueError( f"Unknown metadata structure. Available keys: {list(metadata.keys())}")


def predict_portfolio_risk(portfolio_data: dict) -> dict:
    model = get_model()
    metadata = get_feature_metadata()

    feature_order = extract_feature_order(metadata)

    row = {}
    for feature in feature_order:
        row[feature] = portfolio_data.get(feature, 0.0)

    df = pd.DataFrame([row], columns=feature_order)

    prediction = int(model.predict(df)[0])
    probabilities = model.predict_proba(df)[0]

    return {
        "risk_category": RISK_MAPPING[prediction],
        "confidence": round(float(probabilities[prediction]), 4),
        "probabilities": {
            "LOW": round(float(probabilities[0]), 4),
            "MEDIUM": round(float(probabilities[1]), 4),
            "HIGH": round(float(probabilities[2]), 4)
        }
    }