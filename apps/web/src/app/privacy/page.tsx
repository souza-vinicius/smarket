import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 11 de fevereiro de 2026
        </p>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Dados Coletados
            </h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de cadastro: nome, e-mail</li>
              <li>Notas fiscais enviadas (XML, fotos, QR codes)</li>
              <li>Dados de compras extraídos das notas fiscais</li>
              <li>Informações de perfil familiar (quando fornecidas voluntariamente)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Uso dos Dados
            </h2>
            <p>Seus dados são utilizados para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Análise de gastos e geração de insights personalizados</li>
              <li>Categorização de produtos e identificação de padrões de compra</li>
              <li>Comparação de preços e alertas de economia</li>
              <li>Melhoria contínua dos nossos algoritmos de IA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Armazenamento e Segurança
            </h2>
            <p>
              Seus dados são armazenados em servidores seguros com criptografia.
              Utilizamos práticas de segurança como hashing de senhas (bcrypt),
              tokens JWT para autenticação e comunicação HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Compartilhamento de Dados
            </h2>
            <p>
              Não compartilhamos, vendemos ou alugamos seus dados pessoais a
              terceiros. Dados podem ser compartilhados apenas quando exigido por
              lei ou ordem judicial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Serviços de Terceiros
            </h2>
            <p>
              Utilizamos serviços de IA (como OpenAI, Google Gemini) para
              processamento de notas fiscais. As imagens e textos enviados a esses
              serviços são usados exclusivamente para extração de dados e não são
              armazenados por eles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Seus Direitos (LGPD)
            </h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você
              tem direito a:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Solicitar correção de dados incompletos ou inexatos</li>
              <li>Solicitar exclusão de seus dados</li>
              <li>Revogar consentimento a qualquer momento</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Cookies e Rastreamento
            </h2>
            <p>
              Utilizamos cookies essenciais para funcionamento da autenticação.
              Não utilizamos cookies de rastreamento de terceiros ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Contato do Encarregado (DPO)
            </h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre privacidade,
              entre em contato: privacidade@mercadoesperto.com.br
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
