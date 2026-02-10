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
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors"
        >
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-subtle flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {invoice.issuer_name}
                    </h3>
                    {invoice.type && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                            {invoice.type}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {formatDate(invoice.issue_date)}
                    </span>
                    <span>•</span>
                    <span>{invoice.product_count} itens</span>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-foreground text-sm sm:text-base">
                    {formatCurrency(invoice.total_value)}
                </p>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ml-auto mt-1" />
            </div>
        </div>
    );
}
