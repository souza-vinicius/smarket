import re
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

from src.config import settings


def extract_access_key(qrcode_url: str) -> Optional[str]:
    """
    Extract access key (chave de acesso) from QR Code URL.
    
    Brazilian NFC-e QR Code URLs contain the access key as a parameter.
    Example URL formats:
    - https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx?p=35191212345678000190550010000001231234567890
    - http://www.dfe.ms.gov.br/nfce/qrcode?p=50191212345678000190550010000001231234567890
    
    Args:
        qrcode_url: The QR Code URL scanned from the NFC-e
        
    Returns:
        The 44-digit access key or None if not found
    """
    # Try to find 44-digit access key in URL
    # Pattern: exactly 44 digits
    pattern = r"\d{44}"
    match = re.search(pattern, qrcode_url)
    
    if match:
        return match.group(0)
    
    # Try to extract from 'p' parameter (common in NFC-e URLs)
    try:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(qrcode_url)
        params = parse_qs(parsed.query)
        
        if "p" in params:
            p_value = params["p"][0]
            # The 'p' parameter usually contains the access key
            if len(p_value) >= 44:
                # Extract first 44 digits
                digits = re.search(r"\d{44}", p_value)
                if digits:
                    return digits.group(0)
    except Exception:
        pass
    
    return None


async def fetch_invoice_from_sefaz(access_key: str) -> Dict[str, Any]:
    """
    Fetch invoice data from Sefaz using the access key.
    
    Note: In production, you would use the official Sefaz API or
    a certified service like Focus NFe, Nuvem Fiscal, etc.
    
    This is a mock implementation for development purposes.
    
    Args:
        access_key: The 44-digit access key
        
    Returns:
        Dictionary with invoice data
        
    Raises:
        Exception: If the invoice cannot be fetched
    """
    # Validate access key format
    if not access_key or len(access_key) != 44 or not access_key.isdigit():
        raise ValueError("Invalid access key format. Expected 44 digits.")
    
    # TODO: Implement actual Sefaz API integration
    # For now, return mock data for development
    # In production, replace with actual API call:
    #
    # async with httpx.AsyncClient() as client:
    #     response = await client.get(
    #         f"{settings.SEFAZ_API_URL}/api/v1/invoice/{access_key}"
    #     )
    #     response.raise_for_status()
    #     return response.json()
    
    # Mock data for development
    return {
        "access_key": access_key,
        "number": access_key[25:34],
        "series": access_key[22:25],
        "issue_date": datetime.now(),
        "issuer_cnpj": access_key[6:20],
        "issuer_name": "EMPRESA EXEMPLO LTDA",
        "total_value": Decimal("150.00"),
        "type": "NFC-e",
        "products": [
            {
                "code": "001",
                "description": "ARROZ TIPO 1 5KG",
                "quantity": Decimal("1"),
                "unit": "UN",
                "unit_price": Decimal("25.00"),
                "total_price": Decimal("25.00")
            },
            {
                "code": "002",
                "description": "FEIJAO CARIOCA 1KG",
                "quantity": Decimal("2"),
                "unit": "UN",
                "unit_price": Decimal("8.50"),
                "total_price": Decimal("17.00")
            },
            {
                "code": "003",
                "description": "OLEO DE SOJA 900ML",
                "quantity": Decimal("3"),
                "unit": "UN",
                "unit_price": Decimal("6.00"),
                "total_price": Decimal("18.00")
            }
        ],
        "raw_data": {
            "access_key": access_key,
            "consulted_at": datetime.now().isoformat()
        }
    }


def parse_qrcode_url(qrcode_url: str) -> Dict[str, Any]:
    """
    Parse QR Code URL and extract all available information.
    
    Args:
        qrcode_url: The QR Code URL
        
    Returns:
        Dictionary with parsed information
    """
    access_key = extract_access_key(qrcode_url)
    
    if not access_key:
        raise ValueError("Could not extract access key from QR Code URL")
    
    # Extract state from access key (digits 0-1)
    state_code = access_key[:2]
    
    # Extract CNPJ from access key (digits 6-19)
    cnpj = access_key[6:20]
    
    # Extract model from access key (digits 20-21)
    model = access_key[20:22]
    
    # Extract series from access key (digits 22-24)
    series = access_key[22:25]
    
    # Extract number from access key (digits 25-33)
    number = access_key[25:34]
    
    return {
        "access_key": access_key,
        "state_code": state_code,
        "cnpj": cnpj,
        "model": model,
        "series": series,
        "number": number,
        "url": qrcode_url
    }
