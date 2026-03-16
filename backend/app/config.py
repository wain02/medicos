from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medicos API"
    secret_key: str = "change-me-in-prod"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    admin_username: str = "doctor"
    admin_password: str = "doctor123"
    admin_full_name: str = "Dr. Demo"

    database_url: str = "sqlite:///./medicos.db"
    timezone: str = "America/Argentina/Buenos_Aires"
    slot_minutes: int = 30

    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
