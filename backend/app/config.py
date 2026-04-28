from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str
    OPENAI_API_KEY: str = ""
    JWT_SECRET: str
    FERNET_KEY: str
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin"
    DATA_DIR: str = "/app/data"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14


settings = Settings()
