"""Serviço de normalização de nomes de produtos de nota fiscal.

Expande abreviações comuns em notas fiscais brasileiras (NF-e/NFC-e)
para nomes comerciais mais legíveis, preservando informações relevantes.

Roda ANTES da categorização, para que o categorizador receba nomes
mais completos e consiga classificar melhor.
"""

import logging
import re

from src.schemas.invoice_processing import ExtractedItem


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dicionário de abreviações → expansões
# Organizado por categoria semântica para facilitar manutenção.
# ---------------------------------------------------------------------------

# Tamanho / Volume / Peso
ABBREVIATIONS_SIZE: dict[str, str] = {
    "GDE": "Grande",
    "GD": "Grande",
    "PEQ": "Pequeno",
    "PQ": "Pequeno",
    "MED": "Médio",
    "MD": "Médio",
    "JB": "Jumbo",
    "MINI": "Mini",
}

# Embalagem / Formato
ABBREVIATIONS_PACKAGING: dict[str, str] = {
    "PET": "PET",
    "EMB": "Embalagem",
    "TP": "Tetra Pak",
    "VD": "Vidro",
    "VDR": "Vidro",
    "PL": "Plástico",
    "PLAST": "Plástico",
    "LT": "Lata",
    "GF": "Garrafa",
    "GRF": "Garrafa",
    "LN": "Long Neck",
    "PCT": "Pacote",
    "PC": "Pacote",
    "CX": "Caixa",
    "FD": "Fardo",
    "DZ": "Dúzia",
    "BD": "Bandeja",
    "BDJ": "Bandeja",
    "SC": "Saco",
    "SAQ": "Saquinho",
    "RF": "Refil",
    "REFIL": "Refil",
    "TB": "Tubo",
    "BIS": "Bisnaga",
    "RL": "Rolo",
    "FL": "Frasco",
}

# Estado / Processamento do produto
ABBREVIATIONS_STATE: dict[str, str] = {
    "ANTIAD": "Antiaderente",
    "CONG": "Congelado",
    "RESF": "Resfriado",
    "DEF": "Defumado",
    "DEFUM": "Defumado",
    "MAT": "Maturado",
    "MATUR": "Maturado",
    "FAT": "Fatiado",
    "INT": "Integral",
    "INTEG": "Integral",
    "DESN": "Desnatado",
    "SEMIDESN": "Semidesnatado",
    "SEMI": "Semidesnatado",
    "CONC": "Concentrado",
    "INST": "Instantâneo",
    "TORR": "Torrado",
    "MOI": "Moído",
    "REFINAD": "Refinado",
    "REF": "Refinado",
    "CRIST": "Cristal",
    "PAST": "Pasteurizado",
    "UHT": "UHT",
    "HOMOG": "Homogeneizado",
    "DESC": "Descascado",
    "TEMPERADO": "Temperado",
    "TEMP": "Temperado",
    "ORGANICO": "Orgânico",
    "ORG": "Orgânico",
    "LIGHT": "Light",
    "LT": "Light",
    "ZERO": "Zero",
    "ZER": "Zero",
    "DIET": "Diet",
    "SEM LACT": "Sem Lactose",
    "S/LACT": "Sem Lactose",
    "S/GLUT": "Sem Glúten",
}

# Cortes de carne e formas de preparo
ABBREVIATIONS_CUTS: dict[str, str] = {
    "CARN": "Carne",
    "FIL": "Filé",
    "FILE": "Filé",
    "PJ": "Peça",
    "BIF": "Bife",
    "COST": "Costela",
    "PA": "Paleta",
    "AC": "Acém",
    "ACEM": "Acém",
    "PAT": "Patinho",
    "COX": "Coxa",
    "SOBREC": "Sobrecoxa",
    "SOBRX": "Sobrecoxa",
    "ASA": "Asa",
    "PTO": "Peito",
    "PEIT": "Peito",
    "ALCATRA": "Alcatra",
    "ALC": "Alcatra",
    "MAMINHA": "Maminha",
    "MAM": "Maminha",
    "PICANHA": "Picanha",
    "PIC": "Picanha",
    "CONTRA": "Contrafilé",
    "CONTRAF": "Contrafilé",
    "LAGARTO": "Lagarto",
    "LAG": "Lagarto",
    "MUSC": "Músculo",
    "FRANC": "Francês",
    "PALETA": "Paleta",
    "COPA": "Copa",
    "LOMB": "Lombo",
    "PERNIL": "Pernil",
    "PERN": "Pernil",
    "CARR": "Carré",
}

# Tipos de produto (nome genérico)
ABBREVIATIONS_PRODUCTS: dict[str, str] = {
    "BISC": "Biscoito",
    "BOLACHA": "Bolacha",
    "BOL": "Bolacha",
    "SAB": "Sabonete",
    "SABAO": "Sabão",
    "DET": "Detergente",
    "AMA": "Amaciante",
    "AMAC": "Amaciante",
    "QJ": "Queijo",
    "QJO": "Queijo",
    "QUEIJ": "Queijo",
    "PROT": "Proteica",
    "DESENGO": "Desengordurante",
    "DESENG": "Desengordurante",
    "RISTRET": "Ristretto",
    "RISTRETO": "Ristretto",
    "PENN": "Penne",
    "DENT": "Dental",
    "DENTAL": "Dental",
    "SH": "Shampoo",
    "SHAMP": "Shampoo",
    "COND": "Condicionador",
    "MARG": "Margarina",
    "MANT": "Manteiga",
    "MAC": "Macarrão",
    "MACAR": "Macarrão",
    "ACR": "Açúcar",
    "ACUC": "Açúcar",
    "CF": "Café",
    "CAFE": "Café",
    "ARZ": "Arroz",
    "AROZ": "Arroz",
    "FJ": "Feijão",
    "FEIJ": "Feijão",
    "OL": "Óleo",
    "OLEO": "Óleo",
    "PAP": "Papel",
    "HIG": "Higiênico",
    "TOA": "Toalha",
    "DESOD": "Desodorante",
    "AER": "Aerosol",
    "ROLL": "Roll-On",
    "CREM": "Creme",
    "ESC": "Escova",
    "REFRIG": "Refrigerante",
    "REFRI": "Refrigerante",
    "REFR": "Refrigerante",
    "SUC": "Suco",
    "NCT": "Néctar",
    "AG": "Água",
    "AGUA": "Água",
    "MIN": "Mineral",
    "GAS": "Gaseificada",
    "CERV": "Cerveja",
    "PIL": "Pilsen",
    "VIN": "Vinho",
    "TTO": "Tinto",
    "BRN": "Branco",
    "CHOC": "Chocolate",
    "REC": "Recheado",
    "RECH": "Recheado",
    "PAO": "Pão",
    "FORM": "Forma",
    "PRES": "Presunto",
    "MORT": "Mortadela",
    "SALSI": "Salsicha",
    "LING": "Linguiça",
    "CALIF": "Califórnia",
    "TOSC": "Toscana",
    "HAMB": "Hambúrguer",
    "BOV": "Bovino",
    "IOG": "Iogurte",
    "IOGURT": "Iogurte",
    "NAT": "Natural",
    "MOR": "Morango",
    "OVO": "Ovo",
    "OVOS": "Ovos",
    "FRALDA": "Fralda",
    "FR": "Fralda",
    "ABS": "Absorvente",
    "LIMP": "Limpador",
    "MULTIUSO": "Multiuso",
    "DESENG": "Desengraxante",
    "ALV": "Alvejante",
    "DESINF": "Desinfetante",
    "ESP": "Esponja",
    "ACO": "Aço",
    "LEITE": "Leite",
    "COND": "Condensado",
    "FARINHA": "Farinha",
    "FAR": "Farinha",
    "TRIG": "Trigo",
    "MILHO": "Milho",
    "MAND": "Mandioca",
    "MANDIOC": "Mandioca",
    "BATATA": "Batata",
    "BAT": "Batata",
    "TOMATE": "Tomate",
    "TOM": "Tomate",
    "MOLHO": "Molho",
    "EXTRATO": "Extrato",
    "EXTR": "Extrato",
    "CATCHUP": "Catchup",
    "MAION": "Maionese",
    "MOST": "Mostarda",
    "VINAGRE": "Vinagre",
    "AZT": "Azeite",
    "AZEIT": "Azeite",
    "SAL": "Sal",
    "PIMENTA": "Pimenta",
    "PIM": "Pimenta",
    "TEMPERO": "Tempero",
    "TEMP": "Tempero",
    "ALHO": "Alho",
    "CEBOLA": "Cebola",
    "CEB": "Cebola",
    "CENOURA": "Cenoura",
    "BROCOLIS": "Brócolis",
    "BROC": "Brócolis",
    "ALFACE": "Alface",
    "ALF": "Alface",
    "BANANA": "Banana",
    "BAN": "Banana",
    "MACA": "Maçã",
    "LARANJA": "Laranja",
    "LAR": "Laranja",
    "LIMAO": "Limão",
    "LIM": "Limão",
    "MANGA": "Manga",
    "UVA": "Uva",
    "MELANCIA": "Melancia",
    "MELAO": "Melão",
    "ABACAXI": "Abacaxi",
    "ABAC": "Abacaxi",
    "MAMAO": "Mamão",
    "GOIAB": "Goiaba",
    "MORANGO": "Morango",
    "PESSEGO": "Pêssego",
    "ATUM": "Atum",
    "SARDINHA": "Sardinha",
    "SARD": "Sardinha",
    "GRAO": "Grão",
    "ERVILHA": "Ervilha",
    "ERV": "Ervilha",
    "MILHO": "Milho",
    "LENTILHA": "Lentilha",
    "LENT": "Lentilha",
    "AVEIA": "Aveia",
    "GRANOLA": "Granola",
    "CEREAL": "Cereal",
    "CER": "Cereal",
    "BARRA": "Barra",
    "BISN": "Bisnaga",
    "TORRADA": "Torrada",
    "TORR": "Torrada",
    "CREAM CRACK": "Cream Cracker",
    "CR CRACK": "Cream Cracker",
    "WAFER": "Wafer",
    "ROSQUINHA": "Rosquinha",
    "ROSQ": "Rosquinha",
    "RECHEADO": "Recheado",
    "PETIT": "Petit",
    "BEURRE": "Beurre",
    "CHAMPAGNE": "Champagne",
    "CHAMP": "Champagne",
    "CH": "Champagne",
    "MARIA": "Maria",
    "MAISENA": "Maisena",
    "MAIS": "Maisena",
    "CREAM CHEESE": "Cream Cheese",
    "REQUEIJAO": "Requeijão",
    "REQ": "Requeijão",
    "CATUP": "Catchup",
    "KETCHUP": "Ketchup",
    "SORVETE": "Sorvete",
    "SORV": "Sorvete",
    "PIZZA": "Pizza",
    "LASANHA": "Lasanha",
    "LAS": "Lasanha",
    "EMPANADO": "Empanado",
    "EMP": "Empanado",
    "NUGGETS": "Nuggets",
    "NUGG": "Nuggets",
    "SALG": "Salgadinho",
    "SALGAD": "Salgadinho",
    "PIPOCA": "Pipoca",
    "PIP": "Pipoca",
    "AMENDOIM": "Amendoim",
    "AMEND": "Amendoim",
    "CASTANHA": "Castanha",
    "CAST": "Castanha",
    "ORQUIDEA": "Orquídea",
    "ORQ": "Orquídea",
    "LUMINOUS": "Luminous",
    "COMPLETE": "Complete",
    "COMPL": "Complete",
    "BLANC": "Branqueador",
    "BRANQ": "Branqueador",
    "ANTIBACD": "Antibacteriano",
    "ANTIBAC": "Antibacteriano",
    "ENXAG": "Enxaguante",
    "BUCAL": "Bucal",
    "FIO": "Fio",
    "DESLIZ": "Deslizante",
    "LIO": "Líquido",
    "LIQ": "Líquido",
    "PO": "em Pó",
    "BAST": "Bastão",
    "GEL": "Gel",
    "SPRAY": "Spray",
    "CERA": "Cera",
    "LUSTRAM": "Lustra Móveis",
    "INSETICIDA": "Inseticida",
    "INSET": "Inseticida",
    "REPELENTE": "Repelente",
    "REPEL": "Repelente",
    "ALCOOL": "Álcool",
    "ALC": "Álcool",
    "DETERG": "Detergente",
    "LAVA ROUP": "Lava-Roupas",
    "LAVA LCA": "Lava-Louças",
    "LAVA LOUC": "Lava-Louças",
    "AMACIANTE": "Amaciante",
    "CONCENTR": "Concentrado",
    "S/SAL": "sem Sal",
    "C/SAL": "com Sal",
    "C/ACUCAR": "com Açúcar",
    "S/ACUCAR": "sem Açúcar",
    "S/CONSERV": "sem Conservantes",
    "SACHE": "Sachê",
    "TAM": "Tamanho",
    "PEDAG": "Pedaço",
    "PORCION": "Porcionado",
    "PREMIUM": "Premium",
    "ESPEC": "Especial",
    "TRAD": "Tradicional",
    "ORIG": "Original",
    "SELECION": "Selecionado",
    "EXTRA": "Extra",
    "LONGA VIDA": "Longa Vida",
    "LV": "Longa Vida",
}

# Marcas comuns encontradas como abreviações em notas fiscais
ABBREVIATIONS_BRANDS: dict[str, str] = {
    "POL": "Polenghi",
    "POLENG": "Polenghi",
    "PRM": "Parmalat",
    "PARM": "Parmalat",
    "NES": "Nestlé",
    "NESTL": "Nestlé",
    "3CR": "3 Corações",
    "3COR": "3 Corações",
    "MEM": "Members",
    "MEMBERS": "Members",
    "LX": "Lux",
    "YPE": "Ypê",
    "COLG": "Colgate",
    "ORAL": "Oral-B",
    "ORAL B": "Oral-B",
    "PERD": "Perdigão",
    "PERDIG": "Perdigão",
    "AUR": "Aurora",
    "TJ": "Tio João",
    "TIO JOAO": "Tio João",
    "CAMIL": "Camil",
    "QUALY": "Qualy",
    "ELEF": "Elefante",
    "HELLM": "Hellmann's",
    "HEINZ": "Heinz",
    "KNORR": "Knorr",
    "MAGGI": "Maggi",
    "PILAO": "Pilão",
    "MELITT": "Melitta",
    "MELIT": "Melitta",
    "NESCAF": "Nescafé",
    "BAUDU": "Bauducco",
    "BAUC": "Bauducco",
    "PIRAQUE": "Piraquê",
    "PIRAQ": "Piraquê",
    "ADRIA": "Adria",
    "BARILLA": "Barilla",
    "RENAISS": "Renata",
    "RENATA": "Renata",
    "GALO": "Galo",
    "ANDORINHA": "Andorinha",
    "BORRA": "Borratex",
    "COMFORT": "Comfort",
    "COMF": "Comfort",
    "DOWNY": "Downy",
    "DOVE": "Dove",
    "NIVEA": "Nivea",
    "NIV": "Nivea",
    "LIMPOL": "Limpol",
    "BRILH": "Brilhante",
    "VANISH": "Vanish",
    "VEJA": "Veja",
    "PINHO": "Pinho Sol",
    "PINHO SOL": "Pinho Sol",
    "CAND": "Cândida",
    "CANDID": "Cândida",
    "SADIA": "Sadia",
    "SEARA": "Seara",
    "FRIBOI": "Friboi",
    "FRIB": "Friboi",
    "SWIFT": "Swift",
    "DANONE": "Danone",
    "DAN": "Danone",
    "VIGOR": "Vigor",
    "ITAMBE": "Itambé",
    "ITAMB": "Itambé",
    "TIROL": "Tirol",
    "PIRAC": "Piracanjuba",
    "PIRACANJ": "Piracanjuba",
    "ELEGÊ": "Elegê",
    "ELEGE": "Elegê",
    "GUARANA": "Guaraná",
    "GUAR": "Guaraná",
    "ANTARC": "Antarctica",
    "FANTA": "Fanta",
    "PEPSI": "Pepsi",
    "SCHIN": "Schin",
    "SKOL": "Skol",
    "BRAHMA": "Brahma",
    "AMSTEL": "Amstel",
    "HEINEK": "Heineken",
    "TANG": "Tang",
    "DELVAL": "Del Valle",
    "DEL VALLE": "Del Valle",
    "SUFRESH": "Sufresh",
    "TAEQ": "Taeq",
    "QUALITA": "Qualitá",
    "QUALIT": "Qualitá",
    "CARREF": "Carrefour",
    "GPA": "GPA",
    "PDAL": "Pão de Açúcar",
    "FI": "Filiz",
}


# ---------------------------------------------------------------------------
# Dicionário unificado (gerado na inicialização do módulo)
# Ordenado por tamanho do match (maior primeiro) para evitar substituições
# parciais incorretas.
# ---------------------------------------------------------------------------


def _build_unified_dict() -> dict[str, str]:
    """Combina todos os dicionários parciais num único mapeamento."""
    unified: dict[str, str] = {}
    for d in [
        ABBREVIATIONS_SIZE,
        ABBREVIATIONS_PACKAGING,
        ABBREVIATIONS_STATE,
        ABBREVIATIONS_CUTS,
        ABBREVIATIONS_PRODUCTS,
        ABBREVIATIONS_BRANDS,
    ]:
        unified.update(d)
    return unified


ABBREVIATIONS: dict[str, str] = _build_unified_dict()

# Pré-compilar padrão para tokens que parecem medidas (ex: 1KG, 500ML, 2L, 1,5L)
_MEASURE_RE = re.compile(
    r"\b(\d+[.,]?\d*)\s*" r"(KG|GR|G|ML|LT|L|UN|PC|PCT|CX|FD|DZ|M|CM|MM)\b",
    re.IGNORECASE,
)

# Unidades de medida que devem ser preservadas como estão
_UNITS = {
    "KG",
    "GR",
    "G",
    "ML",
    "LT",
    "L",
    "UN",
    "UND",
    "PC",
    "PCT",
    "CX",
    "FD",
    "DZ",
    "M",
    "CM",
    "MM",
}

# Palavras muito curtas e ambíguas que NÃO devem ser expandidas isoladamente.
# Só são expandidas quando compõem padrões conhecidos (via _COMPOUND_PATTERNS).
_AMBIGUOUS_TOKENS = {"F", "P", "C", "S", "A", "E", "M", "R", "T", "N", "D"}

# ---------------------------------------------------------------------------
# Padrões compostos — tratam combinações que só fazem sentido juntas
# Cada tupla: (regex compilado, substituição)
# ---------------------------------------------------------------------------

_COMPOUND_PATTERNS: list[tuple[re.Pattern, str]] = [
    # "OVO GDE" / "OVOS GDE" → "Ovos Grandes"
    (re.compile(r"\bOVOS?\s+GDE\b", re.IGNORECASE), "Ovos Grandes"),
    (re.compile(r"\bOVOS?\s+GD\b", re.IGNORECASE), "Ovos Grandes"),
    (re.compile(r"\bOVOS?\s+JB\b", re.IGNORECASE), "Ovos Jumbo"),
    (re.compile(r"\bOVOS?\s+PEQ\b", re.IGNORECASE), "Ovos Pequenos"),
    (re.compile(r"\bOVOS?\s+MED\b", re.IGNORECASE), "Ovos Médios"),
    (re.compile(r"\bOVOS?\s+BR\b", re.IGNORECASE), "Ovos Brancos"),
    (re.compile(r"\bOVOS?\s+VM\b", re.IGNORECASE), "Ovos Vermelhos"),
    # "BISC CH" → "Biscoito Champagne"
    (re.compile(r"\bBISC\s+CH\b", re.IGNORECASE), "Biscoito Champagne"),
    (re.compile(r"\bBISC\s+CHAMP\b", re.IGNORECASE), "Biscoito Champagne"),
    # "SAB LIO" / "SAB LIQ" → "Sabonete Líquido"
    (re.compile(r"\bSAB\s+LIO\b", re.IGNORECASE), "Sabonete Líquido"),
    (re.compile(r"\bSAB\s+LIQ\b", re.IGNORECASE), "Sabonete Líquido"),
    (re.compile(r"\bSAB\s+BARRA\b", re.IGNORECASE), "Sabonete em Barra"),
    # "CREM DENT" / "CR DENTAL" / "3CR DENTAL" → "Creme Dental"
    (re.compile(r"\bCREM\s+DENT(?:AL)?\b", re.IGNORECASE), "Creme Dental"),
    (re.compile(r"\bCR\s+DENT(?:AL)?\b", re.IGNORECASE), "Creme Dental"),
    # "QJ POL" / "QJO POL" → "Queijo Polenghi"
    (re.compile(r"\bQJ(?:O)?\s+POL\b", re.IGNORECASE), "Queijo Polenghi"),
    # "LEITE COND" → "Leite Condensado"
    (re.compile(r"\bLEITE\s+COND\b", re.IGNORECASE), "Leite Condensado"),
    # "LEITE INT" / "LT INT" → "Leite Integral"
    (re.compile(r"\bLEITE\s+INT(?:EG)?\b", re.IGNORECASE), "Leite Integral"),
    (re.compile(r"\bLT\s+INT(?:EG)?\b", re.IGNORECASE), "Leite Integral"),
    # "LEITE DESN" → "Leite Desnatado"
    (re.compile(r"\bLEITE\s+DESN\b", re.IGNORECASE), "Leite Desnatado"),
    # "LEITE SEMIDESN" / "LEITE SEMI" → "Leite Semidesnatado"
    (re.compile(r"\bLEITE\s+SEMIDESN\b", re.IGNORECASE), "Leite Semidesnatado"),
    (re.compile(r"\bLEITE\s+SEMI\b", re.IGNORECASE), "Leite Semidesnatado"),
    # "PAP HIG" → "Papel Higiênico"
    (re.compile(r"\bPAP\s+HIG\b", re.IGNORECASE), "Papel Higiênico"),
    # "PAP TOA" → "Papel Toalha"
    (re.compile(r"\bPAP\s+TOA\b", re.IGNORECASE), "Papel Toalha"),
    # "DET LIQ" / "DET PO" → "Detergente Líquido" / "Detergente em Pó"
    (re.compile(r"\bDET\s+LIQ\b", re.IGNORECASE), "Detergente Líquido"),
    (re.compile(r"\bDET\s+PO\b", re.IGNORECASE), "Detergente em Pó"),
    (re.compile(r"\bDET\s+LIO\b", re.IGNORECASE), "Detergente Líquido"),
    # "SAB PO" → "Sabão em Pó"
    (re.compile(r"\bSAB(?:AO)?\s+PO\b", re.IGNORECASE), "Sabão em Pó"),
    (re.compile(r"\bSABAO\s+PO\b", re.IGNORECASE), "Sabão em Pó"),
    (re.compile(r"\bSAB\s+EM\s+PO\b", re.IGNORECASE), "Sabão em Pó"),
    (re.compile(r"\bSABAO\s+EM\s+PO\b", re.IGNORECASE), "Sabão em Pó"),
    (re.compile(r"\bSAB\s+LIQ\b", re.IGNORECASE), "Sabonete Líquido"),
    # "CAFE TORR MOI" → "Café Torrado e Moído"
    (
        re.compile(r"\bCAFE?\s+TORR(?:ADO)?\s+(?:E\s+)?MOI(?:DO)?\b", re.IGNORECASE),
        "Café Torrado e Moído",
    ),
    (re.compile(r"\bCF\s+TORR\s+MOI\b", re.IGNORECASE), "Café Torrado e Moído"),
    # "ACR REF" → "Açúcar Refinado"
    (re.compile(r"\bACR\s+REF\b", re.IGNORECASE), "Açúcar Refinado"),
    (re.compile(r"\bACUC?\s+REF\b", re.IGNORECASE), "Açúcar Refinado"),
    (re.compile(r"\bACR\s+CRIST\b", re.IGNORECASE), "Açúcar Cristal"),
    (re.compile(r"\bACUC?\s+CRIST\b", re.IGNORECASE), "Açúcar Cristal"),
    # "FJ PT" / "FEIJ PT" → "Feijão Preto"
    (re.compile(r"\b(?:FEIJ|FJ|FEI)\s+PT(?:O)?\b", re.IGNORECASE), "Feijão Preto"),
    (re.compile(r"\b(?:FEIJ|FJ|FEI)\s+CD\b", re.IGNORECASE), "Feijão Carioca"),
    (
        re.compile(r"\b(?:FEIJ|FJ|FEI)\s+CAR(?:IOCA)?\b", re.IGNORECASE),
        "Feijão Carioca",
    ),
    # "OL SOJ" / "OLEO SOJ" → "Óleo de Soja"
    (re.compile(r"\bOL(?:EO)?\s+SOJ(?:A)?\b", re.IGNORECASE), "Óleo de Soja"),
    (re.compile(r"\bOL(?:EO)?\s+GIR(?:ASSOL)?\b", re.IGNORECASE), "Óleo de Girassol"),
    (re.compile(r"\bOL(?:EO)?\s+CANOLA\b", re.IGNORECASE), "Óleo de Canola"),
    (re.compile(r"\bOL(?:EO)?\s+MILHO\b", re.IGNORECASE), "Óleo de Milho"),
    # "AG MIN" / "AGUA MIN" → "Água Mineral"
    (re.compile(r"\bAG(?:UA)?\s+MIN(?:ERAL)?\b", re.IGNORECASE), "Água Mineral"),
    (re.compile(r"\bAG(?:UA)?\s+MIN\s+GAS\b", re.IGNORECASE), "Água Mineral com Gás"),
    (
        re.compile(r"\bAG(?:UA)?\s+MIN\s+S/?GAS\b", re.IGNORECASE),
        "Água Mineral sem Gás",
    ),
    # "LAVA ROUP" / "LAVA LCA" → "Lava-Roupas" / "Lava-Louças"
    (re.compile(r"\bLAVA\s*ROUP(?:A|AS)?\b", re.IGNORECASE), "Lava-Roupas"),
    (re.compile(r"\bLAVA\s*L(?:OUC|CA)(?:A|AS)?\b", re.IGNORECASE), "Lava-Louças"),
    # "MARG S/SAL" / "MARG C/SAL" → "Margarina sem Sal" / "Margarina com Sal"
    (re.compile(r"\bMARG\s+S/?SAL\b", re.IGNORECASE), "Margarina sem Sal"),
    (re.compile(r"\bMARG\s+C/?SAL\b", re.IGNORECASE), "Margarina com Sal"),
    # "FILE PEITO FRANGO" → "Filé de Peito de Frango"
    (
        re.compile(
            r"\bFIL(?:E|É)?\s+(?:DE\s+)?PEITO?\s+(?:DE\s+)?FRANG(?:O)?\b", re.IGNORECASE
        ),
        "Filé de Peito de Frango",
    ),
    (re.compile(r"\bFIL(?:E|É)?\s+FRANG(?:O)?\b", re.IGNORECASE), "Filé de Frango"),
    # "COX SOBREC" → "Coxa e Sobrecoxa"
    (
        re.compile(r"\bCOX(?:A)?\s+(?:E\s+)?SOBREC(?:OXA)?\b", re.IGNORECASE),
        "Coxa e Sobrecoxa",
    ),
    # "PRES PERU" / "PRES SUINO" → "Presunto de Peru" / "Presunto Suíno"
    (re.compile(r"\bPRES\s+PERU\b", re.IGNORECASE), "Presunto de Peru"),
    (re.compile(r"\bPRES\s+SUIN(?:O)?\b", re.IGNORECASE), "Presunto Suíno"),
    # "LING TOSC" / "LING CALIF" → "Linguiça Toscana" / "Linguiça Calabresa"
    (re.compile(r"\bLING\s+TOSC(?:ANA)?\b", re.IGNORECASE), "Linguiça Toscana"),
    (re.compile(r"\bLING\s+CALIF(?:ORNIA)?\b", re.IGNORECASE), "Linguiça Califórnia"),
    (re.compile(r"\bLING\s+CALAB(?:RESA)?\b", re.IGNORECASE), "Linguiça Calabresa"),
    # "LUMINOUS C" → "Luminous Complete"
    (re.compile(r"\bLUMINOUS\s+C\b", re.IGNORECASE), "Luminous Complete"),
    # "PETIT BEURRE" is already legible, keep it
    (re.compile(r"\bPETIT\s+BEURRE\b", re.IGNORECASE), "Petit Beurre"),
    # "MAC INST" → "Macarrão Instantâneo"
    (re.compile(r"\bMAC(?:AR)?\s+INST\b", re.IGNORECASE), "Macarrão Instantâneo"),
    (re.compile(r"\bMAC\s+PARAFUSO\b", re.IGNORECASE), "Macarrão Parafuso"),
    (re.compile(r"\bMAC\s+ESPAG\b", re.IGNORECASE), "Macarrão Espaguete"),
    (re.compile(r"\bMAC\s+PENNE\b", re.IGNORECASE), "Macarrão Penne"),
    # "IOG NAT" → "Iogurte Natural"
    (re.compile(r"\bIOG(?:URT)?\s+NAT\b", re.IGNORECASE), "Iogurte Natural"),
    (re.compile(r"\bIOG(?:URT)?\s+MOR\b", re.IGNORECASE), "Iogurte de Morango"),
    (re.compile(r"\bIOG(?:URT)?\s+GREGO\b", re.IGNORECASE), "Iogurte Grego"),
    # "F" = Fatiado em contexto de frios/carnes
    (
        re.compile(r"\bQJ(?:O)?\s+(?:\w+\s+)?F\b", re.IGNORECASE),
        None,
    ),  # Marcador especial: tratado em código
    # "ARZ TP1" / "ARROZ T1" → "Arroz Tipo 1"
    (re.compile(r"\bARR?O?Z?\s+T(?:IPO\s*)?1\b", re.IGNORECASE), "Arroz Tipo 1"),
    (re.compile(r"\bARR?O?Z?\s+T(?:IPO\s*)?2\b", re.IGNORECASE), "Arroz Tipo 2"),
    (re.compile(r"\bARR?O?Z?\s+TP1\b", re.IGNORECASE), "Arroz Tipo 1"),
    (re.compile(r"\bARR?O?Z?\s+TP2\b", re.IGNORECASE), "Arroz Tipo 2"),
    # "FAR TRIG" → "Farinha de Trigo"
    (
        re.compile(r"\bFAR(?:INHA)?\s+(?:DE\s+)?TRIG(?:O)?\b", re.IGNORECASE),
        "Farinha de Trigo",
    ),
    (
        re.compile(r"\bFAR(?:INHA)?\s+(?:DE\s+)?MAND(?:IOCA)?\b", re.IGNORECASE),
        "Farinha de Mandioca",
    ),
    (
        re.compile(r"\bFAR(?:INHA)?\s+(?:DE\s+)?MILHO\b", re.IGNORECASE),
        "Farinha de Milho",
    ),
    # "EXTR TOM" → "Extrato de Tomate"
    (
        re.compile(r"\bEXTR(?:ATO)?\s+(?:DE\s+)?TOM(?:ATE)?\b", re.IGNORECASE),
        "Extrato de Tomate",
    ),
    # "MOLHO TOM" → "Molho de Tomate"
    (
        re.compile(r"\bMOLHO\s+(?:DE\s+)?TOM(?:ATE)?\b", re.IGNORECASE),
        "Molho de Tomate",
    ),
    # "PAO FORM" / "PAO FR" → "Pão de Forma" / "Pão Francês"
    (re.compile(r"\bPAO\s+FORM(?:A)?\b", re.IGNORECASE), "Pão de Forma"),
    (re.compile(r"\bPAO\s+FR(?:ANC(?:ES|ÊS))?\b", re.IGNORECASE), "Pão Francês"),
    (re.compile(r"\bPAO\s+INT(?:EG(?:RAL)?)?\b", re.IGNORECASE), "Pão Integral"),
    # "HAMB BOV" → "Hambúrguer Bovino"
    (
        re.compile(r"\bHAMB(?:URG(?:UER)?)?\s+BOV(?:INO)?\b", re.IGNORECASE),
        "Hambúrguer Bovino",
    ),
    (
        re.compile(r"\bHAMB(?:URG(?:UER)?)?\s+FRANG(?:O)?\b", re.IGNORECASE),
        "Hambúrguer de Frango",
    ),
    # "DESOD AER" / "DESOD ROLL" → "Desodorante Aerosol" / "Desodorante Roll-On"
    (re.compile(r"\bDESOD\s+AER(?:OSOL)?\b", re.IGNORECASE), "Desodorante Aerosol"),
    (re.compile(r"\bDESOD\s+ROLL\b", re.IGNORECASE), "Desodorante Roll-On"),
    (re.compile(r"\bDESOD\s+SPRAY\b", re.IGNORECASE), "Desodorante Spray"),
    (re.compile(r"\bDESOD\s+BAST(?:AO)?\b", re.IGNORECASE), "Desodorante Bastão"),
    # "ENXAG BUCAL" → "Enxaguante Bucal"
    (re.compile(r"\bENXAG\s+BUCAL\b", re.IGNORECASE), "Enxaguante Bucal"),
]

# Padrão para "F" = Fatiado no final (em contexto de frios)
_FATIADO_SUFFIX_RE = re.compile(r"\s+F$", re.IGNORECASE)
_FRIOS_CONTEXT = {
    "QUEIJO",
    "QJ",
    "QJO",
    "PRES",
    "PRESUNTO",
    "MORT",
    "MORTADELA",
    "PEITO",
    "PERU",
    "LOMBO",
    "LOMB",
    "COPA",
    "SALAME",
    "MUSSARELA",
    "MUSSR",
    "MUSS",
    "PROVOLONE",
    "PROV",
    "EMMENTAL",
    "EDAM",
    "GRUYERE",
    "PRATO",
    "GOUDA",
    "CHESTER",
    "BLANQUET",
}


# ---------------------------------------------------------------------------
# Funções principais
# ---------------------------------------------------------------------------


def normalize_product_name(description: str) -> str:
    """Expande abreviações em uma descrição de produto de nota fiscal.

    Aplica padrões compostos primeiro (ex: "SAB LIO" → "Sabonete Líquido"),
    depois expande tokens individuais remanescentes.

    Preserva medidas (ex: "1KG", "500ML"), mantém caixa título e não
    altera tokens que não são abreviações conhecidas.

    Args:
        description: Descrição bruta do produto como consta na NF-e.

    Returns:
        Nome normalizado, mais legível/comercial.
    """
    if not description or not description.strip():
        return description or ""

    text = description.strip()

    # Preservar medidas antes de processar (para não expandir "L" → "Lata" etc.)
    measures: list[tuple[str, str]] = []
    for match in _MEASURE_RE.finditer(text):
        placeholder = f"__MEASURE_{len(measures)}__"
        measures.append((placeholder, match.group(0)))

    for placeholder, original in measures:
        text = text.replace(original, placeholder, 1)

    # 1. Aplicar padrões compostos (maior prioridade)
    for pattern, replacement in _COMPOUND_PATTERNS:
        if replacement is None:
            # Padrão especial: tratar manualmente (ver _FATIADO_SUFFIX_RE)
            continue
        text = pattern.sub(replacement, text)

    # 2. Tratar "F" = Fatiado no final, em contexto de frios
    if _FATIADO_SUFFIX_RE.search(text):
        first_token = text.split()[0].upper() if text.split() else ""
        if first_token in _FRIOS_CONTEXT:
            text = _FATIADO_SUFFIX_RE.sub(" Fatiado", text)

    # 3. Expandir tokens individuais remanescentes
    tokens = text.split()
    result_tokens: list[str] = []

    for token in tokens:
        # Não modificar placeholders de medidas
        if token.startswith("__MEASURE_"):
            result_tokens.append(token)
            continue

        upper_token = token.upper()

        # Pular unidades de medida soltas
        if upper_token in _UNITS:
            result_tokens.append(token)
            continue

        # Pular tokens ambíguos de 1 caractere
        if upper_token in _AMBIGUOUS_TOKENS:
            result_tokens.append(token)
            continue

        # Verificar se o token (sem pontuação final) casa com uma abreviação
        clean_token = re.sub(r"[.,;:!?]+$", "", upper_token)
        trailing = upper_token[len(clean_token) :]

        if clean_token in ABBREVIATIONS:
            expanded = ABBREVIATIONS[clean_token]
            result_tokens.append(expanded + trailing)
        else:
            # Manter como está, mas com caixa título se for tudo maiúsculo
            if token.isupper() and len(token) > 2:
                result_tokens.append(token.capitalize())
            else:
                result_tokens.append(token)

    text = " ".join(result_tokens)

    # 4. Restaurar medidas
    for placeholder, original in measures:
        text = text.replace(placeholder, original)

    # 5. Limpar espaços duplicados
    text = re.sub(r"\s+", " ", text).strip()

    return text


def normalize_items(
    items: list[ExtractedItem],
) -> list[ExtractedItem]:
    """Normaliza nomes de todos os itens extraídos.

    Para cada item, gera um `normalized_name` a partir do `description`.
    O `description` original é preservado.

    Args:
        items: Lista de ExtractedItem com description preenchida.

    Returns:
        Mesma lista com campo normalized_name preenchido.
    """
    if not items:
        return items

    normalized_count = 0

    for item in items:
        if not item.description:
            continue

        original = item.description
        normalized = normalize_product_name(original)

        # Só define se houve mudança significativa
        if normalized and normalized != original:
            item.normalized_name = normalized
            normalized_count += 1
        else:
            # Mesmo sem mudança, caixa título é mais legível
            item.normalized_name = _title_case_preserve(original)

    logger.info(
        f"Normalização completa: {normalized_count}/{len(items)} itens "
        f"tiveram nome expandido"
    )

    return items


def normalize_product_dict(product: dict) -> dict:
    """Normaliza o nome de um produto representado como dict.

    Usado nos fluxos XML e QR code onde os itens vêm como dicionários.

    Args:
        product: Dict com pelo menos a chave 'description'.

    Returns:
        Mesmo dict com 'normalized_name' adicionado.
    """
    description = product.get("description", "")
    if description:
        normalized = normalize_product_name(description)
        if normalized and normalized != description:
            product["normalized_name"] = normalized
        else:
            product["normalized_name"] = _title_case_preserve(description)
    return product


def _title_case_preserve(text: str) -> str:
    """Converte para título preservando medidas e siglas curtas.

    Ex: "ARROZ TIPO 1 5KG" → "Arroz Tipo 1 5KG"
    """
    tokens = text.split()
    result: list[str] = []

    for token in tokens:
        # Preservar medidas (ex: "5KG", "500ML", "1,5L")
        if _MEASURE_RE.match(token):
            result.append(token)
        # Preservar siglas de 1-2 caracteres
        elif len(token) <= 2:
            result.append(token)
        # Preservar tokens que são tudo minúsculo (preposições como "de", "em")
        elif token.islower():
            result.append(token)
        # Converter tudo-maiúsculo para título
        elif token.isupper():
            result.append(token.capitalize())
        else:
            result.append(token)

    return " ".join(result)
