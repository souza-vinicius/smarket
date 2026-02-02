'use client';

import { useState } from 'react';
import {
    FileText,
    Calendar,
    Store,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AddInvoiceOptions } from '@/components/invoices/add-invoice-options';
import { UploadModal } from '@/components/invoices/upload-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices, useUploadXML, useProcessQRCode } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

type UploadMode = 'qrcode' | 'xml' | null;

export default function AddInvoicePage() {
    const [uploadMode, setUploadMode] = useState<UploadMode>(null);
    const { data: invoices, isLoading: isLoadingInvoices } = useInvoices();
    const uploadXMLMutation = useUploadXML();
    const processQRCodeMutation = useProcessQRCode();

    // Get last 3 invoices
    const recentInvoices = invoices?.slice(0, 3) || [];

    const handleUploadXML = (file: File) => {
        uploadXMLMutation.mutate(file, {
            onSuccess: () => {
                setUploadMode(null);
            },
        });
    };

    const handleProcessQRCode = (url: string) => {
        processQRCodeMutation.mutate({ qrcode_url: url }, {
            onSuccess: () => {
                setUploadMode(null);
            },
        });
    };

    const handleSelectUpload = () => {
        setUploadMode('xml');
    };

    const handleSelectQRCode = () => {
        setUploadMode('qrcode');
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
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Bem-vindo ao SMarket, João
                        </h1>
                        <p className="text-slate-600">
                            Onde você quer economizar hoje?
                        </p>
                    </div>

                    {/* Options Section - Centered */}
                    <div className="max-w-xl mx-auto mb-8">
                        <AddInvoiceOptions
                            onSelectUpload={handleSelectUpload}
                            onSelectQRCode={handleSelectQRCode}
                        />
                    </div>

                    {/* Recent Invoices Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Notas Recentes
                            </h2>
                            <Link href="/invoices">
                                <Button variant="ghost" size="sm">
                                    Ver todas
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {isLoadingInvoices ? (
                                [...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-32 rounded-xl" />
                                ))
                            ) : recentInvoices.length > 0 ? (
                                recentInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                                                <Store className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {invoice.issuer_name}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {invoice.product_count} itens comprados
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Calendar className="h-3 w-3" />
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
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                        <FileText className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600">
                                        Nenhuma nota fiscal registrada ainda
                                    </p>
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
                onClose={() => setUploadMode(null)}
                onUploadXML={handleUploadXML}
                onProcessQRCode={handleProcessQRCode}
                isUploading={uploadXMLMutation.isPending || processQRCodeMutation.isPending}
            />
        </div>
    );
}
