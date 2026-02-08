import logging
import os
import re
import mimetypes
import aiofiles
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import select, and_

from src.database import AsyncSessionLocal
from src.models.invoice import Invoice
from src.models.invoice_processing import InvoiceProcessing
from src.services.multi_provider_extractor import extractor
from src.services.name_normalizer import normalize_items
from src.services.categorizer import categorize_items

if TYPE_CHECKING:
    from src.schemas.invoice_processing import ExtractedInvoiceData

logger = logging.getLogger(__name__)


async def process_invoice_photos(processing_id: str) -> None:
    """Processa fotos de notas fiscais em background.

    Args:
        processing_id: ID do registro InvoiceProcessing
    """
    # Log imediato para confirmar que a task foi iniciada
    logger.info(f"=" * 80)
    logger.info(f"🎬 BACKGROUND TASK STARTED | Processing ID: {processing_id}")
    logger.info(f"=" * 80)

    async with AsyncSessionLocal() as db:
        # Buscar registro de processamento
        result = await db.execute(
            select(InvoiceProcessing).where(
                InvoiceProcessing.id == processing_id
            )
        )
        processing = result.scalar_one_or_none()

        if not processing:
            logger.error(f"Processing {processing_id} not found")
            return

        try:
            # Atualizar status para processing
            processing.status = "processing"
            await db.commit()

            logger.info(
                f"🚀 STARTING INVOICE PROCESSING | "
                f"Processing ID: {processing_id} | "
                f"Images: {processing.image_count}",
                extra={
                    "processing_id": processing_id,
                    "image_count": processing.image_count,
                    "user_id": processing.user_id
                }
            )

            # Carregar todas as imagens
            images: list[tuple[bytes, str]] = []

            for idx, image_id in enumerate(processing.image_ids):
                try:
                    image_bytes = await _load_image_from_storage(image_id)

                    if not image_bytes:
                        raise ValueError(f"Failed to load image: {image_id}")

                    mime_type = _get_mime_type(image_id)

                    logger.info(
                        f"Image {idx + 1}/{len(processing.image_ids)} loaded: "
                        f"{len(image_bytes)} bytes, type: {mime_type}",
                        extra={"processing_id": processing_id}
                    )

                    images.append((image_bytes, mime_type))

                except Exception as e:
                    logger.error(
                        f"✗ ERROR loading image {idx + 1}/"
                        f"{len(processing.image_ids)}: {e}",
                        extra={
                            "processing_id": processing_id,
                            "image_id": image_id,
                            "error": str(e)
                        },
                        exc_info=True
                    )
                    processing.errors.append(f"Image {idx + 1}: {str(e)}")

            if not images:
                processing.status = "error"
                processing.errors.append("No images could be loaded")
                logger.error(
                    f"✗ NO IMAGES LOADED | Processing ID: {processing_id}",
                    extra={"processing_id": processing_id}
                )
                processing.updated_at = datetime.utcnow()
                await db.commit()
                return

            # Enviar TODAS as imagens numa única request à LLM
            logger.info(
                f"→ Sending {len(images)} image(s) to multi-provider extractor "
                f"in a single request...",
                extra={"processing_id": processing_id}
            )

            try:
                extracted = await extractor.extract_multiple(images)

                # Normalizar nomes dos itens (expande abreviações)
                if extracted.items:
                    try:
                        extracted.items = normalize_items(
                            extracted.items
                        )
                    except Exception as norm_err:
                        logger.warning(
                            f"Normalização de nomes falhou: {norm_err}"
                        )

                # Categorizar itens (segundo passo, não-crítico)
                if extracted.items:
                    try:
                        extracted.items = await categorize_items(
                            extracted.items
                        )
                    except Exception as cat_err:
                        logger.warning(
                            f"Categorização falhou: {cat_err}"
                        )

                # Check for potential duplicates before storing
                potential_duplicates = await _check_duplicates(
                    db, processing.user_id, extracted
                )

                # Converter para dict para armazenamento
                merged_data = _extraction_to_dict(extracted, len(images))

                if potential_duplicates:
                    merged_data["potential_duplicates"] = potential_duplicates
                    processing.warnings = list(processing.warnings or []) + [
                        "Possível nota fiscal duplicada encontrada"
                    ]

                processing.extracted_data = merged_data
                processing.status = "extracted"
                processing.confidence_score = extracted.confidence

                logger.info(
                    f"✓✓✓ EXTRACTION COMPLETED SUCCESSFULLY | "
                    f"Processing ID: {processing_id} | "
                    f"Images: {len(images)} | "
                    f"Items: {len(extracted.items)} | "
                    f"Confidence: {extracted.confidence:.2%} | "
                    f"Invoice: {extracted.number or 'N/A'} | "
                    f"Total: R$ {float(extracted.total_value) if extracted.total_value else 0:.2f} | "
                    f"Warnings: {len(extracted.warnings)}",
                    extra={
                        "processing_id": processing_id,
                        "confidence": extracted.confidence,
                        "images_processed": len(images),
                        "total_items": len(extracted.items),
                        "invoice_number": extracted.number,
                        "warnings": extracted.warnings,
                    }
                )

            except Exception as e:
                logger.error(
                    f"✗ EXTRACTION FAILED: {e}",
                    extra={"processing_id": processing_id, "error": str(e)},
                    exc_info=True
                )
                processing.status = "error"
                processing.errors.append(f"Extraction failed: {str(e)}")

            processing.updated_at = datetime.utcnow()
            await db.commit()

        except Exception as e:
            logger.error(
                f"Error in process_invoice_photos: {e}",
                extra={"processing_id": processing_id}
            )
            processing.status = "error"
            processing.errors.append(str(e))
            processing.updated_at = datetime.utcnow()
            await db.commit()

    logger.info(f"=" * 80)
    logger.info(f"🏁 BACKGROUND TASK FINISHED | Processing ID: {processing_id}")
    logger.info(f"=" * 80)


async def _check_duplicates(
    db, user_id, extracted: "ExtractedInvoiceData"
) -> list[dict]:
    """Verifica se existem notas fiscais similares já cadastradas.

    Busca por match em: access_key (exata) OU (number + issuer_cnpj + total_value).
    Retorna lista de possíveis duplicatas para aviso ao usuário.
    """
    duplicates = []

    try:
        # 1. Check by access_key (exact match)
        clean_key = re.sub(r'\D', '', extracted.access_key or '')
        if len(clean_key) == 44:
            result = await db.execute(
                select(Invoice).where(
                    Invoice.access_key == clean_key,
                    Invoice.user_id == user_id
                )
            )
            for inv in result.scalars().all():
                duplicates.append({
                    "invoice_id": str(inv.id),
                    "number": inv.number,
                    "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                    "total_value": float(inv.total_value),
                    "issuer_name": inv.issuer_name,
                    "match_type": "access_key",
                })

        # 2. Check by number + CNPJ + total_value (fuzzy match)
        if not duplicates and extracted.number and extracted.issuer_cnpj:
            clean_cnpj = re.sub(r'\D', '', extracted.issuer_cnpj)
            clean_number = re.sub(r'\D', '', extracted.number)

            if clean_cnpj and clean_number:
                conditions = [
                    Invoice.number == clean_number,
                    Invoice.issuer_cnpj == clean_cnpj,
                    Invoice.user_id == user_id,
                ]
                if extracted.total_value is not None:
                    conditions.append(
                        Invoice.total_value == Decimal(str(extracted.total_value))
                    )

                result = await db.execute(
                    select(Invoice).where(and_(*conditions))
                )
                for inv in result.scalars().all():
                    duplicates.append({
                        "invoice_id": str(inv.id),
                        "number": inv.number,
                        "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                        "total_value": float(inv.total_value),
                        "issuer_name": inv.issuer_name,
                        "match_type": "number_cnpj_value",
                    })

        if duplicates:
            logger.warning(
                f"Found {len(duplicates)} potential duplicate(s) for user {user_id}"
            )

    except Exception as e:
        logger.warning(f"Duplicate check failed (non-critical): {e}")

    return duplicates


async def _load_image_from_storage(image_id: str) -> bytes:
    """Carrega imagem do storage.

    Args:
        image_id: ID da imagem no storage (caminho do arquivo local)

    Returns:
        Conteúdo da imagem em bytes
    """
    try:
        if os.path.exists(image_id):
            async with aiofiles.open(image_id, 'rb') as f:
                content = await f.read()
                logger.info(f"Loaded image {image_id}: {len(content)} bytes")
                return content
        else:
            logger.error(f"Image file not found: {image_id}")
    except Exception as e:
        logger.error(f"Error loading image {image_id}: {e}")

    return b""


def _get_mime_type(filepath: str) -> str:
    """Determina o mime type de um arquivo.

    Args:
        filepath: Caminho do arquivo

    Returns:
        Mime type (ex: image/jpeg, image/png)
    """
    mime_type, _ = mimetypes.guess_type(filepath)

    # Fallback para extensões comuns
    if not mime_type:
        ext = filepath.lower().split('.')[-1]
        mime_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'heic': 'image/heic',
            'heif': 'image/heif'
        }
        mime_type = mime_map.get(ext, 'image/jpeg')

    return mime_type


def _extraction_to_dict(
    extracted: "ExtractedInvoiceData",
    image_count: int,
) -> dict:
    """Converte ExtractedInvoiceData para dict armazenável em JSON.

    Args:
        extracted: Dados extraídos pela LLM (já validados)
        image_count: Número de imagens processadas

    Returns:
        Dicionário serializável para JSON
    """
    items = []
    for item in extracted.items:
        item_dict = item.model_dump()
        for key in ['quantity', 'unit_price', 'total_price']:
            if key in item_dict and item_dict[key] is not None:
                item_dict[key] = float(item_dict[key])
        items.append(item_dict)

    return {
        "access_key": extracted.access_key,
        "number": extracted.number,
        "series": extracted.series,
        "issue_date": (
            extracted.issue_date.isoformat() if extracted.issue_date else None
        ),
        "issuer_name": extracted.issuer_name,
        "issuer_cnpj": extracted.issuer_cnpj,
        "total_value": (
            float(extracted.total_value) if extracted.total_value else 0
        ),
        "items": items,
        "confidence": extracted.confidence,
        "warnings": extracted.warnings or [],
        "image_count": image_count,
    }
