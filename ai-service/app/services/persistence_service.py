from datetime import datetime
from app.services.prediction_service import predict_portfolio_risk
from app.services.explainability_service import explain_portfolio_risk
from app.repositories.prediction_repository import save_prediction


async def persist_prediction(user_id: str, portfolio_id: str, portfolio_data: dict):
    prediction = predict_portfolio_risk(portfolio_data)
    explanation = explain_portfolio_risk(portfolio_data)

    document = {
        "user_id": user_id,
        "portfolio_id": portfolio_id,
        "input_features": portfolio_data,
        "risk_category": prediction["risk_category"],
        "confidence": prediction["confidence"],
        "probabilities": prediction["probabilities"],
        "explanation": explanation,
        "created_at": datetime.utcnow()
    }

    prediction_id = await save_prediction(document)

    return {
        "prediction_id": prediction_id,
        "risk_category": prediction["risk_category"],
        "confidence": prediction["confidence"]
    }