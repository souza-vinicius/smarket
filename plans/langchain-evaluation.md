# Avaliação: Implementação com LangChain vs SDK Nativo

## Implementação Atual (SDK Nativo Google)

A implementação atual usa o SDK oficial do Google (`google.genai`):

```python
# apps/api/src/services/gemini_extractor.py

from google import genai
from google.genai import types

class GeminiExtractor:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-3.0-flash"

    async def extract_from_image(self, image_bytes: bytes) -> ExtractedInvoiceData:
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[...],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=EXTRACTION_PROMPT,
                temperature=0.1
            )
        )
        return self._parse_response(response.text)
```

**Prós:**
- SDK oficial e atualizado
- Integração nativa com Gemini 3.0
- Suporte a JSON Schema nativo
- Menor overhead
- Atualizações garantidas pelo Google

**Contras:**
- Acoplado ao Google/Gemini
- Menos flexibilidade para trocar de provedor

---

## Implementação com LangChain

### Dependências Necessárias

```bash
pip install langchain langchain-google-genai pydantic
```

### Código com LangChain

```python
# apps/api/src/services/langchain_extractor.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel

class ExtractedInvoiceData(BaseModel):
    access_key: Optional[str] = None
    number: Optional[str] = None
    series: Optional[str] = None
    issue_date: Optional[str] = None
    issuer_name: Optional[str] = None
    issuer_cnpj: Optional[str] = None
    total_value: Optional[float] = None
    items: list[dict] = []
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    warnings: list[str] = []

class LangChainExtractor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.0-flash",
            api_key=settings.GEMINI_API_KEY,
            temperature=0.1
        )

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """Você é especialista em extrair dados de notas fiscais
            brasileiras (NFC-e/NF-e). Extraia os dados em JSON.""")
            ("human", "Analise esta imagem de nota fiscal:\n{image}")
        ])

        self.output_parser = PydanticOutputParser(pydantic_object=ExtractedInvoiceData)

    async def extract_from_image(self, image_bytes: bytes) -> ExtractedInvoiceData:
        # Converter imagem para base64
        import base64
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:image/jpeg;base64,{image_base64}"

        # Criar chain
        chain = self.prompt | self.llm | self.output_parser

        # Executar
        result = await chain.ainvoke({"image": image_url})

        return result
```

---

## Comparativo Técnico

| Aspecto | SDK Nativo | LangChain |
|---------|------------|-----------|
| **Linhas de código** | ~80 | ~120 |
| **Dependências** | 1 (`google-genai`) | 2+ (`langchain`, `langchain-google-genai`) |
| **Overhead** | Baixo | Médio |
| **Flexibilidade** | Baixa (vendor lock-in) | Alta (abstração) |
| **Curva de aprendizado** | Baixa | Média |
| **Manutenção** | Simplicidade | Suporte ativo da comunidade |

---

## Análise de Custos Adicionais

### LangChain Adds Overhead?

| Componente | Custo Adicional |
|------------|-----------------|
| Dependências extras | ~10MB extras |
| Latência | +10-50ms por requisição |
| Manutenção | Updates frequentes |

### Quando LangChain Vale a Pena?

**Use LangChain se:**
- Planeja suportar múltiplos LLMs (OpenAI, Anthropic, local)
- Quer usar agentes e tools
- Precisa de cadeias complexas (RAG, memory)
- Equipe já conhece LangChain

**Use SDK Nativo se:**
- Só precisa de Gemini
- Quer mínima latência
- Quer menor complexidade
- Equipe é nova em LLMs

---

## Recomendação

### Para Este Projeto (Mercado Esperto)

**Recomendação: Manter SDK Nativo**

Justificativa:

1. **Custo-benefício**: O projeto já usa OpenAI. Para Gemini, SDK nativo é mais simples
2. **性能 (Performance)**: Menos camadas = menor latência
3. **Manutenibilidade**: Código mais direto e menor
4. **Necessidade real**: Não há planos imediatos de suportar múltiplos provedores

### Se Quiser Padronizar com LangChain

```python
# Abstração para suportar múltiplos LLMs no futuro

from abc import ABC, abstractmethod

class InvoiceExtractor(ABC):
    @abstractmethod
    async def extract_from_image(self, image_bytes: bytes) -> ExtractedInvoiceData:
        pass

class GeminiExtractor(InvoiceExtractor):
    """Implementação com SDK nativo Google"""
    pass

class LangChainOpenAIExtractor(InvoiceExtractor):
    """Implementação com LangChain + OpenAI"""
    pass
```

---

## Conclusão

| Critério | SDK Nativo | LangChain |
|----------|------------|-----------|
| Simplicidade | ✅ Melhor | ⚠️ Mais complexo |
| Performance | ✅ Melhor | ⚠️ Overhead |
| Flexibilidade | ❌ Vendor lock-in | ✅ Abstração |
| Manutenção | ✅ Diretamente do Google | ✅ Comunidade ativa |
| Recomendação | **Sim** | Só se precisar multi-provider |

**Decisão Final**: Para o Mercado Esperto, **SDK Nativo é a escolha correta** pelo menor overhead e simplicidade. LangChain seria justificado apenas se houvesse necessidade real de suportar múltiplos provedores de LLM.