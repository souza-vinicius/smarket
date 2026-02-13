"use client";

import { useState } from "react";

import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { useAuditLogs } from "@/hooks/use-admin-settings";

const ACTION_LABELS: Record<string, string> = {
  create: "Criacao",
  update: "Atualizacao",
  delete: "Exclusao",
  impersonate: "Impersonacao",
  restore: "Restauracao",
  cancel: "Cancelamento",
  refund: "Reembolso",
  extend_trial: "Extensao de trial",
};

const RESOURCE_LABELS: Record<string, string> = {
  user: "Usuario",
  subscription: "Assinatura",
  payment: "Pagamento",
  settings: "Configuracoes",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState<string>("");
  const [action, setAction] = useState<string>("");

  const { logs, total, pages, isLoading } = useAuditLogs({
    page,
    perPage: 25,
    resourceType: resourceType || undefined,
    action: action || undefined,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
        <p className="mt-1 text-gray-600">
          Registro de todas as acoes administrativas
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Recurso</label>
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="user">Usuario</option>
            <option value="subscription">Assinatura</option>
            <option value="payment">Pagamento</option>
            <option value="settings">Configuracoes</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Acao</label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="create">Criacao</option>
            <option value="update">Atualizacao</option>
            <option value="delete">Exclusao</option>
            <option value="impersonate">Impersonacao</option>
            <option value="restore">Restauracao</option>
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-xs text-gray-400">{total} registros</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Data/Hora
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Admin
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Acao
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Recurso
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <FileText className="mx-auto mb-2 size-8 opacity-50" />
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {log.admin_email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.action === "delete"
                            ? "bg-red-50 text-red-700"
                            : log.action === "impersonate"
                              ? "bg-yellow-50 text-yellow-700"
                              : log.action === "create"
                                ? "bg-green-50 text-green-700"
                                : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                      {log.resource_id && (
                        <span className="ml-1 text-xs text-gray-400">
                          {log.resource_id.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="inline-flex size-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="inline-flex size-2 rounded-full bg-red-500" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                      {log.new_values
                        ? Object.entries(log.new_values)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-600">
              Pagina {page} de {pages} ({total} registros)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                disabled={page <= 1}
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="mr-1 size-4" />
                Anterior
              </button>
              <button
                onClick={() => { setPage((p) => Math.min(pages, p + 1)); }}
                disabled={page >= pages}
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proximo
                <ChevronRight className="ml-1 size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
