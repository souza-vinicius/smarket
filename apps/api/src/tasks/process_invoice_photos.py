import logging
import os
import aiofiles
from datetime import datetime

from sqlalchemy import select

from src.database import AsyncSessionLocal
from src.models.invoice_processing import InvoiceProcessing
from src.services.multi_provider_extractor import extractor

logger = logging.getLogger(__name__)


async def process_invoice_photos(processing_id: str) -> None:
    """Processa fotos de notas fiscais em background.

    Args:
        processing_id: ID do registro InvoiceProcessing
    """

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
                f"Starting processing for {processing.image_count} images",
                extra={"processing_id": processing_id}
            )

            # Processar cada imagem
            all_extracted = []
            all_items = []

            for idx, image_id in enumerate(processing.image_ids):
                try:
                    logger.info(
                        f"Processing image {idx + 1}/"
                        f"{len(processing.image_ids)}",
                        extra={"processing_id": processing_id}
                    )

                    # Aqui você carregaria a imagem do storage
                    # Por enquanto, simulamos
                    image_bytes = await _load_image_from_storage(image_id)

                    # Extrair dados com AI (multi-provider fallback)
                    extracted = await extractor.extract(
                        image_bytes,
                        mime_type="image/jpeg"
                    )

                    all_extracted.append(extracted)

                    if extracted.items:
                        all_items.extend(extracted.items)

                    logger.info(
                        f"Image {idx + 1} processed successfully",
                        extra={
                            "processing_id": processing_id,
                            "confidence": extracted.confidence
                        }
                    )

                except Exception as e:
                    logger.error(
                        f"Error processing image {idx + 1}: {e}",
                        extra={"processing_id": processing_id}
                    )
                    processing.errors.append(f"Image {idx + 1}: {str(e)}")

            # Mesclar dados extraídos
            if all_extracted:
                merged_data = _merge_extracted_data(all_extracted, all_items)

                processing.extracted_data = merged_data
                processing.status = "extracted"
                processing.confidence_score = merged_data.get(
                    "confidence",
                    0.0
                )

                logger.info(
                    "Extraction completed successfully",
                    extra={
                        "processing_id": processing_id,
                        "confidence": processing.confidence_score
                    }
                )
            else:
                processing.status = "error"
                processing.errors.append("No images could be processed")

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
                return await f.read()
    except Exception as e:
        logger.error(f"Error loading image {image_id}: {e}")
    
    return b""


def _merge_extracted_data(
    all_extracted: list,
    all_items: list
) -> dict:
    """Mescla dados extraídos de múltiplas imagens.

    Args:
        all_extracted: Lista de ExtractedInvoiceData
        all_items: Lista de todos os items

    Returns:
        Dicionário com dados mesclados
    """

    # Usar primeira extração como base
    if not all_extracted:
        return {}

    base = all_extracted[0]

    # Calcular confiança média
    avg_confidence = sum(
        e.confidence for e in all_extracted
    ) / len(all_extracted)

    # Mesclar items
    merged_items = []
    for item in all_items:
        merged_items.append(item.model_dump())

    return {
        "access_key": base.access_key,
        "number": base.number,
        "series": base.series,
        "issue_date": base.issue_date.isoformat() if base.issue_date else None,
        "issuer_name": base.issuer_name,
        "issuer_cnpj": base.issuer_cnpj,
        "total_value": float(base.total_value) if base.total_value else 0,
        "items": merged_items,
        "confidence": avg_confidence,
        "warnings": base.warnings,
        "image_count": len(all_extracted)
    }
