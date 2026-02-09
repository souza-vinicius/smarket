import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal
from typing import Any


def parse_xml_invoice(xml_content: bytes) -> dict[str, Any]:
    """
    Parse Brazilian NF-e/NFC-e XML and extract relevant data.

    Args:
        xml_content: XML file content as bytes

    Returns:
        Dictionary with invoice data
    """
    root = ET.fromstring(xml_content)

    # Define namespace
    ns = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

    # Extract invoice info
    ide = root.find(".//nfe:ide", ns)
    emit = root.find(".//nfe:emit", ns)
    total = root.find(".//nfe:total/nfe:ICMSTot", ns)
    inf_nfe = root.find(".//nfe:infNFe", ns)

    # Access key from infNFe tag
    access_key = inf_nfe.get("Id", "").replace("NFe", "")

    # Invoice number and series
    number = get_text(ide, "nfe:nNF", ns, "")
    series = get_text(ide, "nfe:serie", ns, "")

    # Issue date
    issue_date_str = get_text(ide, "nfe:dhEmi", ns, "")
    if not issue_date_str:
        issue_date_str = get_text(ide, "nfe:dEmi", ns, "")

    issue_date = parse_datetime(issue_date_str)

    # Issuer info
    issuer_cnpj = get_text(emit, "nfe:CNPJ", ns, "")
    issuer_name = get_text(emit, "nfe:xNome", ns, "")

    # Total value
    total_value = Decimal(get_text(total, "nfe:vNF", ns, "0"))

    # Invoice type (NFC-e or NF-e)
    tipo = get_text(ide, "nfe:tpNF", ns, "1")
    mod = get_text(ide, "nfe:mod", ns, "55")

    invoice_type = "NFC-e" if mod == "65" else "NF-e"

    # Extract products
    products = []
    det_elements = root.findall(".//nfe:det", ns)

    for det in det_elements:
        prod = det.find("nfe:prod", ns)

        discount = Decimal(get_text(prod, "nfe:vDesc", ns, "0"))
        product = {
            "code": get_text(prod, "nfe:cProd", ns, ""),
            "description": get_text(prod, "nfe:xProd", ns, ""),
            "quantity": Decimal(get_text(prod, "nfe:qCom", ns, "0")),
            "unit": get_text(prod, "nfe:uCom", ns, "UN"),
            "unit_price": Decimal(get_text(prod, "nfe:vUnCom", ns, "0")),
            "discount": discount,
            "total_price": Decimal(get_text(prod, "nfe:vProd", ns, "0")) - discount,
        }
        products.append(product)

    # Build raw data
    raw_data = {
        "access_key": access_key,
        "number": number,
        "series": series,
        "issue_date": issue_date.isoformat() if issue_date else None,
        "issuer_cnpj": issuer_cnpj,
        "issuer_name": issuer_name,
        "total_value": str(total_value),
        "type": invoice_type,
        "products_count": len(products),
    }

    return {
        "access_key": access_key,
        "number": number,
        "series": series,
        "issue_date": issue_date,
        "issuer_cnpj": issuer_cnpj,
        "issuer_name": issuer_name,
        "total_value": total_value,
        "type": invoice_type,
        "products": products,
        "raw_data": raw_data,
    }


def get_text(element, path: str, ns: dict, default: str = "") -> str:
    """Safely get text from XML element."""
    if element is None:
        return default
    child = element.find(path, ns)
    return child.text if child is not None else default


def parse_datetime(date_str: str) -> datetime:
    """Parse datetime from NF-e XML fields.

    Handles multiple formats:
    - ISO 8601 with timezone: "2024-01-15T14:30:22Z" or "2024-01-15T14:30:22-03:00"
    - ISO 8601 without timezone: "2024-01-15T14:30:22"
    - Brazilian format: "15/01/2024 14:30:22" or "15/01/2024"
    - Date only: "2024-01-15"
    """
    if not date_str:
        return datetime.now()

    # Try ISO format with timezone
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        pass

    # Try format without timezone
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        pass

    # Try format YYYY-MM-DDTHH:MM:SS
    try:
        return datetime.strptime(date_str[:19], "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        pass

    # Try format YYYY-MM-DD
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d")
    except ValueError:
        pass

    # Try Brazilian format with datetime: DD/MM/YYYY HH:MM:SS
    try:
        return datetime.strptime(date_str[:19], "%d/%m/%Y %H:%M:%S")
    except ValueError:
        pass

    # Try Brazilian format date only: DD/MM/YYYY
    try:
        return datetime.strptime(date_str[:10], "%d/%m/%Y")
    except ValueError:
        pass

    # Fallback: use dateutil for flexible parsing
    try:
        from dateutil import parser as dateutil_parser

        return dateutil_parser.parse(date_str, dayfirst=True)
    except Exception:
        pass

    return datetime.now()
