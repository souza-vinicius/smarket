from typing import ClassVar

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Mercado Esperto API"
    DEBUG: bool = False

    # Database
    DATABASE_URL: (
        str
    ) = "postgresql+asyncpg://mercadoesperto:mercadoesperto_password@postgres:5432/mercadoesperto"
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

    # OpenRouter (unified multi-model API)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-2.0-flash-001"
    OPENROUTER_MODEL_LITE: str = "google/gemini-2.0-flash-lite-preview-02-05"
    OPENROUTER_MODEL_FULL: str = "google/gemini-2.0-flash-thinking-exp-01-21"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Database Connection Pool (Production optimization)
    DB_POOL_SIZE: int = 10  # Connections per worker (2 workers × 10 = 20 base)
    DB_MAX_OVERFLOW: int = 5  # Extra connections under load (total max: 25)
    DB_POOL_RECYCLE: int = 1800  # Recycle connections after 30 minutes
    DB_POOL_TIMEOUT: int = 30  # Timeout for getting connection from pool (seconds)

    # Sefaz
    SEFAZ_API_URL: str = "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,capacitor://localhost,https://localhost"

    # Uploads
    UPLOAD_DIR: str = "uploads"

    # Image optimization for LLM vision processing
    IMAGE_OPTIMIZATION_ENABLED: bool = True
    IMAGE_MAX_DIMENSION: int = 1536  # Max dimension for longest side
    IMAGE_JPEG_QUALITY: int = 90  # JPEG quality (1-100)

    # LLM Cache (Production optimization)
    LLM_CACHE_TTL: int = 86400  # Cache TTL in seconds (24 hours)

    # Rate Limiting (Production optimization)
    RATE_LIMIT_ENABLED: bool = True  # Master toggle for rate limiting

    # LLM Resilience (Production optimization)
    LLM_TIMEOUT_SECONDS: int = 60  # Timeout for LLM API calls (seconds)

    # AI Analysis - Master flag + individual flags per analysis type
    ENABLE_AI_ANALYSIS: bool = True
    ENABLE_ANALYSIS_PRICE_ALERT: bool = True
    ENABLE_ANALYSIS_CATEGORY_INSIGHT: bool = True
    ENABLE_ANALYSIS_MERCHANT_PATTERN: bool = True
    ENABLE_ANALYSIS_SUMMARY: bool = True
    ENABLE_ANALYSIS_BUDGET_HEALTH: bool = True
    ENABLE_ANALYSIS_PER_CAPITA_SPENDING: bool = True
    ENABLE_ANALYSIS_ESSENTIAL_RATIO: bool = True
    ENABLE_ANALYSIS_INCOME_COMMITMENT: bool = True
    ENABLE_ANALYSIS_CHILDREN_SPENDING: bool = True
    ENABLE_ANALYSIS_WHOLESALE_OPPORTUNITY: bool = True
    ENABLE_ANALYSIS_SHOPPING_FREQUENCY: bool = True
    ENABLE_ANALYSIS_SEASONAL_ALERT: bool = True
    ENABLE_ANALYSIS_SAVINGS_POTENTIAL: bool = True
    ENABLE_ANALYSIS_FAMILY_NUTRITION: bool = True

    # CNPJ Features - Master flag to disable all CNPJ features at once
    ENABLE_CNPJ_FEATURES: bool = True
    ENABLE_CNPJ_VALIDATION: bool = True
    ENABLE_CNPJ_ENRICHMENT: bool = True
    CNPJ_API_TIMEOUT: int = 5  # seconds
    CNPJ_CACHE_TTL: int = 86400  # 24 hours in seconds

    # Subscription System - Master flag to enable subscription limits gradually
    ENABLE_SUBSCRIPTION_SYSTEM: bool = False
    TRIAL_DURATION_DAYS: int = 30

    # Admin System - Bootstrap first admin user
    ADMIN_BOOTSTRAP_EMAIL: str = ""  # Email of user to make admin on startup
    ADMIN_BOOTSTRAP_ROLE: str = "super_admin"  # Role to assign (super_admin, admin, support, finance, read_only)

    # Stripe Payment Integration
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_BASIC_MONTHLY_PRICE_ID: str = ""
    STRIPE_BASIC_YEARLY_PRICE_ID: str = ""
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: str = ""
    STRIPE_PREMIUM_YEARLY_PRICE_ID: str = ""

    # Apple IAP (for future Fase 3)
    APPLE_SHARED_SECRET: str = ""
    APPLE_BUNDLE_ID: str = "com.mercadoesperto.app"

    # Google Play (for future Fase 3)
    GOOGLE_PLAY_PACKAGE_NAME: str = "com.mercadoesperto.app"
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: str = ""  # path to JSON key

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    _ANALYSIS_FLAG_MAP: ClassVar[dict[str, str]] = {
        "price_alert": "ENABLE_ANALYSIS_PRICE_ALERT",
        "category_insight": "ENABLE_ANALYSIS_CATEGORY_INSIGHT",
        "merchant_pattern": "ENABLE_ANALYSIS_MERCHANT_PATTERN",
        "summary": "ENABLE_ANALYSIS_SUMMARY",
        "budget_health": "ENABLE_ANALYSIS_BUDGET_HEALTH",
        "per_capita_spending": "ENABLE_ANALYSIS_PER_CAPITA_SPENDING",
        "essential_ratio": "ENABLE_ANALYSIS_ESSENTIAL_RATIO",
        "income_commitment": "ENABLE_ANALYSIS_INCOME_COMMITMENT",
        "children_spending": "ENABLE_ANALYSIS_CHILDREN_SPENDING",
        "wholesale_opportunity": "ENABLE_ANALYSIS_WHOLESALE_OPPORTUNITY",
        "shopping_frequency": "ENABLE_ANALYSIS_SHOPPING_FREQUENCY",
        "seasonal_alert": "ENABLE_ANALYSIS_SEASONAL_ALERT",
        "savings_potential": "ENABLE_ANALYSIS_SAVINGS_POTENTIAL",
        "family_nutrition": "ENABLE_ANALYSIS_FAMILY_NUTRITION",
    }

    def is_analysis_enabled(self, analysis_type: str) -> bool:
        """Check if a specific analysis type is enabled (respects master flag)."""
        if not self.ENABLE_AI_ANALYSIS:
            return False
        flag_attr = self._ANALYSIS_FLAG_MAP.get(analysis_type)
        if flag_attr is None:
            return True  # Unknown types default to enabled
        return getattr(self, flag_attr, True)

    @property
    def cnpj_validation_enabled(self) -> bool:
        """Check if CNPJ validation is enabled (respects master flag)."""
        return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_VALIDATION

    @property
    def cnpj_enrichment_enabled(self) -> bool:
        """Check if CNPJ enrichment is enabled (respects master flag)."""
        return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_ENRICHMENT

    @property
    def subscription_enabled(self) -> bool:
        """Check if subscription system is enabled."""
        return self.ENABLE_SUBSCRIPTION_SYSTEM

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
