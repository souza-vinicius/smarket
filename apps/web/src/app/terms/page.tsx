import Link from "next/link";

import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/register"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Termos de Uso</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Última atualização: 11 de fevereiro de 2026
        </p>

        <div className="prose prose-sm space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o Mercado Esperto, você concorda com estes Termos de Uso.
              Caso não concorde com algum dos termos, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              O Mercado Esperto é uma plataforma de análise de notas fiscais (NF-e/NFC-e) que permite
              aos usuários digitalizar, organizar e analisar seus gastos com auxílio de
              inteligência artificial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Conta do Usuário</h2>
            <p>
              Você é responsável por manter a confidencialidade de sua senha e por todas as
              atividades realizadas com sua conta. Notifique-nos imediatamente sobre qualquer
              uso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Uso Aceitável</h2>
            <p>
              Você concorda em utilizar o serviço apenas para fins legais e de acordo com as
              leis brasileiras aplicáveis. É proibido utilizar o serviço para qualquer
              atividade fraudulenta ou ilícita.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, marcas, logos e software do Mercado Esperto são de propriedade exclusiva
              da plataforma e protegidos por leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Limitação de Responsabilidade</h2>
            <p>
              As análises e insights fornecidos pelo Mercado Esperto são de caráter informativo.
              Não nos responsabilizamos por decisões financeiras baseadas exclusivamente
              nas informações fornecidas pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de alterar estes termos a qualquer momento.
              Alterações significativas serão comunicadas por e-mail ou notificação na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes termos, entre em contato pelo e-mail:
              suporte@mercadoesperto.com.br
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
