"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  Store,
  CreditCard,
  Package,
  ArrowLeft,
  Trash2,
  Edit,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Skeleton, SkeletonListItem } from "@/components/ui/skeleton";
import { useInvoice, useDeleteInvoice } from "@/hooks/use-invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";

interface InvoiceDetailPageProps {
  params: {
    invoiceId: string;
  };
}

function ProductItem({
  product,
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
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center">
        <Package className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground line-clamp-1">
          {product.normalized_name || product.description}
        </h4>
        <div className="flex flex-wrap items-center gap-2 mt-1">
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

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const { data: invoice, isLoading } = useInvoice(params.invoiceId);
  const deleteMutation = useDeleteInvoice();

  const handleDelete = () => {
    deleteMutation.mutate(params.invoiceId, {
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
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nota não encontrada
          </h3>
          <p className="text-muted-foreground mb-4">
            A nota fiscal que você procura não existe ou foi removida.
          </p>
          <Button onClick={() => router.push("/invoices")}>
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
            onClick={() => router.push(`/invoices/${params.invoiceId}/edit`)}
            aria-label="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={() => setShowDeleteModal(true)}
            aria-label="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      {/* Summary Card */}
      <Card className="mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Valor Total</p>
            <p className="text-3xl font-bold">
              {formatCurrency(invoice.total_value)}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
        </div>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
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
            <div className="w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
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
        <h3 className="font-semibold text-foreground mb-4">Detalhes</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">CNPJ Emitente</span>
            <span className="font-medium text-foreground">
              {invoice.issuer_cnpj || "N/A"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Número</span>
            <span className="font-medium text-foreground">
              {invoice.number}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Série</span>
            <span className="font-medium text-foreground">
              {invoice.series}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Chave de Acesso</span>
            <span className="font-medium text-foreground text-xs">
              {invoice.access_key.slice(0, 20)}...
            </span>
          </div>
        </div>
      </Card>

      {/* Products List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">
            Produtos ({invoice.products?.length || 0})
          </h3>
        </div>

        <Card>
          {invoice.products && invoice.products.length > 0 ? (
            <div className="divide-y divide-border">
              {invoice.products.map((product, index) => (
                <ProductItem key={index} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </Card>
      </section>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
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
