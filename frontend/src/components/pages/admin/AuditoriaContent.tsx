"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAudit } from "@/hooks/useAudit";
import { auditService } from "@/services/audit.service";
import { useToast } from "@/components/ui/ToastContainer";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import AdvancedFiltersSidebar from "@/components/pages/admin/AdvancedFiltersSidebar";
import type { AuditEntry, AuditHistoryParams, AuditSource } from "@/types/api";

const ROWS_PER_PAGE = 10;

type RoleFilter = "" | "STUDENT" | "TEACHER" | "ADMIN" | "SUPER_ADMIN";
type SortKey = "datetime" | "userName" | "source";
type SortOrder = "ASC" | "DESC";

const TYPE_FILTERS: Array<{ label: string; value: AuditSource | "" }> = [
  { label: "Todos", value: "" },
  { label: "Auditoría", value: "AUDIT" },
  { label: "Seguridad", value: "SECURITY" },
];

const ROLE_FILTERS: Array<{ label: string; value: RoleFilter }> = [
  { label: "Todos", value: "" },
  { label: "Alumnos", value: "STUDENT" },
  { label: "Asesores", value: "TEACHER" },
  { label: "Administradores", value: "ADMIN" },
  { label: "Superadministradores", value: "SUPER_ADMIN" },
];

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
}

function getDefaultEndDate() {
  return new Date().toISOString().split("T")[0];
}

function buildAuditParams(
  startDate: string,
  endDate: string,
  source: AuditSource | "",
): AuditHistoryParams {
  const params: AuditHistoryParams = { limit: 100 };
  if (startDate) {
    params.startDate = new Date(`${startDate}T00:00:00`).toISOString();
  }
  if (endDate) {
    params.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
  }
  if (source) {
    params.source = source;
  }
  return params;
}

function buildAuditExportParams(
  startDate: string,
  endDate: string,
  source: AuditSource | "",
): AuditHistoryParams {
  const params: AuditHistoryParams = {};
  if (startDate) {
    params.startDate = new Date(`${startDate}T00:00:00`).toISOString();
  }
  if (endDate) {
    params.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
  }
  if (source) {
    params.source = source;
  }
  return params;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i += 1
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

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

function normalizeRole(role?: string): RoleFilter {
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

function getSourceBadge(source: AuditSource): {
  label: string;
  className: string;
} {
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

function formatDateParts(value: string) {
  if (!value) {
    return { date: "", time: "" };
  }
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
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

export default function AuditoriaContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { entries, loading, error, loadHistory } = useAudit();
  const { showToast } = useToast();

  const defaultStartDate = useMemo(() => getDefaultStartDate(), []);
  const defaultEndDate = useMemo(() => getDefaultEndDate(), []);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<AuditSource | "">("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [draftSourceFilter, setDraftSourceFilter] = useState<AuditSource | "">(
    "",
  );
  const [draftRoleFilter, setDraftRoleFilter] = useState<RoleFilter>("");
  const [draftStartDate, setDraftStartDate] = useState(defaultStartDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultEndDate);

  const [sortBy, setSortBy] = useState<SortKey>("datetime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "shield", label: "Auditoría" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    void loadHistory(buildAuditParams(startDate, endDate, sourceFilter));
  }, [startDate, endDate, sourceFilter, loadHistory]);

  const openSidebar = () => {
    setDraftSourceFilter(sourceFilter);
    setDraftRoleFilter(roleFilter);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setIsSidebarOpen(true);
  };

  const handleApplyFilters = () => {
    setSourceFilter(draftSourceFilter);
    setRoleFilter(draftRoleFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setCurrentPage(1);
    setIsSidebarOpen(false);
  };

  const handleClearFilters = () => {
    setSourceFilter("");
    setRoleFilter("");
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setDraftSourceFilter("");
    setDraftRoleFilter("");
    setDraftStartDate(defaultStartDate);
    setDraftEndDate(defaultEndDate);
    setCurrentPage(1);
    setIsSidebarOpen(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
      return;
    }
    setSortBy(key);
    setSortOrder(key === "datetime" ? "DESC" : "ASC");
  };

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (entry.userName || "").toLowerCase().includes(normalizedSearch) ||
        (entry.userEmail || "").toLowerCase().includes(normalizedSearch);

      const matchesRole =
        !roleFilter || normalizeRole(entry.userRole) === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [entries, roleFilter, search]);

  const sortedEntries = useMemo(() => {
    const items = [...filteredEntries];
    items.sort((left, right) => {
      let comparison = 0;

      if (sortBy === "datetime") {
        comparison =
          new Date(left.datetime).getTime() -
          new Date(right.datetime).getTime();
      }

      if (sortBy === "userName") {
        comparison = (left.userName || "").localeCompare(
          right.userName || "",
          "es",
          {
            sensitivity: "base",
          },
        );
      }

      if (sortBy === "source") {
        comparison = left.source.localeCompare(right.source, "es", {
          sensitivity: "base",
        });
      }

      return sortOrder === "ASC" ? comparison : comparison * -1;
    });

    return items;
  }, [filteredEntries, sortBy, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEntries.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedEntries.slice(start, start + ROWS_PER_PAGE);
  }, [currentPage, sortedEntries]);

  const paginationItems = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const activeFilterCount =
    (sourceFilter ? 1 : 0) +
    (roleFilter ? 1 : 0) +
    (startDate !== defaultStartDate || endDate !== defaultEndDate ? 1 : 0);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await auditService.exportToExcel(
        buildAuditExportParams(startDate, endDate, sourceFilter),
      );

      if (result.mode === "sync") {
        downloadBlob(
          result.blob,
          `auditoria_${new Date().toISOString().split("T")[0]}.xlsx`,
        );
        showToast({
          type: "success",
          title: "Eventos exportados",
          description: "El archivo Excel se descargó correctamente.",
        });
        return;
      }

      showToast({
        type: "info",
        title: "Exportación en proceso",
        description: `Se encoló el reporte de auditoría. Archivos estimados: ${result.estimatedFileCount}.`,
      });
    } catch (exportError) {
      showToast({
        type: "error",
        title: "No se pudo exportar",
        description:
          exportError instanceof Error
            ? exportError.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setExporting(false);
    }
  }, [endDate, showToast, sourceFilter, startDate]);

  const getSortIconName = (key: SortKey) => {
    if (sortBy !== key) return "swap_vert";
    return sortOrder === "ASC" ? "arrow_upward" : "arrow_downward";
  };

  const handleViewEvent = (entry: AuditEntry) => {
    if (typeof window !== "undefined") {
      const serializedEntry = JSON.stringify(entry);
      window.sessionStorage.setItem(`audit-event:${entry.id}`, serializedEntry);
      window.sessionStorage.setItem("audit-event:last", serializedEntry);
    }
    router.push(`/plataforma/admin/auditoria/${encodeURIComponent(entry.id)}`);
  };

  return (
    <div className="w-full max-w-[1200px] flex flex-col justify-start items-start gap-8 overflow-hidden">
      <div className="self-stretch inline-flex justify-between items-center gap-4">
        <div className="justify-start text-text-primary text-3xl font-semibold leading-10">
          Auditoría
        </div>
        <button
          onClick={() => void handleExport()}
          disabled={exporting}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors disabled:opacity-50"
        >
          <Icon name="download" size={16} className="text-icon-white" />
          <div className="justify-start text-text-white text-sm font-medium leading-4">
            {exporting ? "Exportando..." : "Exportar eventos"}
          </div>
        </button>
      </div>

      <div className="self-stretch p-3 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-center items-start gap-4">
        <div className="self-stretch inline-flex justify-start items-start gap-4">
          <div className="flex-1 h-10 px-2.5 py-3 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre de la cuenta"
              className="flex-1 text-text-primary text-sm font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary"
            />
          </div>
          <button
            onClick={openSidebar}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
          >
            <Icon
              name="filter_list"
              size={16}
              className="text-icon-accent-primary"
            />
            <div className="text-text-accent-primary text-sm font-medium leading-4">
              Filtros
            </div>
            {activeFilterCount > 0 ? (
              <span className="w-5 h-5 bg-bg-accent-primary-solid rounded-full flex items-center justify-center text-text-white text-[10px] font-medium">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="self-stretch inline-flex justify-start items-center gap-2 flex-wrap content-center">
          {TYPE_FILTERS.map((filter) => {
            const isActive = sourceFilter === filter.value;
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => {
                  setSourceFilter(filter.value);
                  setDraftSourceFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 text-sm font-medium leading-4 transition-colors ${
                  isActive
                    ? "bg-bg-accent-primary-solid text-text-white"
                    : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col overflow-hidden">
        {error ? (
          <div className="px-6 py-8 text-text-error-primary text-sm">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent-light border-t-accent-solid rounded-full animate-spin" />
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="search_off" size={48} className="text-icon-tertiary" />
            <p className="text-text-secondary text-sm">
              No se encontraron eventos
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto self-stretch">
              <div className="min-w-[1100px] grid grid-cols-[12rem_15rem_minmax(22rem,1fr)_8rem_5rem]">
                <button
                  type="button"
                  onClick={() => handleSort("datetime")}
                  className="h-12 px-4 bg-bg-tertiary rounded-tl-xl border-b border-stroke-primary inline-flex justify-start items-center gap-2 text-left"
                >
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Fecha y Hora
                  </span>
                  <Icon
                    name={getSortIconName("datetime")}
                    size={16}
                    variant="outlined"
                    className={
                      sortBy === "datetime"
                        ? "text-icon-accent-primary"
                        : "text-icon-secondary"
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleSort("userName")}
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary inline-flex justify-start items-center gap-2 text-left"
                >
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Usuario
                  </span>
                  <Icon
                    name={getSortIconName("userName")}
                    size={16}
                    variant="outlined"
                    className={
                      sortBy === "userName"
                        ? "text-icon-accent-primary"
                        : "text-icon-secondary"
                    }
                  />
                </button>
                <div className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary inline-flex justify-start items-center gap-2">
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Acción
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSort("source")}
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary inline-flex justify-start items-center gap-2 text-left"
                >
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Tipo
                  </span>
                  <Icon
                    name={getSortIconName("source")}
                    size={16}
                    variant="outlined"
                    className={
                      sortBy === "source"
                        ? "text-icon-accent-primary"
                        : "text-icon-secondary"
                    }
                  />
                </button>
                <div className="h-12 px-4 bg-bg-tertiary rounded-tr-xl border-b border-stroke-primary inline-flex justify-center items-center gap-2">
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Acciones
                  </span>
                </div>

                {paginatedEntries.map((entry) => {
                  const { date, time } = formatDateParts(entry.datetime);
                  const roleBadge = getRoleBadge(entry.userRole);
                  const sourceBadge = getSourceBadge(entry.source);
                  const rowButtonClass =
                    "h-14 px-4 py-2 border-b border-stroke-primary transition-colors hover:bg-bg-secondary/40";

                  return (
                    <div key={entry.id} className="contents">
                      <button
                        type="button"
                        onClick={() => handleViewEvent(entry)}
                        className={`${rowButtonClass} flex flex-col justify-center items-start gap-1 text-left`}
                      >
                        <div className="text-text-tertiary text-sm font-normal leading-4">
                          {date}
                        </div>
                        <div className="text-text-tertiary text-xs font-normal leading-3">
                          {time}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewEvent(entry)}
                        className={`${rowButtonClass} inline-flex justify-start items-center gap-2 text-left`}
                      >
                        <div className="flex-1 flex justify-start items-start gap-1.5 min-w-0">
                          <div className="w-7 h-7 p-1 bg-bg-info-primary-solid rounded-full flex justify-center items-center shrink-0">
                            <div className="text-center text-text-white text-[8px] font-medium leading-[10px]">
                              {getInitials(entry.userName)}
                            </div>
                          </div>
                          <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5 min-w-0">
                            <div className="self-stretch text-text-secondary text-sm font-normal leading-4 line-clamp-1">
                              {entry.userName || ""}
                            </div>
                            {roleBadge.label ? (
                              <div
                                className={`px-1.5 py-1 rounded-full flex justify-center items-center gap-1 ${roleBadge.className}`}
                              >
                                <div className="text-[8px] font-medium leading-[10px]">
                                  {roleBadge.label}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewEvent(entry)}
                        className={`${rowButtonClass} inline-flex justify-start items-center gap-2 text-left`}
                      >
                        <div className="flex-1 text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                          {entry.actionName || ""}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewEvent(entry)}
                        className={`${rowButtonClass} inline-flex justify-start items-center gap-2 text-left`}
                      >
                        <div
                          className={`px-2.5 py-1.5 rounded-full flex justify-center items-center gap-1 ${sourceBadge.className}`}
                        >
                          <div className="text-xs font-medium leading-3">
                            {sourceBadge.label}
                          </div>
                        </div>
                      </button>
                      <div className="h-14 px-4 py-2 border-b border-stroke-primary flex flex-col justify-center items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewEvent(entry);
                          }}
                          className="p-1 rounded-full inline-flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                          title="Ver evento"
                        >
                          <Icon
                            name="visibility"
                            size={20}
                            className="text-icon-tertiary"
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="self-stretch px-4 py-3 flex flex-col justify-start items-start gap-2.5">
              <div className="self-stretch inline-flex justify-between items-center gap-4 flex-wrap">
                <div className="flex justify-center items-center gap-1 text-text-tertiary text-sm leading-4">
                  <div>Mostrando</div>
                  <div className="flex justify-start items-center">
                    <div className="font-medium">
                      {(currentPage - 1) * ROWS_PER_PAGE + 1}
                    </div>
                    <div className="font-medium">-</div>
                    <div className="font-medium">
                      {Math.min(
                        currentPage * ROWS_PER_PAGE,
                        sortedEntries.length,
                      )}
                    </div>
                  </div>
                  <div>de</div>
                  <div className="font-medium">{sortedEntries.length}</div>
                </div>
                <div className="flex justify-start items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage <= 1}
                    className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-50"
                  >
                    <Icon
                      name="chevron_left"
                      size={16}
                      className="text-icon-tertiary"
                    />
                  </button>
                  <div className="flex justify-start items-center gap-2">
                    {paginationItems.map((item, index) =>
                      item === "..." ? (
                        <div
                          key={`ellipsis-${index}`}
                          className="min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center text-text-tertiary text-sm font-normal leading-4"
                        >
                          ...
                        </div>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center text-sm leading-4 ${
                            item === currentPage
                              ? "bg-bg-accent-primary-solid text-text-white font-medium"
                              : "text-text-tertiary font-normal"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-50"
                  >
                    <Icon
                      name="chevron_right"
                      size={16}
                      className="text-icon-tertiary"
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AdvancedFiltersSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onClear={handleClearFilters}
        onApply={handleApplyFilters}
      >
        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Tipo
          </div>
          <div className="self-stretch inline-flex justify-start items-center gap-2 flex-wrap content-center">
            {TYPE_FILTERS.map((filter) => {
              const isActive = draftSourceFilter === filter.value;
              return (
                <button
                  key={`draft-${filter.label}`}
                  type="button"
                  onClick={() => setDraftSourceFilter(filter.value)}
                  className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 text-sm font-medium leading-4 transition-colors ${
                    isActive
                      ? "bg-bg-accent-primary-solid text-text-white"
                      : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Rol
          </div>
          <div className="self-stretch inline-flex justify-start items-center gap-2 flex-wrap content-center">
            {ROLE_FILTERS.map((filter) => {
              const isActive = draftRoleFilter === filter.value;
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setDraftRoleFilter(filter.value)}
                  className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 text-sm font-medium leading-4 transition-colors ${
                    isActive
                      ? "bg-bg-accent-primary-solid text-text-white"
                      : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch justify-start text-text-quartiary text-base font-semibold leading-5">
            Rango de fechas
          </div>
          <div className="self-stretch inline-flex justify-start items-start gap-4">
            <DatePicker
              value={draftStartDate}
              onChange={(value) => {
                setDraftStartDate(value);
                if (draftEndDate && value > draftEndDate) {
                  setDraftEndDate(value);
                }
              }}
              placeholder="dd/mm/aaaa"
            />
            <DatePicker
              value={draftEndDate}
              min={draftStartDate}
              onChange={setDraftEndDate}
              placeholder="dd/mm/aaaa"
            />
          </div>
        </div>
      </AdvancedFiltersSidebar>
    </div>
  );
}
