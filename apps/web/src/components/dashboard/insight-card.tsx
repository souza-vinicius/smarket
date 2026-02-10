"use client";

import {
  AlertTriangle,
  Apple,
  Baby,
  BarChart3,
  Calendar,
  DollarSign,
  Heart,
  Info,
  Lightbulb,
  PiggyBank,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getPriorityBgColor } from "@/lib/utils";
import { type Analysis } from "@/types";

interface InsightCardProps {
  insight: Analysis;
  onMarkAsRead?: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  price_alert: <AlertTriangle className="size-4" />,
  category_insight: <TrendingUp className="size-4" />,
  merchant_pattern: <Info className="size-4" />,
  savings_opportunity: <Lightbulb className="size-4" />,
  budget_health: <Heart className="size-4" />,
  per_capita_spending: <Users className="size-4" />,
  essential_ratio: <ShoppingCart className="size-4" />,
  income_commitment: <DollarSign className="size-4" />,
  children_spending: <Baby className="size-4" />,
  wholesale_opportunity: <Warehouse className="size-4" />,
  shopping_frequency: <Calendar className="size-4" />,
  seasonal_alert: <Apple className="size-4" />,
  savings_potential: <PiggyBank className="size-4" />,
  family_nutrition: <BarChart3 className="size-4" />,
};

const typeLabels: Record<string, string> = {
  price_alert: "Alerta de Preço",
  category_insight: "Insight de Categoria",
  merchant_pattern: "Padrão de Estabelecimento",
  savings_opportunity: "Oportunidade de Economia",
  budget_health: "Saúde do Orçamento",
  per_capita_spending: "Gasto Per Capita",
  essential_ratio: "Essenciais vs Supérfluos",
  income_commitment: "Comprometimento da Renda",
  children_spending: "Gastos com Crianças",
  wholesale_opportunity: "Oportunidade de Atacado",
  shopping_frequency: "Frequência de Compras",
  seasonal_alert: "Alerta Sazonal",
  savings_potential: "Potencial de Economia",
  family_nutrition: "Equilíbrio Nutricional",
};

const priorityLabels: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export function InsightCard({ insight, onMarkAsRead }: InsightCardProps) {
  return (
    <Card className={getPriorityBgColor(insight.priority)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {typeIcons[insight.type] || <Info className="size-4" />}
            <Badge variant="outline" className="text-xs">
              {typeLabels[insight.type] || insight.type}
            </Badge>
          </div>
          <Badge
            variant={
              insight.priority === "high" || insight.priority === "critical"
                ? "destructive"
                : insight.priority === "medium"
                  ? "warning"
                  : "secondary"
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
          <span className="text-xs text-muted-foreground">{formatDate(insight.created_at)}</span>
          {!insight.is_read && onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onMarkAsRead(insight.id);
              }}
            >
              Marcar como lido
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
