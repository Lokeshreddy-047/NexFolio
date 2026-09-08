from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NexFolio AI Service"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    frontend_url: str = "http://localhost:3000"
    frontend_urls: str = ""
    allowed_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,https://nexfolio.vercel.app,https://nexfolio-eta.vercel.app",
        alias="allowed_origins"
    )

    xgboost_model_path: str = "ml/models/xgboost_risk_model.pkl"
    shap_explainer_path: str = "ml/models/shap_explainer.pkl"
    metadata_path: str = "ml/datasets/portfolio/xgboost_ready/feature_metadata.json"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "nexfolio"

    firebase_project_id: str = "nexfolio-pid37"
    firebase_credentials_path: str = ""
    firebase_credentials_json: str = ""
    environment: str = "production"
    dev_auth_enabled: bool = False

    # Market Data Feed Layer
    market_data_mode: str = "live"
    market_data_provider: str = "yahoo"
    upstox_client_id: str = ""
    upstox_client_secret: str = ""
    upstox_access_token: str = ""
    upstox_feed_url: str = "wss://api.upstox.com/v2/feed/market-data-feed"

    @property
    def allowed_origins(self) -> list[str]:
        raw_candidates = [
            self.allowed_origins_raw,
            self.frontend_urls,
            self.frontend_url,
        ]
        origins: list[str] = []
        for raw in raw_candidates:
            if raw:
                for part in raw.split(","):
                    cleaned = part.strip().rstrip("/")
                    if cleaned and cleaned not in origins:
                        origins.append(cleaned)
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://nexfolio.vercel.app",
            "https://nexfolio-eta.vercel.app",
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()