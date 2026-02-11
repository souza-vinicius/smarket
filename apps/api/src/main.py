import logging
import sys
import traceback
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.exceptions import SMarketException, handle_exception
from src.routers import (
    analysis,
    auth,
    categories,
    debug,
    invoice_items,
    invoices,
    merchants,
    products,
    purchase_patterns,
    subscriptions,
    users,
)


# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)

# Set specific loggers to DEBUG for detailed tracking
logging.getLogger("src.services.multi_provider_extractor").setLevel(
    logging.DEBUG
)
logging.getLogger("src.tasks.process_invoice_photos").setLevel(logging.DEBUG)

# Log CORS origins at startup so we can verify on the server
logger.info("CORS allowed origins: %s", settings.allowed_origins_list)

app = FastAPI(
    title=settings.APP_NAME,
    description="API para análise de notas fiscais",
    version="1.0.0",
)


def _cors_headers(request: Request) -> dict[str, str]:
    """Build CORS headers for a given request origin (fallback for errors)."""
    origin = request.headers.get("origin", "")
    if origin in settings.allowed_origins_list:
        return {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            "access-control-allow-methods": "*",
            "access-control-allow-headers": "*",
            "access-control-expose-headers": "X-Request-ID, X-Subscription-Error, X-Limit-Type, X-Current-Plan",
        }
    return {}


# Request ID middleware for tracing — runs BEFORE CORSMiddleware,
# so we must add CORS headers ourselves when catching errors here.
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except Exception:
        logger.error(
            "Unhandled error in middleware: %s", traceback.format_exc()
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
            headers=_cors_headers(request),
        )
    response.headers["X-Request-ID"] = request_id
    return response


# CORS — added after @app.middleware so it wraps the request-id middleware.
# In Starlette's stack the first add_middleware call is the outermost layer.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
        "X-Subscription-Error",
        "X-Limit-Type",
        "X-Current-Plan",
    ],
)


# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["invoices"])
app.include_router(merchants.router, prefix="/api/v1/merchants", tags=["merchants"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(
    invoice_items.router, prefix="/api/v1/invoice-items", tags=["invoice-items"]
)
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(
    purchase_patterns.router,
    prefix="/api/v1/purchase-patterns",
    tags=["purchase-patterns"],
)
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(debug.router, prefix="/api/v1/debug", tags=["debug"])
app.include_router(
    subscriptions.router, prefix="/api/v1", tags=["subscriptions"]
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/features")
async def feature_status():
    """Get status of feature flags."""
    return {
        "subscription_system": {
            "enabled": settings.subscription_enabled,
            "trial_duration_days": settings.TRIAL_DURATION_DAYS,
            "description": "Subscription limits for invoices and AI analyses",
        },
        "cnpj_features": {
            "master_enabled": settings.ENABLE_CNPJ_FEATURES,
            "validation": {
                "flag": settings.ENABLE_CNPJ_VALIDATION,
                "enabled": settings.cnpj_validation_enabled,
                "description": "Validates CNPJ checksum before saving invoices",
            },
            "enrichment": {
                "flag": settings.ENABLE_CNPJ_ENRICHMENT,
                "enabled": settings.cnpj_enrichment_enabled,
                "description": "Enriches merchant data from BrasilAPI/ReceitaWS",
                "timeout": settings.CNPJ_API_TIMEOUT,
                "cache_ttl": settings.CNPJ_CACHE_TTL,
            },
        },
    }


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "features": "/features",
    }


@app.exception_handler(SMarketException)
async def smarket_exception_handler(request: Request, exc: SMarketException):
    """Handle SMarket custom exceptions."""
    http_exc = handle_exception(exc)
    return JSONResponse(
        status_code=http_exc.status_code,
        content={"detail": http_exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler so CORS headers are always present on errors."""
    logger.error("Unhandled exception: %s", traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
