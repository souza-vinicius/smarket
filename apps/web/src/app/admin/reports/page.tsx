"use client";

import { useState } from "react";

import {
  Download,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  FileSpreadsheet,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChurnReport,
  useConversionReport,
  useMRRReport,
  exportUsersCSV,
  exportSubscriptionsCSV,
  exportPaymentsCSV,
} from "@/hooks/use-admin-reports";

const MONTHS_OPTIONS = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
];

export default function AdminReportsPage() {
  const [months, setMonths] = useState(12);
  const [exporting, setExporting] = useState<string | null>(null);

  const { report: churnReport, isLoading: churnLoading } =
    useChurnReport(months);
  const { report: conversionReport, isLoading: conversionLoading } =
    useConversionReport(months);
  const { report: mrrReport, isLoading: mrrLoading } = useMRRReport(months);

  const handleExportUsers = async () => {
    try {
      setExporting("users");
      await exportUsersCSV(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportSubscriptions = async () => {
    try {
      setExporting("subscriptions");
      await exportSubscriptionsCSV();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPayments = async () => {
    try {
      setExporting("payments");
      await exportPaymentsCSV(undefined, months);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada de churn, conversão e receita
          </p>
        </div>
        <Select
          value={months.toString()}
          onValueChange={(v: string) => { setMonths(parseInt(v)); }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="churn" className="space-y-4">
        <TabsList>
          <TabsTrigger value="churn" className="flex items-center gap-2">
            <TrendingDown className="size-4" />
            Churn
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <TrendingUp className="size-4" />
            Conversão
          </TabsTrigger>
          <TabsTrigger value="mrr" className="flex items-center gap-2">
            <DollarSign className="size-4" />
            MRR
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" />
            Exportar
          </TabsTrigger>
        </TabsList>

        {/* Churn Tab */}
        <TabsContent value="churn" className="space-y-4">
          {churnLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : churnReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Cancelamentos
                    </CardTitle>
                    <TrendingDown className="size-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {churnReport.summary.total_cancelled}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No período selecionado
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Taxa Média de Churn
                    </CardTitle>
                    <TrendingDown className="size-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {churnReport.summary.average_churn_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Média mensal
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Plano com Maior Churn
                    </CardTitle>
                    <Users className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {churnReport.by_plan.length > 0
                        ? churnReport.by_plan.reduce((a, b) =>
                            a.churn_rate > b.churn_rate ? a : b
                          ).plan
                        : "-"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {churnReport.by_plan.length > 0
                        ? `${churnReport.by_plan.reduce((a, b) =>
                            a.churn_rate > b.churn_rate ? a : b
                          ).churn_rate.toFixed(1)}% de churn`
                        : "Sem dados"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Churn Timeline Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução do Churn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={churnReport.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cancelled"
                          stroke="#ef4444"
                          name="Cancelamentos"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="churn_rate"
                          stroke="#f97316"
                          name="Taxa (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Churn by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Churn por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={churnReport.by_plan}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="cancelled"
                          fill="#ef4444"
                          name="Cancelados"
                        />
                        <Bar
                          dataKey="total"
                          fill="#3b82f6"
                          name="Total"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <p className="text-muted-foreground">
                  Nenhum dado disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-4">
          {conversionLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : conversionReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Trials
                    </CardTitle>
                    <Users className="size-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {conversionReport.summary.total_trials}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trials iniciados
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Convertidos
                    </CardTitle>
                    <TrendingUp className="size-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {conversionReport.summary.total_converted}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trial → Pago
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Taxa de Conversão
                    </CardTitle>
                    <TrendingUp className="size-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {conversionReport.summary.overall_conversion_rate.toFixed(
                        1
                      )}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Média do período
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Trial Funnel Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Conversão Trial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionReport.trial_funnel}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="trials_started"
                          fill="#3b82f6"
                          name="Trials Iniciados"
                        />
                        <Bar
                          dataKey="converted"
                          fill="#22c55e"
                          name="Convertidos"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionReport.plan_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="count"
                          fill="#8b5cf6"
                          name="Assinantes"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Flows */}
              {conversionReport.plan_flows.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Movimentação entre Planos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conversionReport.plan_flows.slice(0, 10).map((flow, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded bg-muted p-2"
                        >
                          <span>
                            <span className="font-medium">{flow.from_plan}</span>
                            {" → "}
                            <span className="font-medium">{flow.to_plan}</span>
                          </span>
                          <span className="text-muted-foreground">
                            {flow.count} usuários
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <p className="text-muted-foreground">
                  Nenhum dado disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MRR Tab */}
        <TabsContent value="mrr" className="space-y-4">
          {mrrLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : mrrReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      MRR Atual
                    </CardTitle>
                    <DollarSign className="size-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {mrrReport.summary.current_mrr.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receita recorrente mensal
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      ARR (Projetado)
                    </CardTitle>
                    <DollarSign className="size-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {mrrReport.summary.arr.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receita anual recorrente
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* MRR Timeline Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução do MRR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mrrReport.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) =>
                            `R$ ${value.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="mrr"
                          stroke="#22c55e"
                          name="MRR Total"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="premium_mrr"
                          stroke="#8b5cf6"
                          name="Premium"
                        />
                        <Line
                          type="monotone"
                          dataKey="basic_mrr"
                          stroke="#3b82f6"
                          name="Basic"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* MRR by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>MRR por Plano e Ciclo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mrrReport.by_plan.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded bg-muted p-3"
                      >
                        <div>
                          <span className="font-medium capitalize">
                            {item.plan}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            ({item.billing_cycle === "monthly" ? "Mensal" : "Anual"})
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            R$ {item.mrr.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.subscribers} assinantes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <p className="text-muted-foreground">
                  Nenhum dado disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Export Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Exportar lista de usuários com informações de perfil,
                  assinatura e uso.
                </p>
                <Button
                  onClick={handleExportUsers}
                  disabled={exporting !== null}
                  className="w-full"
                >
                  {exporting === "users" ? (
                    "Exportando..."
                  ) : (
                    <>
                      <Download className="mr-2 size-4" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Exportar lista de assinaturas com status, plano,
                  ciclo de cobrança e datas.
                </p>
                <Button
                  onClick={handleExportSubscriptions}
                  disabled={exporting !== null}
                  className="w-full"
                >
                  {exporting === "subscriptions" ? (
                    "Exportando..."
                  ) : (
                    <>
                      <Download className="mr-2 size-4" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="size-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Exportar histórico de pagamentos dos últimos {months} meses
                  com valores e status.
                </p>
                <Button
                  onClick={handleExportPayments}
                  disabled={exporting !== null}
                  className="w-full"
                >
                  {exporting === "payments" ? (
                    "Exportando..."
                  ) : (
                    <>
                      <Download className="mr-2 size-4" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Info */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre as Exportações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Os arquivos são gerados em formato CSV (comma-separated values)
              </p>
              <p>
                • A codificação é UTF-8, compatível com Excel e Google Sheets
              </p>
              <p>
                • Todas as exportações são registradas no log de auditoria
              </p>
              <p>
                • Os dados incluem apenas usuários ativos por padrão (exceto
                quando especificado)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
