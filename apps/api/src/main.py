import logging
import sys
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
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
    users,
)


# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Set specific loggers to DEBUG for detailed tracking
logging.getLogger("src.services.multi_provider_extractor").setLevel(logging.DEBUG)
logging.getLogger("src.tasks.process_invoice_photos").setLevel(logging.DEBUG)

app = FastAPI(
    title=settings.APP_NAME,
    description="API para análise de notas fiscais",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware for tracing
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


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


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/features")
async def feature_status():
    """Get status of feature flags."""
    return {
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
        }
    }


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "features": "/features",
    }
