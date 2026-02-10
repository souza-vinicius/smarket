"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface CategoryDonutChartProps {
  products: {
    category_name?: string;
    total_price: number | string;
  }[];
  onCategoryFilter?: (category: string | null) => void;
}

// Paleta de cores moderna e vibrante (sem roxo/violeta)
const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#eab308", // yellow-500
];

export function CategoryDonutChart({ products, onCategoryFilter }: CategoryDonutChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Agrupar produtos por categoria e calcular totais
  const categoryMap = new Map<string, number>();
  let totalValue = 0;

  products.forEach((product) => {
    const category = product.category_name || "Sem categoria";
    const price = Number(product.total_price) || 0;

    // Debug: verificar valores
    if (isNaN(price)) {
      console.error('NaN detected:', {
        category,
        raw_price: product.total_price,
        converted_price: price,
        type: typeof product.total_price
      });
    }

    const currentValue = categoryMap.get(category) || 0;
    categoryMap.set(category, currentValue + price);
    totalValue += price;
  });

  // Converter para array e calcular percentuais
  const data: CategoryData[] = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value); // Ordenar do maior para o menor

  if (data.length === 0 || totalValue === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CategoryData;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value || 0)} ({(data.percentage || 0).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy }: any) => {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground"
      >
        <tspan x={cx} dy="-0.5em" fontSize="24" fontWeight="bold">
          {data.length}
        </tspan>
        <tspan x={cx} dy="1.5em" fontSize="14" className="fill-muted-foreground">
          {data.length === 1 ? "categoria" : "categorias"}
        </tspan>
      </text>
    );
  };

  const handleCategoryClick = (categoryName: string) => {
    const newCategory = selectedCategory === categoryName ? null : categoryName;
    setSelectedCategory(newCategory);
    onCategoryFilter?.(newCategory);
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => {
          const isSelected = selectedCategory === entry.value;
          const isFiltered = selectedCategory !== null && !isSelected;

          return (
            <div
              key={`legend-${index}`}
              onClick={() => handleCategoryClick(entry.value)}
              className={`flex items-center justify-between gap-3 text-sm cursor-pointer rounded-lg p-2 transition-all ${
                isSelected
                  ? "bg-primary-subtle ring-2 ring-primary"
                  : isFiltered
                  ? "opacity-40"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-foreground font-medium truncate">
                  {entry.value}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground">
                  {(entry.payload.percentage || 0).toFixed(1)}%
                </span>
                <span className="text-foreground font-semibold min-w-[80px] text-right">
                  {formatCurrency(entry.payload.value || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handlePieClick = (data: any) => {
    handleCategoryClick(data.name);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          Distribuição por Categoria
        </h3>
        {selectedCategory && (
          <button
            onClick={() => handleCategoryClick(selectedCategory)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar filtro
          </button>
        )}
      </div>
      <div className="w-full">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={CustomLabel}
              onClick={handlePieClick}
            >
              {data.map((entry, index) => {
                const isSelected = selectedCategory === entry.name;
                const isFiltered = selectedCategory !== null && !isSelected;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={isFiltered ? 0.3 : 1}
                    className="stroke-background stroke-2 hover:opacity-80 transition-all cursor-pointer"
                    style={{
                      filter: isSelected ? 'brightness(1.1)' : 'none',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="px-2">
          {renderLegend({
            payload: data.map((entry, index) => ({
              value: entry.name,
              color: COLORS[index % COLORS.length],
              payload: entry,
            })),
          })}
        </div>
      </div>
    </Card>
  );
}
