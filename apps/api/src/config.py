from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SMarket API"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/smarket"
    DB_ECHO: bool = False

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Sefaz
    SEFAZ_API_URL: str = "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # CNPJ Features - Master flag to disable all CNPJ features at once
    ENABLE_CNPJ_FEATURES: bool = True
    ENABLE_CNPJ_VALIDATION: bool = True
    ENABLE_CNPJ_ENRICHMENT: bool = True
    CNPJ_API_TIMEOUT: int = 5  # seconds
    CNPJ_CACHE_TTL: int = 86400  # 24 hours in seconds

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def cnpj_validation_enabled(self) -> bool:
        """Check if CNPJ validation is enabled (respects master flag)."""
        return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_VALIDATION

    @property
    def cnpj_enrichment_enabled(self) -> bool:
        """Check if CNPJ enrichment is enabled (respects master flag)."""
        return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_ENRICHMENT
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
