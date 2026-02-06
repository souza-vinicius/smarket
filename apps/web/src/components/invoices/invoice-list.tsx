'use client';

import { Receipt, Calendar, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { type InvoiceList as InvoiceListType } from '@/types';

interface InvoiceListProps {
  invoices: InvoiceListType[];
  isLoading: boolean;
  onViewDetails: (id: string) => void;
}

export function InvoiceList({
  invoices,
  isLoading,
  onViewDetails,
}: InvoiceListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={`skeleton-${String(i)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Receipt className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhuma nota fiscal</h3>
          <p className="text-sm text-muted-foreground">
            Adicione sua primeira nota fiscal para começar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="transition-shadow hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-muted-foreground" />
                  <h3 className="font-medium">{invoice.issuer_name}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(invoice.issue_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="size-3" />
                    {invoice.product_count} produtos
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">
                  {formatCurrency(invoice.total_value)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onViewDetails(invoice.id); }}
                >
                  Ver detalhes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
