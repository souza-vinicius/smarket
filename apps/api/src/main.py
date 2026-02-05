from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routers import (
    auth,
    invoices,
    merchants,
    categories,
    products,
    invoice_items,
    analysis,
    purchase_patterns,
    users
)

app = FastAPI(
    title=settings.APP_NAME,
    description="API para análise de notas fiscais",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["invoices"])
app.include_router(merchants.router, prefix="/api/v1/merchants", tags=["merchants"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(
    invoice_items.router,
    prefix="/api/v1/invoice-items",
    tags=["invoice-items"]
)
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(purchase_patterns.router, prefix="/api/v1/purchase-patterns", tags=["purchase-patterns"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs"
    }
