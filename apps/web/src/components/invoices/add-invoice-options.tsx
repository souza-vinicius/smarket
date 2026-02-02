'use client';

import { Camera, Upload, QrCode, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddInvoiceOptionsProps {
    onSelectUpload: () => void;
    onSelectQRCode: () => void;
}

export function AddInvoiceOptions({
    onSelectUpload,
    onSelectQRCode,
}: AddInvoiceOptionsProps) {
    return (
        <div className="space-y-4">
            {/* Primary CTA - Photo/Upload */}
            <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50/50 p-6">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <Camera className="h-8 w-8 text-emerald-600" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Tire uma foto do cupom fiscal
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                        Capture a imagem completa da nota para que possamos identificar os melhores preços para você.
                    </p>

                    {/* Primary Button */}
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onSelectUpload}
                        leftIcon={<Upload className="h-4 w-4" />}
                        className="shadow-md mb-4"
                    >
                        Enviar foto ou PDF/XML
                    </Button>

                    {/* Helper text */}
                    <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Info className="h-3 w-3" />
                        Se a nota for longa, você pode enviar várias fotos
                    </p>
                </div>
            </div>

            {/* Secondary - Quick Scan QR Code */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <button
                    onClick={onSelectQRCode}
                    className={cn(
                        'flex w-full items-center gap-4 text-left transition-colors',
                        'hover:opacity-80'
                    )}
                >
                    {/* Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
                        <QrCode className="h-6 w-6 text-slate-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">
                            Quick Scan
                        </h4>
                        <p className="text-sm text-slate-600">
                            Ou aponte sua câmera para o QR Code da nota fiscal impressa
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
