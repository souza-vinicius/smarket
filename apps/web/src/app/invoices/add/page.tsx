"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { FileText, Calendar, Store, ChevronRight } from "lucide-react";

import { AddInvoiceOptions } from "@/components/invoices/add-invoice-options";
import { UploadModal } from "@/components/invoices/upload-modal";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices, useUploadXML, useProcessQRCode, useUploadPhotos } from "@/hooks/use-invoices";
import { formatCurrency, formatDate } from "@/lib/utils";

type UploadMode = "qrcode" | "xml" | "photo" | null;

interface SubscriptionError {
  limitType: "invoice" | "analysis";
  currentPlan: string;
}

export default function AddInvoicePage() {
  const router = useRouter();
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoices();
  const uploadXMLMutation = useUploadXML();
  const processQRCodeMutation = useProcessQRCode();

  const uploadPhotosMutation = useUploadPhotos();

  // Get last 3 invoices
  const recentInvoices = invoices?.slice(0, 3) || [];

  const handleUploadXML = (file: File) => {
    uploadXMLMutation.mutate(file, {
      onSuccess: () => {
        setUploadMode(null);
        router.push("/invoices");
      },
      onError: (error: any) => {
        const status = error?.response?.status;
        if (status === 402 || status === 429) {
          const headers = error?.response?.headers;
          const limitType = (headers?.["x-limit-type"] as "invoice" | "analysis") || "invoice";
          const currentPlan = (headers?.["x-current-plan"] as string) || "free";

          setSubscriptionError({ limitType, currentPlan });
          setUploadMode(null);
        }
      },
    });
  };

  const handleUploadImages = (files: File[]) => {
    uploadPhotosMutation.mutate(files, {
      onSuccess: (data) => {
        setUploadMode(null);
        if (data.processing_id) {
          router.push(`/invoices/review/${data.processing_id}`);
        }
      },
      onError: (error: any) => {
        const status = error?.response?.status;
        if (status === 402 || status === 429) {
          const headers = error?.response?.headers;
          const limitType = (headers?.["x-limit-type"] as "invoice" | "analysis") || "invoice";
          const currentPlan = (headers?.["x-current-plan"] as string) || "free";

          setSubscriptionError({ limitType, currentPlan });
          setUploadMode(null);
        }
      },
    });
  };

  const handleProcessQRCode = (url: string) => {
    processQRCodeMutation.mutate(
      { qrcode_url: url },
      {
        onSuccess: () => {
          setUploadMode(null);
          router.push("/invoices");
        },
        onError: (error: any) => {
          const status = error?.response?.status;
          if (status === 402 || status === 429) {
            const headers = error?.response?.headers;
            const limitType = (headers?.["x-limit-type"] as "invoice" | "analysis") || "invoice";
            const currentPlan = (headers?.["x-current-plan"] as string) || "free";

            setSubscriptionError({ limitType, currentPlan });
            setUploadMode(null);
          }
        },
      }
    );
  };

  const handleSelectUpload = () => {
    setUploadMode("photo");
  };

  const handleSelectQRCode = () => {
    setUploadMode("qrcode");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header
          title="Adicionar Nota Fiscal"
          subtitle="Registre suas compras e acompanhe a variação de preços"
        />

        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Bem-vindo ao SMarket, João</h1>
            <p className="text-slate-600">Onde você quer economizar hoje?</p>
          </div>

          {/* Options Section - Centered */}
          <div className="mx-auto mb-8 max-w-xl">
            <AddInvoiceOptions
              onSelectUpload={handleSelectUpload}
              onSelectQRCode={handleSelectQRCode}
            />
          </div>

          {/* Recent Invoices Section */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Notas Recentes</h2>
              <Link href="/invoices">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {isLoadingInvoices ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`skeleton-${String(i)}`} className="h-32 rounded-xl" />
                ))
              ) : recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                        <Store className="size-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900">
                          {invoice.issuer_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {invoice.product_count} itens comprados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="size-3" />
                        {formatDate(invoice.issue_date)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(invoice.total_value)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100">
                    <FileText className="size-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600">Nenhuma nota fiscal registrada ainda</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-400">
            © 2024 SMarket - Gestão Inteligente de Economia
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadMode !== null}
        onClose={() => {
          setUploadMode(null);
        }}
        onUploadXML={handleUploadXML}
        onUploadImages={handleUploadImages}
        onProcessQRCode={handleProcessQRCode}
        isUploading={
          uploadXMLMutation.isPending ||
          processQRCodeMutation.isPending ||
          uploadPhotosMutation.isPending
        }
        initialTab={uploadMode === "qrcode" ? "qrcode" : "images"}
      />

      {/* Upgrade Modal */}
      {subscriptionError && (
        <UpgradeModal
          isOpen={true}
          onClose={() => {
            setSubscriptionError(null);
          }}
          limitType={subscriptionError.limitType}
          currentPlan={subscriptionError.currentPlan}
        />
      )}
    </div>
  );
}
