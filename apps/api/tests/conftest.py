import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool

from src.main import app
from src.database import Base, get_db
from src.config import settings

# Test database URL
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    "/smarket", "/smarket_test"
)

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True,
    poolclass=NullPool,
)


async def override_get_db():
    """Override get_db dependency for testing."""
    async with AsyncSession(test_engine) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Override dependency
app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "no_db: mark test as not requiring database setup"
    )


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database(request):
    """Create and drop test database tables."""
    # Skip database setup for tests marked with no_db
    if "no_db" in request.keywords:
        yield
        return

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Create a fresh database session for each test."""
    async with AsyncSession(test_engine) as session:
        yield session
        # Clean up after test
        await session.rollback()


@pytest_asyncio.fixture
async def client():
    """Create a test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_xml_invoice():
    """Sample XML invoice content for testing."""
    return b"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <NFe>
        <infNFe Id="NFe35191212345678000190550010000001231234567890" versao="4.00">
            <ide>
                <cUF>35</cUF>
                <cNF>12345678</cNF>
                <natOp>Venda</natOp>
                <mod>65</mod>
                <serie>1</serie>
                <nNF>123</nNF>
                <dhEmi>2023-12-01T10:00:00-03:00</dhEmi>
            </ide>
            <emit>
                <CNPJ>12345678000190</CNPJ>
                <xNome>EMPRESA EXEMPLO LTDA</xNome>
            </emit>
            <total>
                <ICMSTot>
                    <vNF>150.00</vNF>
                </ICMSTot>
            </total>
            <det nItem="1">
                <prod>
                    <cProd>001</cProd>
                    <xProd>ARROZ TIPO 1 5KG</xProd>
                    <qCom>1.0000</qCom>
                    <uCom>UN</uCom>
                    <vUnCom>25.00</vUnCom>
                    <vProd>25.00</vProd>
                </prod>
            </det>
        </infNFe>
    </NFe>
</nfeProc>
"""
