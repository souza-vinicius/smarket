"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { type AxiosError } from "axios";
import {
  FileText,
  Calendar,
  Store,
  Package,
  AlertTriangle,
  ArrowLeft,
  Plus,
  X,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCNPJEnrichment, type CNPJEnrichmentError } from "@/hooks/use-cnpj-enrichment";
import {
  useProcessingStatus,
  useConfirmInvoice,
  type ExtractedInvoiceData,
} from "@/hooks/use-invoices";
import { formatCNPJInput, getCNPJErrorMessage, isValidCNPJ } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_NAMES, getSubcategories } from "@/lib/category-options";
import { type InvoiceItem } from "@/types";

interface DuplicateErrorData {
  message: string;
  existingId?: string;
  existingNumber?: string;
  existingDate?: string;
  existingTotal?: number;
}

export default function InvoiceReviewClient() {
  const params = useParams();
  const router = useRouter();
  const processingId = params.processingId as string;

  const { data: processingData, isLoading, error: fetchError } = useProcessingStatus(processingId);
  const confirmMutation = useConfirmInvoice();
  const enrichmentMutation = useCNPJEnrichment();

  const [editedData, setEditedData] = useState<ExtractedInvoiceData | null>(null);
  const [duplicateError, setDuplicateError] = useState<DuplicateErrorData | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [enrichmentSuccess, setEnrichmentSuccess] = useState<string | null>(null);

  // Update editedData when processingData changes
  useEffect(() => {
    if (processingData?.extracted_data && !editedData) {
      const cleanedData = {
        ...processingData.extracted_data,
        total_value: Number(processingData.extracted_data.total_value) || 0,
        confidence: Number(processingData.extracted_data.confidence) || 0,
        items:
          (processingData.extracted_data.items as InvoiceItem[] | undefined)?.map((item) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            total_price: Number(item.total_price) || 0,
          })) || [],
      };
      setEditedData(cleanedData);
    }
  }, [processingData, editedData]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!editedData) return;

    const newItems = [...editedData.items];

    if (field === "quantity" || field === "unit_price" || field === "total_price") {
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : Number(value) || 0;
      newItems[index] = { ...newItems[index], [field]: numValue };
    } else {
      if (field === "description") {
        newItems[index] = {
          ...newItems[index],
          description: value as string,
          normalized_name: newItems[index].normalized_name ? (value as string) : undefined,
        };
      } else if (field === "category_name") {
        newItems[index] = { ...newItems[index], category_name: value as string, subcategory: "" };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    }

    if (field === "quantity" || field === "unit_price") {
      const quantity = Number(newItems[index].quantity) || 0;
      const unitPrice = Number(newItems[index].unit_price) || 0;
      newItems[index].total_price = quantity * unitPrice;
    }

    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

    setEditedData({
      ...editedData,
      items: newItems,
      total_value: newTotal,
    });
  };

  const handleHeaderChange = (field: keyof ExtractedInvoiceData, value: string) => {
    if (!editedData) return;

    if (field === "issuer_cnpj") {
      const formatted = formatCNPJInput(value);
      setEditedData({ ...editedData, [field]: formatted });
      const error = getCNPJErrorMessage(formatted);
      setCnpjError(error);
      setValidationError(null);
    } else if (field === "issue_date") {
      if (value) {
        const selectedDate = new Date(value);
        const now = new Date();
        setDateError(selectedDate > now ? "A data da nota fiscal não pode ser futura" : null);
      } else {
        setDateError(null);
      }
      setEditedData({ ...editedData, [field]: value });
    } else {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleConfirm = async () => {
    if (!editedData) return;

    if (editedData.issuer_cnpj) {
      const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
      if (cnpjValidationError) {
        setCnpjError(cnpjValidationError);
        setValidationError("Por favor, corrija os erros antes de continuar.");
        return;
      }
    }

    if (editedData.issue_date) {
      const selectedDate = new Date(editedData.issue_date);
      const now = new Date();
      if (selectedDate > now) {
        setDateError("A data da nota fiscal não pode ser futura");
        setValidationError("Por favor, corrija os erros antes de continuar.");
        return;
      }
    }

    try {
      await confirmMutation.mutateAsync({
        processingId,
        data: editedData as ExtractedInvoiceData & Record<string, unknown>,
      });
      router.push("/invoices");
    } catch (err) {
      const axiosError = err as AxiosError<{
        detail?:
        | {
          error?: string;
          message?: string;
          field?: string;
          hint?: string;
          existing_invoice_id?: string;
          existing_invoice_number?: string;
          existing_invoice_date?: string;
          existing_invoice_total?: number;
        }
        | string;
      }>;

      if (axiosError.response?.status === 400) {
        const detail = axiosError?.response?.data?.detail;
        if (typeof detail === "object" && detail !== null && detail.error === "invalid_cnpj") {
          setCnpjError(detail.message || "CNPJ inválido");
          setValidationError(detail.hint || "Verifique o CNPJ informado.");
          return;
        }
      }

      if (axiosError.response?.status === 409) {
        const detail = axiosError?.response?.data?.detail;
        if (typeof detail === "object" && detail !== null) {
          setDuplicateError({
            message: detail.message || "Esta nota fiscal já foi cadastrada",
            existingId: detail.existing_invoice_id,
            existingNumber: detail.existing_invoice_number,
            existingDate: detail.existing_invoice_date,
            existingTotal: detail.existing_invoice_total,
          });
        } else {
          setDuplicateError({
            message: typeof detail === "string" ? detail : "Esta nota fiscal já foi cadastrada",
          });
        }
      } else {
        const errorMessage =
          typeof axiosError?.response?.data?.detail === "object"
            ? axiosError.response.data.detail.message
            : axiosError?.response?.data?.detail ||
            axiosError.message ||
            "Falha ao salvar nota fiscal";
        alert(errorMessage);
      }
    }
  };

  const handleEnrichCNPJ = async () => {
    if (!editedData?.issuer_cnpj) {
      setValidationError("CNPJ não informado");
      return;
    }

    const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
    if (cnpjValidationError) {
      setCnpjError(cnpjValidationError);
      setValidationError("Por favor, corrija o CNPJ antes de consultar.");
      return;
    }

    setEnrichmentSuccess(null);
    setValidationError(null);

    try {
      const result = await enrichmentMutation.mutateAsync(editedData.issuer_cnpj);
      if (result.suggested_name && editedData) {
        setEditedData({
          ...editedData,
          issuer_name: result.suggested_name,
        });
        setEnrichmentSuccess("Nome atualizado com sucesso!");
      }
    } catch (err) {
      console.error("CNPJ enrichment error:", err);
      const axiosError = err as AxiosError<{ detail?: CNPJEnrichmentError }>;
      const detail = axiosError?.response?.data?.detail;
      if (detail) {
        setValidationError(detail.hint ? `${detail.message}\n${detail.hint}` : detail.message || "Erro ao consultar CNPJ");
      } else {
        setValidationError(axiosError?.message || "Erro ao consultar CNPJ. Tente novamente.");
      }
    }
  };

  const handleAddItem = () => {
    if (!editedData) return;
    const newItems = [
      ...editedData.items,
      {
        code: "",
        description: "",
        quantity: 1,
        unit: "UN",
        unit_price: 0,
        total_price: 0,
      },
    ];
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    if (!editedData || editedData.items.length <= 1) return;
    const newItems = editedData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleUseItemsSum = () => {
    if (!editedData) return;
    const itemsSum = editedData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, total_value: itemsSum });
  };

  // Loading state
  if (isLoading) {
    return (
      <PageLayout title="Validar Nota" showBackButton>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <PageLayout title="Erro" showBackButton>
        <Card className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">{String(fetchError)}</p>
          <Button size="lg" onClick={() => router.push("/invoices")} className="!h-12">
            Voltar para Notas
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Processing states
  if (!processingData || processingData.status === "pending" || processingData.status === "processing") {
    const statusMessage =
      processingData?.status === "processing"
        ? "Processando nota fiscal com IA..."
        : processingData?.status === "pending"
          ? "Aguardando processamento..."
          : "Carregando dados...";

    return (
      <PageLayout title="Processando" showBackButton>
        <Card className="text-center py-12">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{statusMessage}</h3>
          <p className="text-muted-foreground">Isso pode levar alguns segundos...</p>
        </Card>
      </PageLayout>
    );
  }

  // Error status from backend
  if (processingData.status === "error") {
    return (
      <PageLayout title="Erro no Processamento" showBackButton>
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-destructive-subtle mx-auto mb-4 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro no Processamento</h3>
          <p className="text-destructive mb-4">
            {processingData.errors.length > 0
              ? processingData.errors.join(", ")
              : "Não foi possível processar a nota fiscal"}
          </p>
          <Button size="lg" onClick={() => router.push("/invoices")} className="!h-12">
            Voltar
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Data not available
  if (!editedData) {
    return (
      <PageLayout title="Dados não disponíveis" showBackButton>
        <Card className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Dados extraídos não disponíveis</h3>
          <Button size="lg" onClick={() => router.push("/invoices")} className="!h-12">
            Voltar
          </Button>
        </Card>
      </PageLayout>
    );
  }

  const confidence = Number(editedData.confidence) || 0;
  const confidenceColor =
    confidence >= 0.9 ? "success" : confidence >= 0.7 ? "warning" : "danger";

  const itemsSum = editedData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalMismatch = Math.abs(itemsSum - Number(editedData.total_value)) > 0.01;

  return (
    <PageLayout
      title="Validar Nota Fiscal"
      subtitle="Revise e confirme os dados extraídos"
      showBackButton
    >
      {/* Confidence Badge */}
      <div className="mb-6 flex items-center justify-between">
        <Badge variant={confidenceColor} size="lg">
          Confiança: {Math.round(confidence * 100)}%
        </Badge>
        {editedData.image_count && editedData.image_count > 1 && (
          <Badge variant="secondary">{editedData.image_count} imagens processadas</Badge>
        )}
      </div>

      {/* Duplicate Warning */}
      {editedData.potential_duplicates && editedData.potential_duplicates.length > 0 && (
        <Card className="mb-6 border-warning bg-warning-subtle/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-warning-foreground">Possível nota fiscal duplicada</p>
              <p className="text-sm text-warning-foreground/80 mt-1">
                Uma nota fiscal similar já foi cadastrada. Verifique antes de confirmar.
              </p>
              {editedData.potential_duplicates.map((dup, idx) => (
                <div key={idx} className="mt-2 p-3 bg-background rounded-lg border border-warning">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {dup.number && <span>N°: <strong>{dup.number}</strong></span>}
                    {dup.issue_date && (
                      <span>
                        Data: <strong>{new Date(dup.issue_date).toLocaleDateString("pt-BR")}</strong>
                      </span>
                    )}
                    {dup.total_value !== undefined && (
                      <span>Total: <strong>{formatCurrency(dup.total_value)}</strong></span>
                    )}
                    {dup.issuer_name && <span>Emissor: <strong>{dup.issuer_name}</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Validation Errors */}
      {validationError && (
        <Card className="mb-6 border-destructive bg-destructive-subtle/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive text-sm">{validationError}</p>
          </div>
        </Card>
      )}

      {/* Header Information */}
      <Card className="mb-6">
        <h3 className="font-semibold text-foreground mb-4">Informações da Nota</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issuer */}
          <div className="space-y-4">
            <div>
              <label htmlFor="issuer-name" className="block text-sm font-medium text-muted-foreground mb-2">
                Estabelecimento
              </label>
              <input
                id="issuer-name"
                type="text"
                value={editedData.issuer_name}
                onChange={(e) => handleHeaderChange("issuer_name", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Nome do estabelecimento"
              />
            </div>

            <div>
              <label htmlFor="issuer-cnpj" className="block text-sm font-medium text-muted-foreground mb-2">
                CNPJ
              </label>
              <div className="flex gap-2">
                <input
                  id="issuer-cnpj"
                  type="text"
                  value={editedData.issuer_cnpj}
                  onChange={(e) => handleHeaderChange("issuer_cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`flex-1 px-4 py-2 rounded-lg border ${cnpjError
                      ? "border-destructive bg-destructive-subtle/30 text-destructive"
                      : "border-border bg-background text-foreground"
                    } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void handleEnrichCNPJ()}
                  disabled={enrichmentMutation.isPending || !!cnpjError || !editedData.issuer_cnpj}
                  title="Consultar dados do CNPJ"
                >
                  {enrichmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {cnpjError && <p className="text-sm text-destructive mt-1">{cnpjError}</p>}
              {enrichmentSuccess && (
                <p className="text-sm text-success mt-1 flex items-center gap-1">
                  <Check className="w-4 h-4" /> {enrichmentSuccess}
                </p>
              )}
              {!cnpjError && !enrichmentSuccess && editedData.issuer_cnpj && isValidCNPJ(editedData.issuer_cnpj) && (
                <p className="text-sm text-success mt-1 flex items-center gap-1">
                  <Check className="w-4 h-4" /> CNPJ válido
                </p>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-muted-foreground mb-2">
                Número da NF
              </label>
              <input
                id="number"
                type="text"
                value={editedData.number}
                onChange={(e) => handleHeaderChange("number", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Número"
              />
            </div>

            <div>
              <label htmlFor="series" className="block text-sm font-medium text-muted-foreground mb-2">
                Série
              </label>
              <input
                id="series"
                type="text"
                value={editedData.series}
                onChange={(e) => handleHeaderChange("series", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Série"
              />
            </div>

            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-muted-foreground mb-2">
                Data de Emissão
              </label>
              <input
                id="issue_date"
                type="datetime-local"
                value={editedData.issue_date ? new Date(editedData.issue_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => handleHeaderChange("issue_date", e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
                className={`w-full px-4 py-2 rounded-lg border ${dateError
                    ? "border-destructive bg-destructive-subtle/30 text-destructive"
                    : "border-border bg-background text-foreground"
                  } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors`}
              />
              {dateError && <p className="text-sm text-destructive mt-1">{dateError}</p>}
            </div>
          </div>
        </div>

        {/* Access Key */}
        <div className="mt-6">
          <label htmlFor="access-key" className="block text-sm font-medium text-muted-foreground mb-2">
            Chave de Acesso
          </label>
          <input
            id="access-key"
            type="text"
            value={editedData.access_key}
            onChange={(e) => handleHeaderChange("access_key", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="44 dígitos"
          />
        </div>
      </Card>

      {/* Items List */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-foreground">Produtos ({editedData.items.length})</h3>
          <Button
            variant="outline"
            size="lg"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAddItem}
            className="w-full sm:w-auto !h-12"
          >
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-4">
          {editedData.items.map((item, index) => (
            <div key={index} className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Descrição</label>
                  <input
                    type="text"
                    value={item.normalized_name || item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    value={Number(item.quantity) || 0}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Unidade</label>
                  <input
                    type="text"
                    value={item.unit || ""}
                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Preço Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    value={Number(item.unit_price) || 0}
                    onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                {/* Total Price */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Total</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2 rounded-lg border border-border bg-muted text-foreground font-semibold">
                      {formatCurrency(Number(item.total_price) || 0)}
                    </div>
                    {editedData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-destructive hover:bg-destructive-subtle"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Categoria</label>
                  <select
                    value={item.category_name || ""}
                    onChange={(e) => handleItemChange(index, "category_name", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  >
                    <option value="">Selecione uma categoria</option>
                    {CATEGORY_NAMES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Subcategoria</label>
                  <select
                    value={item.subcategory || ""}
                    onChange={(e) => handleItemChange(index, "subcategory", e.target.value)}
                    disabled={!item.category_name}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{item.category_name ? "Selecione uma subcategoria" : "Selecione uma categoria primeiro"}</option>
                    {item.category_name && getSubcategories(item.category_name).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Total Mismatch Warning */}
      {totalMismatch && (
        <Card className="mb-6 border-warning bg-warning-subtle/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning-foreground">Divergência de Valores</p>
                <p className="text-sm text-warning-foreground/80 mt-1">
                  Soma dos itens: {formatCurrency(itemsSum)} ≠ Total: {formatCurrency(Number(editedData.total_value))}
                  <span className="ml-2">
                    (diferença: {formatCurrency(Math.abs(itemsSum - Number(editedData.total_value)))})
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="warning"
              size="lg"
              onClick={handleUseItemsSum}
              className="w-full sm:w-auto !h-12 whitespace-nowrap"
            >
              Usar Soma dos Itens
            </Button>
          </div>
        </Card>
      )}

      {/* Total Card */}
      <Card className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Valor Total</p>
            <p className="text-3xl font-bold">{formatCurrency(Number(editedData.total_value))}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => void handleConfirm()}
          disabled={confirmMutation.isPending || !!cnpjError}
          size="lg"
          className="flex-1 !h-14 !text-base font-semibold"
          isLoading={confirmMutation.isPending}
        >
          Confirmar e Salvar
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/invoices")}
          disabled={confirmMutation.isPending}
          size="lg"
          className="flex-1 sm:flex-none sm:w-auto !h-14 !text-base font-semibold"
        >
          Cancelar
        </Button>
      </div>

      {/* Duplicate Error Modal */}
      {duplicateError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-destructive shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive-subtle mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-destructive mb-2">Nota Fiscal Duplicada</h3>
              <p className="text-muted-foreground mb-4">{duplicateError.message}</p>

              {duplicateError.existingNumber && (
                <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                  <p className="text-sm text-muted-foreground mb-2">Nota Existente:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Número:</span>
                      <strong>{duplicateError.existingNumber}</strong>
                    </div>
                    {duplicateError.existingDate && (
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <strong>{new Date(duplicateError.existingDate).toLocaleDateString("pt-BR")}</strong>
                      </div>
                    )}
                    {duplicateError.existingTotal !== undefined && (
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <strong>{formatCurrency(duplicateError.existingTotal)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={() => {
                    setDuplicateError(null);
                    router.push("/invoices");
                  }}
                  className="!h-12"
                >
                  Ver Todas as Notas
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setDuplicateError(null)}
                  className="!h-12"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
