"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { classEventService } from "@/services/classEvent.service";
import { materialsService } from "@/services/materials.service";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService } from "@/services/courses.service";
import type { ClassEvent } from "@/types/classEvent";
import type { ClassEventMaterial, MaterialFolder, FolderMaterial, FolderContentsResponse } from "@/types/material";
import type { Enrollment } from "@/types/enrollment";
import Icon from "@/components/ui/Icon";
import ClassMaterialsModal from "@/components/modals/ClassMaterialsModal";

interface EvaluationContentProps {
  cursoId: string;
  evalId: string;
}

type EvalTabOption = "sesiones" | "material";

// ============================================
// Helpers de formato
// ============================================

function formatDate(iso: string): string {
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

function formatSingleTime(date: Date, includeAmPm: boolean): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? "pm" : "am";

  const timeStr = m === 0 ? `${hourNum}` : `${hourNum}:${m.toString().padStart(2, "0")}`;
  return includeAmPm ? `${timeStr}${ampm}` : timeStr;
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = formatSingleTime(startDate, false);
  const endStr = formatSingleTime(endDate, true);
  return `${startStr} - ${endStr}`;
}

function formatDurationHMS(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatFileSize(sizeBytes: string): string {
  const bytes = parseInt(sizeBytes, 10);
  if (isNaN(bytes) || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.substring(dotIndex);
}

function getFileNameWithoutExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return fileName;
  return fileName.substring(0, dotIndex);
}

function getFileIconPath(mimeType: string, fileName: string): string {
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

type SessionCardType = "GRABADA" | "EN_VIVO_PRONTO" | "PROGRAMADA";

function getSessionCardType(event: ClassEvent): SessionCardType {
  // EN_CURSO siempre es "en vivo"
  if (event.sessionStatus === "EN_CURSO" && !event.isCancelled) {
    return "EN_VIVO_PRONTO";
  }

  // PROGRAMADA pero falta ≤ 1 hora → EN VIVO PRONTO
  if (event.sessionStatus === "PROGRAMADA" && !event.isCancelled) {
    const msUntilStart = new Date(event.startDatetime).getTime() - Date.now();
    if (msUntilStart > 0 && msUntilStart <= 60 * 60 * 1000) {
      return "EN_VIVO_PRONTO";
    }
    return "PROGRAMADA";
  }

  // FINALIZADA o CANCELADA → card de grabación
  return "GRABADA";
}

/** Calcula minutos restantes hasta startDatetime */
function getMinutesUntilStart(startDatetime: string): number {
  const ms = new Date(startDatetime).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 1000)));
}

// ============================================
// Badge de estado de grabación
// ============================================

function SessionBadge({ event, cardType }: { event: ClassEvent; cardType: SessionCardType }) {
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
// Material File Card
// ============================================

function MaterialCard({ material }: { material: ClassEventMaterial }) {
  const [downloading, setDownloading] = useState(false);

  const fileName =
    material.displayName || material.fileResource.originalName;
  const nameWithoutExt = getFileNameWithoutExtension(fileName);
  const ext = getFileExtension(fileName);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await materialsService.downloadMaterial(material.id, fileName);
    } catch (err) {
      console.error("Error al descargar:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="self-stretch p-3 bg-bg-secondary rounded-lg inline-flex justify-start items-center gap-3">
      {/* File type icon */}
      <div className="flex-1 flex justify-start items-center gap-1">
        <img
          src={getFileIconPath(material.fileResource.mimeType, fileName)}
          alt=""
          className="w-8 h-8 shrink-0"
        />

        {/* File info */}
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
          <div className="self-stretch inline-flex justify-start items-start">
            <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
              {nameWithoutExt}
            </span>
            <span className="text-text-primary text-sm font-normal leading-4">
              {ext}
            </span>
          </div>
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <span className="text-text-tertiary text-[10px] font-normal leading-3">
              {formatFileSize(material.fileResource.sizeBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-start items-center gap-1">
        <button
          className="p-1 rounded-full flex justify-center items-center"
          title="Ver"
        >
          <Icon name="visibility" size={20} className="text-icon-tertiary" />
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1 rounded-full flex justify-center items-center disabled:opacity-50"
          title="Descargar"
        >
          <Icon
            name={downloading ? "hourglass_empty" : "download"}
            size={20}
            className="text-icon-tertiary"
          />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Class Session Card (Figma redesign)
// ============================================

function ClassSessionCard({
  event,
  materials,
  loadingMaterials,
  onOpenMaterials,
  cursoId,
  evalId,
}: {
  event: ClassEvent;
  materials: ClassEventMaterial[];
  loadingMaterials: boolean;
  onOpenMaterials: (eventId: string) => void;
  cursoId: string;
  evalId: string;
}) {
  const router = useRouter();
  const cardType = getSessionCardType(event);
  const canWatch =
    event.canWatchRecording && event.recordingStatus === "READY";
  const duration = formatDurationHMS(event.startDatetime, event.endDatetime);
  // Siempre mostrar botón de materiales
  const hasMaterials = true;

  // Countdown for EN_VIVO_PRONTO
  const [minutesLeft, setMinutesLeft] = useState(() => getMinutesUntilStart(event.startDatetime));

  useEffect(() => {
    if (cardType !== "EN_VIVO_PRONTO") return;
    const interval = setInterval(() => {
      setMinutesLeft(getMinutesUntilStart(event.startDatetime));
    }, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [cardType, event.startDatetime]);

  const handleWatchRecording = () => {
    if (canWatch) {
      router.push(`/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${event.id}`);
    }
  };

  const handleJoinLive = () => {
    if (event.liveMeetingUrl) {
      window.open(event.liveMeetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Format "Hoy, 7pm" style for EN VIVO PRONTO
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
      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-2 outline-offset-[-2px] outline-stroke-accent-primary inline-flex justify-start items-start gap-6">
        {/* Left icon area */}
        <div className="h-32 aspect-video shrink-0 p-2 bg-bg-accent-light rounded-lg inline-flex flex-col justify-center items-center gap-2">
          <Icon name="videocam" size={40} className="text-icon-accent-primary" variant="rounded" />
          <span className="text-text-accent-primary text-sm font-semibold leading-4">
            EN VIVO PRONTO
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            {/* Title + Badge */}
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

            {/* Countdown */}
            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon name="schedule" size={14} className="text-icon-accent-primary" variant="rounded" />
              <span className="text-text-accent-primary text-xs font-medium leading-4">
                Empieza en {minutesLeft} min ({formatLiveTime()})
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="self-stretch inline-flex justify-end items-start gap-2.5">
            {hasMaterials && (
              <button
                onClick={() => onOpenMaterials(event.id)}
                className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
              >
                <Icon name="folder" size={16} className="text-icon-accent-primary" variant="rounded" />
                <span className="text-text-accent-primary text-sm font-medium leading-4">
                  Materiales de Clase
                </span>
              </button>
            )}
            <button
              onClick={handleJoinLive}
              disabled={!event.liveMeetingUrl}
              className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors ${
                event.liveMeetingUrl
                  ? "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
                  : "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
              }`}
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
      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-start gap-6">
        {/* Left icon area */}
        <div className="h-32 aspect-video shrink-0 p-2 bg-bg-tertiary rounded-lg inline-flex flex-col justify-center items-center gap-2">
          <Icon name="event" size={40} className="text-icon-tertiary" variant="rounded" />
          <span className="text-gray-600 text-sm font-semibold leading-4">
            CLASE PROGRAMADA
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            {/* Title + Badge */}
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

            {/* Date + Time */}
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

          {/* Action Buttons */}
          <div className="self-stretch inline-flex justify-end items-start gap-2.5">
            {hasMaterials && (
              <button
                onClick={() => onOpenMaterials(event.id)}
                className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
              >
                <Icon name="folder" size={16} className="text-icon-accent-primary" variant="rounded" />
                <span className="text-text-accent-primary text-sm font-medium leading-4">
                  Materiales de Clase
                </span>
              </button>
            )}
            <button
              disabled
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
    <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-start gap-6">
      {/* Video Thumbnail */}
      <div
        onClick={handleWatchRecording}
        className={`h-32 aspect-video shrink-0 p-2 relative bg-bg-disabled rounded-lg inline-flex flex-col justify-end items-end ${canWatch ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
      >
        {/* Play button centered */}
        <div className="p-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-accent-primary-solid rounded-full inline-flex justify-center items-center">
          <Icon name="play_arrow" size={24} className="text-icon-white" />
        </div>
        {/* Duration badge bottom-right */}
        {canWatch && (
          <div className="px-2 py-1 bg-black/80 rounded-full inline-flex justify-start items-center">
            <span className="text-text-white text-[10px] font-normal leading-3">
              {duration}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-6">
        {/* Title + Badge + Date/Time */}
        <div className="self-stretch flex flex-col justify-start items-start gap-2">
          {/* Title row + Badge */}
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

          {/* Date + Time */}
          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon
                name="calendar_today"
                size={14}
                className="text-icon-secondary"
              />
              <span className="text-text-tertiary text-xs font-normal leading-4">
                {formatDate(event.startDatetime)}
              </span>
            </div>
            <div className="self-stretch inline-flex justify-start items-center gap-1">
              <Icon
                name="schedule"
                size={14}
                className="text-icon-secondary"
              />
              <span className="text-text-secondary text-xs font-normal leading-3">
                {formatTimeRange(event.startDatetime, event.endDatetime)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="self-stretch inline-flex justify-end items-start gap-2.5">
          {hasMaterials && (
            <button
              onClick={() => onOpenMaterials(event.id)}
              className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
            >
              <Icon
                name="folder"
                size={16}
                className="text-icon-accent-primary"
                variant="rounded"
              />
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                Materiales de Clase
              </span>
            </button>
          )}
          <button
            onClick={handleWatchRecording}
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
// Componente principal
// ============================================

export default function EvaluationContent({
  cursoId,
  evalId,
}: EvaluationContentProps) {
  const { setBreadcrumbItems } = useBreadcrumb();

  const [activeTab, setActiveTab] = useState<EvalTabOption>("sesiones");
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  // Nombre del curso (desde enrollment)
  const [courseName, setCourseName] = useState<string>("");

  // Nombre de la evaluación (corto y completo)
  const [evalShortName, setEvalShortName] = useState<string>("");
  const [evalFullName, setEvalFullName] = useState<string>("");

  // Materiales por classEventId
  const [materialsByEvent, setMaterialsByEvent] = useState<
    Record<string, ClassEventMaterial[]>
  >({});
  const [loadingMaterialsMap, setLoadingMaterialsMap] = useState<
    Record<string, boolean>
  >({});

  // Material Adicional tab state
  const [additionalFolders, setAdditionalFolders] = useState<MaterialFolder[]>([]);
  const [folderContents, setFolderContents] = useState<FolderContentsResponse | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Cargar nombre del curso desde enrollment + evaluación desde ciclo vigente
  useEffect(() => {
    async function loadCourseData() {
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments: Enrollment[] = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find(
          (e) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error("Error al cargar nombre del curso:", err);
      }
    }

    async function loadEvalNames() {
      try {
        const data = await coursesService.getCurrentCycleContent(cursoId);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) {
          setEvalShortName(eval_.shortName);
          setEvalFullName(eval_.fullName);
        }
      } catch (err) {
        console.error("Error al cargar datos de evaluación:", err);
      }
    }

    loadCourseData();
    loadEvalNames();
  }, [cursoId, evalId]);

  // Breadcrumb
  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: "Cursos" },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: "Ciclo Vigente" },
      { label: evalShortName },
    ]);
  }, [setBreadcrumbItems, courseName, evalShortName, cursoId]);

  // ⚠️ MOCK DATA — BORRAR ESTE BLOQUE COMPLETO (buscar "MOCK_START" y "MOCK_END")
  // MOCK_START
  useEffect(() => {
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const in30minEnd = new Date(in30min.getTime() + 2 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(yesterday.getTime() + 2 * 60 * 60 * 1000);

    const baseMock = {
      liveMeetingUrl: "https://meet.google.com/pasalo-test",
      recordingUrl: null,
      isCancelled: false,
      canJoinLive: false,
      canCopyLiveLink: false,
      canCopyRecordingLink: false,
      courseName: "Álgebra Matricial",
      courseCode: "MATE101",
      courseCycleId: "20",
      evaluationId: "120",
      evaluationName: "PC4",
      creator: { id: "2", firstName: "Docente", lastName1: "Pasalo", lastName2: "", profilePhotoUrl: null },
      professors: [],
      createdAt: now.toISOString(),
      updatedAt: null,
    };

    const mockEvents: ClassEvent[] = [
      {
        ...baseMock,
        id: "mock-1",
        sessionNumber: 1,
        title: "Sesión 1",
        topic: "Introducción a matrices",
        startDatetime: yesterday.toISOString(),
        endDatetime: yesterdayEnd.toISOString(),
        sessionStatus: "FINALIZADA",
        recordingStatus: "READY",
        canWatchRecording: true,
        recordingUrl: "https://drive.google.com/file/d/1gQ616dto69rGFt9PFQhK85YvoUXyLssD/preview",
      },
      {
        ...baseMock,
        id: "mock-2",
        sessionNumber: 2,
        title: "Sesión 2",
        topic: "Ángulo de inclinación y pendiente de una recta",
        startDatetime: in30min.toISOString(),
        endDatetime: in30minEnd.toISOString(),
        sessionStatus: "PROGRAMADA",
        recordingStatus: "NOT_AVAILABLE",
        canWatchRecording: false,
      },
      {
        ...baseMock,
        id: "mock-3",
        sessionNumber: 3,
        title: "Sesión 3",
        topic: "PCs pasadas",
        startDatetime: nextWeek.toISOString(),
        endDatetime: nextWeekEnd.toISOString(),
        sessionStatus: "PROGRAMADA",
        recordingStatus: "NOT_AVAILABLE",
        canWatchRecording: false,
        liveMeetingUrl: null,
      },
      {
        ...baseMock,
        id: "mock-4",
        sessionNumber: 4,
        title: "Sesión 4",
        topic: "Repaso Final",
        startDatetime: yesterday.toISOString(),
        endDatetime: yesterdayEnd.toISOString(),
        sessionStatus: "FINALIZADA",
        recordingStatus: "PROCESSING",
        canWatchRecording: false,
      },
    ];

    setEvents(mockEvents);
    setLoadingEvents(false);
  }, []);
  // MOCK_END

  // Cargar sesiones de clase (COMENTADO POR MOCK — descomentar al borrar mock)
  /* useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true);
      setErrorEvents(null);
      try {
        const data =
          await classEventService.getEvaluationEvents(evalId);
        setEvents(data);
        // Fallback: si no se pudo obtener nombres desde ciclo vigente
        if (data.length > 0 && data[0].evaluationName && !evalShortName) {
          setEvalShortName(data[0].evaluationName);
        }
      } catch (err) {
        console.error("Error al cargar sesiones:", err);
        setErrorEvents("Error al cargar las sesiones de clase");
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [evalId, evalShortName]); */

  // Cargar materiales para cada sesión
  useEffect(() => {
    if (events.length === 0) return;

    async function loadMaterialsForEvent(eventId: string) {
      setLoadingMaterialsMap((prev) => ({ ...prev, [eventId]: true }));
      try {
        const materials =
          await materialsService.getClassEventMaterials(eventId);
        setMaterialsByEvent((prev) => ({ ...prev, [eventId]: materials }));
      } catch (err) {
        console.error(
          `Error al cargar materiales para evento ${eventId}:`,
          err,
        );
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

  const handleOpenMaterials = (eventId: string) => {
    setMaterialsModalEventId(eventId);
    setMaterialsModalOpen(true);
  };

  // Load "Material Adicional" root folder contents when tab is active
  useEffect(() => {
    if (activeTab !== "material") return;
    if (additionalFolders.length > 0) return; // already loaded

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
          setAdditionalFolders(contents.folders);
          // Pre-populate counts
          setFolderContents(contents);
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

  // Expanded folders + their loaded materials
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderMaterials, setFolderMaterials] = useState<Record<string, FolderMaterial[]>>({});
  const [loadingFolderMaterials, setLoadingFolderMaterials] = useState<Record<string, boolean>>({});

  const toggleFolder = async (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });

    // Lazy load materials if not already loaded
    if (!folderMaterials[folderId] && !loadingFolderMaterials[folderId]) {
      setLoadingFolderMaterials((prev) => ({ ...prev, [folderId]: true }));
      try {
        const contents = await materialsService.getFolderContents(folderId);
        setFolderMaterials((prev) => ({ ...prev, [folderId]: contents.materials }));
      } catch {
        setFolderMaterials((prev) => ({ ...prev, [folderId]: [] }));
      } finally {
        setLoadingFolderMaterials((prev) => ({ ...prev, [folderId]: false }));
      }
    }
  };

  const expandAll = () => {
    const allIds = new Set(additionalFolders.map((f) => f.id));
    setExpandedFolders(allIds);
    // Lazy load all
    additionalFolders.forEach((f) => {
      if (!folderMaterials[f.id] && !loadingFolderMaterials[f.id]) {
        setLoadingFolderMaterials((prev) => ({ ...prev, [f.id]: true }));
        materialsService.getFolderContents(f.id).then((contents) => {
          setFolderMaterials((prev) => ({ ...prev, [f.id]: contents.materials }));
        }).catch(() => {
          setFolderMaterials((prev) => ({ ...prev, [f.id]: [] }));
        }).finally(() => {
          setLoadingFolderMaterials((prev) => ({ ...prev, [f.id]: false }));
        });
      }
    });
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const allExpanded = additionalFolders.length > 0 && additionalFolders.every((f) => expandedFolders.has(f.id));

  const handleDownloadMaterial = async (mat: FolderMaterial) => {
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
  };

  // Sub-tabs config
  const evalTabs: { key: EvalTabOption; label: string }[] = [
    { key: "sesiones", label: "Sesiones de Clase" },
    { key: "material", label: "Material Adicional" },
  ];

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* ========================================
          BACK LINK
          ======================================== */}
      <Link
        href={`/plataforma/curso/${cursoId}`}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver al Ciclo Vigente
        </span>
      </Link>

      {/* ========================================
          BANNER
          ======================================== */}
      <div
        className="self-stretch px-10 py-8 relative rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8"
        style={{
          background:
            "linear-gradient(to right, var(--muted-indigo-800), var(--muted-indigo-700), var(--muted-indigo-200))",
        }}
      >
        {/* Decorative icon */}
        <div className="w-40 h-40 absolute right-[-36px] top-[-12px] overflow-hidden">
          <Icon name="school" size={160} className="text-muted-indigo-700" />
        </div>
        <div className="self-stretch flex flex-col justify-center items-start gap-0.5">
          <span className="self-stretch text-text-white text-3xl font-semibold leading-10">
            {evalShortName}
          </span>
          {evalFullName && (
            <span className="self-stretch text-text-white text-sm font-normal leading-4">
              {evalFullName.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* ========================================
          SUB-TABS + CONTENT
          ======================================== */}
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

        {/* ========================================
            TAB: Sesiones de Clase
            ======================================== */}
        {activeTab === "sesiones" && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            {/* Section Title */}
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Sesiones de Clase
              </span>
            </div>

            {/* Loading */}
            {loadingEvents && (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {errorEvents && (
              <div className="bg-bg-primary self-stretch p-12 rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="error"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    {errorEvents}
                  </p>
                  <p className="text-text-secondary text-sm">
                    Intenta recargar la página
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loadingEvents && !errorEvents && events.length === 0 && (
              <div className="self-stretch p-12 bg-bg-secondary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="event_available"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay sesiones de clase
                  </p>
                  <p className="text-text-secondary text-sm">
                    Las sesiones aparecerán aquí cuando sean programadas
                  </p>
                </div>
              </div>
            )}

            {/* Session Cards (stacked) */}
            {!loadingEvents && !errorEvents && events.length > 0 && (
              <div className="self-stretch inline-flex flex-col justify-start items-start gap-6">
                {events.map((event) => (
                  <ClassSessionCard
                    key={event.id}
                    event={event}
                    materials={materialsByEvent[event.id] || []}
                    loadingMaterials={loadingMaterialsMap[event.id] || false}
                    onOpenMaterials={handleOpenMaterials}
                    cursoId={cursoId}
                    evalId={evalId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================
            TAB: Material Adicional
            ======================================== */}
        {activeTab === "material" && (
          <div className="self-stretch inline-flex flex-col justify-start items-start gap-6 overflow-hidden">
            {/* Header */}
            <div className="self-stretch inline-flex justify-between items-center">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Material Adicional
              </span>
              {additionalFolders.length > 0 && (
                <button
                  onClick={allExpanded ? collapseAll : expandAll}
                  className="p-1 rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name={allExpanded ? "unfold_less" : "unfold_more"}
                    size={16}
                    className="text-icon-accent-primary"
                  />
                  <span className="text-text-accent-primary text-sm font-medium leading-4">
                    {allExpanded ? "Colapsar Todo" : "Expandir Todo"}
                  </span>
                </button>
              )}
            </div>

            {/* Loading */}
            {loadingFolders && (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {folderError && (
              <div className="bg-bg-primary self-stretch p-12 rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
                <Icon name="error" size={64} className="text-icon-tertiary" />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">{folderError}</p>
                  <p className="text-text-secondary text-sm">Intenta recargar la página</p>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loadingFolders && !folderError && additionalFolders.length === 0 && (
              <div className="self-stretch p-12 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
                <Icon name="folder_open" size={64} className="text-icon-tertiary" variant="rounded" />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">No hay material adicional</p>
                  <p className="text-text-secondary text-sm">Los materiales aparecerán aquí cuando sean subidos</p>
                </div>
              </div>
            )}

            {/* Folder Accordions */}
            {!loadingFolders && !folderError && additionalFolders.length > 0 && (
              <div className="self-stretch flex flex-col justify-start items-start gap-4">
                {additionalFolders.map((folder) => {
                  const isOpen = expandedFolders.has(folder.id);
                  const materialCount = folderContents?.subfolderMaterialCount?.[folder.id] ?? 0;
                  const materials = folderMaterials[folder.id] || [];
                  const isLoadingMats = loadingFolderMaterials[folder.id] || false;

                  return (
                    <div
                      key={folder.id}
                      className="self-stretch bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col justify-start items-start overflow-hidden"
                    >
                      {/* Folder Header (clickable) */}
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="self-stretch p-4 inline-flex justify-start items-center gap-4 hover:bg-bg-secondary transition-colors w-full text-left"
                      >
                        <div className={`p-2 rounded-xl flex justify-start items-center ${isOpen ? "bg-gray-700" : "bg-bg-disabled"}`}>
                          <Icon
                            name="folder"
                            size={24}
                            className={isOpen ? "text-icon-white" : "text-icon-disabled"}
                            variant="rounded"
                          />
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
                          <span className="self-stretch text-text-primary text-lg font-semibold leading-5">
                            {folder.name}
                          </span>
                          <div className="self-stretch inline-flex justify-start items-start gap-1">
                            <span className="text-text-tertiary text-xs font-medium leading-4">
                              {materialCount}
                            </span>
                            <span className="text-text-tertiary text-xs font-medium leading-4">
                              {materialCount === 1 ? "archivo" : "archivos"}
                            </span>
                          </div>
                        </div>
                        <Icon
                          name="expand_more"
                          size={28}
                          className={`text-icon-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Expanded content */}
                      <div
                        className={`w-full grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden">
                        <div className={`self-stretch p-4 border-t border-stroke-primary flex flex-col justify-start items-start gap-2 ${!isOpen ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}>
                          {isLoadingMats && (
                            <div className="self-stretch flex justify-center py-4">
                              <div className="w-6 h-6 border-2 border-accent-solid border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}

                          {!isLoadingMats && materials.length === 0 && (
                            <div className="self-stretch py-4 flex justify-center">
                              <span className="text-text-tertiary text-sm">No hay archivos en esta carpeta</span>
                            </div>
                          )}

                          {!isLoadingMats && materials.map((mat) => {
                            const matName = mat.displayName;
                            const matNameOnly = getFileNameWithoutExtension(matName);
                            const matExt = getFileExtension(matName);
                            const matIcon = getFileIconPath("", matName);
                            const createdDate = new Date(mat.createdAt);
                            const dateStr = `${createdDate.getDate()}/${(createdDate.getMonth() + 1).toString().padStart(2, "0")}/${createdDate.getFullYear()}`;
                            const hours = createdDate.getHours();
                            const ampm = hours >= 12 ? "pm" : "am";
                            const hourNum = hours % 12 || 12;
                            const mins = createdDate.getMinutes();
                            const timeStr = mins === 0 ? `${hourNum}${ampm}` : `${hourNum}:${mins.toString().padStart(2, "0")}${ampm}`;

                            return (
                              <div
                                key={mat.id}
                                className="self-stretch p-3 bg-bg-secondary rounded-lg inline-flex justify-start items-center gap-3"
                              >
                                <div className="flex-1 flex justify-start items-center gap-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={matIcon} alt="" className="w-8 h-8 shrink-0" />
                                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch inline-flex justify-start items-start">
                                      <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
                                        {matNameOnly}
                                      </span>
                                      <span className="text-text-primary text-sm font-normal leading-4">
                                        {matExt}
                                      </span>
                                    </div>
                                    <div className="self-stretch inline-flex justify-start items-center gap-0.5">
                                      <span className="text-text-tertiary text-[10px] font-normal leading-3">
                                        Última modificación: {dateStr} - {timeStr}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDownloadMaterial(mat)}
                                  className="p-1 rounded-full flex justify-center items-center hover:bg-bg-primary transition-colors"
                                  title="Descargar"
                                >
                                  <Icon name="download" size={20} className="text-icon-tertiary" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Materials Modal */}
      <ClassMaterialsModal
        isOpen={materialsModalOpen}
        onClose={() => setMaterialsModalOpen(false)}
        events={events}
        materialsByEvent={materialsByEvent}
        loadingMaterialsMap={loadingMaterialsMap}
        initialEventId={materialsModalEventId}
      />
    </div>
  );
}
