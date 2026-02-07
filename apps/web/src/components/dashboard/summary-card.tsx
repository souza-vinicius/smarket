'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
}

export function SummaryCard({
  title,
  value,
  subtitle,
  change,
  icon,
  format = 'currency',
}: SummaryCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      default:
        return val.toString();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {change !== undefined && (
          <div
            className={`mt-1 flex items-center text-xs ${
              change > 0 ? 'text-destructive' : 'text-green-600'
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="mr-1 size-3" />
            ) : (
              <TrendingDown className="mr-1 size-3" />
            )}
            {formatPercentage(change)} vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
