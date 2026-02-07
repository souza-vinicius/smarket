import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.invoice_processing import InvoiceProcessing


@pytest.mark.asyncio
async def test_upload_invoice_photos(
    client: AsyncClient,
    auth_headers: dict
):
    """Test uploading invoice photos."""
    # Criar arquivo de teste
    files = [
        ("files", ("invoice1.jpg", b"fake image data", "image/jpeg")),
        ("files", ("invoice2.jpg", b"fake image data", "image/jpeg"))
    ]

    response = await client.post(
        "/api/v1/invoices/upload/photos",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 202
    data = response.json()
    assert "processing_id" in data
    assert data["status"] == "pending"
    assert data["message"] == "Images uploaded for processing"


@pytest.mark.asyncio
async def test_upload_invoice_photos_no_files(
    client: AsyncClient,
    auth_headers: dict
):
    """Test uploading with no files."""
    response = await client.post(
        "/api/v1/invoices/upload/photos",
        files=[],
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "At least one file is required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_invoice_photos_too_many_files(
    client: AsyncClient,
    auth_headers: dict
):
    """Test uploading more than 10 files."""
    files = [
        ("files", (f"invoice{i}.jpg", b"fake", "image/jpeg"))
        for i in range(11)
    ]

    response = await client.post(
        "/api/v1/invoices/upload/photos",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "Maximum 10 files allowed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_invoice_photos_invalid_type(
    client: AsyncClient,
    auth_headers: dict
):
    """Test uploading invalid file type."""
    files = [
        ("files", ("invoice.txt", b"text data", "text/plain"))
    ]

    response = await client.post(
        "/api/v1/invoices/upload/photos",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_processing_status(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    current_user_id: uuid.UUID
):
    """Test getting processing status."""
    # Criar registro de processamento
    processing = InvoiceProcessing(
        user_id=current_user_id,
        status="extracted",
        image_ids=["img1", "img2"],
        image_count=2,
        extracted_data={
            "access_key": "12345678901234567890123456789012345678901234",
            "number": "123456",
            "series": "1",
            "issue_date": "2024-01-15T10:30:00",
            "issuer_name": "LOJA EXEMPLO",
            "issuer_cnpj": "12345678901234",
            "total_value": 150.00,
            "items": [],
            "confidence": 0.95
        },
        confidence_score=0.95
    )
    db.add(processing)
    await db.commit()
    await db.refresh(processing)

    response = await client.get(
        f"/api/v1/invoices/processing/{processing.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["processing_id"] == str(processing.id)
    assert data["status"] == "extracted"
    assert data["confidence_score"] == 0.95


@pytest.mark.asyncio
async def test_get_processing_status_not_found(
    client: AsyncClient,
    auth_headers: dict
):
    """Test getting non-existent processing."""
    fake_id = uuid.uuid4()

    response = await client.get(
        f"/api/v1/invoices/processing/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "Processing not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_confirm_extracted_invoice(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    current_user_id: uuid.UUID
):
    """Test confirming extracted invoice."""
    # Criar registro de processamento
    processing = InvoiceProcessing(
        user_id=current_user_id,
        status="extracted",
        image_ids=["img1"],
        image_count=1,
        extracted_data={
            "access_key": "12345678901234567890123456789012345678901234",
            "number": "123456",
            "series": "1",
            "issue_date": "2024-01-15T10:30:00",
            "issuer_name": "LOJA EXEMPLO",
            "issuer_cnpj": "12345678901234",
            "total_value": 150.00,
            "items": [
                {
                    "description": "ARROZ 5KG",
                    "quantity": 1,
                    "unit": "UN",
                    "unit_price": 25.00,
                    "total_price": 25.00
                }
            ],
            "confidence": 0.95
        },
        confidence_score=0.95
    )
    db.add(processing)
    await db.commit()
    await db.refresh(processing)

    response = await client.post(
        f"/api/v1/invoices/processing/{processing.id}/confirm",
        json={"corrections": None},
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["access_key"] == "12345678901234567890123456789012345678901234"
    assert data["issuer_name"] == "LOJA EXEMPLO"
    assert data["total_value"] == 150.00


@pytest.mark.asyncio
async def test_confirm_extracted_invoice_with_corrections(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    current_user_id: uuid.UUID
):
    """Test confirming with corrections."""
    processing = InvoiceProcessing(
        user_id=current_user_id,
        status="extracted",
        image_ids=["img1"],
        image_count=1,
        extracted_data={
            "access_key": "12345678901234567890123456789012345678901234",
            "number": "123456",
            "series": "1",
            "issue_date": "2024-01-15T10:30:00",
            "issuer_name": "LOJA EXEMPLO",
            "issuer_cnpj": "12345678901234",
            "total_value": 150.00,
            "items": [],
            "confidence": 0.95
        },
        confidence_score=0.95
    )
    db.add(processing)
    await db.commit()
    await db.refresh(processing)

    response = await client.post(
        f"/api/v1/invoices/processing/{processing.id}/confirm",
        json={
            "corrections": {
                "issuer_name": "LOJA CORRIGIDA",
                "total_value": 160.00
            }
        },
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["issuer_name"] == "LOJA CORRIGIDA"
    assert data["total_value"] == 160.00


@pytest.mark.asyncio
async def test_confirm_processing_wrong_status(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
    current_user_id: uuid.UUID
):
    """Test confirming processing in wrong status."""
    processing = InvoiceProcessing(
        user_id=current_user_id,
        status="pending",
        image_ids=["img1"],
        image_count=1
    )
    db.add(processing)
    await db.commit()
    await db.refresh(processing)

    response = await client.post(
        f"/api/v1/invoices/processing/{processing.id}/confirm",
        json={"corrections": None},
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "Cannot confirm processing" in response.json()["detail"]
