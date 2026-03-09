"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { classEventService } from "@/services/classEvent.service";
import { materialsService } from "@/services/materials.service";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService } from "@/services/courses.service";
import type { ClassEvent } from "@/types/classEvent";
import type { ClassEventMaterial } from "@/types/material";
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
// Badge de estado de grabación
// ============================================

function RecordingBadge({ event }: { event: ClassEvent }) {
  if (event.isCancelled) {
    return (
      <div className="px-2 py-1 bg-bg-error-light rounded-full flex justify-center items-center">
        <span className="text-text-error-primary text-[10px] font-semibold leading-3">
          CANCELADA
        </span>
      </div>
    );
  }

  if (event.canWatchRecording && event.recordingStatus === "READY") {
    return (
      <div className="px-2 py-1 bg-bg-info-primary-light rounded-full flex justify-center items-center">
        <span className="text-text-info-primary text-[10px] font-semibold leading-3">
          GRABADA
        </span>
      </div>
    );
  }

  if (event.status === "EN_CURSO") {
    return (
      <div className="px-2 py-1 bg-bg-success-light rounded-full flex justify-center items-center">
        <span className="text-text-success-primary text-[10px] font-semibold leading-3">
          EN VIVO
        </span>
      </div>
    );
  }

  if (event.status === "PROGRAMADA") {
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
  const canWatch =
    event.canWatchRecording && event.recordingStatus === "READY";
  const duration = formatDurationHMS(event.startDatetime, event.endDatetime);

  const handleWatchRecording = () => {
    if (canWatch) {
      router.push(`/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${event.id}`);
    }
  };

  const hasMaterials = materials.length > 0 || loadingMaterials;

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
            <RecordingBadge event={event} />
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

  // Cargar sesiones de clase
  useEffect(() => {
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
  }, [evalId, evalShortName]);

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
            TAB: Material Adicional (placeholder)
            ======================================== */}
        {activeTab === "material" && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Material Adicional
              </span>
            </div>

            <div className="self-stretch p-12 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
              <Icon
                name="folder"
                size={64}
                className="text-icon-tertiary"
              />
              <div className="text-center">
                <p className="text-text-primary font-semibold mb-2">
                  Próximamente
                </p>
                <p className="text-text-secondary text-sm">
                  Esta sección estará disponible pronto
                </p>
              </div>
            </div>
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
