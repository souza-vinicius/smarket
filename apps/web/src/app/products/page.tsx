"use client";

import { useState, useMemo } from "react";

import { Package, Store, Calendar, Search } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, type Product } from "@/hooks/use-products";
import { formatCurrency, formatDate } from "@/lib/utils";

function ProductCard({ product }: { product: Product }) {
  return (
    <Card isInteractive className="flex items-start gap-4">
      <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle">
        <Package className="size-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-semibold text-foreground">
          {product.normalized_name || product.description}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Store className="size-3.5" />
            {product.merchant_name || product.issuer_name || "Desconhecido"}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatDate(product.issue_date)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-foreground">
          {formatCurrency(product.unit_price)}
        </p>
        <p className="text-xs text-muted-foreground">
          {product.quantity} {product.unit}
        </p>
      </div>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <Card className="flex items-start gap-4">
      <Skeleton variant="avatar" className="size-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </Card>
  );
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const { data: products, isLoading } = useProducts(debouncedSearch);

  // Debounce search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target;
    setSearchQuery(value);
    
    // Debounce - only update API search after 300ms
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleClear = () => {
    setSearchQuery("");
    setDebouncedSearch("");
  };

  // Group by category for summary (from product data)
  const categorySummary = useMemo(() => {
    if (!products) {return {};}
    
    return products.reduce<Record<string, number>>((acc, product) => {
      // Use merchant name as a proxy for category since the API doesn't return category
      const category = product.merchant_name || product.issuer_name || "Sem categoria";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }, [products]);

  const displayProducts = products || [];

  return (
    <PageLayout
      title="Produtos"
      subtitle="Busque seus produtos nas notas fiscais"
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar produtos (mínimo 2 caracteres)..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="px-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-muted"
            >
              <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </p>
      </div>

      {/* Category Summary - Horizontal scroll on mobile */}
      {!isLoading && Object.keys(categorySummary).length > 0 && (
        <div className="scrollbar-hide -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:flex-wrap">
            {Object.entries(categorySummary)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([category, count]) => (
                <div
                  key={category}
                  className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2"
                >
                  <span className="whitespace-nowrap text-sm font-medium text-foreground">
                    {category}
                  </span>
                  <Badge variant="secondary" size="sm">
                    {count}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-3">
          <ProductSkeleton />
          <ProductSkeleton />
          <ProductSkeleton />
          <ProductSkeleton />
          <ProductSkeleton />
        </div>
      ) : displayProducts.length > 0 ? (
        <div className="space-y-3">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Package className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {searchQuery ? "Nenhum produto encontrado" : "Digite para buscar produtos"}
          </h3>
          <p className="mx-auto max-w-md text-muted-foreground">
            {searchQuery
              ? `Nenhum resultado para "${searchQuery}". Tente outro termo.`
              : "Digite pelo menos 2 caracteres para buscar seus produtos"}
          </p>
        </Card>
      )}
    </PageLayout>
  );
}
