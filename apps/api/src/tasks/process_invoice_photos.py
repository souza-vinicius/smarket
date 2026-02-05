import logging
import os
import mimetypes
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

                    # Carregar imagem do storage
                    image_bytes = await _load_image_from_storage(image_id)
                    
                    # Validar se a imagem foi carregada
                    if not image_bytes:
                        raise ValueError(f"Failed to load image: {image_id}")
                    
                    # Inferir mime type do arquivo
                    mime_type = _get_mime_type(image_id)
                    
                    logger.info(
                        f"Image loaded: {len(image_bytes)} bytes, type: {mime_type}",
                        extra={"processing_id": processing_id}
                    )

                    logger.info(
                        f"→ Calling multi-provider extractor for image {idx + 1}...",
                        extra={"processing_id": processing_id, "image_id": image_id}
                    )

                    # Extrair dados com AI (multi-provider fallback)
                    extracted = await extractor.extract(
                        image_bytes,
                        mime_type=mime_type
                    )

                    all_extracted.append(extracted)

                    if extracted.items:
                        all_items.extend(extracted.items)

                    logger.info(
                        f"✓ Image {idx + 1}/{len(processing.image_ids)} processed successfully | "
                        f"Provider worked | Invoice: {extracted.number} | "
                        f"Total: R$ {extracted.total_value:.2f} | Items: {len(extracted.items)} | "
                        f"Confidence: {extracted.confidence:.2%}",
                        extra={
                            "processing_id": processing_id,
                            "confidence": extracted.confidence,
                            "invoice_number": extracted.number,
                            "total_value": float(extracted.total_value) if extracted.total_value else 0,
                            "items_count": len(extracted.items)
                        }
                    )

                except Exception as e:
                    logger.error(
                        f"✗ ERROR processing image {idx + 1}/{len(processing.image_ids)}: {e}",
                        extra={
                            "processing_id": processing_id,
                            "image_id": image_id,
                            "error": str(e)
                        },
                        exc_info=True
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
                    f"✓✓✓ EXTRACTION COMPLETED SUCCESSFULLY | "
                    f"Processing ID: {processing_id} | "
                    f"Images processed: {len(all_extracted)} | "
                    f"Total items: {len(all_items)} | "
                    f"Avg confidence: {processing.confidence_score:.2%} | "
                    f"Invoice: {merged_data.get('number', 'N/A')}",
                    extra={
                        "processing_id": processing_id,
                        "confidence": processing.confidence_score,
                        "images_processed": len(all_extracted),
                        "total_items": len(all_items),
                        "invoice_number": merged_data.get('number')
                    }
                )
            else:
                processing.status = "error"
                processing.errors.append("No images could be processed")
                logger.error(
                    f"✗ NO IMAGES PROCESSED | Processing ID: {processing_id}",
                    extra={"processing_id": processing_id}
                )

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

    # Mesclar items convertendo Decimal para float
    merged_items = []
    for item in all_items:
        item_dict = item.model_dump()
        # Converter Decimal para float para serialização JSON
        for key in ['quantity', 'unit_price', 'total_price']:
            if key in item_dict and item_dict[key] is not None:
                item_dict[key] = float(item_dict[key])
        merged_items.append(item_dict)

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
