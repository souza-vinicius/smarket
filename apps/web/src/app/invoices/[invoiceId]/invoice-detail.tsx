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
} from "lucide-react";

import { CategoryDonutChart } from "@/components/invoices/category-donut-chart";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice, useDeleteInvoice } from "@/hooks/use-invoices";
import { dynamicRoute, readDynamicParam } from "@/lib/dynamic-params";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  const invoiceId = readDynamicParam(params.invoiceId as string);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
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
