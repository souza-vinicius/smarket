"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/use-admin-settings";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

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
        <p className="text-gray-600 mt-1">
          Registro de todas as acoes administrativas
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Recurso</label>
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="user">Usuario</option>
            <option value="subscription">Assinatura</option>
            <option value="payment">Pagamento</option>
            <option value="settings">Configuracoes</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Acao</label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Data/Hora
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Admin
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Acao
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Recurso
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {log.admin_email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
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
                        <span className="text-xs text-gray-400 ml-1">
                          {log.resource_id.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="inline-flex w-2 h-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="inline-flex w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Pagina {page} de {pages} ({total} registros)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
