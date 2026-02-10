"""
Image preprocessing utilities for optimizing images before sending to LLM vision models.

Reduces token consumption while maintaining OCR quality for invoice text extraction.
"""

import io
import logging
from typing import Tuple

from PIL import Image, ExifTags

logger = logging.getLogger(__name__)


def resize_image_for_llm(
    image_bytes: bytes,
    mime_type: str,
    max_dimension: int = 1536,
    jpeg_quality: int = 90,
) -> bytes:
    """
    Resize and optimize an image for LLM vision processing.

    Reduces token consumption by:
    1. Resizing to max_dimension on longest side (maintains aspect ratio)
    2. Auto-rotating based on EXIF orientation
    3. Converting HEIC/HEIF to JPEG
    4. Compressing with high-quality JPEG encoding

    Args:
        image_bytes: Raw image bytes
        mime_type: Original MIME type (e.g., "image/jpeg", "image/heic")
        max_dimension: Maximum dimension for longest side (default: 1536px)
        jpeg_quality: JPEG compression quality 1-100 (default: 90)

    Returns:
        Optimized image bytes (JPEG format)

    Note:
        If optimization fails, returns original bytes (non-blocking).
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Get original dimensions
        original_width, original_height = image.size
        original_size_kb = len(image_bytes) / 1024

        # Convert RGBA to RGB if needed (for JPEG compatibility)
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None)
            image = background

        # Convert other modes to RGB
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        # Auto-rotate based on EXIF orientation
        try:
            exif = image.getexif()
            if exif:
                orientation_key = next(
                    (k for k, v in ExifTags.TAGS.items() if v == "Orientation"),
                    None,
                )
                if orientation_key and orientation_key in exif:
                    orientation = exif[orientation_key]
                    if orientation == 3:
                        image = image.rotate(180, expand=True)
                    elif orientation == 6:
                        image = image.rotate(270, expand=True)
                    elif orientation == 8:
                        image = image.rotate(90, expand=True)
        except Exception as e:
            logger.debug(f"Could not read EXIF orientation: {e}")

        # Calculate new dimensions
        width, height = image.size
        longest_side = max(width, height)

        # Skip resize if image is already smaller than target
        if longest_side <= max_dimension:
            logger.debug(
                f"Image already optimal: {width}x{height} "
                f"(<= {max_dimension}px), skipping resize"
            )
            # Still convert to JPEG for consistency
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=jpeg_quality, optimize=True)
            optimized_bytes = output.getvalue()
            optimized_size_kb = len(optimized_bytes) / 1024

            logger.info(
                f"Image converted to JPEG: {original_size_kb:.1f}KB → "
                f"{optimized_size_kb:.1f}KB "
                f"({(1 - optimized_size_kb/original_size_kb)*100:.0f}% reduction)"
            )
            return optimized_bytes

        # Calculate aspect ratio and new dimensions
        if width > height:
            new_width = max_dimension
            new_height = int(height * (max_dimension / width))
        else:
            new_height = max_dimension
            new_width = int(width * (max_dimension / height))

        # Resize using high-quality Lanczos resampling
        resized_image = image.resize(
            (new_width, new_height),
            resample=Image.Resampling.LANCZOS,
        )

        # Save as JPEG with specified quality
        output = io.BytesIO()
        resized_image.save(output, format="JPEG", quality=jpeg_quality, optimize=True)
        optimized_bytes = output.getvalue()
        optimized_size_kb = len(optimized_bytes) / 1024

        # Log optimization results
        logger.info(
            f"Image optimized: {original_width}x{original_height} → "
            f"{new_width}x{new_height}, "
            f"{original_size_kb:.1f}KB → {optimized_size_kb:.1f}KB "
            f"({(1 - optimized_size_kb/original_size_kb)*100:.0f}% reduction)"
        )

        return optimized_bytes

    except Exception as e:
        logger.warning(
            f"Image optimization failed (using original): {e}",
            exc_info=True,
        )
        return image_bytes


def get_optimized_dimensions(
    width: int,
    height: int,
    max_dimension: int = 1536,
) -> Tuple[int, int]:
    """
    Calculate optimized dimensions maintaining aspect ratio.

    Args:
        width: Original width
        height: Original height
        max_dimension: Maximum dimension for longest side

    Returns:
        Tuple of (new_width, new_height)
    """
    longest_side = max(width, height)

    if longest_side <= max_dimension:
        return width, height

    if width > height:
        new_width = max_dimension
        new_height = int(height * (max_dimension / width))
    else:
        new_height = max_dimension
        new_width = int(width * (max_dimension / height))

    return new_width, new_height
