// ============================================
// USE AUDIT HOOK - GESTION DE HISTORIAL DE AUDITORIA
// ============================================

import { useState, useCallback } from "react";
import { auditService } from "@/services/audit.service";
import type { AuditEntry, AuditHistoryParams } from "@/types/api";

export function useAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (params?: AuditHistoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getHistory(params);
      setEntries(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar historial",
      );
      console.error("Error loading audit history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    entries,
    loading,
    error,
    loadHistory,
  };
}
