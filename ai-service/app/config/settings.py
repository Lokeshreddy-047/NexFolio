from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NexFolio AI Service"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    frontend_url: str = "http://localhost:3000"

    model_path: str = "ml/models/xgboost_risk_model.pkl"
    shap_explainer_path: str = "ml/models/shap_explainer.pkl"
    metadata_path: str = "ml/datasets/portfolio/xgboost_ready/feature_metadata.json"

    mongodb_uri: str
    mongodb_database: str = "nexfolio"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()