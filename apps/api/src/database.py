from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from src.config import settings


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    future=True,
    poolclass=NullPool if settings.DEBUG else None,
    # Production pool settings (ignored when NullPool is used in DEBUG mode)
    pool_size=settings.DB_POOL_SIZE,  # Base connection pool size
    max_overflow=settings.DB_MAX_OVERFLOW,  # Extra connections under load
    pool_pre_ping=True,  # Verify connections before using (detect stale connections)
    pool_recycle=settings.DB_POOL_RECYCLE,  # Recycle connections after N seconds
    pool_timeout=settings.DB_POOL_TIMEOUT,  # Timeout when getting connection from pool
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
