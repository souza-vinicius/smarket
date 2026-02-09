"use client";

import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";

import { type AxiosError } from "axios";

import { Badge } from "@/components/ui/badge";
import { useCNPJEnrichment, type CNPJEnrichmentError } from "@/hooks/use-cnpj-enrichment";
import {
  useProcessingStatus,
  useConfirmInvoice,
  type ExtractedInvoiceData,
} from "@/hooks/use-invoices";
import { formatCNPJInput, getCNPJErrorMessage, isValidCNPJ } from "@/lib/cnpj";
import { type InvoiceItem } from "@/types";

interface DuplicateErrorData {
  message: string;
  existingId?: string;
  existingNumber?: string;
  existingDate?: string;
  existingTotal?: number;
}

export default function InvoiceReviewPage() {
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
      // Ensure all numeric values are properly converted
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
    if (!editedData) {
      return;
    }

    const newItems = [...editedData.items];

    // Convert to number if it's a numeric field
    if (field === "quantity" || field === "unit_price" || field === "total_price") {
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : Number(value) || 0;
      // eslint-disable-next-line security/detect-object-injection
      newItems[index] = { ...newItems[index], [field]: numValue };
    } else {
      // Special handling for description field - update both description and normalized_name
      if (field === "description") {
        // eslint-disable-next-line security/detect-object-injection
        newItems[index] = {
          ...newItems[index],
          description: value as string,
          // If there was a normalized_name, update it too so the input reflects the change
          normalized_name: newItems[index].normalized_name ? (value as string) : undefined,
        };
      } else {
        // eslint-disable-next-line security/detect-object-injection
        newItems[index] = { ...newItems[index], [field]: value };
      }
    }

    // Recalculate total_price if quantity or unit_price changed
    if (field === "quantity" || field === "unit_price") {
      // eslint-disable-next-line security/detect-object-injection
      const quantity = Number(newItems[index].quantity) || 0;
      // eslint-disable-next-line security/detect-object-injection
      const unitPrice = Number(newItems[index].unit_price) || 0;
      // eslint-disable-next-line security/detect-object-injection
      newItems[index].total_price = quantity * unitPrice;
    }

    // Recalculate total_value
    const newTotal = newItems.reduce((sum, item) => {
      return sum + (Number(item.total_price) || 0);
    }, 0);

    setEditedData({
      ...editedData,
      items: newItems,
      total_value: newTotal,
    });
  };

  const handleHeaderChange = (field: keyof ExtractedInvoiceData, value: string) => {
    if (!editedData) {
      return;
    }

    // Special handling for CNPJ field
    if (field === "issuer_cnpj") {
      // Format as user types
      const formatted = formatCNPJInput(value);
      setEditedData({ ...editedData, [field]: formatted });

      // Validate and show error
      const error = getCNPJErrorMessage(formatted);
      setCnpjError(error);

      // Clear general validation error when user edits
      setValidationError(null);
    } else if (field === "issue_date") {
      // Validate date is not in the future
      if (value) {
        const selectedDate = new Date(value);
        const now = new Date();

        if (selectedDate > now) {
          setDateError("A data da nota fiscal não pode ser futura");
        } else {
          setDateError(null);
        }
      } else {
        setDateError(null);
      }

      setEditedData({ ...editedData, [field]: value });
    } else {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleConfirm = async () => {
    if (!editedData) {
      return;
    }

    // Validate CNPJ before submitting
    if (editedData.issuer_cnpj) {
      const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
      if (cnpjValidationError) {
        setCnpjError(cnpjValidationError);
        setValidationError("Por favor, corrija os erros antes de continuar.");
        return;
      }
    }

    // Validate date is not in the future
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

      // Check if it's an invalid CNPJ error (400 Bad Request)
      if (axiosError.response?.status === 400) {
        const detail = axiosError?.response?.data?.detail;
        if (typeof detail === "object" && detail !== null && detail.error === "invalid_cnpj") {
          setCnpjError(detail.message || "CNPJ inválido");
          setValidationError(detail.hint || "Verifique o CNPJ informado.");
          return;
        }
      }

      // Check if it's a duplicate invoice error (409 Conflict)
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

    // Validate CNPJ before enriching
    const cnpjValidationError = getCNPJErrorMessage(editedData.issuer_cnpj);
    if (cnpjValidationError) {
      setCnpjError(cnpjValidationError);
      setValidationError("Por favor, corrija o CNPJ antes de consultar.");
      return;
    }

    // Clear previous messages
    setEnrichmentSuccess(null);
    setValidationError(null);

    try {
      const result = await enrichmentMutation.mutateAsync(editedData.issuer_cnpj);

      // Update issuer name with suggested name
      if (result.suggested_name && editedData) {
        setEditedData({
          ...editedData,
          issuer_name: result.suggested_name,
        });
        setEnrichmentSuccess(
          `Nome atualizado com sucesso! Fonte: ${result.data.source === "brasilapi" ? "BrasilAPI" : "ReceitaWS"}`
        );
      }
    } catch (err) {
      console.error("CNPJ enrichment error:", err);
      const axiosError = err as AxiosError<{ detail?: CNPJEnrichmentError }>;
      console.log("Response status:", axiosError?.response?.status);
      console.log("Response data:", axiosError?.response?.data);

      const detail = axiosError?.response?.data?.detail;

      if (detail) {
        setValidationError(detail.message || "Erro ao consultar CNPJ");
        if (detail.hint) {
          setValidationError(`${detail.message}\n${detail.hint}`);
        }
      } else {
        // Generic error
        const errorMessage = axiosError?.message || "Erro ao consultar CNPJ. Tente novamente.";
        setValidationError(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    router.push("/invoices");
  };

  // Loading state - initial fetch
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-transparent" />
          <p className="font-mono text-sm text-[#666]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Error state - only show if there's a real error AND we're not still processing
  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <p className="mb-4 text-red-600">{String(fetchError)}</p>
          <button
            onClick={() => {
              router.push("/invoices");
            }}
            className="bg-[#2d2d2d] px-6 py-2 font-mono text-sm text-white transition-colors hover:bg-[#1a1a1a]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Processing states - show spinner with status
  if (
    !processingData ||
    processingData.status === "pending" ||
    processingData.status === "processing"
  ) {
    const statusMessage =
      processingData?.status === "processing"
        ? "Processando nota fiscal com IA..."
        : processingData?.status === "pending"
          ? "Aguardando processamento..."
          : "Carregando dados...";

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-transparent" />
          <p className="mb-2 font-mono text-sm text-[#666]">{statusMessage}</p>
          <p className="font-mono text-xs text-[#999]">Isso pode levar alguns segundos...</p>
        </div>
      </div>
    );
  }

  // Error status from backend
  if (processingData.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block rounded-full bg-red-100 p-4">
            <svg
              className="size-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-bold" style={{ fontFamily: "Crimson Text, serif" }}>
            Erro no Processamento
          </h3>
          <p className="mb-4 font-mono text-sm text-red-600">
            {processingData.errors.length > 0
              ? processingData.errors.join(", ")
              : "Não foi possível processar a nota fiscal"}
          </p>
          <button
            onClick={() => {
              router.push("/invoices");
            }}
            className="bg-[#2d2d2d] px-6 py-2 font-mono text-sm text-white transition-colors hover:bg-[#1a1a1a]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Data not available after extraction
  if (!editedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <p className="mb-4 text-red-600">Dados extraídos não disponíveis</p>
          <button
            onClick={() => {
              router.push("/invoices");
            }}
            className="bg-[#2d2d2d] px-6 py-2 font-mono text-sm text-white transition-colors hover:bg-[#1a1a1a]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const confidence = Number(editedData.confidence) || 0;

  const confidenceColor = confidence >= 0.9 ? "#16a34a" : confidence >= 0.7 ? "#f59e0b" : "#dc2626";

  const confidenceLabel =
    confidence >= 0.9
      ? "ALTA CONFIANÇA"
      : confidence >= 0.7
        ? "CONFIANÇA MÉDIA"
        : "REVISAR COM ATENÇÃO";

  // --- Computed values for UX indicators ---
  const itemsSum = editedData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalMismatch = Math.abs(itemsSum - Number(editedData.total_value)) > 0.01;

  const isFieldEmpty = (value: string | undefined | null): boolean => !value || value.trim() === "";

  const accessKeyDigits = (editedData.access_key || "").replace(/\D/g, "");
  const accessKeyValid = accessKeyDigits.length === 44;

  const fieldHighlight = (value: string | undefined | null): string =>
    isFieldEmpty(value) ? "border-amber-400 bg-amber-50/50" : "border-transparent";

  const handleAddItem = () => {
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
    if (editedData.items.length <= 1) {
      return;
    }
    const newItems = editedData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setEditedData({ ...editedData, items: newItems, total_value: newTotal });
  };

  const handleUseItemsSum = () => {
    setEditedData({ ...editedData, total_value: itemsSum });
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Import fonts via link or CSS file instead of jsx global */}

        {/* Receipt Container */}
        <div className="receipt-texture relative overflow-hidden rounded-none border border-[#e5e5e5] bg-[#faf9f7] shadow-xl">
          {/* Confidence Stamp */}
          <div
            className="stamp-rotate absolute right-6 top-6"
            style={{
              border: `3px solid ${confidenceColor}`,
              padding: "12px 20px",
              transform: "rotate(-5deg)",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
            }}
          >
            <div
              className="font-mono text-xs font-bold tracking-wider"
              style={{ color: confidenceColor }}
            >
              {confidenceLabel}
            </div>
            <div
              className="mt-1 text-center font-mono text-2xl font-bold"
              style={{ color: confidenceColor }}
            >
              {Math.round(confidence * 100)}%
            </div>
          </div>

          <div className="p-8 sm:p-12">
            {/* Image Count Badge */}
            {editedData.image_count && editedData.image_count > 1 && (
              <div className="mb-6 inline-block bg-[#2d2d2d] px-4 py-2 font-mono text-xs text-white">
                {editedData.image_count} IMAGENS PROCESSADAS
              </div>
            )}

            {/* Duplicate Warning Banner */}
            {editedData.potential_duplicates && editedData.potential_duplicates.length > 0 && (
              <div className="mb-6 border-l-4 border-amber-500 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 size-5 shrink-0 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-mono text-sm font-semibold text-amber-800">
                      Possível nota fiscal duplicada
                    </p>
                    <p className="mt-1 font-mono text-xs text-amber-700">
                      Uma nota fiscal similar já foi cadastrada. Verifique antes de confirmar.
                    </p>
                    {editedData.potential_duplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="mt-2 rounded bg-amber-100 p-2 font-mono text-xs text-amber-900"
                      >
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {dup.number && (
                            <span>
                              N°: <strong>{dup.number}</strong>
                            </span>
                          )}
                          {dup.issue_date && (
                            <span>
                              Data:{" "}
                              <strong>
                                {new Date(dup.issue_date).toLocaleDateString("pt-BR")}
                              </strong>
                            </span>
                          )}
                          {dup.total_value !== undefined && (
                            <span>
                              Total: <strong>R$ {dup.total_value.toFixed(2)}</strong>
                            </span>
                          )}
                          {dup.issuer_name && (
                            <span>
                              Emissor: <strong>{dup.issuer_name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Header Info */}
            <div className="mb-8 border-b-2 border-dotted border-[#ccc] pb-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Issuer */}
                <div>
                  <label
                    htmlFor="issuer-name"
                    className="mb-2 block font-mono text-xs tracking-wider text-[#666]"
                  >
                    ESTABELECIMENTO
                  </label>
                  <input
                    id="issuer-name"
                    type="text"
                    value={editedData.issuer_name}
                    onChange={(e) => {
                      handleHeaderChange("issuer_name", e.target.value);
                    }}
                    className={`editable-cell w-full border-b-2 bg-transparent px-2 py-1 font-mono text-lg font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${fieldHighlight(editedData.issuer_name)}`}
                    style={{ fontFamily: "IBM Plex Mono, monospace" }}
                    placeholder="Nome do estabelecimento"
                  />
                  <div className="mt-1">
                    <label
                      htmlFor="issuer-cnpj"
                      className="mb-1 block font-mono text-xs tracking-wider text-[#666]"
                    >
                      CNPJ
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="issuer-cnpj"
                        type="text"
                        value={editedData.issuer_cnpj}
                        onChange={(e) => {
                          handleHeaderChange("issuer_cnpj", e.target.value);
                        }}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className={`editable-cell flex-1 border-b-2 bg-transparent px-2 py-1 font-mono text-sm transition-colors ${
                          cnpjError
                            ? "border-red-500 text-red-600 focus:border-red-600"
                            : "border-transparent text-[#666] hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                        }`}
                        style={{ fontFamily: "IBM Plex Mono, monospace" }}
                      />
                      <button
                        onClick={() => {
                          void handleEnrichCNPJ();
                        }}
                        disabled={
                          enrichmentMutation.isPending || !!cnpjError || !editedData.issuer_cnpj
                        }
                        className="shrink-0 border border-[#2d2d2d] bg-white px-3 py-1 font-mono text-xs font-semibold tracking-wider text-[#2d2d2d] transition-all hover:bg-[#2d2d2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#2d2d2d]"
                        title="Consultar dados do CNPJ na Receita Federal"
                      >
                        {enrichmentMutation.isPending ? "..." : "🔍"}
                      </button>
                    </div>
                    {cnpjError && (
                      <p className="mt-1 font-mono text-xs text-red-600">{cnpjError}</p>
                    )}
                    {enrichmentSuccess && (
                      <p className="mt-1 font-mono text-xs text-green-600">✓ {enrichmentSuccess}</p>
                    )}
                    {!cnpjError &&
                      !enrichmentSuccess &&
                      editedData.issuer_cnpj &&
                      isValidCNPJ(editedData.issuer_cnpj) && (
                        <p className="mt-1 font-mono text-xs text-green-600">✓ CNPJ válido</p>
                      )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-[#666]">NF-e Nº</span>
                    <input
                      type="text"
                      value={editedData.number}
                      onChange={(e) => {
                        handleHeaderChange("number", e.target.value);
                      }}
                      className={`editable-cell border-b-2 bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${fieldHighlight(editedData.number)}`}
                      style={{ fontFamily: "IBM Plex Mono, monospace" }}
                      placeholder="Nº da nota"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-[#666]">SÉRIE</span>
                    <input
                      type="text"
                      value={editedData.series}
                      onChange={(e) => {
                        handleHeaderChange("series", e.target.value);
                      }}
                      className="editable-cell border-b-2 border-transparent bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                      style={{ fontFamily: "IBM Plex Mono, monospace" }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs tracking-wider text-[#666]">DATA</span>
                      <input
                        type="datetime-local"
                        value={
                          editedData.issue_date
                            ? new Date(editedData.issue_date).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          handleHeaderChange("issue_date", e.target.value);
                        }}
                        max={new Date().toISOString().slice(0, 16)}
                        className={`editable-cell border-b-2 bg-transparent px-2 py-1 text-right font-mono text-sm font-semibold transition-colors ${
                          dateError
                            ? "border-red-500 text-red-600 focus:border-red-600"
                            : "border-transparent hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                        }`}
                        style={{ fontFamily: "IBM Plex Mono, monospace" }}
                      />
                    </div>
                    {dateError && (
                      <p className="mt-1 text-right font-mono text-xs text-red-600">{dateError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Access Key */}
              <div className="mt-6">
                <label
                  htmlFor="access-key"
                  className="mb-2 block font-mono text-xs tracking-wider text-[#666]"
                >
                  CHAVE DE ACESSO
                  {!isFieldEmpty(editedData.access_key) && !accessKeyValid && (
                    <span className="ml-2 text-amber-600">
                      ({accessKeyDigits.length}/44 dígitos)
                    </span>
                  )}
                </label>
                <input
                  id="access-key"
                  type="text"
                  value={editedData.access_key}
                  onChange={(e) => {
                    handleHeaderChange("access_key", e.target.value);
                  }}
                  className={`editable-cell w-full border-b-2 bg-transparent px-2 py-1 font-mono text-xs tracking-wider transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d] ${
                    isFieldEmpty(editedData.access_key)
                      ? "border-amber-400 bg-amber-50/50 text-amber-700"
                      : !accessKeyValid
                        ? "border-amber-400 text-amber-700"
                        : "border-transparent text-[#666]"
                  }`}
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  placeholder="44 dígitos — geralmente no rodapé da nota"
                />
                {isFieldEmpty(editedData.access_key) && (
                  <p className="mt-1 font-mono text-xs italic text-amber-600">
                    Chave de acesso não encontrada pela IA — preencha manualmente se possível
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h2 className="mb-6 text-2xl font-bold" style={{ fontFamily: "Crimson Text, serif" }}>
                Itens
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#2d2d2d]">
                      <th className="w-20 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        CÓD
                      </th>
                      <th className="min-w-64 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        DESCRIÇÃO
                      </th>
                      <th className="w-20 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        QTD
                      </th>
                      <th className="w-16 px-2 py-3 text-center font-mono text-xs tracking-wider text-[#666]">
                        UN
                      </th>
                      <th className="w-28 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        CATEGORIA
                      </th>
                      <th className="w-28 px-2 py-3 text-left font-mono text-xs tracking-wider text-[#666]">
                        SUBCATEGORIA
                      </th>
                      <th className="w-28 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        PREÇO UN.
                      </th>
                      <th className="w-28 px-2 py-3 text-right font-mono text-xs tracking-wider text-[#666]">
                        TOTAL
                      </th>
                      <th className="w-10 px-1 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {editedData.items.map((item, index) => (
                      <tr
                        key={`item-${index}`}
                        className="border-b border-dotted border-[#e5e5e5] transition-colors hover:bg-[#faf9f7]"
                      >
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.code || ""}
                            onChange={(e) => {
                              handleItemChange(index, "code" as keyof InvoiceItem, e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-xs text-[#999] transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.normalized_name || item.description}
                            onChange={(e) => {
                              handleItemChange(index, "description", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.001"
                            value={Number(item.quantity) || 0}
                            onChange={(e) => {
                              handleItemChange(index, "quantity", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-right font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.unit || ""}
                            onChange={(e) => {
                              handleItemChange(index, "unit", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-center font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.category_name || ""}
                            onChange={(e) => {
                              handleItemChange(index, "category_name", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.subcategory || ""}
                            onChange={(e) => {
                              handleItemChange(index, "subcategory", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={Number(item.unit_price) || 0}
                            onChange={(e) => {
                              handleItemChange(index, "unit_price", e.target.value);
                            }}
                            className="editable-cell w-full border-b-2 border-transparent bg-transparent p-1 text-right font-mono text-sm transition-colors hover:border-[#e5e5e5] focus:border-[#2d2d2d]"
                            style={{ fontFamily: "IBM Plex Mono, monospace" }}
                          />
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-sm font-semibold">
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1">
                              R$ {(Number(item.total_price) || 0).toFixed(2)}
                              {Math.abs(
                                (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) -
                                  (Number(item.total_price) || 0)
                              ) > 0.02 &&
                                Number(item.total_price) > 0 && (
                                  <span
                                    title="Total recalculado (qtd × preço unitário)"
                                    className="text-amber-500"
                                  >
                                    ⟳
                                  </span>
                                )}
                            </span>
                            {item.discount && Number(item.discount) > 0 && (
                              <Badge variant="success" className="text-xs">
                                DESC: R$ {Number(item.discount).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-1 py-3 text-center">
                          {editedData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveItem(index);
                              }}
                              className="rounded p-1 text-[#999] transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Remover item"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full border-2 border-dashed border-[#ccc] py-3 font-mono text-xs tracking-wider text-[#999] transition-colors hover:border-[#2d2d2d] hover:text-[#2d2d2d]"
              >
                + ADICIONAR ITEM
              </button>
            </div>

            {/* Sum Mismatch Banner */}
            {totalMismatch && (
              <div className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold tracking-wider text-amber-800">
                      ⚠ DIVERGÊNCIA DE VALORES
                    </p>
                    <p className="mt-1 font-mono text-sm text-amber-700">
                      Soma dos itens: R$ {itemsSum.toFixed(2)} ≠ Total: R${" "}
                      {(Number(editedData.total_value) || 0).toFixed(2)}
                      <span className="ml-2 text-amber-500">
                        (dif: R$ {Math.abs(itemsSum - Number(editedData.total_value)).toFixed(2)})
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseItemsSum}
                    className="shrink-0 border border-amber-600 bg-white px-4 py-2 font-mono text-xs font-semibold tracking-wider text-amber-700 transition-colors hover:bg-amber-600 hover:text-white"
                  >
                    USAR SOMA DOS ITENS
                  </button>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mb-8 border-t-2 border-[#2d2d2d] pt-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold" style={{ fontFamily: "Crimson Text, serif" }}>
                  Total
                </span>
                <span
                  className="font-mono text-3xl font-bold"
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                >
                  R$ {(Number(editedData.total_value) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {editedData.warnings && editedData.warnings.length > 0 && (
              <div className="mb-8 border-l-4 border-amber-500 bg-amber-50 p-6">
                <h3 className="mb-3 font-mono text-xs font-bold tracking-wider text-amber-800">
                  ⚠ AVISOS
                </h3>
                <ul className="space-y-2">
                  {editedData.warnings.map((warning, index) => (
                    <li
                      key={`warning-${String(index)}-${warning.substring(0, 10)}`}
                      className="font-mono text-sm text-amber-700"
                    >
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <div className="mb-6 border-l-4 border-red-500 bg-red-50 p-4">
                <p className="font-mono text-sm text-red-700">⚠ {validationError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={confirmMutation.isPending || !!cnpjError}
                className="flex-1 transform bg-[#2d2d2d] py-4 font-mono text-sm font-semibold tracking-wider text-white transition-all hover:scale-[1.02] hover:bg-[#1a1a1a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                title={cnpjError ? "Corrija os erros antes de confirmar" : ""}
              >
                {confirmMutation.isPending ? "SALVANDO..." : "CONFIRMAR E SALVAR"}
              </button>
              <button
                onClick={handleCancel}
                disabled={confirmMutation.isPending}
                className="flex-1 border-2 border-[#2d2d2d] px-8 py-4 font-mono text-sm font-semibold tracking-wider text-[#2d2d2d] transition-all hover:bg-[#2d2d2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center font-mono text-xs text-[#999]">
          Clique nos campos para editar • Alterações são salvas ao confirmar
        </p>
      </div>

      {/* Duplicate Error Modal */}
      {duplicateError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="receipt-texture w-full max-w-md border-2 border-red-500 bg-white shadow-2xl">
            <div className="p-8">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="size-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2
                className="mb-4 text-center text-2xl font-bold text-red-600"
                style={{ fontFamily: "Crimson Text, serif" }}
              >
                Nota Fiscal Duplicada
              </h2>

              {/* Message */}
              <p className="mb-6 text-center font-mono text-sm text-gray-700">
                {duplicateError.message}
              </p>

              {/* Existing Invoice Info */}
              {duplicateError.existingNumber && (
                <div className="mb-6 border-l-4 border-red-500 bg-gray-50 p-4">
                  <p className="mb-2 font-mono text-xs text-gray-600">NOTA EXISTENTE:</p>
                  <div className="space-y-1 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Número:</span>
                      <span className="font-semibold">{duplicateError.existingNumber}</span>
                    </div>
                    {duplicateError.existingDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data:</span>
                        <span className="font-semibold">
                          {new Date(duplicateError.existingDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {duplicateError.existingTotal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">
                          R$ {duplicateError.existingTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setDuplicateError(null);
                    router.push("/invoices");
                  }}
                  className="w-full bg-[#2d2d2d] py-3 font-mono text-sm font-semibold tracking-wider text-white transition-colors hover:bg-[#1a1a1a]"
                >
                  VER TODAS AS NOTAS
                </button>
                <button
                  onClick={() => {
                    setDuplicateError(null);
                  }}
                  className="w-full border-2 border-[#2d2d2d] py-3 font-mono text-sm font-semibold tracking-wider text-[#2d2d2d] transition-colors hover:bg-[#f5f5f5]"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
