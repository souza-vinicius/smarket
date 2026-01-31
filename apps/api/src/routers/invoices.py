import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.user import User
from src.schemas.invoice import InvoiceResponse, InvoiceList, QRCodeRequest
from src.parsers.qrcode_parser import (
    extract_access_key,
    fetch_invoice_from_sefaz
)
from src.parsers.xml_parser import parse_xml_invoice
from src.services.ai_analyzer import analyzer

router = APIRouter()


@router.get("/", response_model=List[InvoiceList])
async def list_invoices(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all invoices for current user."""
    result = await db.execute(
        select(
            Invoice.id,
            Invoice.access_key,
            Invoice.issuer_name,
            Invoice.total_value,
            Invoice.issue_date,
            Invoice.created_at,
            func.count(InvoiceItem.id).label("product_count")
        )
        .outerjoin(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
        .where(Invoice.user_id == current_user.id)
        .group_by(Invoice.id)
        .order_by(Invoice.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    invoices = result.all()
    return [
        InvoiceList(
            id=inv.id,
            access_key=inv.access_key,
            issuer_name=inv.issuer_name,
            total_value=inv.total_value,
            issue_date=inv.issue_date,
            product_count=inv.product_count,
            created_at=inv.created_at
        )
        for inv in invoices
    ]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific invoice by ID."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.user_id == current_user.id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    return invoice


@router.post(
    "/qrcode",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED
)
async def process_qrcode(
    request: QRCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Process invoice from QR Code URL."""
    # Extract access key from QR Code URL
    access_key = extract_access_key(request.qrcode_url)

    if not access_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR Code URL"
        )

    # Check if invoice already exists
    result = await db.execute(
        select(Invoice).where(
            Invoice.access_key == access_key,
            Invoice.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invoice already registered"
        )

    # Fetch invoice data from Sefaz
    try:
        invoice_data = await fetch_invoice_from_sefaz(access_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch invoice from Sefaz: {str(e)}"
        )

    # Create invoice
    invoice = Invoice(
        user_id=current_user.id,
        access_key=access_key,
        number=invoice_data["number"],
        series=invoice_data["series"],
        issue_date=invoice_data["issue_date"],
        issuer_cnpj=invoice_data["issuer_cnpj"],
        issuer_name=invoice_data["issuer_name"],
        total_value=invoice_data["total_value"],
        type=invoice_data["type"],
        source="qrcode",
        raw_data=invoice_data.get("raw_data")
    )

    db.add(invoice)
    await db.flush()  # Get invoice.id

    # Create invoice items
    for item_data in invoice_data["products"]:
        item = InvoiceItem(
            invoice_id=invoice.id,
            code=item_data["code"],
            description=item_data["description"],
            quantity=item_data["quantity"],
            unit=item_data["unit"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(item)

    await db.commit()
    await db.refresh(invoice)

    # Generate AI analyses (background task)
    try:
        user_history = await _get_user_history(current_user.id, db)
        analyses = await analyzer.analyze_invoice(
            invoice, user_history, db
        )
        for analysis in analyses:
            db.add(analysis)
        await db.commit()
    except Exception as e:
        # Log error but don't fail the invoice creation
        print(f"Error generating AI analyses: {e}")

    return invoice


@router.post(
    "/upload/xml",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_xml(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and process XML invoice file."""
    if not file.filename.endswith(".xml"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an XML file"
        )

    content = await file.read()

    try:
        invoice_data = parse_xml_invoice(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse XML: {str(e)}"
        )

    # Check if invoice already exists
    result = await db.execute(
        select(Invoice).where(
            Invoice.access_key == invoice_data["access_key"],
            Invoice.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invoice already registered"
        )

    # Create invoice
    invoice = Invoice(
        user_id=current_user.id,
        access_key=invoice_data["access_key"],
        number=invoice_data["number"],
        series=invoice_data["series"],
        issue_date=invoice_data["issue_date"],
        issuer_cnpj=invoice_data["issuer_cnpj"],
        issuer_name=invoice_data["issuer_name"],
        total_value=invoice_data["total_value"],
        type=invoice_data["type"],
        source="xml",
        raw_data=invoice_data.get("raw_data")
    )

    db.add(invoice)
    await db.flush()

    # Create invoice items
    for item_data in invoice_data["products"]:
        item = InvoiceItem(
            invoice_id=invoice.id,
            code=item_data["code"],
            description=item_data["description"],
            quantity=item_data["quantity"],
            unit=item_data["unit"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(item)

    await db.commit()
    await db.refresh(invoice)

    # Generate AI analyses (background task)
    try:
        user_history = await _get_user_history(current_user.id, db)
        analyses = await analyzer.analyze_invoice(
            invoice, user_history, db
        )
        for analysis in analyses:
            db.add(analysis)
        await db.commit()
    except Exception as e:
        # Log error but don't fail the invoice creation
        print(f"Error generating AI analyses: {e}")

    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an invoice."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.user_id == current_user.id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    await db.delete(invoice)
    await db.commit()

    return None


async def _get_user_history(
    user_id: uuid.UUID,
    db: AsyncSession
) -> dict:
    """
    Get user's purchase history for AI analysis.
    """
    # Get total invoices count
    result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.user_id == user_id
        )
    )
    total_invoices = result.scalar() or 0

    # Get total spent
    result = await db.execute(
        select(func.sum(Invoice.total_value)).where(
            Invoice.user_id == user_id
        )
    )
    total_spent = result.scalar() or 0

    # Get top categories
    result = await db.execute(
        select(
            InvoiceItem.category,
            func.sum(InvoiceItem.total_price).label('total')
        ).join(
            Invoice, Invoice.id == InvoiceItem.invoice_id
        ).where(
            Invoice.user_id == user_id
        ).group_by(
            InvoiceItem.category
        ).order_by(
            func.sum(InvoiceItem.total_price).desc()
        ).limit(5)
    )
    top_categories = result.all()

    return {
        "total_invoices": total_invoices,
        "total_spent": float(total_spent),
        "top_categories": [
            {"category": cat[0], "total": float(cat[1])}
            for cat in top_categories
        ]
    }
