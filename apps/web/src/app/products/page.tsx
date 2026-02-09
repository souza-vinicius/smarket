"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Search, ShoppingCart, Store, Calendar, Package } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductSearch } from "@/hooks/use-products";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ProductsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: results, isLoading, debouncedQuery } = useProductSearch(query);

  const isSearching = debouncedQuery.length >= 2;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 pl-64">
        <Header title="Buscar Produtos" subtitle="Pesquise produtos e veja o histórico de preços" />

        <main className="p-6">
          {/* Search Input */}
          <div className="mb-8">
            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Digite o nome do produto (ex: arroz, leite, café...)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                className="h-14 rounded-xl border-slate-300 pl-12 text-lg shadow-sm focus-visible:ring-emerald-500"
              />
              {query.length > 0 && query.length < 2 && (
                <p className="mt-2 text-center text-sm text-slate-500">
                  Digite pelo menos 2 caracteres para buscar
                </p>
              )}
            </div>
          </div>

          {/* Results */}
          {!isSearching && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-slate-100">
                <ShoppingCart className="size-10 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Busque por um produto</h3>
              <p className="mx-auto max-w-md text-slate-600">
                Digite o nome de um produto para ver todas as vezes que ele foi comprado e o valor
                pago em cada compra.
              </p>
            </div>
          )}

          {isSearching && isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-${String(i)}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching && !isLoading && results && results.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{results.length}</span>{" "}
                  {results.length === 1 ? "resultado encontrado" : "resultados encontrados"} para{" "}
                  <span className="font-semibold text-emerald-700">
                    &quot;{debouncedQuery}&quot;
                  </span>
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate-50"
                      onClick={() => {
                        router.push(`/invoices/${item.invoice_id}`);
                      }}
                    >
                      <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                        <Package className="size-5 text-emerald-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{item.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Store className="size-3" />
                            {item.merchant_name || item.issuer_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(item.issue_date)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Number(item.quantity)} {item.unit}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Total: {formatCurrency(item.total_price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isSearching && !isLoading && results && results.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
                <Search className="size-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Nenhum resultado encontrado
              </h3>
              <p className="text-slate-600">
                Nenhuma compra encontrada para &quot;{debouncedQuery}&quot;. Tente outro termo.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
