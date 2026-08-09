from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "NexFolio AI Service"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    mongodb_uri: str
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()