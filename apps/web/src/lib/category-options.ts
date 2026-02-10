/**
 * Static category → subcategory map matching the AI categorizer values.
 * Source of truth: apps/api/src/services/categorizer.py
 */
export const CATEGORY_MAP: Record<string, string[]> = {
    Laticínios: [
        "Leite", "Iogurte", "Queijos", "Manteiga", "Margarina",
        "Requeijão", "Creme de Leite", "Leite Condensado", "Outros Laticínios",
    ],
    "Carnes e Aves": [
        "Frango", "Carne Bovina", "Carne Suína", "Peixes",
        "Frutos do Mar", "Linguiças", "Embutidos", "Outras Carnes",
    ],
    Frios: [
        "Presunto", "Mortadela", "Salsicha", "Queijos Fatiados",
        "Patês", "Outros Frios",
    ],
    Bebidas: [
        "Refrigerantes", "Sucos", "Águas", "Cervejas", "Vinhos",
        "Destilados", "Energéticos", "Isotônicos", "Chás Prontos",
        "Cafés Prontos", "Outras Bebidas",
    ],
    Padaria: [
        "Pães", "Bolos", "Biscoitos", "Torradas",
        "Salgadinhos", "Doces", "Outros Padaria",
    ],
    Hortifruti: [
        "Frutas", "Verduras", "Legumes", "Temperos Frescos", "Outros Hortifruti",
    ],
    Mercearia: [
        "Arroz", "Feijão", "Massas", "Óleos", "Açúcar", "Sal",
        "Farinhas", "Grãos", "Cereais", "Conservas", "Molhos",
        "Condimentos", "Temperos Secos", "Enlatados", "Outros Mercearia",
    ],
    Congelados: [
        "Pizzas", "Lasanhas", "Hambúrgueres", "Nuggets", "Sorvetes",
        "Polpas de Frutas", "Vegetais Congelados", "Outros Congelados",
    ],
    Limpeza: [
        "Detergentes", "Sabão em Pó", "Amaciantes", "Desinfetantes",
        "Água Sanitária", "Esponjas", "Panos", "Sacos de Lixo",
        "Multiuso", "Outros Limpeza",
    ],
    "Higiene Pessoal": [
        "Sabonetes", "Shampoos", "Condicionadores", "Cremes Dentais",
        "Escovas de Dente", "Desodorantes", "Papel Higiênico",
        "Absorventes", "Fraldas", "Outros Higiene",
    ],
    Bebê: [
        "Fraldas", "Leites Infantis", "Papinhas",
        "Lenços Umedecidos", "Pomadas", "Outros Bebê",
    ],
    Pet: [
        "Ração Cães", "Ração Gatos", "Petiscos",
        "Areia Sanitária", "Outros Pet",
    ],
    Snacks: [
        "Chocolates", "Balas", "Chicletes", "Salgadinhos",
        "Biscoitos Recheados", "Barras de Cereais", "Outros Snacks",
    ],
    Matinais: [
        "Cereais", "Achocolatados", "Aveia", "Granola",
        "Mel", "Geleias", "Outros Matinais",
    ],
    "Utilidades Domésticas": [
        "Papel Toalha", "Guardanapos", "Papel Alumínio",
        "Filme PVC", "Velas", "Fósforos", "Outros Utilidades",
    ],
    Outros: ["Diversos", "Não Classificado"],
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_MAP);

export function getSubcategories(category: string): string[] {
    return CATEGORY_MAP[category] ?? [];
}
