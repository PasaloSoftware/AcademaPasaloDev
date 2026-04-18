"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { auditService } from "@/services/audit.service";
import { useToast } from "@/components/ui/ToastContainer";
import type { AuditEntry } from "@/types/api";

const SESSION_STORAGE_PREFIX = "audit-event:";
const FALLBACK_FETCH_LIMIT = 500;

function getInitials(name?: string): string {
  if (!name) return "NA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "NA"
  );
}

function normalizeRole(role?: string) {
  const normalized = (role || "").trim().toUpperCase();
  if (normalized.includes("SUPER")) return "SUPER_ADMIN";
  if (normalized.includes("ADMIN")) return "ADMIN";
  if (
    normalized.includes("ASESOR") ||
    normalized.includes("PROFESOR") ||
    normalized.includes("PROFESSOR") ||
    normalized.includes("TEACHER")
  ) {
    return "TEACHER";
  }
  if (normalized.includes("ALUMNO") || normalized.includes("STUDENT")) {
    return "STUDENT";
  }
  return "";
}

function getRoleBadge(role?: string): { label: string; className: string } {
  switch (normalizeRole(role)) {
    case "SUPER_ADMIN":
      return {
        label: "SUPERADMINISTRADOR",
        className: "bg-warning-light text-text-warning-primary",
      };
    case "ADMIN":
      return {
        label: "ADMINISTRADOR",
        className: "bg-bg-info-secondary-light text-text-info-secondary",
      };
    case "TEACHER":
      return {
        label: "ASESOR",
        className: "bg-bg-info-primary-light text-text-info-primary",
      };
    case "STUDENT":
      return {
        label: "ALUMNO",
        className: "bg-accent-light text-text-accent-primary",
      };
    default:
      return {
        label: role?.trim() || "",
        className: "bg-bg-quartiary text-text-secondary",
      };
  }
}

function getSourceBadge(source?: AuditEntry["source"]) {
  if (source === "SECURITY") {
    return {
      label: "SEGURIDAD",
      className: "bg-error-light text-text-error-primary",
    };
  }
  return {
    label: "AUDITORÍA",
    className: "bg-warning-light text-text-warning-primary",
  };
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} - ${date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function getMetadataValue(
  metadata: AuditEntry["metadata"],
  key: string,
): string {
  const value = metadata?.[key];
  if (value === null || value === undefined) return "";
  return String(value);
}

function buildAuditDetailExportRow(entry: AuditEntry): Record<string, string> {
  if (entry.source === "SECURITY") {
    return {
      id: String(entry.id ?? ""),
      datetime: entry.datetime ?? "",
      userId: String(entry.userId ?? ""),
      userName: entry.userName ?? "",
      userEmail: entry.userEmail ?? "",
      userRole: entry.userRole ?? "",
      actionCode: entry.actionCode ?? "",
      actionName: entry.actionName ?? "",
      source: entry.source ?? "",
      ipAddress: entry.ipAddress ?? "",
      userAgent: entry.userAgent ?? "",
      deviceId: getMetadataValue(entry.metadata, "deviceId"),
      locationSource: getMetadataValue(entry.metadata, "locationSource"),
      city: getMetadataValue(entry.metadata, "city"),
      country: getMetadataValue(entry.metadata, "country"),
      activeRoleCode: getMetadataValue(entry.metadata, "activeRoleCode"),
      sessionStatus: getMetadataValue(entry.metadata, "sessionStatus"),
      newSessionId: getMetadataValue(entry.metadata, "newSessionId"),
      existingSessionId: getMetadataValue(entry.metadata, "existingSessionId"),
      existingDeviceId: getMetadataValue(entry.metadata, "existingDeviceId"),
    };
  }

  return {
    id: String(entry.id ?? ""),
    datetime: entry.datetime ?? "",
    userId: String(entry.userId ?? ""),
    userName: entry.userName ?? "",
    userEmail: entry.userEmail ?? "",
    userRole: entry.userRole ?? "",
    actionCode: entry.actionCode ?? "",
    actionName: entry.actionName ?? "",
    source: entry.source ?? "",
  };
}

function renderJsonValue(
  value: unknown,
  indentLevel = 0,
  path = "root",
): ReactNode {
  const indentStyle =
    indentLevel > 0 ? { paddingLeft: `${indentLevel * 24}px` } : undefined;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-sky-300">[]</span>;
    }

    return (
      <div className="flex flex-col" style={indentStyle}>
        <span className="text-sky-300">[</span>
        {value.map((item, index) => (
          <div key={`${path}[${index}]`} className="pl-6">
            {renderJsonValue(item, indentLevel + 1, `${path}[${index}]`)}
            {index < value.length - 1 ? (
              <span className="text-sky-300">,</span>
            ) : null}
          </div>
        ))}
        <span className="text-sky-300">]</span>
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <span className="text-sky-300">{"{}"}</span>;
    }

    return (
      <div className="flex flex-col" style={indentStyle}>
        <span className="text-sky-300">{"{"}</span>
        {entries.map(([key, nestedValue], index) => (
          <div key={`${path}.${key}`} className="pl-6">
            <span className="text-fuchsia-300">"{key}"</span>
            <span className="text-sky-300">: </span>
            {renderJsonValue(nestedValue, indentLevel + 1, `${path}.${key}`)}
            {index < entries.length - 1 ? (
              <span className="text-sky-300">,</span>
            ) : null}
          </div>
        ))}
        <span className="text-sky-300">{"}"}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    return <span className="text-emerald-300">"{value}"</span>;
  }

  if (typeof value === "number") {
    return <span className="text-amber-300">{value}</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-violet-300">{String(value)}</span>;
  }

  if (value === null) {
    return <span className="text-rose-300">null</span>;
  }

  return <span className="text-slate-300">{String(value ?? "")}</span>;
}

function readStoredEvent(id: string): AuditEntry | null {
  if (typeof window === "undefined") return null;

  const exactMatch = window.sessionStorage.getItem(
    `${SESSION_STORAGE_PREFIX}${id}`,
  );
  if (exactMatch) {
    try {
      return JSON.parse(exactMatch) as AuditEntry;
    } catch {
      window.sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${id}`);
    }
  }

  const latest = window.sessionStorage.getItem("audit-event:last");
  if (!latest) return null;

  try {
    const parsed = JSON.parse(latest) as AuditEntry;
    return parsed.id === id ? parsed : null;
  } catch {
    window.sessionStorage.removeItem("audit-event:last");
    return null;
  }
}

function InfoField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 inline-flex flex-col justify-start items-start gap-1 min-w-[220px] ${className}`}
    >
      <div className="self-stretch justify-center text-gray-600 text-sm font-semibold leading-4">
        {label}
      </div>
      <div className="self-stretch justify-center text-text-primary text-base font-medium leading-4 break-words">
        {value || ""}
      </div>
    </div>
  );
}

export default function AuditoriaDetalleContent() {
  const params = useParams();
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const id = String(params.id || "");
  const [entry, setEntry] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbItems([
      {
        icon: "shield",
        label: "Auditoría",
        href: "/plataforma/admin/auditoria",
      },
      { label: "Detalles del evento" },
    ]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    let isMounted = true;

    const loadEntry = async () => {
      if (!id) {
        setError("No se pudo identificar el evento.");
        setLoading(false);
        return;
      }

      const storedEntry = readStoredEvent(id);
      if (storedEntry) {
        if (!isMounted) return;
        setEntry(storedEntry);
        setLoading(false);
        return;
      }

      try {
        const history = await auditService.getHistory({
          limit: FALLBACK_FETCH_LIMIT,
        });
        const matchedEntry = history.find((item) => String(item.id) === id);

        if (!isMounted) return;

        if (!matchedEntry) {
          setError(
            "No encontramos el evento. Vuelve a la auditoría y ábrelo de nuevo.",
          );
          setLoading(false);
          return;
        }

        setEntry(matchedEntry);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el detalle del evento.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadEntry();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleExportDetails = useCallback(() => {
    if (!entry) return;

    void (async () => {
      try {
        const XLSX = await import("xlsx");
        const row = buildAuditDetailExportRow(entry);
        const worksheet = XLSX.utils.json_to_sheet([row], {
          header: Object.keys(row),
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Evento");

        const workbookArray = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        downloadBlob(
          new Blob([workbookArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${
            entry.source === "SECURITY" ? "security_event" : "audit_event"
          }_${entry.id}.xlsx`,
        );

        showToast({
          type: "success",
          title: "Detalles exportados",
          description: "Se descargó el Excel del evento correctamente.",
        });
      } catch (exportError) {
        showToast({
          type: "error",
          title: "No se pudo exportar",
          description:
            exportError instanceof Error
              ? exportError.message
              : "Ocurrió un error inesperado al generar el Excel.",
        });
      }
    })();
  }, [entry, showToast]);

  const handleViewProfile = useCallback(() => {
    if (!entry?.userId) return;
    router.push(`/plataforma/admin/usuarios/${entry.userId}`);
  }, [entry?.userId, router]);

  const sourceBadge = useMemo(
    () => getSourceBadge(entry?.source),
    [entry?.source],
  );
  const roleBadge = useMemo(
    () => getRoleBadge(entry?.userRole),
    [entry?.userRole],
  );
  const rawJson = useMemo(
    () => (entry ? JSON.stringify(entry, null, 2) : ""),
    [entry],
  );
  const highlightedJson = useMemo(
    () => (entry ? renderJsonValue(entry) : null),
    [entry],
  );
  const isSecurityEvent = entry?.source === "SECURITY";

  const handleCopyRawJson = useCallback(async () => {
    if (!rawJson) return;

    try {
      await navigator.clipboard.writeText(rawJson);
      showToast({
        type: "success",
        title: "JSON copiado",
        description: "El contenido RAW se copió al portapapeles.",
      });
    } catch (copyError) {
      showToast({
        type: "error",
        title: "No se pudo copiar",
        description:
          copyError instanceof Error
            ? copyError.message
            : "Ocurrió un error inesperado al copiar el contenido.",
      });
    }
  }, [rawJson, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <Icon name="error" size={64} className="text-error-solid mx-auto" />
          <p className="text-lg font-semibold text-text-primary">
            {error || "Evento no encontrado"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/plataforma/admin/auditoria")}
            className="px-4 py-2 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium"
          >
            Volver a Auditoría
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] flex flex-col justify-start items-start gap-8 overflow-hidden">
      <button
        type="button"
        onClick={() => router.push("/plataforma/admin/auditoria")}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-secondary transition-colors"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <div className="justify-start text-text-accent-primary text-base font-medium leading-4">
          Volver a Auditoría
        </div>
      </button>

      <div className="self-stretch inline-flex justify-start items-center gap-4">
        <div className="flex-1 justify-start text-text-primary text-3xl font-semibold leading-8">
          Detalles del Evento
        </div>
        <button
          type="button"
          onClick={handleExportDetails}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
        >
          <Icon name="download" size={16} className="text-icon-white" />
          <div className="justify-start text-text-white text-sm font-medium leading-4">
            Exportar detalles
          </div>
        </button>
      </div>

      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon
            name="person"
            size={20}
            className="text-accent-secondary"
          />
          <div className="flex-1 justify-center text-text-primary text-lg font-semibold leading-5">
            Información del Usuario
          </div>
          {entry.userId ? (
            <button
              type="button"
              onClick={handleViewProfile}
              className="p-1 rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
            >
              <div className="justify-start text-text-accent-primary text-sm font-medium leading-4">
                Ver perfil
              </div>
              <Icon
                name="arrow_forward"
                size={16}
                className="text-icon-accent-primary"
              />
            </button>
          ) : null}
        </div>

        <div className="self-stretch inline-flex justify-start items-start gap-3">
          <div className="w-10 h-10 p-1 bg-bg-info-primary-solid rounded-full flex justify-center items-center gap-2">
            <div className="text-center justify-center text-text-white text-xs font-medium leading-3">
              {getInitials(entry.userName)}
            </div>
          </div>
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-text-primary text-xl font-medium leading-6">
                {entry.userName || ""}
              </div>
              <div className="self-stretch justify-center text-text-info-primary text-sm font-medium leading-4 break-all">
                {entry.userEmail || ""}
              </div>
            </div>
            {roleBadge.label ? (
              <div className="self-stretch inline-flex justify-start items-start gap-2">
                <div
                  className={`px-2.5 py-1.5 rounded-full flex justify-center items-center gap-1 ${roleBadge.className}`}
                >
                  <div className="justify-start text-xs font-medium leading-3">
                    {roleBadge.label}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon name="info" size={20} className="text-icon-info-secondary" />
          <div className="flex-1 justify-center text-text-primary text-lg font-semibold leading-5">
            Información Principal
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <InfoField
              label="Fecha y Hora"
              value={formatDateTime(entry.datetime)}
            />
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 min-w-[220px]">
              <div className="self-stretch justify-center text-gray-600 text-sm font-semibold leading-4">
                Tipo
              </div>
              <div className="inline-flex justify-start items-start">
                <div
                  className={`px-2.5 py-1.5 rounded-full flex justify-center items-center gap-1 ${sourceBadge.className}`}
                >
                  <div className="justify-start text-xs font-medium leading-3">
                    {sourceBadge.label}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <InfoField label="Acción" value={entry.actionName || ""} />
            {isSecurityEvent ? (
              <InfoField label="Dirección IP" value={entry.ipAddress || ""} />
            ) : null}
          </div>

          {isSecurityEvent ? (
            <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
              <InfoField
                label="Dispositivo y Navegador"
                value={entry.userAgent || ""}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="self-stretch bg-slate-900 rounded-xl flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch px-6 py-3 bg-slate-800 border-b border-slate-700 inline-flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <div className="flex justify-start items-start gap-1.5">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <div className="w-3 h-3 bg-amber-400 rounded-full" />
              <div className="w-3 h-3 bg-green-400 rounded-full" />
            </div>
            <div className="pl-4 inline-flex flex-col justify-start items-start">
              <div className="justify-center text-slate-400 text-xs font-normal font-mono leading-4">
                RAW_EVENT_LOG.json
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyRawJson()}
            className="inline-flex items-center justify-center self-center p-1 rounded-lg hover:bg-slate-700 transition-colors"
            title="Copiar RAW JSON"
          >
            <Icon name="content_copy" size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="self-stretch px-8 py-8 flex flex-col justify-start items-start overflow-hidden">
          <div className="self-stretch whitespace-pre-wrap break-words text-sm font-normal font-mono leading-6">
            {highlightedJson}
          </div>
        </div>
      </div>
    </div>
  );
}
