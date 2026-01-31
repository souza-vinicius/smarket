'use client';

import { AlertTriangle, Info, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Analysis } from '@/types';
import { formatDate, getPriorityBgColor } from '@/lib/utils';

interface InsightCardProps {
  insight: Analysis;
  onMarkAsRead?: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  price_alert: <AlertTriangle className="h-4 w-4" />,
  category_insight: <TrendingUp className="h-4 w-4" />,
  merchant_pattern: <Info className="h-4 w-4" />,
  savings_opportunity: <Lightbulb className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  price_alert: 'Alerta de Preço',
  category_insight: 'Insight de Categoria',
  merchant_pattern: 'Padrão de Estabelecimento',
  savings_opportunity: 'Oportunidade de Economia',
};

const priorityLabels: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export function InsightCard({ insight, onMarkAsRead }: InsightCardProps) {
  return (
    <Card className={getPriorityBgColor(insight.priority)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {typeIcons[insight.type] || <Info className="h-4 w-4" />}
            <Badge variant="outline" className="text-xs">
              {typeLabels[insight.type] || insight.type}
            </Badge>
          </div>
          <Badge
            variant={
              insight.priority === 'high' || insight.priority === 'critical'
                ? 'destructive'
                : insight.priority === 'medium'
                ? 'warning'
                : 'secondary'
            }
            className="text-xs"
          >
            {priorityLabels[insight.priority]}
          </Badge>
        </div>
        <CardTitle className="text-base">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{insight.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(insight.created_at)}
          </span>
          {!insight.is_read && onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(insight.id)}
            >
              Marcar como lido
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
