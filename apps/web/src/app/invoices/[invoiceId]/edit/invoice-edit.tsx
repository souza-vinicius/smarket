"use client";

import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";

import { type AxiosError } from "axios";
import {
  FileText,
  Calendar,
  Package,
  AlertTriangle,
  Plus,
  X,
  Check,
  Loader2,
  Search,
  Hash,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCNPJEnrichment, type CNPJEnrichmentError } from "@/hooks/use-cnpj-enrichment";
import { useInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { CATEGORY_NAMES, getSubcategories } from "@/lib/category-options";
import { formatCNPJInput, getCNPJErrorMessage, isValidCNPJ } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/utils";
import { type InvoiceItem, type InvoiceUpdateRequest } from "@/types";

interface EditableInvoice {
  issuer_name: string;
  issuer_cnpj: string;
  number: string;
  series: string;
  issue_date: string;
  access_key: string;
  total_value: number;
  items: InvoiceItem[];
}

export default function InvoiceEditClient() {
  const params = useParams();
  const router = useRouter();

  // In static export, extract real ID from URL pathname
  const invoiceId = (() => {
    if (typeof window === 'undefined') {return params.invoiceId as string;}
    const {pathname} = window.location;
    const match = pathname.match(/^\/invoices\/([^/]+)/);
    return match ? match[1] : params.invoiceId as string;
  })();

  const { data: invoice, isLoading, error: fetchError } = useInvoice(invoiceId);
  const updateMutation = useUpdateInvoice();
  const enrichmentMutation = useCNPJEnrichment();

  const [editedData, setEditedData] = useState<EditableInvoice | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [enrichmentSuccess, setEnrichmentSuccess] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize editedData from fetched invoice
  useEffect(() => {
    if (invoice && !editedData) {
      const items: InvoiceItem[] = (invoice.items ?? invoice.products ?? []).map((item) => ({
        code: item.code || "",
        description: item.description || "",
        normalized_name: item.normalized_name || undefined,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || "UN",
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
        category_name: item.category_name || "",
        subcategory: item.subcategory || "",
      }));

      setEditedData({
        issuer_name: invoice.issuer_name || "",
        issuer_cnpj: invoice.issuer_cnpj ? formatCNPJInput(invoice.issuer_cnpj) : "",
        number: invoice.number || "",
        series: invoice.series || "",
        issue_date: invoice.issue_date
          ? new Date(invoice.issue_date).toISOString().slice(0, 16)
          : "",
        access_key: invoice.access_key || "",
        total_value: Number(invoice.total_value) || 0,
        items,
      });
    }
  }, [invoice, editedData]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!editedData) {return;}

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

  const handleHeaderChange = (field: keyof EditableInvoice, value: string) => {
    if (!editedData) {return;}

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
      setValidationError(null);
    } else {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleAddItem = () => {
    if (!editedData) {return;}
    const newItems = [
      ...editedData.items,
      {
        code: "",
        description: "",
        quantity: 1,
        unit: "UN",
        unit_price: 0,
        total_price: 0,
        category_name: "",
        subcategory: "",
      },
    ];
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    if (!editedData || editedData.items.length <= 1) {return;}
    const newItems = editedData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleUseItemsSum = () => {
    if (!editedData) {return;}
    const itemsSum = editedData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, total_value: itemsSum });
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
      const axiosError = err as AxiosError<{ detail?: CNPJEnrichmentError }>;
      const detail = axiosError?.response?.data?.detail;
      setValidationError(detail?.message || "Erro ao consultar CNPJ");
    }
  };

  const handleSave = async () => {
    if (!editedData) {return;}

    if (editedData.issuer_cnpj) {
      const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
      if (cnpjValidationError) {
        setCnpjError(cnpjValidationError);
        setValidationError("Por favor, corrija os erros antes de salvar.");
        return;
      }
    }

    if (editedData.issue_date) {
      const selectedDate = new Date(editedData.issue_date);
      const now = new Date();
      if (selectedDate > now) {
        setDateError("A data da nota fiscal não pode ser futura");
        setValidationError("Por favor, corrija os erros antes de salvar.");
        return;
      }
    }

    try {
      const updateData: InvoiceUpdateRequest = {
        number: editedData.number,
        series: editedData.series,
        issue_date: editedData.issue_date ? new Date(editedData.issue_date).toISOString() : undefined,
        issuer_name: editedData.issuer_name,
        issuer_cnpj: editedData.issuer_cnpj,
        total_value: editedData.total_value,
        access_key: editedData.access_key,
        items: editedData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          total_price: Number(item.total_price) || 0,
        })),
      };

      await updateMutation.mutateAsync({ id: invoiceId, data: updateData });
      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 800);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: any }>;
      const detail = axiosError?.response?.data?.detail;
      setValidationError(typeof detail === "string" ? detail : detail?.message || "Falha ao salvar alterações");
    }
  };

  const handleCancel = () => {
    router.push(`/invoices/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <PageLayout title="Editar Nota" showBackButton>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </PageLayout>
    );
  }

  if (fetchError || !invoice || !editedData) {
    return (
      <PageLayout title="Erro" showBackButton>
        <Card className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-4 size-16 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">Nota não encontrada</h3>
          <Button onClick={() => { router.push("/invoices"); }}>Voltar para Notas</Button>
        </Card>
      </PageLayout>
    );
  }

  const itemsSum = editedData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalMismatch = Math.abs(itemsSum - Number(editedData.total_value)) > 0.01;

  return (
    <PageLayout
      title="Editar Nota Fiscal"
      subtitle={`NF-e nº ${invoice.number} · ${invoice.issuer_name}`}
      showBackButton
    >
      {/* Validation Errors */}
      {validationError && (
        <Card className="mb-6 border-destructive bg-destructive-subtle/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{validationError}</p>
          </div>
        </Card>
      )}

      {/* Save Success Messenger */}
      {saveSuccess && (
        <Card className="mb-6 border-success bg-success-subtle/30">
          <div className="flex items-center gap-2 text-success">
            <Check className="size-5" />
            <p className="font-semibold">Alterações salvas com sucesso! Redirecionando...</p>
          </div>
        </Card>
      )}

      {/* Header Information Card */}
      <Card className="mb-6">
        <h3 className="mb-4 font-semibold text-foreground">Informações do Emissor</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label htmlFor="issuer-name" className="mb-2 block text-sm font-medium text-muted-foreground">
                Estabelecimento
              </label>
              <input
                id="issuer-name"
                type="text"
                value={editedData.issuer_name}
                onChange={(e) => { handleHeaderChange("issuer_name", e.target.value); }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nome do estabelecimento"
              />
            </div>

            <div>
              <label htmlFor="issuer-cnpj" className="mb-2 block text-sm font-medium text-muted-foreground">
                CNPJ
              </label>
              <div className="flex gap-2">
                <input
                  id="issuer-cnpj"
                  type="text"
                  value={editedData.issuer_cnpj}
                  onChange={(e) => { handleHeaderChange("issuer_cnpj", e.target.value); }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`flex-1 rounded-lg border px-4 py-2 ${cnpjError
                    ? "border-destructive bg-destructive-subtle/30 text-destructive"
                    : "border-border bg-background text-foreground"
                    } transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void handleEnrichCNPJ()}
                  disabled={enrichmentMutation.isPending || !!cnpjError || !editedData.issuer_cnpj}
                >
                  {enrichmentMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </div>
              {cnpjError && <p className="mt-1 text-sm text-destructive">{cnpjError}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">NF-e Número</label>
                <input
                  type="text"
                  value={editedData.number}
                  onChange={(e) => { handleHeaderChange("number", e.target.value); }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Série</label>
                <input
                  type="text"
                  value={editedData.series}
                  onChange={(e) => { handleHeaderChange("series", e.target.value); }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Data de Emissão</label>
              <input
                type="datetime-local"
                value={editedData.issue_date}
                onChange={(e) => { handleHeaderChange("issue_date", e.target.value); }}
                className={`w-full rounded-lg border px-4 py-2 ${dateError
                  ? "border-destructive bg-destructive-subtle/30 text-destructive"
                  : "border-border bg-background text-foreground"
                  } transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20`}
              />
              {dateError && <p className="mt-1 text-sm text-destructive">{dateError}</p>}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Chave de Acesso</label>
          <input
            type="text"
            value={editedData.access_key}
            onChange={(e) => { handleHeaderChange("access_key", e.target.value); }}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 font-mono text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {/* Items List Card */}
      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Produtos ({editedData.items.length})</h3>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={handleAddItem}
          >
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-4">
          {editedData.items.map((item, index) => (
            <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Descrição</label>
                  <input
                    type="text"
                    value={item.normalized_name || item.description}
                    onChange={(e) => { handleItemChange(index, "description", e.target.value); }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Qtd</label>
                    <input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => { handleItemChange(index, "quantity", e.target.value); }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Un</label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => { handleItemChange(index, "unit", e.target.value); }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Preço Un.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => { handleItemChange(index, "unit_price", e.target.value); }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-right text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Total</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-border bg-muted px-4 py-2 font-semibold text-foreground">
                      {formatCurrency(Number(item.total_price) || 0)}
                    </div>
                    {editedData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { handleRemoveItem(index); }}
                        className="size-10 text-destructive hover:bg-destructive-subtle"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Categoria</label>
                  <select
                    value={item.category_name}
                    onChange={(e) => { handleItemChange(index, "category_name", e.target.value); }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione uma categoria</option>
                    {CATEGORY_NAMES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Subcategoria</label>
                  <select
                    value={item.subcategory}
                    onChange={(e) => { handleItemChange(index, "subcategory", e.target.value); }}
                    disabled={!item.category_name}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-warning-foreground">Divergência de Valores</p>
                <p className="mt-1 text-sm text-warning-foreground/80">
                  Soma: {formatCurrency(itemsSum)} ≠ Total informado: {formatCurrency(editedData.total_value)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseItemsSum}
              className="w-full border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white sm:w-auto"
            >
              Usar Soma dos Itens
            </Button>
          </div>
        </Card>
      )}

      {/* Summary/Total Card */}
      <Card className="mb-8 border-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-emerald-100">Valor Total</p>
            <p className="text-3xl font-bold">{formatCurrency(editedData.total_value)}</p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20">
            <FileText className="size-7" />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending || !!cnpjError || !!dateError || saveSuccess}
          size="lg"
          className="!h-14 flex-1 text-lg font-semibold"
          isLoading={updateMutation.isPending}
        >
          {saveSuccess ? "Salvo!" : "Salvar Alterações"}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          size="lg"
          className="!h-14 flex-1 text-lg font-semibold"
        >
          Cancelar
        </Button>
      </div>
    </PageLayout>
  );
}
