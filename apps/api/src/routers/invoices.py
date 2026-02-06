import uuid
import os
import logging
import aiofiles
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.invoice_processing import InvoiceProcessing
from src.models.user import User
from src.schemas.invoice import InvoiceResponse, InvoiceList, QRCodeRequest
from src.schemas.invoice_processing import (
    ProcessingResponse,
    ProcessingStatus,
    ProcessingConfirmRequest,
    InvoiceProcessingList
)
from src.parsers.qrcode_parser import (
    extract_access_key,
    fetch_invoice_from_sefaz
)
from src.parsers.xml_parser import parse_xml_invoice
from src.services.ai_analyzer import analyzer
from src.services.cnpj_enrichment import enrich_cnpj_data
from src.tasks.process_invoice_photos import process_invoice_photos
from src.utils.cnpj_validator import validate_cnpj, clean_cnpj, format_cnpj
from src.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


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


@router.get("/processing", response_model=List[InvoiceProcessingList])
async def list_pending_processing(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List pending and awaiting review invoice processing records for current user."""
    result = await db.execute(
        select(InvoiceProcessing)
        .where(InvoiceProcessing.user_id == current_user.id)
        .where(InvoiceProcessing.status != "completed")
        .order_by(InvoiceProcessing.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )

    processing_records = result.scalars().all()

    items = []
    for record in processing_records:
        # Extract issuer name and total value from extracted_data if available
        extracted_issuer_name = None
        extracted_total_value = None
        extracted_issue_date = None

        if record.extracted_data:
            extracted_issuer_name = record.extracted_data.get("issuer_name")
            total_value = record.extracted_data.get("total_value")
            # Convert Decimal to float for JSON serialization
            if total_value is not None:
                extracted_total_value = float(total_value)
            extracted_issue_date = record.extracted_data.get("issue_date")

        # Ensure errors is a list of strings
        errors = record.errors if isinstance(record.errors, list) else []

        items.append(
            InvoiceProcessingList(
                processing_id=record.id,
                status=record.status,
                image_count=record.image_count,
                confidence_score=record.confidence_score,
                extracted_issuer_name=extracted_issuer_name,
                extracted_total_value=extracted_total_value,
                extracted_issue_date=extracted_issue_date,
                errors=errors,
                created_at=record.created_at,
                updated_at=record.updated_at
            )
        )

    return items


@router.delete("/processing/{processing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_processing(
    processing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a pending invoice processing record."""
    result = await db.execute(
        select(InvoiceProcessing)
        .where(InvoiceProcessing.id == processing_id)
        .where(InvoiceProcessing.user_id == current_user.id)
    )
    processing = result.scalar_one_or_none()

    if not processing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processing record not found"
        )

    await db.delete(processing)
    await db.commit()

    return None


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


@router.post(
    "/upload/photos",
    response_model=ProcessingResponse,
    status_code=status.HTTP_202_ACCEPTED
)
async def upload_invoice_photos(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload photos of invoices for LLM processing."""
    print(f"DEBUG: upload_invoice_photos called with {len(files)} files")
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required"
        )

    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 files allowed"
        )

    # Validar tipos de arquivo
    allowed_types = {"image/jpeg", "image/png", "image/heic"}
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} not allowed"
            )

    # Save files and get paths
    image_paths = []
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    for file in files:
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        image_paths.append(filepath)

    # Criar registro de processamento
    processing = InvoiceProcessing(
        user_id=current_user.id,
        status="pending",
        image_ids=image_paths, # Saving file paths as image_ids
        image_count=len(files)
    )

    db.add(processing)
    await db.commit()
    await db.refresh(processing)

    # Trigger background task
    background_tasks.add_task(process_invoice_photos, str(processing.id))

    return ProcessingResponse(
        processing_id=processing.id,
        status="pending",
        message="Images uploaded for processing",
        estimated_seconds=30
    )


@router.get(
    "/processing/{processing_id}",
    response_model=ProcessingStatus
)
async def get_processing_status(
    processing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get status of photo processing."""
    result = await db.execute(
        select(InvoiceProcessing).where(
            InvoiceProcessing.id == processing_id,
            InvoiceProcessing.user_id == current_user.id
        )
    )
    processing = result.scalar_one_or_none()

    if not processing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processing not found"
        )

    return ProcessingStatus(
        processing_id=processing.id,
        status=processing.status,
        extracted_data=processing.extracted_data,
        errors=processing.errors,
        warnings=processing.warnings,
        confidence_score=processing.confidence_score,
        created_at=processing.created_at,
        updated_at=processing.updated_at,
        completed_at=processing.completed_at
    )


@router.post(
    "/processing/{processing_id}/confirm",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED
)
async def confirm_extracted_invoice(
    processing_id: uuid.UUID,
    request: ProcessingConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Confirm and save extracted invoice data."""
    try:
        logger.info(f"Confirming invoice for processing_id: {processing_id}")
        result = await db.execute(
            select(InvoiceProcessing).where(
                InvoiceProcessing.id == processing_id,
                InvoiceProcessing.user_id == current_user.id
            )
        )
        processing = result.scalar_one_or_none()

        if not processing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Processing not found"
            )

        if processing.status != "extracted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm processing in {processing.status} status"
            )

        if not processing.extracted_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No extracted data available"
            )

        # Usar dados editados do request (já validados pelo Pydantic)
        # Criar Invoice
        raw_data = request.model_dump(mode='json')
        # Ensure datetime is serialized to string for JSON storage
        if 'issue_date' in raw_data and raw_data['issue_date'] is not None:
            if isinstance(raw_data['issue_date'], datetime):
                raw_data['issue_date'] = raw_data['issue_date'].isoformat()

        # Clean access_key: remove spaces, hyphens, and keep only first 44 chars
        access_key = request.access_key or ""
        access_key = "".join(c for c in access_key if c.isalnum())[:44]

        # Clean CNPJ: remove dots, hyphens, slashes
        issuer_cnpj = request.issuer_cnpj or ""
        issuer_cnpj = clean_cnpj(issuer_cnpj)
        issuer_name = request.issuer_name or ""

        logger.info(f"Cleaned access_key: '{access_key}' (length: {len(access_key)})")
        logger.info(f"Cleaned CNPJ: '{issuer_cnpj}' (length: {len(issuer_cnpj)})")

        # CNPJ Validation (if enabled and CNPJ exists)
        if settings.cnpj_validation_enabled and issuer_cnpj:
            # Check CNPJ length
            if len(issuer_cnpj) != 14:
                logger.warning(f"Invalid CNPJ length: {issuer_cnpj} (length: {len(issuer_cnpj)})")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_cnpj",
                        "message": "CNPJ deve ter 14 dígitos",
                        "field": "issuer_cnpj",
                        "value": issuer_cnpj,
                        "expected_length": 14,
                        "actual_length": len(issuer_cnpj)
                    }
                )

            # Validate CNPJ checksum
            is_valid = validate_cnpj(issuer_cnpj)

            if not is_valid:
                logger.warning(f"Invalid CNPJ checksum: {issuer_cnpj}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_cnpj",
                        "message": "CNPJ inválido. Verifique os dígitos verificadores.",
                        "field": "issuer_cnpj",
                        "value": format_cnpj(issuer_cnpj),
                        "hint": "O CNPJ informado não passa na validação dos dígitos verificadores."
                    }
                )

            logger.info(f"✓ CNPJ validated successfully: {issuer_cnpj}")

            # CNPJ Enrichment (if enabled)
            if settings.cnpj_enrichment_enabled:
                try:
                    enriched = await enrich_cnpj_data(
                        issuer_cnpj,
                        timeout=settings.CNPJ_API_TIMEOUT
                    )

                    if enriched:
                        logger.info(f"✓ CNPJ enriched from {enriched.get('source')}: {issuer_cnpj}")

                        # Use razao_social (legal name) as default, fallback to nome_fantasia
                        enriched_name = enriched.get('razao_social') or enriched.get('nome_fantasia')

                        # Update issuer_name if:
                        # - It's empty OR
                        # - Enriched name is significantly longer (likely more complete)
                        if enriched_name and (not issuer_name or len(enriched_name) > len(issuer_name) + 5):
                            old_name = issuer_name
                            issuer_name = enriched_name
                            logger.info(f"✓ Updated issuer_name: '{old_name}' -> '{enriched_name}'")

                        # Save complete enriched data in raw_data for reference
                        raw_data['cnpj_enrichment'] = {
                            'source': enriched.get('source', 'unknown'),
                            'enriched_at': datetime.utcnow().isoformat(),
                            'data': enriched
                        }
                    else:
                        logger.warning(f"CNPJ enrichment returned no data for: {issuer_cnpj}")

                except Exception as e:
                    # Don't fail if enrichment fails - continue with original data
                    logger.warning(f"CNPJ enrichment failed for {issuer_cnpj}: {e}")
                    # Continue with original issuer_name

        # Check if invoice with this access_key already exists
        existing_invoice_result = await db.execute(
            select(Invoice).where(
                Invoice.access_key == access_key,
                Invoice.user_id == current_user.id
            )
        )
        existing_invoice = existing_invoice_result.scalar_one_or_none()

        if existing_invoice:
            logger.warning(f"Duplicate invoice detected: access_key={access_key}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Esta nota fiscal já foi cadastrada",
                    "existing_invoice_id": str(existing_invoice.id),
                    "existing_invoice_number": existing_invoice.number,
                    "existing_invoice_date": existing_invoice.issue_date.isoformat(),
                    "existing_invoice_total": float(existing_invoice.total_value),
                }
            )

        invoice = Invoice(
            user_id=current_user.id,
            access_key=access_key,
            number=request.number or "",
            series=request.series or "",
            issue_date=request.issue_date,
            issuer_cnpj=issuer_cnpj,
            issuer_name=issuer_name,  # Use potentially enriched name
            total_value=float(request.total_value) if request.total_value else 0,
            invoice_type="NFC-e",  # Default
            source="photo",
            raw_data=raw_data
        )

        db.add(invoice)
        await db.flush()

        # Criar items
        for item_data in request.items:
            item = InvoiceItem(
                invoice_id=invoice.id,
                code="",  # Não capturamos código ainda
                description=item_data.description or "",
                quantity=item_data.quantity,
                unit=item_data.unit or "UN",
                unit_price=item_data.unit_price,
                total_price=item_data.total_price
            )
            db.add(item)

        # Atualizar processing
        processing.status = "completed"
        processing.invoice_id = invoice.id
        processing.completed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(invoice)

        logger.info(f"✓ Invoice confirmed successfully: {invoice.id}")
        return invoice

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error confirming invoice: {e}", exc_info=True)
        await db.rollback()

        # Check if it's a duplicate key error
        error_str = str(e).lower()
        if 'unique constraint' in error_str or 'duplicate key' in error_str:
            if 'access_key' in error_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "Esta nota fiscal já foi cadastrada anteriormente",
                        "error": "duplicate_invoice",
                    }
                )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm invoice: {str(e)}"
        )


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


@router.get("/cnpj/{cnpj}/enrich")
async def enrich_cnpj(
    cnpj: str,
    current_user: User = Depends(get_current_user)
):
    """
    Enrich CNPJ data using public Brazilian APIs (BrasilAPI/ReceitaWS).
    
    This endpoint queries public APIs to get detailed information about a company
    based on its CNPJ number, including legal name, trade name, address, and status.
    """
    logger.info(f"Enriching CNPJ: {cnpj}")

    # Clean CNPJ
    cnpj_clean = clean_cnpj(cnpj)

    # Validate CNPJ length
    if len(cnpj_clean) != 14:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_cnpj",
                "message": "CNPJ deve ter 14 dígitos",
                "cnpj": cnpj,
                "length": len(cnpj_clean)
            }
        )

    # Validate CNPJ checksum (if validation is enabled)
    if settings.cnpj_validation_enabled:
        if not validate_cnpj(cnpj_clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_cnpj",
                    "message": "CNPJ inválido. Verifique os dígitos verificadores.",
                    "cnpj": format_cnpj(cnpj_clean)
                }
            )

    # Enrich CNPJ (if enrichment is enabled)
    if not settings.cnpj_enrichment_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "service_disabled",
                "message": "Serviço de enriquecimento de CNPJ está desabilitado"
            }
        )

    try:
        enriched_data = await enrich_cnpj_data(
            cnpj_clean,
            timeout=settings.CNPJ_API_TIMEOUT
        )

        if not enriched_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "cnpj_not_found",
                    "message": "CNPJ não encontrado nas bases de dados públicas",
                    "cnpj": format_cnpj(cnpj_clean),
                    "hint": "Verifique se o CNPJ está correto e ativo"
                }
            )

        logger.info(f"✓ CNPJ enriched successfully from {enriched_data.get('source')}: {cnpj_clean}")

        return {
            "success": True,
            "cnpj": format_cnpj(cnpj_clean),
            "data": enriched_data,
            "suggested_name": enriched_data.get('razao_social') or enriched_data.get('nome_fantasia')
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enriching CNPJ {cnpj_clean}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "enrichment_failed",
                "message": "Falha ao consultar dados do CNPJ. Tente novamente.",
                "hint": "As APIs públicas podem estar temporariamente indisponíveis"
            }
        )


@router.get("/stats/summary")
async def get_invoices_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get summary statistics for user's invoices.
    
    Returns:
    - total_invoices: Total number of invoices
    - total_spent: Sum of all invoice values
    - top_categories: Top 5 spending categories
    """
    logger.info(f"Getting invoice summary for user: {current_user.id}")

    # Get total invoices count
    result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.user_id == current_user.id
        )
    )
    total_invoices = result.scalar() or 0

    # Get total spent
    result = await db.execute(
        select(func.sum(Invoice.total_value)).where(
            Invoice.user_id == current_user.id
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
            Invoice.user_id == current_user.id
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
            {"category": cat[0] or "Sem categoria", "total": float(cat[1])}
            for cat in top_categories
        ]
    }
