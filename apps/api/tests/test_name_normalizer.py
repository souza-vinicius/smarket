"""Testes para o serviço de normalização de nomes de produtos.

Testa expansão de abreviações comuns em NF-e/NFC-e brasileiras.
"""

import pytest
from decimal import Decimal

from src.services.name_normalizer import (
    normalize_product_name,
    normalize_items,
    normalize_product_dict,
)
from src.schemas.invoice_processing import ExtractedItem


class TestNormalizeProductName:
    """Testes para normalize_product_name()."""

    # --- Exemplos da issue original ---

    def test_ovo_gde(self):
        result = normalize_product_name("OVO GDE")
        assert "Ovos Grandes" in result

    def test_pet_packaging(self):
        result = normalize_product_name("REFRIG COLA PET 2L")
        assert "PET" in result

    def test_bisc_ch(self):
        result = normalize_product_name("BISC CH PETIT BEURRE")
        assert "Biscoito Champagne" in result
        assert "Petit Beurre" in result

    def test_sab_lio(self):
        result = normalize_product_name("SAB LIO LX ORQUIDEA")
        assert "Sabonete Líquido" in result
        assert "Lux" in result

    def test_members_brand(self):
        result = normalize_product_name("MEM QUEIJO PRATO")
        assert "Members" in result

    def test_pj_peca(self):
        result = normalize_product_name("QUEIJO PRATO PJ")
        assert "Peça" in result

    def test_f_fatiado(self):
        result = normalize_product_name("QJ MUSSARELA F")
        assert "Fatiado" in result

    def test_prot_proteica(self):
        result = normalize_product_name("BARRA PROT 8X6")
        assert "Proteica" in result

    def test_3cr_dental(self):
        result = normalize_product_name("3CR CREM DENT LUMINOUS C")
        assert "3 Corações" in result
        assert "Creme Dental" in result
        assert "Luminous Complete" in result

    def test_qj_pol(self):
        result = normalize_product_name("QJ POL PARMESAO")
        assert "Queijo Polenghi" in result

    def test_mat_maturado(self):
        result = normalize_product_name("QJO MAT CHEDDAR")
        assert "Maturado" in result

    def test_def_defumado(self):
        result = normalize_product_name("PEITO PERU DEF")
        assert "Defumado" in result

    # --- Produtos comuns de supermercado ---

    def test_leite_integral(self):
        result = normalize_product_name("LEITE INT PRM 1L")
        assert "Leite Integral" in result
        assert "Parmalat" in result

    def test_leite_desnatado(self):
        result = normalize_product_name("LEITE DESN")
        assert "Leite Desnatado" in result

    def test_leite_condensado(self):
        result = normalize_product_name("LEITE COND")
        assert "Leite Condensado" in result

    def test_papel_higienico(self):
        result = normalize_product_name("PAP HIG 30M FL DUPLA")
        assert "Papel Higiênico" in result

    def test_papel_toalha(self):
        result = normalize_product_name("PAP TOA 2 ROLOS")
        assert "Papel Toalha" in result

    def test_detergente_liquido(self):
        result = normalize_product_name("DET LIQ LIMPOL 500ML")
        assert "Detergente Líquido" in result

    def test_sabao_em_po(self):
        result = normalize_product_name("SAB PO OMO 1KG")
        assert "Sabão em Pó" in result

    def test_cafe_torrado_moido(self):
        result = normalize_product_name("CAFE TORR MOI PILAO 500GR")
        assert "Café Torrado e Moído" in result
        assert "Pilão" in result

    def test_acucar_refinado(self):
        result = normalize_product_name("ACR REF UNIAO 1KG")
        assert "Açúcar Refinado" in result

    def test_feijao_preto(self):
        result = normalize_product_name("FJ PT CAMIL 1KG")
        assert "Feijão Preto" in result
        assert "Camil" in result

    def test_feijao_carioca(self):
        result = normalize_product_name("FEIJ CAR 1KG")
        assert "Feijão Carioca" in result

    def test_oleo_soja(self):
        result = normalize_product_name("OL SOJ LIZA 900ML")
        assert "Óleo de Soja" in result

    def test_agua_mineral(self):
        result = normalize_product_name("AG MIN 500ML")
        assert "Água Mineral" in result

    def test_farinha_trigo(self):
        result = normalize_product_name("FAR TRIG 1KG")
        assert "Farinha de Trigo" in result

    def test_extrato_tomate(self):
        result = normalize_product_name("EXTR TOM ELEF 340GR")
        assert "Extrato de Tomate" in result
        assert "Elefante" in result

    def test_molho_tomate(self):
        result = normalize_product_name("MOLHO TOM HEINZ 340GR")
        assert "Molho de Tomate" in result

    def test_pao_forma(self):
        result = normalize_product_name("PAO FORM BAUDU")
        assert "Pão de Forma" in result
        assert "Bauducco" in result

    def test_macarrao_instantaneo(self):
        result = normalize_product_name("MAC INST NISSIN")
        assert "Macarrão Instantâneo" in result

    def test_iogurte_natural(self):
        result = normalize_product_name("IOG NAT DANONE")
        assert "Iogurte Natural" in result
        assert "Danone" in result

    def test_linguica_toscana(self):
        result = normalize_product_name("LING TOSC SADIA 500GR")
        assert "Linguiça Toscana" in result
        assert "Sadia" in result

    def test_desodorante_aerosol(self):
        result = normalize_product_name("DESOD AER DOVE 150ML")
        assert "Desodorante Aerosol" in result
        assert "Dove" in result

    def test_hamburguer_bovino(self):
        result = normalize_product_name("HAMB BOV SEARA 672GR")
        assert "Hambúrguer Bovino" in result
        assert "Seara" in result

    # --- Cortes de carne ---

    def test_file_peito_frango(self):
        result = normalize_product_name("FILE PEITO FRANGO KG")
        assert "Filé de Peito de Frango" in result

    def test_coxa_sobrecoxa(self):
        result = normalize_product_name("COX SOBREC FRANG CONG")
        assert "Coxa e Sobrecoxa" in result

    def test_arroz_tipo1(self):
        result = normalize_product_name("ARZ TP1 TJ 5KG")
        assert "Arroz Tipo 1" in result
        assert "Tio João" in result

    # --- Preservação de medidas ---

    def test_preserva_kg(self):
        result = normalize_product_name("ARROZ 5KG")
        assert "5KG" in result

    def test_preserva_ml(self):
        result = normalize_product_name("DET 500ML")
        assert "500ML" in result

    def test_preserva_litros(self):
        result = normalize_product_name("LEITE 1L")
        assert "1L" in result

    # --- Marcas ---

    def test_marca_polenghi(self):
        result = normalize_product_name("POL REQUEIJAO 250GR")
        assert "Polenghi" in result

    def test_marca_nestle(self):
        result = normalize_product_name("NES CHOC AO LEITE 170GR")
        assert "Nestlé" in result

    def test_marca_fi(self):
        result = normalize_product_name("FI MAC ESPAG 500GR")
        assert "Filiz" in result

    def test_marca_ype(self):
        result = normalize_product_name("YPE DET LIQ 500ML")
        assert "Ypê" in result

    # --- Padrões compostos com marcas ---

    def test_margarina_sem_sal(self):
        result = normalize_product_name("MARG S/SAL QUALY 500GR")
        assert "Margarina sem Sal" in result
        assert "Qualy" in result

    def test_margarina_com_sal(self):
        result = normalize_product_name("MARG C/SAL 500GR")
        assert "Margarina com Sal" in result

    def test_enxaguante_bucal(self):
        result = normalize_product_name("ENXAG BUCAL ORAL B 500ML")
        assert "Enxaguante Bucal" in result

    # --- Edge cases ---

    def test_string_vazia(self):
        result = normalize_product_name("")
        assert result == ""

    def test_none(self):
        result = normalize_product_name(None)
        assert result == ""

    def test_nao_expande_tokens_ambiguos(self):
        """Tokens de 1 char ambíguos não devem ser expandidos isoladamente."""
        result = normalize_product_name("PRODUTO A B C")
        # A, B, C devem permanecer inalterados
        assert "A" in result
        assert "B" in result
        assert "C" in result

    def test_caixa_titulo_palavras_longas(self):
        """Palavras tudo-maiúsculo com mais de 2 chars ficam em título."""
        result = normalize_product_name("BANANA NANICA")
        assert "Banana" in result
        assert "Nanica" in result

    def test_ovos_vermelho(self):
        result = normalize_product_name("OVO VM GDE 12UN")
        assert "Ovos Vermelhos" in result or "Ovos" in result


class TestNormalizeItems:
    """Testes para normalize_items() com lista de ExtractedItem."""

    def test_normaliza_lista(self):
        items = [
            ExtractedItem(
                code="001",
                description="OVO GDE 12UN",
                quantity=Decimal("1"),
                unit="DZ",
                unit_price=Decimal("15.90"),
                total_price=Decimal("15.90"),
            ),
            ExtractedItem(
                code="002",
                description="LEITE INT PRM 1L",
                quantity=Decimal("2"),
                unit="UN",
                unit_price=Decimal("5.99"),
                total_price=Decimal("11.98"),
            ),
        ]
        result = normalize_items(items)

        assert len(result) == 2
        assert result[0].normalized_name is not None
        assert "Ovos Grandes" in result[0].normalized_name
        assert result[1].normalized_name is not None
        assert "Leite Integral" in result[1].normalized_name

        # description original preservada
        assert result[0].description == "OVO GDE 12UN"
        assert result[1].description == "LEITE INT PRM 1L"

    def test_lista_vazia(self):
        result = normalize_items([])
        assert result == []

    def test_item_sem_descricao(self):
        items = [
            ExtractedItem(
                code="001",
                description=None,
                quantity=Decimal("1"),
                unit="UN",
                unit_price=Decimal("10.00"),
                total_price=Decimal("10.00"),
            ),
        ]
        result = normalize_items(items)
        assert result[0].normalized_name is None


class TestNormalizeProductDict:
    """Testes para normalize_product_dict() usado nos fluxos XML e QR."""

    def test_dict_com_descricao(self):
        product = {
            "code": "001",
            "description": "BISC CH PETIT BEURRE 200GR",
            "quantity": 1,
            "unit": "UN",
            "unit_price": 8.50,
            "total_price": 8.50,
        }
        result = normalize_product_dict(product)
        assert "normalized_name" in result
        assert "Biscoito Champagne" in result["normalized_name"]
        # Descrição original intocada
        assert result["description"] == "BISC CH PETIT BEURRE 200GR"

    def test_dict_sem_descricao(self):
        product = {"code": "001", "description": ""}
        result = normalize_product_dict(product)
        assert result.get("normalized_name") is None or result.get("normalized_name") == ""

    def test_dict_descricao_sem_abreviacoes(self):
        product = {"description": "BANANA NANICA KG"}
        result = normalize_product_dict(product)
        assert "normalized_name" in result
        assert "Banana" in result["normalized_name"]


class TestCompoundPatterns:
    """Testa padrões compostos específicos."""

    def test_lava_roupas(self):
        result = normalize_product_name("LAVA ROUPA OMO 3L")
        assert "Lava-Roupas" in result

    def test_lava_loucas(self):
        result = normalize_product_name("LAVA LOUCA YPE 500ML")
        assert "Lava-Louças" in result

    def test_acucar_cristal(self):
        result = normalize_product_name("ACR CRIST 2KG")
        assert "Açúcar Cristal" in result

    def test_oleo_girassol(self):
        result = normalize_product_name("OL GIR 900ML")
        assert "Óleo de Girassol" in result

    def test_presunto_peru(self):
        result = normalize_product_name("PRES PERU SADIA 200GR")
        assert "Presunto de Peru" in result
        assert "Sadia" in result

    def test_linguica_calabresa(self):
        result = normalize_product_name("LING CALAB SEARA")
        assert "Linguiça Calabresa" in result

    def test_pao_integral(self):
        result = normalize_product_name("PAO INT WICKBOLD")
        assert "Pão Integral" in result

    def test_desodorante_roll_on(self):
        result = normalize_product_name("DESOD ROLL NIVEA")
        assert "Desodorante Roll-On" in result
        assert "Nivea" in result

    def test_farinha_mandioca(self):
        result = normalize_product_name("FAR MAND 500GR")
        assert "Farinha de Mandioca" in result

    def test_iogurte_morango(self):
        result = normalize_product_name("IOG MOR DANONE 170GR")
        assert "Iogurte de Morango" in result
        assert "Danone" in result

    def test_arroz_tipo_2(self):
        result = normalize_product_name("ARZ TP2 5KG")
        assert "Arroz Tipo 2" in result

    def test_hamburguer_frango(self):
        result = normalize_product_name("HAMB FRANGO SADIA")
        assert "Hambúrguer de Frango" in result
