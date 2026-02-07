'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Receipt, Calendar, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceList as InvoiceListType } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

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
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
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
          <Receipt className="h-12 w-12 text-muted-foreground" />
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
        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{invoice.issuer_name}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(invoice.issue_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
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
                  onClick={() => onViewDetails(invoice.id)}
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
