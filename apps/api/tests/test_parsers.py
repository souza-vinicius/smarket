import pytest
from datetime import datetime
from decimal import Decimal

from src.parsers.xml_parser import parse_xml_invoice
from src.parsers.qrcode_parser import extract_access_key, parse_qrcode_url


class TestXMLParser:
    """Test XML invoice parser."""
    
    def test_parse_valid_xml(self, sample_xml_invoice):
        """Test parsing a valid XML invoice."""
        result = parse_xml_invoice(sample_xml_invoice)
        
        assert result["access_key"] == "35191212345678000190550010000001231234567890"
        assert result["number"] == "123"
        assert result["series"] == "1"
        assert result["issuer_cnpj"] == "12345678000190"
        assert result["issuer_name"] == "EMPRESA EXEMPLO LTDA"
        assert result["total_value"] == Decimal("150.00")
        assert result["type"] == "NFC-e"
        assert isinstance(result["issue_date"], datetime)
        assert len(result["products"]) == 1
        
        # Check product
        product = result["products"][0]
        assert product["code"] == "001"
        assert product["description"] == "ARROZ TIPO 1 5KG"
        assert product["quantity"] == Decimal("1")
        assert product["unit"] == "UN"
        assert product["unit_price"] == Decimal("25.00")
        assert product["total_price"] == Decimal("25.00")
    
    def test_parse_xml_with_multiple_products(self):
        """Test parsing XML with multiple products."""
        xml_content = b"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <NFe>
        <infNFe Id="NFe35191212345678000190550010000001231234567890">
            <ide>
                <cUF>35</cUF>
                <mod>55</mod>
                <serie>1</serie>
                <nNF>456</nNF>
                <dhEmi>2023-12-01T10:00:00-03:00</dhEmi>
            </ide>
            <emit>
                <CNPJ>12345678000190</CNPJ>
                <xNome>EMPRESA EXEMPLO LTDA</xNome>
            </emit>
            <total>
                <ICMSTot>
                    <vNF>200.00</vNF>
                </ICMSTot>
            </total>
            <det nItem="1">
                <prod>
                    <cProd>001</cProd>
                    <xProd>PRODUTO 1</xProd>
                    <qCom>2.0000</qCom>
                    <uCom>UN</uCom>
                    <vUnCom>50.00</vUnCom>
                    <vProd>100.00</vProd>
                </prod>
            </det>
            <det nItem="2">
                <prod>
                    <cProd>002</cProd>
                    <xProd>PRODUTO 2</xProd>
                    <qCom>1.0000</qCom>
                    <uCom>UN</uCom>
                    <vUnCom>100.00</vUnCom>
                    <vProd>100.00</vProd>
                </prod>
            </det>
        </infNFe>
    </NFe>
</nfeProc>
"""
        result = parse_xml_invoice(xml_content)
        assert len(result["products"]) == 2
        assert result["type"] == "NF-e"  # mod 55 = NF-e


class TestQRCodeParser:
    """Test QR Code parser."""
    
    def test_extract_access_key_from_url(self):
        """Test extracting access key from QR Code URL."""
        url = "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx?p=35191212345678000190550010000001231234567890"
        access_key = extract_access_key(url)
        assert access_key == "35191212345678000190550010000001231234567890"
    
    def test_extract_access_key_from_short_url(self):
        """Test extracting access key from shortened URL."""
        url = "http://www.dfe.ms.gov.br/nfce/qrcode?p=50191212345678000190550010000001231234567890"
        access_key = extract_access_key(url)
        assert access_key == "50191212345678000190550010000001231234567890"
    
    def test_extract_access_key_invalid_url(self):
        """Test extracting access key from invalid URL."""
        url = "https://example.com/no-key-here"
        access_key = extract_access_key(url)
        assert access_key is None
    
    def test_parse_qrcode_url(self):
        """Test parsing QR Code URL."""
        url = "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx?p=35191212345678000190550010000001231234567890"
        result = parse_qrcode_url(url)
        
        assert result["access_key"] == "35191212345678000190550010000001231234567890"
        assert result["state_code"] == "35"
        assert result["cnpj"] == "12345678000190"
        assert result["model"] == "65"
        assert result["series"] == "001"
        assert result["number"] == "000000123"
    
    def test_parse_qrcode_url_invalid(self):
        """Test parsing invalid QR Code URL."""
        url = "https://example.com/no-key"
        with pytest.raises(ValueError, match="Could not extract access key"):
            parse_qrcode_url(url)
