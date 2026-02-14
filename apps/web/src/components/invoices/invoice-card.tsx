"use client";

import { FileText, Calendar, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceCardProps {
    invoice: {
        id: string;
        issuer_name: string;
        total_value: number;
        issue_date: string;
        type?: string;
        product_count: number;
        access_key?: string;
    };
    onClick: () => void;
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
    return (
        <div
            onClick={onClick}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
        >
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle sm:size-12">
                <FileText className="size-5 text-primary sm:size-6" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                        {invoice.issuer_name}
                    </h3>
                    {invoice.type && (
                        <Badge variant="outline" className="flex-shrink-0 text-[10px] sm:text-xs">
                            {invoice.type}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground sm:gap-3 sm:text-sm">
                    <span className="flex items-center gap-1">
                        <Calendar className="size-3 sm:size-3.5" />
                        {formatDate(invoice.issue_date)}
                    </span>
                    <span>•</span>
                    <span>{invoice.product_count} itens</span>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-foreground sm:text-base">
                    {formatCurrency(invoice.total_value)}
                </p>
                <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground sm:size-5" />
            </div>
        </div>
    );
}
