"use client";

import { useRouter } from "next/navigation";

import { Trash2, Eye, AlertCircle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type InvoiceProcessingList } from "@/types";

interface PendingListProps {
  items: InvoiceProcessingList[];
  isLoading?: boolean;
  onDelete?: (processingId: string) => void;
  isDeleting?: boolean;
}

export function PendingList({
  items,
  isLoading = false,
  onDelete,
  isDeleting = false,
}: PendingListProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700">Aguardando...</Badge>;
      case "processing":
        return (
          <Badge className="flex items-center gap-1 bg-amber-100 text-amber-700">
            <Loader2 className="size-3 animate-spin" />
            Processando...
          </Badge>
        );
      case "extracted":
        return <Badge className="bg-green-100 text-green-700">Pronto para revisão</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionButton = (item: InvoiceProcessingList) => {
    if (item.status === "extracted") {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            router.push(`/invoices/review/${item.processing_id}`);
          }}
        >
          Revisar
        </Button>
      );
    }
    if (item.status === "pending" || item.status === "processing") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.push(`/invoices/review/${item.processing_id}`);
          }}
        >
          <Eye className="mr-2 size-4" />
          Ver Status
        </Button>
      );
    }
    if (item.status === "error") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.push(`/invoices/review/${item.processing_id}`);
          }}
        >
          Ver Detalhes
        </Button>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`skeleton-${String(i)}`}
            className="h-20 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.processing_id}
          className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Header with status badge */}
              <div className="mb-2 flex items-center gap-2">
                <h3 className="truncate font-semibold text-slate-900">
                  {item.extracted_issuer_name ||
                    `Processamento ${item.processing_id.slice(0, 8)}...`}
                </h3>
                {getStatusBadge(item.status)}
              </div>

              {/* Details row */}
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>
                  {item.image_count} imagem{item.image_count !== 1 ? "s" : ""}
                </span>
                {item.extracted_issue_date && (
                  <span>• {formatDate(item.extracted_issue_date)}</span>
                )}
                {item.confidence_score && item.confidence_score > 0 && (
                  <span>• Confiança: {Math.round(item.confidence_score * 100)}%</span>
                )}
              </div>

              {/* Errors display */}
              {item.errors && item.errors.length > 0 && (
                <div className="mb-2 space-y-1">
                  {item.errors.map((error, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-sm bg-red-50 p-2">
                      <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-red-600" />
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Total value if extracted */}
              {item.extracted_total_value && (
                <div className="text-sm font-semibold text-slate-900">
                  {formatCurrency(item.extracted_total_value)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {getActionButton(item)}
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-slate-400 hover:text-red-600"
                onClick={() => {
                  if (onDelete) {
                    onDelete(item.processing_id);
                  }
                }}
                disabled={isDeleting}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
