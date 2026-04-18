// ============================================
// AUDIT SERVICE - HISTORIAL DE AUDITORIA Y SEGURIDAD
// ============================================

import { apiClient } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/storage";
import type { AuditEntry, AuditHistoryParams } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

function buildQueryString(params?: AuditHistoryParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.userId) query.append("userId", params.userId);
  if (params.source) query.append("source", params.source);
  if (params.actionCode) query.append("actionCode", params.actionCode);
  if (params.limit) query.append("limit", String(params.limit));
  const str = query.toString();
  return str ? `?${str}` : "";
}

export interface AuditExportQueuedResponse {
  jobId: string;
  status: string;
  mode: "async";
  totalRows: number;
  thresholdRows: number;
  rowsPerFile: number;
  estimatedFileCount: number;
  artifactTtlSeconds: number;
}

export type AuditExportResult =
  | { mode: "sync"; blob: Blob }
  | AuditExportQueuedResponse;

export const auditService = {
  async getHistory(params?: AuditHistoryParams): Promise<AuditEntry[]> {
    const endpoint = `/audit/history${buildQueryString(params)}`;
    const response = await apiClient.get<AuditEntry[]>(endpoint);
    return response.data ?? [];
  },

  async exportToExcel(params?: AuditHistoryParams): Promise<AuditExportResult> {
    const url = `${API_BASE_URL}/audit/export${buildQueryString(params)}`;
    const token = getAccessToken();

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let message = "Error al exportar el historial de auditoría";
      try {
        const errorData = await response.json();
        const candidate = errorData?.message;
        if (Array.isArray(candidate)) {
          message = candidate.join(", ");
        } else if (typeof candidate === "string" && candidate.trim()) {
          message = candidate;
        }
      } catch {
        // noop
      }
      throw new Error(message);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return payload.data as AuditExportQueuedResponse;
    }

    return { mode: "sync", blob: await response.blob() };
  },

  async downloadExportJob(jobId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/audit/export-jobs/${jobId}/download`;
    const token = getAccessToken();

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Error al descargar el reporte de auditoría");
    }

    return response.blob();
  },
};
