"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import FloatingSelect from "@/components/ui/FloatingSelect";
import {
  settingsService,
  type SystemSettingsBundle,
} from "@/services/settings.service";
import {
  cyclesService,
  type CycleHistoryItem,
  type CycleHistoryResponse,
} from "@/services/cycles.service";

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCycleCode(code: string): string {
  return code.replace("CYCLE_", "").replaceAll("_", "-");
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

function toDateInputValue(date: string): string {
  return date.slice(0, 10);
}

function clampPositiveInteger(value: string): string {
  return value.replace(/\D/g, "");
}

function monthsFromDays(days: number): number {
  return Math.max(1, Math.round(days / 30));
}

function EmptyStatePanel({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="self-stretch px-14 py-6 relative bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex flex-col justify-center items-center gap-4">
      <div className="flex flex-col justify-start items-start">
        <div className="p-3 bg-bg-disabled rounded-full inline-flex justify-center items-center">
          <Icon
            name={icon}
            size={44}
            variant="outlined"
            className="text-icon-disabled"
          />
        </div>
      </div>
      <div className="flex flex-col justify-start items-start">
        <div className="flex flex-col justify-start items-center">
          <div className="text-center justify-center text-text-secondary text-base font-medium leading-4">
            {title}
          </div>
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-start items-center gap-4">
        <div className="w-full max-w-[600px] px-2.5 flex flex-col justify-start items-center gap-1.5">
          <div className="self-stretch text-center justify-center text-text-quartiary text-sm font-normal leading-4">
            {description}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
      >
        <Icon name="settings" size={16} className="text-icon-accent-primary" />
        <div className="justify-start text-text-accent-primary text-sm font-medium leading-4">
          {buttonLabel}
        </div>
      </button>
    </div>
  );
}

function FilledConfigCard({
  title,
  icon,
  iconClassName,
  children,
  onEdit,
}: {
  title: string;
  icon: string;
  iconClassName: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-3.5">
      <div className="self-stretch inline-flex justify-start items-center gap-4">
        <div className="flex-1 flex justify-start items-center gap-2">
          <Icon name={icon} size={24} className={iconClassName} />
          <div className="inline-flex flex-col justify-start items-start">
            <div className="justify-center text-slate-900 text-xl font-semibold leading-6">
              {title}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-2.5 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1 hover:bg-bg-accent-light transition-colors"
        >
          <Icon name="edit" size={20} className="text-icon-accent-primary" />
        </button>
      </div>
      {children}
    </div>
  );
}

function FloatingField({
  label,
  helperText,
  children,
}: {
  label: string;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      {children}
      <div className="px-1 absolute left-[8px] top-[-7px] bg-bg-primary inline-flex justify-start items-start">
        <div className="justify-start text-text-tertiary text-xs font-normal leading-4">
          {label}
        </div>
      </div>
      {helperText ? (
        <div className="self-stretch inline-flex justify-start items-center">
          <div className="flex-1 justify-start text-text-tertiary text-xs font-light leading-4">
            {helperText}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalTextField({
  label,
  value,
  onChange,
  type = "text",
  helperText,
  rightIcon,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  helperText?: string;
  rightIcon?: string;
  min?: string | number;
}) {
  return (
    <FloatingField label={label} helperText={helperText}>
      <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <input
          type={type}
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 bg-transparent text-text-primary text-base font-normal leading-4 outline-none"
        />
        {rightIcon ? (
          <Icon name={rightIcon} size={16} className="text-icon-tertiary" />
        ) : null}
      </div>
    </FloatingField>
  );
}

function ModalSelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <FloatingSelect
      label="Unidad"
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? value)}
      options={options}
      includeAllOption={false}
      className="self-stretch flex-1"
      variant="filled"
      size="large"
    />
  );
}

function InfoBanner({ text }: { text: string }) {
  return (
    <div className="self-stretch px-2 py-3 bg-bg-secondary rounded-lg outline outline-2 outline-offset-[-2px] outline-stroke-primary inline-flex justify-start items-center gap-2">
      <div className="px-2 py-1 rounded-full flex justify-start items-center">
        <Icon name="info" size={24} className="text-icon-tertiary" />
      </div>
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
        <div className="self-stretch justify-start text-text-tertiary text-xs font-normal leading-4">
          {text}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracionContent() {
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettingsBundle | null>(null);
  const [history, setHistory] = useState<CycleHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);

  const [isCurrentCycleModalOpen, setIsCurrentCycleModalOpen] = useState(false);
  const [editingHistoryCycle, setEditingHistoryCycle] =
    useState<CycleHistoryItem | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  const [currentCycleForm, setCurrentCycleForm] = useState({
    identifier: "",
    startDate: "",
    endDate: "",
  });
  const [historyCycleForm, setHistoryCycleForm] = useState({
    identifier: "",
    startDate: "",
    endDate: "",
  });
  const [securityForm, setSecurityForm] = useState({
    timeWindowMinutes: "",
    distanceKm: "",
  });
  const [retentionForm, setRetentionForm] = useState({
    period: "",
    unit: "months",
  });

  const [currentCycleSaving, setCurrentCycleSaving] = useState(false);
  const [historyCycleSaving, setHistoryCycleSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);

  useEffect(() => {
    setBreadcrumbItems([
      { icon: "settings", label: "Configuracion del Sistema" },
    ]);
  }, [setBreadcrumbItems]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await settingsService.getAdminSettings();
      setSettings(response);
    } catch (error) {
      console.error("Error al cargar configuracion del sistema:", error);
      showToast({
        type: "error",
        title: "No se pudo cargar la configuracion",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await cyclesService.getHistory(historyPage);
      setHistory(response);
    } catch (error) {
      console.error("Error al cargar historial de ciclos:", error);
      showToast({
        type: "error",
        title: "No se pudo cargar el historial",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado.",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, showToast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const historyPages = useMemo(
    () => getPageNumbers(history?.currentPage ?? 1, history?.totalPages ?? 0),
    [history],
  );

  const canSaveCurrentCycle =
    currentCycleForm.identifier.trim().length > 0 &&
    currentCycleForm.startDate.length > 0 &&
    currentCycleForm.endDate.length > 0 &&
    currentCycleForm.startDate <= currentCycleForm.endDate;

  const canSaveHistoryCycle =
    historyCycleForm.identifier.trim().length > 0 &&
    historyCycleForm.startDate.length > 0 &&
    historyCycleForm.endDate.length > 0 &&
    historyCycleForm.startDate <= historyCycleForm.endDate;

  const canSaveSecurity =
    Number(securityForm.timeWindowMinutes) > 0 &&
    Number(securityForm.distanceKm) > 0;

  const canSaveRetention = Number(retentionForm.period) > 0;

  const openCurrentCycleModal = useCallback(() => {
    setCurrentCycleForm({
      identifier: settings?.currentCycle
        ? formatCycleCode(settings.currentCycle.code)
        : "",
      startDate: settings?.currentCycle
        ? toDateInputValue(settings.currentCycle.startDate)
        : "",
      endDate: settings?.currentCycle
        ? toDateInputValue(settings.currentCycle.endDate)
        : "",
    });
    setIsCurrentCycleModalOpen(true);
  }, [settings]);

  const openHistoryCycleModal = useCallback((cycle: CycleHistoryItem) => {
    setEditingHistoryCycle(cycle);
    setHistoryCycleForm({
      identifier: formatCycleCode(cycle.code),
      startDate: toDateInputValue(cycle.startDate),
      endDate: toDateInputValue(cycle.endDate),
    });
  }, []);

  const openSecurityModal = useCallback(() => {
    setSecurityForm({
      timeWindowMinutes: String(
        settings?.geoGpsThresholds.timeWindowMinutes ?? "",
      ),
      distanceKm: String(settings?.geoGpsThresholds.distanceKm ?? ""),
    });
    setIsSecurityModalOpen(true);
  }, [settings]);

  const openRetentionModal = useCallback(() => {
    setRetentionForm({
      period: String(
        settings ? monthsFromDays(settings.logRetention.days) : "",
      ),
      unit: "months",
    });
    setIsRetentionModalOpen(true);
  }, [settings]);

  const handleCyclePersistenceUnavailable = useCallback(
    async (
      title: string,
      close: () => void,
      setSaving: (value: boolean) => void,
    ) => {
      setSaving(true);
      try {
        showToast({
          type: "info",
          title,
          description:
            "El modal ya esta listo, pero la API actual aun no expone un endpoint para guardar cambios de ciclos academicos.",
        });
        close();
      } finally {
        setSaving(false);
      }
    },
    [showToast],
  );

  const handleSaveSecurity = useCallback(async () => {
    setSecuritySaving(true);
    try {
      const updated = await settingsService.updateAdminSettings({
        geoGpsThresholds: {
          timeWindowMinutes: Number(securityForm.timeWindowMinutes),
          distanceKm: Number(securityForm.distanceKm),
        },
      });
      setSettings(updated);
      setIsSecurityModalOpen(false);
      showToast({
        type: "success",
        title: "Seguridad actualizada",
        description: "Los parametros de seguridad se guardaron correctamente.",
      });
    } catch (error) {
      console.error("Error al guardar seguridad:", error);
      showToast({
        type: "error",
        title: "No se pudo guardar la seguridad",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado.",
      });
    } finally {
      setSecuritySaving(false);
    }
  }, [securityForm, showToast]);

  const handleSaveRetention = useCallback(async () => {
    setRetentionSaving(true);
    try {
      const updated = await settingsService.updateAdminSettings({
        logRetention: {
          days: Number(retentionForm.period) * 30,
        },
      });
      setSettings(updated);
      setIsRetentionModalOpen(false);
      showToast({
        type: "success",
        title: "Retencion actualizada",
        description: "La configuracion de retencion se guardo correctamente.",
      });
    } catch (error) {
      console.error("Error al guardar retencion:", error);
      showToast({
        type: "error",
        title: "No se pudo guardar la retencion",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado.",
      });
    } finally {
      setRetentionSaving(false);
    }
  }, [retentionForm, showToast]);

  return (
    <>
      <div className="w-full max-w-[1200px] flex flex-col justify-start items-start gap-8 overflow-hidden">
        <div className="self-stretch inline-flex justify-start items-center">
          <div className="justify-start text-text-primary text-3xl font-semibold leading-10">
            Configuracion del Sistema
          </div>
        </div>

        <div className="self-stretch inline-flex flex-col justify-start items-start gap-8">
          <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-8">
            {loading ? (
              <div className="self-stretch px-14 py-20 bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-bg-accent-light border-t-bg-accent-primary-solid rounded-full animate-spin" />
              </div>
            ) : settings?.currentCycle ? (
              <>
                <div className="self-stretch inline-flex justify-start items-center gap-4">
                  <div className="flex-1 flex justify-start items-center gap-2">
                    <Icon
                      name="event_available"
                      size={24}
                      className="text-accent-secondary"
                    />
                    <div className="inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-text-primary text-xl font-semibold leading-6">
                        Ciclo Academico Vigente
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openCurrentCycleModal}
                    className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
                  >
                    <Icon
                      name="edit"
                      size={16}
                      className="text-icon-accent-primary"
                    />
                    <div className="justify-start text-text-accent-primary text-sm font-medium leading-4">
                      Editar
                    </div>
                  </button>
                </div>

                <div className="self-stretch bg-white rounded-xl flex flex-col justify-start items-start gap-8">
                  <div className="self-stretch inline-flex justify-start items-start gap-8 flex-wrap">
                    <div className="flex-1 min-w-[220px] inline-flex flex-col justify-start items-start gap-1">
                      <div className="justify-center text-text-tertiary text-xs font-medium leading-4">
                        IDENTIFICADOR
                      </div>
                      <div className="self-stretch justify-center text-text-primary text-base font-normal leading-5">
                        {formatCycleCode(settings.currentCycle.code)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[220px] inline-flex flex-col justify-start items-start gap-1">
                      <div className="justify-center text-text-tertiary text-xs font-medium leading-4">
                        FECHA DE INICIO
                      </div>
                      <div className="self-stretch justify-center text-text-primary text-base font-normal leading-5">
                        {formatDate(settings.currentCycle.startDate)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[220px] inline-flex flex-col justify-start items-start gap-1">
                      <div className="justify-center text-text-tertiary text-xs font-medium leading-4">
                        FECHA DE FIN
                      </div>
                      <div className="self-stretch justify-center text-text-primary text-base font-normal leading-5">
                        {formatDate(settings.currentCycle.endDate)}
                      </div>
                    </div>
                  </div>

                  <div className="self-stretch flex flex-col justify-start items-start gap-2">
                    <div className="self-stretch inline-flex justify-between items-end">
                      <div className="justify-center text-text-tertiary text-sm font-medium leading-4">
                        Progreso del Ciclo
                      </div>
                      <div className="justify-center text-text-info-secondary text-sm font-medium leading-4">
                        {Math.round(settings.currentCycle.progressPercent)}%
                      </div>
                    </div>
                    <div className="self-stretch h-3 relative bg-bg-quartiary rounded-[1000px] overflow-hidden">
                      <div
                        className="h-3 left-0 top-0 absolute bg-info-secondary-solid rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, settings.currentCycle.progressPercent),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="self-stretch inline-flex justify-start items-center gap-4">
                  <div className="flex-1 flex justify-start items-center gap-2">
                    <Icon
                      name="event_available"
                      size={24}
                      className="text-accent-secondary"
                    />
                    <div className="inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-text-primary text-xl font-semibold leading-6">
                        Ciclo Academico Vigente
                      </div>
                    </div>
                  </div>
                </div>
                <EmptyStatePanel
                  icon="warning"
                  title="No hay un ciclo academico configurado"
                  description="Para comenzar a gestionar estudiantes y cursos, primero debe definir los periodos de inicio y fin del ciclo actual."
                  buttonLabel="Configurar ciclo vigente"
                  onClick={openCurrentCycleModal}
                />
              </>
            )}
          </div>

          <div className="self-stretch flex flex-col xl:flex-row justify-start items-start gap-8">
            {loading ? (
              <>
                <div className="flex-1 min-w-0 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary">
                  <div className="self-stretch px-14 py-20 bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-bg-accent-light border-t-bg-accent-primary-solid rounded-full animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary">
                  <div className="self-stretch px-14 py-20 bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-bg-accent-light border-t-bg-accent-primary-solid rounded-full animate-spin" />
                  </div>
                </div>
              </>
            ) : settings ? (
              <>
                <FilledConfigCard
                  title="Seguridad"
                  icon="security"
                  iconClassName="text-red-600"
                  onEdit={openSecurityModal}
                >
                  <div className="self-stretch inline-flex justify-start items-start gap-3">
                    <div className="flex-1 p-3 bg-bg-tertiary rounded-xl inline-flex flex-col justify-start items-start gap-1">
                      <div className="self-stretch justify-center text-text-tertiary text-xs font-medium leading-3">
                        UMBRAL TEMPORAL
                      </div>
                      <div className="self-stretch inline-flex justify-start items-end gap-1">
                        <div className="justify-center text-text-primary text-2xl font-semibold leading-7">
                          {settings.geoGpsThresholds.timeWindowMinutes}
                        </div>
                        <div className="pb-1 flex justify-center items-center">
                          <div className="justify-center text-text-primary text-xs font-normal leading-4">
                            minutos
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-3 bg-bg-tertiary rounded-xl inline-flex flex-col justify-start items-start gap-1">
                      <div className="self-stretch justify-center text-text-tertiary text-xs font-medium leading-3">
                        DISTANCIA GEOGRAFICA
                      </div>
                      <div className="self-stretch inline-flex justify-start items-end gap-1">
                        <div className="justify-center text-text-primary text-2xl font-semibold leading-7">
                          {settings.geoGpsThresholds.distanceKm}
                        </div>
                        <div className="pb-1 flex justify-center items-center">
                          <div className="justify-center text-text-primary text-xs font-normal leading-4">
                            km
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="self-stretch justify-center text-text-tertiary text-xs font-light leading-4">
                    Estos parametros definen los criterios automaticos de
                    seguridad institucional para la deteccion de accesos
                    inusuales al sistema.
                  </div>
                </FilledConfigCard>

                <FilledConfigCard
                  title="Retención de Logs de Auditoría"
                  icon="folder_zip"
                  iconClassName="text-icon-info-primary"
                  onEdit={openRetentionModal}
                >
                  <div className="self-stretch flex justify-start items-start gap-3">
                    <div className="w-full max-w-[220px] p-3 bg-bg-tertiary rounded-xl inline-flex flex-col justify-start items-start gap-1">
                      <div className="self-stretch justify-center text-text-tertiary text-xs font-medium leading-3">
                        PERIODO DE GRACIA
                      </div>
                      <div className="inline-flex justify-start items-end gap-1">
                        <div className="justify-center text-text-primary text-2xl font-semibold leading-7">
                          {monthsFromDays(settings.logRetention.days)}
                        </div>
                        <div className="pb-1 flex justify-center items-center">
                          <div className="justify-center text-text-primary text-xs font-normal leading-4">
                            meses
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="self-stretch justify-center text-text-tertiary text-xs font-light leading-4">
                    Los logs de auditoría y seguridad se depuran automáticamente 
                    según el período de retención configurado.
                  </div>
                </FilledConfigCard>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-3.5">
                  <div className="self-stretch inline-flex justify-start items-center gap-4">
                    <div className="flex-1 flex justify-start items-center gap-2">
                      <Icon
                        name="security"
                        size={24}
                        className="text-red-600"
                      />
                      <div className="inline-flex flex-col justify-start items-start">
                        <div className="justify-center text-slate-900 text-xl font-semibold leading-6">
                          Seguridad
                        </div>
                      </div>
                    </div>
                  </div>
                  <EmptyStatePanel
                    icon="warning"
                    title="Sin parametros de seguridad"
                    description="No se ha configurado ningun parametro de seguridad"
                    buttonLabel="Configurar seguridad"
                    onClick={openSecurityModal}
                  />
                </div>

                <div className="flex-1 min-w-0 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-3.5">
                  <div className="self-stretch inline-flex justify-start items-center gap-4">
                    <div className="flex-1 flex justify-start items-center gap-2">
                      <Icon
                        name="folder_zip"
                        size={24}
                        className="text-icon-info-primary"
                      />
                      <div className="inline-flex flex-col justify-start items-start">
                        <div className="justify-center text-slate-900 text-xl font-semibold leading-6">
                          Retencion de Datos Estudiantiles
                        </div>
                      </div>
                    </div>
                  </div>
                  <EmptyStatePanel
                    icon="warning"
                    title="Sin periodo de retencion"
                    description="No se ha definido el periodo de retencion de datos"
                    buttonLabel="Configurar retencion"
                    onClick={openRetentionModal}
                  />
                </div>
              </>
            )}
          </div>

          <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-8">
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch inline-flex justify-start items-center gap-4">
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div className="self-stretch justify-center text-slate-900 text-xl font-semibold leading-6">
                      Historial de Ciclos Academicos
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div className="self-stretch justify-center text-text-tertiary text-sm font-normal leading-4">
                      Registro historico de periodos lectivos finalizados.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast({
                      type: "info",
                      title: "Registrar ciclo pasado",
                      description:
                        "La API actual aun no expone el alta de ciclos historicos desde esta pantalla.",
                    })
                  }
                  className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
                >
                  <Icon
                    name="add"
                    size={16}
                    className="text-icon-accent-primary"
                  />
                  <div className="justify-start text-text-accent-primary text-sm font-medium leading-4">
                    Registrar ciclo pasado
                  </div>
                </button>
              </div>

              {historyLoading ? (
                <div className="self-stretch px-14 py-20 bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-bg-accent-light border-t-bg-accent-primary-solid rounded-full animate-spin" />
                </div>
              ) : history && history.items.length > 0 ? (
                <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-stroke-primary flex flex-col justify-start items-start overflow-hidden">
                  <div className="self-stretch inline-flex justify-start items-start">
                    <div className="flex-1 inline-flex flex-col justify-start items-start">
                      <div className="self-stretch h-12 p-4 bg-bg-tertiary rounded-tl-xl border-b border-stroke-primary inline-flex justify-start items-center">
                        <div className="text-text-secondary text-sm font-medium leading-4">
                          Identificador
                        </div>
                      </div>
                      {history.items.map((cycle) => (
                        <div
                          key={`code-${cycle.id}`}
                          className="self-stretch h-14 px-4 py-2 border-b border-stroke-primary inline-flex justify-start items-center"
                        >
                          <div className="flex-1 text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                            {formatCycleCode(cycle.code)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-60 inline-flex flex-col justify-start items-start">
                      <div className="self-stretch h-12 p-4 bg-bg-tertiary border-b border-stroke-primary inline-flex justify-end items-center">
                        <div className="text-text-secondary text-sm font-medium leading-4">
                          Inicio
                        </div>
                      </div>
                      {history.items.map((cycle) => (
                        <div
                          key={`start-${cycle.id}`}
                          className="self-stretch h-14 px-4 py-2 border-b border-stroke-primary inline-flex justify-end items-center"
                        >
                          <div className="text-text-tertiary text-sm font-normal leading-4">
                            {formatDate(cycle.startDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-60 inline-flex flex-col justify-start items-start">
                      <div className="self-stretch h-12 p-4 bg-bg-tertiary border-b border-stroke-primary inline-flex justify-end items-center">
                        <div className="text-text-secondary text-sm font-medium leading-4">
                          Fin
                        </div>
                      </div>
                      {history.items.map((cycle) => (
                        <div
                          key={`end-${cycle.id}`}
                          className="self-stretch h-14 px-4 py-2 border-b border-stroke-primary inline-flex justify-end items-center"
                        >
                          <div className="text-text-tertiary text-sm font-normal leading-4">
                            {formatDate(cycle.endDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-24 inline-flex flex-col justify-start items-start">
                      <div className="self-stretch h-12 p-4 bg-bg-tertiary rounded-tr-xl border-b border-stroke-primary inline-flex justify-center items-center">
                        <div className="text-text-secondary text-sm font-medium leading-4">
                          Acciones
                        </div>
                      </div>
                      {history.items.map((cycle) => (
                        <div
                          key={`action-${cycle.id}`}
                          className="self-stretch h-14 px-4 py-2 border-b border-stroke-primary inline-flex justify-center items-center"
                        >
                          <button
                            type="button"
                            onClick={() => openHistoryCycleModal(cycle)}
                            className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                          >
                            <Icon
                              name="edit"
                              size={20}
                              className="text-icon-tertiary"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="self-stretch px-4 py-3 flex flex-col justify-start items-start gap-2.5">
                    <div className="self-stretch inline-flex justify-between items-center">
                      <div className="flex justify-center items-center gap-1 text-text-tertiary text-sm leading-4">
                        <div>Mostrando</div>
                        <div className="font-medium">
                          {(history.currentPage - 1) * history.pageSize + 1}
                        </div>
                        <div className="font-medium">-</div>
                        <div className="font-medium">
                          {Math.min(
                            history.currentPage * history.pageSize,
                            history.totalItems,
                          )}
                        </div>
                        <div>de</div>
                        <div className="font-medium">{history.totalItems}</div>
                      </div>
                      <div className="flex justify-start items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={history.currentPage <= 1}
                          className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-50"
                        >
                          <Icon
                            name="chevron_left"
                            size={16}
                            className="text-icon-tertiary"
                          />
                        </button>
                        <div className="flex justify-start items-center gap-2">
                          {historyPages.map((page, index) =>
                            page === "..." ? (
                              <div
                                key={`ellipsis-${index}`}
                                className="min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center text-text-tertiary text-sm font-normal leading-4"
                              >
                                ...
                              </div>
                            ) : (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setHistoryPage(page)}
                                className={`min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center text-sm leading-4 ${
                                  page === history.currentPage
                                    ? "bg-bg-accent-primary-solid text-text-white font-medium"
                                    : "text-text-tertiary font-normal"
                                }`}
                              >
                                {page}
                              </button>
                            ),
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryPage((prev) =>
                              Math.min(history.totalPages, prev + 1),
                            )
                          }
                          disabled={history.currentPage >= history.totalPages}
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
                </div>
              ) : (
                <div className="self-stretch px-14 py-6 relative bg-white rounded-xl outline outline-2 outline-offset-[-2px] outline-gray-200 flex flex-col justify-center items-center gap-4">
                  <div className="self-stretch flex flex-col justify-start items-center gap-4">
                    <div className="w-full max-w-[600px] px-2.5 flex flex-col justify-start items-center gap-1.5">
                      <div className="self-stretch text-center justify-center text-text-quartiary text-sm font-normal leading-4">
                        No hay ciclos academicos registrados
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCurrentCycleModalOpen}
        onClose={() => setIsCurrentCycleModalOpen(false)}
        title="Editar Ciclo Vigente"
        size="lg"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setIsCurrentCycleModalOpen(false)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!canSaveCurrentCycle}
              loading={currentCycleSaving}
              loadingText="Guardando..."
              onClick={() =>
                void handleCyclePersistenceUnavailable(
                  "Edicion de ciclo vigente",
                  () => setIsCurrentCycleModalOpen(false),
                  setCurrentCycleSaving,
                )
              }
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <ModalTextField
            label="Identificador"
            value={currentCycleForm.identifier}
            onChange={(value) =>
              setCurrentCycleForm((prev) => ({ ...prev, identifier: value }))
            }
          />
          <FloatingField label="Fecha de inicio">
            <DatePicker
              value={currentCycleForm.startDate}
              onChange={(value) =>
                setCurrentCycleForm((prev) => ({
                  ...prev,
                  startDate: value,
                  endDate:
                    prev.endDate && value > prev.endDate ? value : prev.endDate,
                }))
              }
            />
          </FloatingField>
          <FloatingField label="Fecha de fin">
            <DatePicker
              value={currentCycleForm.endDate}
              min={currentCycleForm.startDate}
              onChange={(value) =>
                setCurrentCycleForm((prev) => ({ ...prev, endDate: value }))
              }
            />
          </FloatingField>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(editingHistoryCycle)}
        onClose={() => setEditingHistoryCycle(null)}
        title="Editar Ciclo Historico"
        size="lg"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setEditingHistoryCycle(null)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!canSaveHistoryCycle}
              loading={historyCycleSaving}
              loadingText="Guardando..."
              onClick={() =>
                void handleCyclePersistenceUnavailable(
                  "Edicion de ciclo historico",
                  () => setEditingHistoryCycle(null),
                  setHistoryCycleSaving,
                )
              }
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <ModalTextField
            label="Identificador"
            value={historyCycleForm.identifier}
            onChange={(value) =>
              setHistoryCycleForm((prev) => ({ ...prev, identifier: value }))
            }
          />
          <FloatingField label="Fecha de inicio">
            <DatePicker
              value={historyCycleForm.startDate}
              onChange={(value) =>
                setHistoryCycleForm((prev) => ({
                  ...prev,
                  startDate: value,
                  endDate:
                    prev.endDate && value > prev.endDate ? value : prev.endDate,
                }))
              }
            />
          </FloatingField>
          <FloatingField label="Fecha de fin">
            <DatePicker
              value={historyCycleForm.endDate}
              min={historyCycleForm.startDate}
              onChange={(value) =>
                setHistoryCycleForm((prev) => ({ ...prev, endDate: value }))
              }
            />
          </FloatingField>
        </div>
      </Modal>

      <Modal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        title="Editar Seguridad"
        size="lg"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setIsSecurityModalOpen(false)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!canSaveSecurity}
              loading={securitySaving}
              loadingText="Guardando..."
              onClick={() => void handleSaveSecurity()}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <ModalTextField
            label="Umbral temporal (minutos)"
            type="number"
            min={1}
            value={securityForm.timeWindowMinutes}
            onChange={(value) =>
              setSecurityForm((prev) => ({
                ...prev,
                timeWindowMinutes: clampPositiveInteger(value),
              }))
            }
            helperText="Tiempo maximo entre inicios de sesion distantes."
          />
          <ModalTextField
            label="Distancia geografica (km)"
            type="number"
            min={1}
            value={securityForm.distanceKm}
            onChange={(value) =>
              setSecurityForm((prev) => ({
                ...prev,
                distanceKm: clampPositiveInteger(value),
              }))
            }
            helperText="Distancia minima para activar alerta de anomalia."
          />
        </div>
      </Modal>

      <Modal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
        title="Configurar Retencion"
        size="lg"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setIsRetentionModalOpen(false)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!canSaveRetention}
              loading={retentionSaving}
              loadingText="Guardando..."
              onClick={() => void handleSaveRetention()}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <InfoBanner text=" Los logs de auditoría y seguridad se depuran automáticamente según el período de retención configurado" />
          <div className="self-stretch inline-flex flex-row justify-start items-start gap-1">
            <ModalTextField
              label="Periodo de retencion"
              type="number"
              min={1}
              value={retentionForm.period}
              onChange={(value) =>
                setRetentionForm((prev) => ({
                  ...prev,
                  period: clampPositiveInteger(value),
                }))
              }
            />
            <ModalSelectField
              value={retentionForm.unit}
              onChange={(value) =>
                setRetentionForm((prev) => ({ ...prev, unit: value }))
              }
              options={[{ value: "months", label: "Meses" }]}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
