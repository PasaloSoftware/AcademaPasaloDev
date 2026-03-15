"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { classEventService } from "@/services/classEvent.service";
import { materialsService } from "@/services/materials.service";
import type { ClassEvent } from "@/types/classEvent";
import type { ClassEventMaterial, FolderMaterial } from "@/types/material";
import Icon from "@/components/ui/Icon";
import ClassMaterialsModal from "@/components/modals/ClassMaterialsModal";
import MaterialPreviewModal from "@/components/materials/MaterialPreviewModal";
import ExpandableFolderList from "@/components/shared/ExpandableFolderList";
import type { ExpandableFolder } from "@/components/shared/ExpandableFolderList";

// ============================================
// Helpers de formato
// ============================================

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const formatted = date.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatSingleTime(date: Date, includeAmPm: boolean): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? "pm" : "am";

  const timeStr = m === 0 ? `${hourNum}` : `${hourNum}:${m.toString().padStart(2, "0")}`;
  return includeAmPm ? `${timeStr}${ampm}` : timeStr;
}

export function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = formatSingleTime(startDate, false);
  const endStr = formatSingleTime(endDate, true);
  return `${startStr} - ${endStr}`;
}

export function formatDurationHMS(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatFileSize(sizeBytes: string): string {
  const bytes = parseInt(sizeBytes, 10);
  if (isNaN(bytes) || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.substring(dotIndex);
}

export function getFileNameWithoutExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.substring(0, dotIndex);
}

export function getFileIconPath(mimeType: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") return "/icons/files/pdf.svg";
  if (ext === "doc" || ext === "docx") return "/icons/files/doc.svg";
  if (ext === "xls" || ext === "xlsx") return "/icons/files/xls.svg";
  if (ext === "ppt" || ext === "pptx") return "/icons/files/ppt.svg";
  if (ext === "txt") return "/icons/files/txt.svg";
  if (ext === "csv") return "/icons/files/excel.svg";
  if (ext === "zip" || ext === "rar" || ext === "7z") return "/icons/files/zip.svg";
  if (ext === "svg") return "/icons/files/svg.svg";
  if (ext === "js" || ext === "jsx") return "/icons/files/javascript.svg";
  if (ext === "css") return "/icons/files/css.svg";
  if (ext === "php") return "/icons/files/php.svg";
  if (ext === "sql") return "/icons/files/sql.svg";
  if (ext === "mp3" || ext === "wav" || ext === "ogg") return "/icons/files/mp3.svg";
  if (ext === "mp4" || ext === "avi" || ext === "mov" || ext === "mkv") return "/icons/files/video.svg";
  if (ext === "ttf" || ext === "otf" || ext === "woff") return "/icons/files/ttf.svg";
  if (ext === "apk") return "/icons/files/apk.svg";
  if (ext === "iso") return "/icons/files/iso.svg";
  if (ext === "psd") return "/icons/files/psd.svg";
  if (ext === "ai") return "/icons/files/adobe illustrator.svg";

  if (mimeType.includes("pdf")) return "/icons/files/pdf.svg";
  if (mimeType.includes("word") || mimeType.includes("document")) return "/icons/files/doc.svg";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "/icons/files/xls.svg";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "/icons/files/ppt.svg";
  if (mimeType.startsWith("image/")) return "/icons/files/image.svg";
  if (mimeType.startsWith("video/")) return "/icons/files/video.svg";
  if (mimeType.startsWith("audio/")) return "/icons/files/mp3.svg";
  if (mimeType.includes("text/")) return "/icons/files/txt.svg";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "/icons/files/zip.svg";

  return "/icons/files/text.svg";
}

// ============================================
// Tipo visual de la card de sesión
// ============================================

export type SessionCardType = "GRABADA" | "EN_VIVO_PRONTO" | "PROGRAMADA";

export function getSessionCardType(event: ClassEvent): SessionCardType {
  if (event.sessionStatus === "EN_CURSO" && !event.isCancelled) {
    return "EN_VIVO_PRONTO";
  }

  if (event.sessionStatus === "PROGRAMADA" && !event.isCancelled) {
    const msUntilStart = new Date(event.startDatetime).getTime() - Date.now();
    if (msUntilStart > 0 && msUntilStart <= 60 * 60 * 1000) {
      return "EN_VIVO_PRONTO";
    }
    return "PROGRAMADA";
  }

  return "GRABADA";
}

export function getMinutesUntilStart(startDatetime: string): number {
  const ms = new Date(startDatetime).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 1000)));
}

// ============================================
// Badge de estado de grabación
// ============================================

export function SessionBadge({ event, cardType }: { event: ClassEvent; cardType: SessionCardType }) {
  if (event.isCancelled) {
    return (
      <div className="px-2 py-1 bg-bg-error-light rounded-full flex justify-center items-center">
        <span className="text-text-error-primary text-[10px] font-semibold leading-3">
          CANCELADA
        </span>
      </div>
    );
  }

  if (cardType === "EN_VIVO_PRONTO") {
    return (
      <div className="px-2 py-1 bg-error-light rounded-full flex justify-center items-center gap-1">
        <Icon name="circle" size={12} className="text-red-600" variant="rounded" />
        <span className="text-red-600 text-[10px] font-semibold leading-3">
          EN VIVO PRONTO
        </span>
      </div>
    );
  }

  if (cardType === "GRABADA") {
    return (
      <div className="px-2 py-1 bg-bg-info-primary-light rounded-full flex justify-center items-center">
        <span className="text-text-info-primary text-[10px] font-semibold leading-3">
          GRABADA
        </span>
      </div>
    );
  }

  if (cardType === "PROGRAMADA") {
    return (
      <div className="px-2 py-1 bg-bg-quartiary rounded-full flex justify-center items-center">
        <span className="text-text-secondary text-[10px] font-semibold leading-3">
          PROGRAMADA
        </span>
      </div>
    );
  }

  return null;
}

// ============================================
// Class Session Card
// ============================================

export function ClassSessionCard({
  event,
  onOpenMaterials,
  getClassPageUrl,
}: {
  event: ClassEvent;
  materials: ClassEventMaterial[];
  loadingMaterials: boolean;
  onOpenMaterials: (eventId: string) => void;
  getClassPageUrl: (eventId: string) => string;
}) {
  const router = useRouter();
  const cardType = getSessionCardType(event);
  const canWatch =
    event.canWatchRecording && event.recordingStatus === "READY";
  const duration = formatDurationHMS(event.startDatetime, event.endDatetime);
  const [minutesLeft, setMinutesLeft] = useState(() => getMinutesUntilStart(event.startDatetime));

  useEffect(() => {
    if (cardType !== "EN_VIVO_PRONTO") return;
    const interval = setInterval(() => {
      setMinutesLeft(getMinutesUntilStart(event.startDatetime));
    }, 30_000);
    return () => clearInterval(interval);
  }, [cardType, event.startDatetime]);

  const classPageUrl = getClassPageUrl(event.id);

  const handleGoToClass = () => {
    router.push(classPageUrl);
  };

  const handleJoinLive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.liveMeetingUrl) {
      window.open(event.liveMeetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenMaterials = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenMaterials(event.id);
  };

  const formatLiveTime = useCallback(() => {
    const start = new Date(event.startDatetime);
    const now = new Date();
    const isToday =
      start.getDate() === now.getDate() &&
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear();
    const timeStr = formatSingleTime(start, true);
    return isToday ? `Hoy, ${timeStr}` : `${formatDate(event.startDatetime)}, ${timeStr}`;
  }, [event.startDatetime]);

  // ── EN VIVO PRONTO card ──
  if (cardType === "EN_VIVO_PRONTO") {
    return (
      <div onClick={handleGoToClass} className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-2 outline-offset-[-2px] outline-stroke-accent-primary inline-flex justify-start items-start gap-6 cursor-pointer">
        <div className="h-32 aspect-video shrink-0 p-2 bg-bg-accent-light rounded-lg inline-flex flex-col justify-center items-center gap-2">
          <Icon name="videocam" size={40} className="text-icon-accent-primary" variant="rounded" />
          <span className="text-text-accent-primary text-sm font-semibold leading-4">
            EN VIVO PRONTO
          </span>
        </div>

        <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            <div className="self-stretch inline-flex justify-start items-start gap-4">
              <div className="flex-1 flex justify-start items-start gap-1">
                <span className="text-text-primary text-lg font-semibold leading-5">
                  Clase {event.sessionNumber}:
                </span>
                <span className="flex-1 text-text-primary text-lg font-semibold leading-5">
                  {event.topic}
                </span>
              </div>
              <SessionBadge event={event} cardType={cardType} />
            </div>

            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon name="schedule" size={14} className="text-icon-accent-primary" variant="rounded" />
              <span className="text-text-accent-primary text-xs font-medium leading-4">
                Empieza en {minutesLeft} min ({formatLiveTime()})
              </span>
            </div>
          </div>

          <div className="self-stretch inline-flex justify-end items-start gap-2.5">
            <button
              onClick={handleOpenMaterials}
              className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
            >
              <Icon name="folder" size={16} className="text-icon-accent-primary" variant="rounded" />
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                Materiales de Clase
              </span>
            </button>
            <button
              onClick={handleJoinLive}
              disabled={!event.liveMeetingUrl}
              className="px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
            >
              <Icon name="videocam" size={16} className="text-icon-white" variant="rounded" />
              <span className="text-text-white text-sm font-medium leading-4">
                Unirse a la Clase
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PROGRAMADA card ──
  if (cardType === "PROGRAMADA") {
    return (
      <div onClick={handleGoToClass} className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-start gap-6 cursor-pointer">
        <div className="h-32 aspect-video shrink-0 p-2 bg-bg-tertiary rounded-lg inline-flex flex-col justify-center items-center gap-2">
          <Icon name="event" size={40} className="text-icon-tertiary" variant="rounded" />
          <span className="text-gray-600 text-sm font-semibold leading-4">
            CLASE PROGRAMADA
          </span>
        </div>

        <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            <div className="self-stretch inline-flex justify-start items-start gap-4">
              <div className="flex-1 flex justify-start items-start gap-1">
                <span className="text-text-primary text-lg font-semibold leading-5">
                  Clase {event.sessionNumber}:
                </span>
                <span className="flex-1 text-text-primary text-lg font-semibold leading-5">
                  {event.topic}
                </span>
              </div>
              <SessionBadge event={event} cardType={cardType} />
            </div>

            <div className="self-stretch flex flex-col justify-start items-start gap-1">
              <div className="self-stretch inline-flex justify-start items-center gap-1">
                <Icon name="calendar_today" size={14} className="text-icon-secondary" variant="rounded" />
                <span className="text-text-tertiary text-xs font-normal leading-4">
                  {formatDate(event.startDatetime)}
                </span>
              </div>
              <div className="self-stretch inline-flex justify-start items-center gap-1">
                <Icon name="schedule" size={14} className="text-icon-secondary" variant="rounded" />
                <span className="text-text-secondary text-xs font-normal leading-3">
                  {formatTimeRange(event.startDatetime, event.endDatetime)}
                </span>
              </div>
            </div>
          </div>

          <div className="self-stretch inline-flex justify-end items-start gap-2.5">
            <button
              onClick={handleOpenMaterials}
              className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
            >
              <Icon name="folder" size={16} className="text-icon-accent-primary" variant="rounded" />
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                Materiales de Clase
              </span>
            </button>
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="px-6 py-3 bg-bg-disabled rounded-lg flex justify-center items-center gap-1.5 cursor-not-allowed"
            >
              <Icon name="videocam" size={16} className="text-icon-disabled" variant="rounded" />
              <span className="text-text-disabled text-sm font-medium leading-4">
                Unirme a la Clase
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GRABADA card (default: FINALIZADA / CANCELADA) ──
  return (
    <div onClick={handleGoToClass} className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-start gap-6 cursor-pointer">
      <div
        className="h-32 aspect-video shrink-0 p-2 relative bg-bg-disabled rounded-lg inline-flex flex-col justify-end items-end"
      >
        <div className="p-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-accent-primary-solid rounded-full inline-flex justify-center items-center">
          <Icon name="play_arrow" size={24} className="text-icon-white" />
        </div>
        {canWatch && (
          <div className="px-2 py-1 bg-black/80 rounded-full inline-flex justify-start items-center">
            <span className="text-text-white text-[10px] font-normal leading-3">
              {duration}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
        <div className="self-stretch flex flex-col justify-start items-start gap-2">
          <div className="self-stretch inline-flex justify-start items-start gap-4">
            <div className="flex-1 flex justify-start items-start gap-1">
              <span className="text-text-primary text-lg font-semibold leading-5">
                Clase {event.sessionNumber}:
              </span>
              <span className="flex-1 text-text-primary text-lg font-semibold leading-5">
                {event.topic}
              </span>
            </div>
            <SessionBadge event={event} cardType={cardType} />
          </div>

          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon name="calendar_today" size={14} className="text-icon-secondary" />
              <span className="text-text-tertiary text-xs font-normal leading-4">
                {formatDate(event.startDatetime)}
              </span>
            </div>
            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon name="schedule" size={14} className="text-icon-secondary" />
              <span className="text-text-secondary text-xs font-normal leading-3">
                {formatTimeRange(event.startDatetime, event.endDatetime)}
              </span>
            </div>
          </div>
        </div>

        <div className="self-stretch inline-flex justify-end items-start gap-2.5">
          <button
            onClick={handleOpenMaterials}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
          >
            <Icon name="folder" size={16} className="text-icon-accent-primary" variant="rounded" />
            <span className="text-text-accent-primary text-sm font-medium leading-4">
              Materiales de Clase
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleGoToClass(); }}
            disabled={!canWatch}
            className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors ${
              canWatch
                ? "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
                : "bg-bg-disabled cursor-not-allowed"
            }`}
          >
            <Icon
              name="play_arrow"
              size={16}
              className={canWatch ? "text-icon-white" : "text-icon-disabled"}
            />
            <span
              className={`text-sm font-medium leading-4 ${canWatch ? "text-text-white" : "text-text-disabled"}`}
            >
              Ver Grabación
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componente de contenido reutilizable
// Maneja: tabs, sesiones, materiales, modal
// ============================================

type EvalTabOption = "sesiones" | "material";

interface EvaluationPageContentProps {
  evalId: string;
  /** Función para generar URL de la página de una clase */
  getClassPageUrl: (eventId: string) => string;
  /** Callback opcional cuando se detecta el nombre de la evaluación desde los eventos */
  onEvalNameDetected?: (name: string) => void;
}

export function EvaluationPageContent({
  evalId,
  getClassPageUrl,
  onEvalNameDetected,
}: EvaluationPageContentProps) {
  const [activeTab, setActiveTab] = useState<EvalTabOption>("sesiones");
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  // Materiales por classEventId
  const [materialsByEvent, setMaterialsByEvent] = useState<
    Record<string, ClassEventMaterial[]>
  >({});
  const [loadingMaterialsMap, setLoadingMaterialsMap] = useState<
    Record<string, boolean>
  >({});

  // Material Adicional tab state
  const [additionalFolders, setAdditionalFolders] = useState<ExpandableFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Cargar sesiones de clase
  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true);
      setErrorEvents(null);
      try {
        const data = await classEventService.getEvaluationEvents(evalId);
        setEvents(data);
        if (data.length > 0 && data[0].evaluationName && onEvalNameDetected) {
          onEvalNameDetected(data[0].evaluationName);
        }
      } catch (err) {
        console.error("Error al cargar sesiones:", err);
        setErrorEvents("Error al cargar las sesiones de clase");
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [evalId, onEvalNameDetected]);

  // Cargar materiales para cada sesión
  useEffect(() => {
    if (events.length === 0) return;

    async function loadMaterialsForEvent(eventId: string) {
      setLoadingMaterialsMap((prev) => ({ ...prev, [eventId]: true }));
      try {
        const materials = await materialsService.getClassEventMaterials(eventId);
        setMaterialsByEvent((prev) => ({ ...prev, [eventId]: materials }));
      } catch (err) {
        console.error(`Error al cargar materiales para evento ${eventId}:`, err);
        setMaterialsByEvent((prev) => ({ ...prev, [eventId]: [] }));
      } finally {
        setLoadingMaterialsMap((prev) => ({ ...prev, [eventId]: false }));
      }
    }

    events.forEach((event) => {
      loadMaterialsForEvent(event.id);
    });
  }, [events]);

  // Materials modal state
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [materialsModalEventId, setMaterialsModalEventId] = useState<string | undefined>();
  const [previewMaterials, setPreviewMaterials] = useState<FolderMaterial[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleOpenMaterials = (eventId: string) => {
    setMaterialsModalEventId(eventId);
    setMaterialsModalOpen(true);
  };

  // Load "Material Adicional" root folder contents when tab is active
  useEffect(() => {
    if (activeTab !== "material") return;
    if (additionalFolders.length > 0) return;

    let cancelled = false;
    async function load() {
      setLoadingFolders(true);
      setFolderError(null);
      try {
        const rootFolders = await materialsService.getRootFolders(evalId);
        const matAdicional = rootFolders.find(
          (f) => f.name.toLowerCase().includes("adicional"),
        );
        if (!matAdicional) {
          if (!cancelled) setAdditionalFolders([]);
          return;
        }
        const contents = await materialsService.getFolderContents(matAdicional.id);
        if (!cancelled) {
          setAdditionalFolders(
            contents.folders.map((f) => ({
              id: f.id,
              name: f.name,
              materialCount: contents.subfolderMaterialCount?.[f.id] ?? 0,
            })),
          );
        }
      } catch {
        if (!cancelled) setFolderError("Error al cargar los materiales");
      } finally {
        if (!cancelled) setLoadingFolders(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, evalId]);

  const loadFolderMaterials = useCallback(async (folderId: string): Promise<FolderMaterial[]> => {
    const contents = await materialsService.getFolderContents(folderId);
    return contents.materials;
  }, []);

  const handleDownloadMaterial = useCallback(async (mat: FolderMaterial) => {
    try {
      const data = await materialsService.getAuthorizedLink(mat.id, "download");
      const a = document.createElement("a");
      a.href = data.url;
      a.download = mat.displayName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      await materialsService.downloadMaterial(mat.id, mat.displayName);
    }
  }, []);

  const evalTabs: { key: EvalTabOption; label: string }[] = [
    { key: "sesiones", label: "Sesiones de Clase" },
    { key: "material", label: "Material Adicional" },
  ];

  return (
    <div className="self-stretch inline-flex flex-col justify-start items-start gap-8">
      {/* Sub-tabs */}
      <div className="p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-center items-center">
        {evalTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? "bg-bg-accent-primary-solid"
                : "bg-bg-primary hover:bg-bg-secondary"
            }`}
          >
            <span
              className={`text-center text-base leading-4 whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-text-white font-medium"
                  : "text-text-secondary font-normal"
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* TAB: Sesiones de Clase */}
      {activeTab === "sesiones" && (
        <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
          <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
            <span className="text-text-primary text-2xl font-semibold leading-7">
              Sesiones de Clase
            </span>
          </div>

          {loadingEvents && (
            <div className="self-stretch flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {errorEvents && (
            <div className="bg-bg-primary self-stretch p-12 rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
              <Icon name="error" size={64} className="text-icon-tertiary" />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">{errorEvents}</p>
                <p className="text-text-secondary text-sm">Intenta recargar la página</p>
              </div>
            </div>
          )}

          {!loadingEvents && !errorEvents && events.length === 0 && (
            <div className="self-stretch p-12 bg-white rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
              <Icon name="event" size={64} className="text-icon-tertiary" />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">No hay sesiones de clase</p>
                <p className="text-text-secondary text-sm">Las sesiones aparecerán aquí cuando sean programadas</p>
              </div>
            </div>
          )}

          {!loadingEvents && !errorEvents && events.length > 0 && (
            <div className="self-stretch inline-flex flex-col justify-start items-start gap-6">
              {events.map((event) => (
                <ClassSessionCard
                  key={event.id}
                  event={event}
                  materials={materialsByEvent[event.id] || []}
                  loadingMaterials={loadingMaterialsMap[event.id] || false}
                  onOpenMaterials={handleOpenMaterials}
                  getClassPageUrl={getClassPageUrl}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Material Adicional */}
      {activeTab === "material" && (
        <div className="self-stretch inline-flex flex-col justify-start items-start gap-6 overflow-hidden">
          {loadingFolders && (
            <div className="self-stretch flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {folderError && (
            <div className="bg-bg-primary self-stretch p-12 rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
              <Icon name="error" size={64} className="text-icon-tertiary" />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">{folderError}</p>
                <p className="text-text-secondary text-sm">Intenta recargar la página</p>
              </div>
            </div>
          )}

          {!loadingFolders && !folderError && additionalFolders.length === 0 && (
            <div className="self-stretch p-12 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
              <Icon name="folder_open" size={64} className="text-icon-tertiary" variant="rounded" />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">No hay material adicional</p>
                <p className="text-text-secondary text-sm">Los materiales aparecerán aquí cuando sean subidos</p>
              </div>
            </div>
          )}

          {!loadingFolders && !folderError && additionalFolders.length > 0 && (
            <ExpandableFolderList
              title="Material Adicional"
              folders={additionalFolders}
              loadFolderMaterials={loadFolderMaterials}
              onDownloadMaterial={handleDownloadMaterial}
              onPreviewMaterial={(mats, idx) => { setPreviewMaterials(mats); setPreviewIndex(idx); }}
            />
          )}
        </div>
      )}

      {/* Materials Modal */}
      <ClassMaterialsModal
        isOpen={materialsModalOpen}
        onClose={() => setMaterialsModalOpen(false)}
        events={events}
        materialsByEvent={materialsByEvent}
        loadingMaterialsMap={loadingMaterialsMap}
        initialEventId={materialsModalEventId}
      />

      {/* Material Preview Modal */}
      {previewMaterials && (
        <MaterialPreviewModal
          materials={previewMaterials}
          initialIndex={previewIndex}
          onClose={() => setPreviewMaterials(null)}
        />
      )}
    </div>
  );
}
