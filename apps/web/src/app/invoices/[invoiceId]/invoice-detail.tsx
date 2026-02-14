"use client";

import { useState } from "react";

import { useRouter , useParams } from "next/navigation";

import {
  FileText,
  Calendar,
  CreditCard,
  Package,
  Trash2,
  Edit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";

import { CategoryDonutChart } from "@/components/invoices/category-donut-chart";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice, useDeleteInvoice } from "@/hooks/use-invoices";
import { useInvoiceAnalyses } from "@/hooks/use-insights";
import { dynamicRoute, useDynamicParam } from "@/lib/dynamic-params";
import { formatCurrency, formatDate } from "@/lib/utils";

const priorityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "bg-destructive-subtle text-destructive border-destructive/20",
    label: "Crítico",
  },
  high: {
    icon: TrendingUp,
    color: "bg-warning-subtle text-warning border-warning/20",
    label: "Alto",
  },
  medium: {
    icon: Info,
    color: "bg-info-subtle text-info border-info/20",
    label: "Médio",
  },
  low: {
    icon: Sparkles,
    color: "bg-muted text-muted-foreground border-border",
    label: "Baixo",
  },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  price_alert: { label: "Alerta de Preço", color: "bg-destructive/10 text-destructive" },
  category_insight: { label: "Categoria", color: "bg-primary/10 text-primary" },
  merchant_pattern: { label: "Estabelecimento", color: "bg-accent/10 text-accent" },
  summary: { label: "Resumo", color: "bg-muted text-muted-foreground" },
  budget_health: { label: "Orçamento", color: "bg-destructive/10 text-destructive" },
  per_capita_spending: { label: "Per Capita", color: "bg-info-subtle text-info" },
  essential_ratio: { label: "Essenciais", color: "bg-warning-subtle text-warning" },
  income_commitment: { label: "Renda", color: "bg-destructive/10 text-destructive" },
  children_spending: { label: "Crianças", color: "bg-primary/10 text-primary" },
  wholesale_opportunity: { label: "Atacado", color: "bg-accent/10 text-accent" },
  shopping_frequency: { label: "Frequência", color: "bg-warning-subtle text-warning" },
  seasonal_alert: { label: "Sazonalidade", color: "bg-info-subtle text-info" },
  savings_potential: { label: "Economia", color: "bg-primary/10 text-primary" },
  family_nutrition: { label: "Nutrição", color: "bg-accent/10 text-accent" },
};

function ProductItem({
  product,
  isFiltered,
}: {
  product: {
    description: string;
    normalized_name?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    category_name?: string;
  };
  isFiltered?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 border-b border-border py-3 transition-all last:border-0 ${
        isFiltered ? "scale-95 opacity-30" : "scale-100 opacity-100"
      }`}
    >
      <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
        <Package className="size-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-1 font-medium text-foreground">
          {product.normalized_name || product.description}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {product.category_name && (
            <Badge variant="secondary" size="sm">
              {product.category_name}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {product.quantity} {product.unit} × {formatCurrency(product.unit_price)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-foreground">
          {formatCurrency(product.total_price)}
        </p>
      </div>
    </div>
  );
}

export default function InvoiceDetailClient() {
  const router = useRouter();
  const params = useParams();

  const invoiceId = useDynamicParam(params.invoiceId as string);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: analyses, isLoading: isLoadingAnalyses } = useInvoiceAnalyses(invoiceId);
  const deleteMutation = useDeleteInvoice();

  const handleDelete = () => {
    deleteMutation.mutate(invoiceId, {
      onSuccess: () => {
        router.push("/invoices");
      },
    });
  };

  if (isLoading) {
    return (
      <PageLayout title="Detalhes da Nota" showBackButton>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </PageLayout>
    );
  }

  if (!invoice) {
    return (
      <PageLayout title="Nota não encontrada" showBackButton>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Nota não encontrada
          </h3>
          <p className="mb-4 text-muted-foreground">
            A nota fiscal que você procura não existe ou foi removida.
          </p>
          <Button onClick={() => { router.push("/invoices"); }}>
            Voltar para Notas
          </Button>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={invoice.issuer_name}
      subtitle={`Nota Fiscal ${invoice.number}/${invoice.series}`}
      showBackButton
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => { router.push(dynamicRoute("/invoices", invoiceId, "/edit")); }}
            aria-label="Editar"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={() => { setShowDeleteModal(true); }}
            aria-label="Excluir"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      }
    >
      {/* Summary Card */}
      <Card className="mb-4 border-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-emerald-100">Valor Total</p>
            <p className="text-3xl font-bold">
              {formatCurrency(invoice.total_value)}
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20">
            <FileText className="size-7" />
          </div>
        </div>
      </Card>

      {/* Info Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle">
              <Calendar className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium text-foreground">
                {formatDate(invoice.issue_date)}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle">
              <CreditCard className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium text-foreground">{invoice.type}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Card */}
      <Card className="mb-6">
        <h3 className="mb-4 font-semibold text-foreground">Detalhes</h3>
        <div className="space-y-3">
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-muted-foreground">CNPJ Emitente</span>
            <span className="font-medium text-foreground">
              {invoice.issuer_cnpj || "N/A"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Número</span>
            <span className="font-medium text-foreground">
              {invoice.number}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Série</span>
            <span className="font-medium text-foreground">
              {invoice.series}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Chave de Acesso</span>
            <span className="text-xs font-medium text-foreground">
              {invoice.access_key.slice(0, 20)}...
            </span>
          </div>
        </div>
      </Card>

      {/* Category Distribution Chart */}
      {invoice.products && invoice.products.length > 0 && (
        <div className="mb-6">
          <CategoryDonutChart
            products={invoice.products}
            onCategoryFilter={setSelectedCategory}
          />
        </div>
      )}

      {/* Products List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Produtos (
            {selectedCategory
              ? invoice.products?.filter(
                  (p) => (p.category_name || "Sem categoria") === selectedCategory
                ).length
              : invoice.products?.length || 0}
            )
          </h3>
          {selectedCategory && (
            <Badge variant="default" size="sm">
              {selectedCategory}
            </Badge>
          )}
        </div>

        <Card>
          {invoice.products && invoice.products.length > 0 ? (
            <div className="divide-y divide-border">
              {invoice.products.map((product, index) => {
                const productCategory = product.category_name || "Sem categoria";
                const isFiltered =
                  selectedCategory !== null && productCategory !== selectedCategory;

                return (
                  <ProductItem
                    key={index}
                    product={product}
                    isFiltered={isFiltered}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-3 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </Card>
      </section>

      {/* Analyses Section */}
      <section className="mt-6">
        <h3 className="mb-4 font-semibold text-foreground">
          Análises da Nota
          {isLoadingAnalyses ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">Carregando...</span>
          ) : analyses && analyses.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({analyses.length})
            </span>
          ) : null}
        </h3>

        {isLoadingAnalyses ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const priority = priorityConfig[analysis.priority as keyof typeof priorityConfig] || priorityConfig.medium;
              const Icon = priority.icon;
              const typeStyle = typeConfig[analysis.type] || typeConfig.summary;

              return (
                <Card
                  key={analysis.id}
                  className={`relative ${!analysis.is_read ? "border-primary/30" : ""}`}
                >
                  {/* Unread indicator */}
                  {!analysis.is_read && (
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Priority Icon */}
                    <div
                      className={`flex size-12 flex-shrink-0 items-center justify-center rounded-xl border ${priority.color}`}
                    >
                      <Icon className="size-6" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" size="sm" className={typeStyle.color}>
                          {typeStyle.label}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {priority.label}
                        </Badge>
                      </div>

                      <h4 className="mb-1 font-semibold text-foreground">{analysis.title}</h4>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {analysis.description}
                      </p>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(analysis.created_at)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="py-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="size-8 text-muted-foreground" />
            </div>
            <h4 className="mb-2 text-lg font-semibold text-foreground">
              Nenhuma análise ainda
            </h4>
            <p className="mx-auto max-w-md text-muted-foreground">
              As análises da IA aparecerão aqui após o processamento da nota fiscal.
            </p>
          </Card>
        )}
      </section>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); }}
        onConfirm={handleDelete}
        isConfirming={deleteMutation.isPending}
        variant="danger"
        title="Excluir Nota Fiscal"
        message={`Tem certeza que deseja excluir a nota fiscal de ${invoice.issuer_name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />
    </PageLayout>
  );
}
