from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "HomePulse"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "homepulse"
    POSTGRES_PASSWORD: str = "homepulse_secret"
    POSTGRES_DB: str = "homepulse"
    DATABASE_URL: Optional[str] = None
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Security
    SECRET_KEY: str = "change-this-to-a-very-long-random-secret-key-in-production-please-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # 2FA
    TOTP_ISSUER: str = "HomePulse"
    
    # Agent
    AGENT_TOKEN_EXPIRE_DAYS: int = 365
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"


settings = Settings()
