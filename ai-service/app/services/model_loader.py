from pathlib import Path
import joblib
import json


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ml" / "models" / "xgboost_risk_model.pkl"
METADATA_PATH = BASE_DIR / "ml" / "datasets" / "portfolio" / "xgboost_ready" / "feature_metadata.json"


_model = None
_feature_metadata = None


def get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def get_feature_metadata():
    global _feature_metadata
    if _feature_metadata is None:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _feature_metadata = json.load(f)
    return _feature_metadata