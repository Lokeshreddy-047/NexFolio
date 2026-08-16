from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NexFolio AI Service"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    frontend_url: str = "http://localhost:3000"
    frontend_urls: str = ""

    xgboost_model_path: str = "ml/models/xgboost_risk_model.pkl"
    shap_explainer_path: str = "ml/models/shap_explainer.pkl"
    metadata_path: str = "ml/datasets/portfolio/xgboost_ready/feature_metadata.json"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "nexfolio"

    firebase_project_id: str = "nexfolio-pid37"
    firebase_credentials_path: str = ""
    firebase_credentials_json: str = ""
    dev_auth_enabled: bool = True

    # Market Data Feed Layer
    market_data_mode: str = "reference"
    market_data_provider: str = "reference"
    upstox_client_id: str = ""
    upstox_client_secret: str = ""
    upstox_access_token: str = ""
    upstox_feed_url: str = "wss://api.upstox.com/v2/feed/market-data-feed"

    @property
    def allowed_origins(self) -> list[str]:
        raw_value = self.frontend_urls or self.frontend_url
        origins = [part.strip() for part in raw_value.split(",") if part.strip()]
        return origins or [self.frontend_url]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()