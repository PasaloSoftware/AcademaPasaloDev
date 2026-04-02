"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { classEventService } from "@/services/classEvent.service";
import { materialsService } from "@/services/materials.service";
import type { ClassEvent } from "@/types/classEvent";
import type { ClassEventMaterial } from "@/types/material";
import Icon from "@/components/ui/Icon";
import MaterialPreviewModal from "@/components/materials/MaterialPreviewModal";
import { getAccessToken } from "@/lib/storage";
import { useToast } from "@/components/ui/ToastContainer";
import Modal from "@/components/ui/Modal";
import FloatingInput from "@/components/ui/FloatingInput";

// ============================================
// Helpers
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
  const timeStr =
    m === 0 ? `${hourNum}` : `${hourNum}:${m.toString().padStart(2, "0")}`;
  return includeAmPm ? `${timeStr}${ampm}` : timeStr;
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${formatSingleTime(startDate, false)} - ${formatSingleTime(endDate, true)}`;
}

function getFileIconPath(mimeType: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") return "/icons/files/pdf.svg";
  if (ext === "doc" || ext === "docx") return "/icons/files/doc.svg";
  if (ext === "xls" || ext === "xlsx") return "/icons/files/xls.svg";
  if (ext === "ppt" || ext === "pptx") return "/icons/files/ppt.svg";
  if (ext === "txt") return "/icons/files/txt.svg";
  if (ext === "csv") return "/icons/files/excel.svg";
  if (ext === "zip" || ext === "rar" || ext === "7z")
    return "/icons/files/zip.svg";
  if (ext === "mp3" || ext === "wav" || ext === "ogg")
    return "/icons/files/mp3.svg";
  if (ext === "mp4" || ext === "avi" || ext === "mov" || ext === "mkv")
    return "/icons/files/video.svg";

  if (mimeType.includes("pdf")) return "/icons/files/pdf.svg";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "/icons/files/doc.svg";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "/icons/files/xls.svg";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "/icons/files/ppt.svg";
  if (mimeType.startsWith("image/")) return "/icons/files/image.svg";
  if (mimeType.startsWith("video/")) return "/icons/files/video.svg";
  if (mimeType.startsWith("audio/")) return "/icons/files/mp3.svg";
  if (mimeType.includes("text/")) return "/icons/files/txt.svg";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "/icons/files/zip.svg";

  return "/icons/files/text.svg";
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext ? `.${ext}` : "";
}

function getFileNameWithoutExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

function formatMaterialDate(iso: string): string {
  const date = new Date(iso);
  const d = date.getDate();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const hourNum = h % 12 || 12;
  const timeStr =
    min === 0
      ? `${hourNum}${ampm}`
      : `${hourNum}:${min.toString().padStart(2, "0")}${ampm}`;
  return `${d}/${m}/${y} - ${timeStr}`;
}

// ============================================
// Upload constants & helpers
// ============================================

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isAllowedFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE;
}

// ============================================
// Component
// ============================================

export interface VideoPageLayoutProps {
  cursoId: string;
  evalId: string;
  eventId: string;
  resolveNames: (
    cursoId: string,
    evalId: string,
  ) => Promise<{ courseName: string; evalShortName: string }>;
  renderActions?: (
    event: ClassEvent,
    reloadEvent: () => Promise<void>,
  ) => React.ReactNode;
  canUploadMaterials?: boolean;
}

export default function VideoPageLayout({
  cursoId,
  evalId,
  eventId,
  resolveNames,
  renderActions,
  canUploadMaterials,
}: VideoPageLayoutProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();
  const [event, setEvent] = useState<ClassEvent | null>(null);
  const [nextEvent, setNextEvent] = useState<ClassEvent | null>(null);
  const [materials, setMaterials] = useState<ClassEventMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const [courseName, setCourseName] = useState("");
  const [evalShortName, setEvalShortName] = useState("");
  const [minutesLeft, setMinutesLeft] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload view states
  interface StagedFileEntry {
    id: string;
    file: File;
    progress: number;
    status: "idle" | "uploading" | "uploaded" | "error";
    startTime: number;
    xhr: XMLHttpRequest | null;
  }
  const [showUploadView, setShowUploadView] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFileEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Material context menu & modals
  const [contextMenuMat, setContextMenuMat] = useState<{
    mat: ClassEventMaterial;
    x: number;
    y: number;
  } | null>(null);
  const [infoMat, setInfoMat] = useState<ClassEventMaterial | null>(null);
  const [deleteMat, setDeleteMat] = useState<ClassEventMaterial | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [renameMat, setRenameMat] = useState<ClassEventMaterial | null>(null);
  const [renameMatValue, setRenameMatValue] = useState("");
  const [renameMatLoading, setRenameMatLoading] = useState(false);
  const [hiddenMatIds, setHiddenMatIds] = useState<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const evaluationPath = `/plataforma/curso/${cursoId}/evaluacion/${evalId}`;

  const reloadEvent = useCallback(async () => {
    try {
      const data = await classEventService.getEventDetail(eventId);
      setEvent(data);
    } catch (err) {
      console.error("Error al recargar evento:", err);
    }
  }, [eventId]);

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      setError(null);
      try {
        const [data, allEvents] = await Promise.all([
          classEventService.getEventDetail(eventId),
          classEventService.getEvaluationEvents(evalId),
        ]);
        setEvent(data);

        const sorted = allEvents
          .filter((e) => !e.isCancelled && e.id !== eventId)
          .sort((a, b) => a.sessionNumber - b.sessionNumber);
        const next = sorted.find((e) => e.sessionNumber > data.sessionNumber);
        setNextEvent(next || null);
      } catch (err) {
        console.error("Error al cargar evento:", err);
        setError("No se pudo cargar la información del video");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId, evalId]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const data = await materialsService.getClassEventMaterials(eventId);
        setMaterials(data);
      } catch (err) {
        console.error("Error al cargar materiales:", err);
      }
    }

    loadMaterials();
  }, [eventId]);

  useEffect(() => {
    async function loadNames() {
      try {
        const names = await resolveNames(cursoId, evalId);
        setCourseName(names.courseName);
        setEvalShortName(names.evalShortName);
      } catch (err) {
        console.error("Error al cargar nombres:", err);
      }
    }

    loadNames();
  }, [cursoId, evalId, resolveNames]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenuMat) return;
    const handleClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenuMat(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenuMat]);

  useEffect(() => {
    if (!event) return;
    setBreadcrumbItems([
      { label: "Cursos" },
      {
        label: courseName || event.courseName,
        href: `/plataforma/curso/${cursoId}`,
      },
      { label: "Ciclo Vigente", href: `/plataforma/curso/${cursoId}` },
      { label: evalShortName || event.evaluationName, href: evaluationPath },
      { label: `Clase ${event.sessionNumber}` },
    ]);
  }, [
    setBreadcrumbItems,
    event,
    courseName,
    evalShortName,
    cursoId,
    evaluationPath,
  ]);

  useEffect(() => {
    if (!event) return;
    const computeMinutes = () =>
      Math.max(
        0,
        Math.ceil(
          (new Date(event.startDatetime).getTime() - Date.now()) / 60000,
        ),
      );
    setMinutesLeft(computeMinutes());
    const interval = setInterval(
      () => setMinutesLeft(computeMinutes()),
      30_000,
    );
    return () => clearInterval(interval);
  }, [event]);

  const handleBack = useCallback(() => {
    router.push(evaluationPath);
  }, [router, evaluationPath]);

  // ---- Upload view handlers ----

  const addFiles = useCallback((fileList: FileList) => {
    setUploadError(null);
    const newEntries: StagedFileEntry[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!isAllowedFile(file)) {
        errors.push(
          file.size > MAX_FILE_SIZE
            ? `"${file.name}" excede 10 MB`
            : `"${file.name}" tipo no permitido`,
        );
        return;
      }
      newEntries.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: "idle",
        startTime: 0,
        xhr: null,
      });
    });

    if (errors.length) setUploadError(errors.join(". "));
    if (newEntries.length) setStagedFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleSelectFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles],
  );

  const handleRemoveFile = useCallback((fileId: string) => {
    setStagedFiles((prev) => {
      const entry = prev.find((f) => f.id === fileId);
      if (entry?.xhr) entry.xhr.abort();
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  const uploadSingleFile = useCallback(
    (entry: StagedFileEntry, folderId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("materialFolderId", folderId);
        formData.append("displayName", entry.file.name);
        formData.append("classEventId", eventId);

        const xhr = new XMLHttpRequest();

        // Store xhr ref on the entry for cancellation
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: "uploading" as const,
                  startTime: Date.now(),
                  xhr,
                }
              : f,
          ),
        );

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id ? { ...f, progress: pct } : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? {
                      ...f,
                      status: "uploaded" as const,
                      progress: 100,
                      xhr: null,
                    }
                  : f,
              ),
            );
            resolve();
          } else {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, status: "error" as const, xhr: null }
                  : f,
              ),
            );
            let msg = `Error al subir "${entry.file.name}"`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (xhr.status === 409) {
                msg = `"${entry.file.name}" ya existe en esta evaluación`;
              } else if (body?.message) {
                msg = body.message;
              }
            } catch {
              /* keep default msg */
            }
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          setStagedFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: "error" as const, xhr: null }
                : f,
            ),
          );
          reject(new Error(`Error de red al subir "${entry.file.name}"`));
        };

        const token = getAccessToken();
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
        xhr.open("POST", `${apiUrl}/materials`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      }),
    [eventId],
  );

  const handleStartUpload = useCallback(async () => {
    const pending = stagedFiles.filter(
      (f) => f.status === "idle" || f.status === "error",
    );
    if (!pending.length || !event) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const rootFolders = await materialsService.getRootFolders(evalId);
      const targetFolder =
        rootFolders.find((f) => f.name.toLowerCase().includes("clase")) ||
        rootFolders[0];
      if (!targetFolder) throw new Error("No se encontró carpeta de destino");

      // Upload sequentially so progress per file is clear
      for (const entry of pending) {
        await uploadSingleFile(entry, targetFolder.id);
      }

      const updated = await materialsService.getClassEventMaterials(eventId);
      setMaterials(updated);

      // Auto-close after brief delay to show success
      const sessionNum = event.sessionNumber;
      setTimeout(() => {
        setShowUploadView(false);
        setStagedFiles([]);
        setIsUploading(false);
        showToast({
          type: "success",
          title: "Material subido con éxito",
          description: `El material ha sido subido en Clase ${sessionNum}.`,
        });
      }, 1200);
    } catch (err) {
      console.error("Error al subir materiales:", err);
      setUploadError(
        err instanceof Error ? err.message : "Error al subir materiales",
      );
      setIsUploading(false);
    }
  }, [stagedFiles, event, evalId, eventId, uploadSingleFile, showToast]);

  const handleCancelUpload = useCallback(() => {
    stagedFiles.forEach((f) => f.xhr?.abort());
    setStagedFiles([]);
    setIsUploading(false);
    setUploadError(null);
    setShowUploadView(false);
  }, [stagedFiles]);

  const handleNextClass = useCallback(() => {
    if (!nextEvent) return;
    router.push(`${evaluationPath}/clase/${nextEvent.id}`);
  }, [nextEvent, router, evaluationPath]);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
        <Icon name="error" size={64} className="text-icon-tertiary" />
        <p className="text-text-primary font-semibold">
          {error || "Evento no encontrado"}
        </p>
        <button
          onClick={() => router.push(evaluationPath)}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium"
        >
          Volver
        </button>
      </div>
    );
  }

  const isLiveSoon =
    event.sessionStatus === "EN_CURSO" ||
    (event.sessionStatus === "PROGRAMADA" &&
      minutesLeft > 0 &&
      minutesLeft <= 60);
  const isScheduled =
    !isLiveSoon &&
    (event.sessionStatus === "PROGRAMADA" ||
      event.sessionStatus === "EN_CURSO");
  const canWatch =
    !isScheduled &&
    !isLiveSoon &&
    event.canWatchRecording &&
    event.recordingStatus === "READY" &&
    event.recordingUrl;

  // ---- Upload View ----
  if (showUploadView) {
    const hasPending = stagedFiles.some(
      (f) => f.status === "idle" || f.status === "error",
    );
    const allUploaded =
      stagedFiles.length > 0 &&
      stagedFiles.every((f) => f.status === "uploaded");
    const canSubmit = hasPending && !isUploading;

    const getTimeRemaining = (entry: StagedFileEntry) => {
      if (entry.progress <= 0 || !entry.startTime) return "";
      const elapsed = (Date.now() - entry.startTime) / 1000;
      if (elapsed < 1) return "";
      const totalEstimate = elapsed / (entry.progress / 100);
      const remaining = Math.max(0, totalEstimate - elapsed);
      if (remaining < 60) return `Quedan ${Math.ceil(remaining)} segundos`;
      return `Quedan ${Math.ceil(remaining / 60)} minutos`;
    };

    return (
      <div className="w-full flex flex-col gap-8">
        {/* Back link */}
        <button
          onClick={handleCancelUpload}
          className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex items-center gap-2 self-start"
        >
          <Icon
            name="arrow_back"
            size={20}
            className="text-icon-accent-primary"
          />
          <span className="text-text-accent-primary text-base font-medium leading-4">
            Volver a {evalShortName || event.evaluationName}
          </span>
        </button>

        {/* Header info */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-1">
              <Icon
                name="school"
                size={20}
                className="text-icon-accent-primary"
              />
              <span className="flex-1 text-text-accent-primary text-base font-semibold leading-5">
                {(courseName || event.courseName).toUpperCase()}
              </span>
            </div>
            <h1 className="text-text-primary text-3xl font-bold leading-8">
              Clase {event.sessionNumber}: {event.topic}
            </h1>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Icon
                  name="calendar_today"
                  size={14}
                  className="text-icon-secondary"
                />
                <span className="text-text-tertiary text-xs font-normal leading-4">
                  {formatDate(event.startDatetime)}
                </span>
              </div>
              <div className="flex items-center gap-1">
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
        </div>

        {/* Upload Card */}
        <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-end gap-4">
          <div className="self-stretch flex items-center gap-1">
            <Icon
              name="add_circle"
              size={20}
              className="text-icon-accent-primary"
              variant="rounded"
            />
            <span className="text-text-primary text-base font-semibold leading-5">
              Nuevo Material
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              backgroundImage: "url(/images/upload-dropzone.png)",
              backgroundSize: "contain",
              backgroundPosition: "center",
            }}
            className={`self-stretch px-5 py-8 rounded-xl border-2 border-dashed flex flex-col justify-center items-center gap-3 overflow-hidden transition-colors ${
              isDragOver
                ? "border-deep-blue-700 bg-bg-accent-light"
                : "border-stroke-primary"
            }`}
          >
            <div className="w-12 h-12 bg-bg-info-primary-light rounded-full flex items-center justify-center">
              <Icon
                name="cloud_upload"
                size={24}
                className="text-icon-info-primary"
                variant="rounded"
              />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-text-primary text-base font-semibold leading-5">
                Arrastra y suelta tus archivos aquí
              </span>
              <span className="text-text-quartiary text-xs font-normal leading-4">
                PDF, DOC, DOCX, XLS, XLSX (Máx. 10 MB)
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              multiple
              onChange={handleSelectFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-bg-info-primary-light rounded-lg inline-flex items-center gap-1.5 hover:bg-bg-info-primary-light/80 transition-colors"
            >
              <Icon
                name="file_upload"
                size={16}
                className="text-icon-info-primary"
                variant="outlined"
              />
              <span className="text-text-info-primary text-sm font-medium leading-4">
                Seleccionar Archivos
              </span>
            </button>
          </div>

          {/* Error */}
          {uploadError && (
            <span className="self-stretch text-text-error-primary text-sm">
              {uploadError}
            </span>
          )}

          {/* Selected Files */}
          {stagedFiles.length > 0 && (
            <div className="self-stretch flex flex-col gap-2">
              <span className="text-text-quartiary text-sm font-semibold leading-4">
                Archivos seleccionados
              </span>

              {stagedFiles.map((entry) => {
                const ext = getFileExtension(entry.file.name);
                const nameOnly = getFileNameWithoutExt(entry.file.name);
                const iconPath = getFileIconPath(
                  entry.file.type,
                  entry.file.name,
                );

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-bg-secondary rounded-lg flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iconPath}
                        alt={ext}
                        className="w-8 h-8 flex-shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRenameTarget({
                            id: entry.id,
                            name: entry.file.name,
                          });
                          setRenameValue(
                            getFileNameWithoutExt(entry.file.name),
                          );
                        }}
                        className="flex-1 flex flex-col gap-1 min-w-0 text-left hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        <div className="flex items-start">
                          <span className="text-text-primary text-sm font-normal leading-4 truncate">
                            {nameOnly}
                          </span>
                          <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">
                            {ext}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-text-tertiary text-[10px] font-normal leading-3">
                            {formatBytes(entry.file.size)}
                          </span>
                          {entry.status === "uploading" && (
                            <>
                              <div className="w-0.5 h-0.5 bg-gray-900 rounded-full" />
                              <span className="text-text-tertiary text-[10px] font-normal leading-3">
                                {getTimeRemaining(entry)}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {entry.status === "uploaded" && (
                          <Icon
                            name="check_circle"
                            size={16}
                            className="text-icon-success-primary"
                            variant="rounded"
                          />
                        )}
                        {entry.status === "error" && (
                          <Icon
                            name="error"
                            size={16}
                            className="text-text-error-primary"
                            variant="rounded"
                          />
                        )}
                        {entry.status !== "uploading" && (
                          <>
                            <button
                              onClick={() => {
                                const url = URL.createObjectURL(entry.file);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = entry.file.name;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors"
                              title="Descargar"
                            >
                              <Icon
                                name="download"
                                size={20}
                                className="text-icon-tertiary"
                              />
                            </button>
                            <button
                              onClick={() => handleRemoveFile(entry.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors"
                              title="Eliminar"
                            >
                              <Icon
                                name="close"
                                size={16}
                                className="text-icon-tertiary"
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {entry.status === "uploading" && (
                      <div className="w-full h-1 bg-bg-disabled rounded-full overflow-hidden">
                        <div
                          className="h-full bg-deep-blue-700 rounded-full transition-all duration-300"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-4">
          <button
            onClick={handleCancelUpload}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
          >
            <span className="text-text-tertiary text-sm font-medium leading-4">
              Cancelar
            </span>
          </button>
          <button
            onClick={handleStartUpload}
            disabled={!canSubmit}
            className={`px-6 py-3 rounded-lg flex items-center gap-1.5 ${
              canSubmit
                ? "bg-bg-accent-primary-solid hover:opacity-90 transition-opacity"
                : "bg-bg-disabled"
            }`}
          >
            <span
              className={`text-sm font-medium leading-4 ${
                canSubmit ? "text-text-white" : "text-text-disabled"
              }`}
            >
              {isUploading
                ? "Subiendo..."
                : allUploaded
                  ? "Listo"
                  : "Subir Material"}
            </span>
          </button>
        </div>

        {/* Rename Modal */}
        <Modal
          isOpen={!!renameTarget}
          onClose={() => setRenameTarget(null)}
          title="Renombrar archivo"
          footer={
            <>
              <Modal.Button
                variant="secondary"
                onClick={() => setRenameTarget(null)}
              >
                Cancelar
              </Modal.Button>
              <Modal.Button
                disabled={!renameValue.trim()}
                onClick={() => {
                  if (!renameTarget || !renameValue.trim()) return;
                  const ext = getFileExtension(renameTarget.name);
                  const newName = renameValue.trim() + ext;
                  setStagedFiles((prev) =>
                    prev.map((f) => {
                      if (f.id !== renameTarget.id) return f;
                      const renamed = new File([f.file], newName, {
                        type: f.file.type,
                      });
                      return { ...f, file: renamed };
                    }),
                  );
                  setRenameTarget(null);
                }}
              >
                Guardar
              </Modal.Button>
            </>
          }
        >
          <FloatingInput
            id="rename-file"
            label="Nombre del archivo"
            value={renameValue}
            onChange={setRenameValue}
          />
        </Modal>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Back link */}
      <button
        onClick={handleBack}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex items-center gap-2 self-start"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver a {evalShortName || event.evaluationName}
        </span>
      </button>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Left Column */}
        <div className="w-[721px] flex-shrink-0 flex flex-col gap-8">
          {/* Video Player or Scheduled Placeholder */}
          {canWatch ? (
            <div className="w-full aspect-video bg-bg-black-solid rounded-xl overflow-hidden">
              <iframe
                src={event.recordingUrl!}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title={`Clase ${event.sessionNumber}: ${event.topic}`}
              />
            </div>
          ) : isLiveSoon ? (
            <div className="w-full aspect-video bg-bg-accent-light rounded-xl inline-flex flex-col justify-center items-center gap-4">
              <Icon
                name="hourglass_top"
                size={56}
                className="text-icon-accent-primary"
                variant="rounded"
              />
              <span className="text-text-accent-primary text-lg font-semibold leading-5">
                EMPIEZA EN {Math.max(1, minutesLeft)} MIN
              </span>
              <button
                onClick={() => {
                  if (event.liveMeetingUrl) {
                    window.open(
                      event.liveMeetingUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
                disabled={!event.liveMeetingUrl}
                className={`px-6 py-3 rounded-lg inline-flex justify-center items-center gap-1.5 ${
                  event.liveMeetingUrl
                    ? "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
                    : "bg-bg-accent-primary-solid"
                }`}
              >
                <Icon
                  name="videocam"
                  size={16}
                  className="text-icon-white"
                  variant="rounded"
                />
                <span className="text-text-white text-sm font-medium leading-4">
                  Unirse a la Clase
                </span>
              </button>
            </div>
          ) : isScheduled ? (
            <div className="w-full aspect-video bg-bg-tertiary rounded-xl inline-flex flex-col justify-center items-center gap-4">
              <Icon
                name="calendar_month"
                size={56}
                className="text-icon-tertiary"
                variant="rounded"
              />
              <span className="text-text-quartiary text-lg font-semibold leading-5">
                CLASE PROGRAMADA
              </span>
              <button
                disabled
                className="px-6 py-3 bg-bg-disabled rounded-lg inline-flex justify-center items-center gap-1.5"
              >
                <Icon
                  name="videocam"
                  size={16}
                  className="text-icon-disabled"
                  variant="rounded"
                />
                <span className="text-text-disabled text-sm font-medium leading-4">
                  Unirse a la Clase
                </span>
              </button>
            </div>
          ) : (
            <div className="w-full aspect-video bg-bg-tertiary rounded-xl inline-flex flex-col justify-center items-center gap-4">
              <Icon
                name="timelapse"
                size={56}
                className="text-icon-tertiary"
                variant="rounded"
              />
              <span className="text-text-quartiary text-lg font-semibold leading-5">
                {event.recordingStatus === "PROCESSING"
                  ? "GRABACIÓN EN PROCESO"
                  : "GRABACIÓN NO DISPONIBLE"}
              </span>
            </div>
          )}

          {/* Event Info */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Icon
                  name="school"
                  size={16}
                  className="text-icon-accent-primary"
                />
                <span className="text-text-accent-primary text-sm font-semibold leading-4 uppercase">
                  {courseName || event.courseName}
                </span>
              </div>

              <h1 className="text-text-primary text-3xl font-bold leading-9">
                Clase {event.sessionNumber}: {event.topic}
              </h1>

              {isLiveSoon ? (
                <div className="flex items-center gap-1">
                  <Icon
                    name="schedule"
                    size={14}
                    className="text-icon-accent-primary"
                    variant="rounded"
                  />
                  <span className="text-text-accent-primary text-xs font-medium leading-4">
                    Empieza en {Math.max(1, minutesLeft)} min (Hoy,{" "}
                    {formatSingleTime(new Date(event.startDatetime), true)})
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      name="calendar_today"
                      size={16}
                      className="text-icon-secondary"
                    />
                    <span className="text-text-tertiary text-sm font-normal leading-4">
                      {formatDate(event.startDatetime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon
                      name="schedule"
                      size={16}
                      className="text-icon-secondary"
                    />
                    <span className="text-text-tertiary text-sm font-normal leading-4">
                      {formatTimeRange(event.startDatetime, event.endDatetime)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {renderActions?.(event, reloadEvent)}
          </div>

          {/* Next Class Card */}
          {nextEvent && (
            <button
              onClick={handleNextClass}
              className="w-full px-5 py-4 bg-muted-indigo-700 rounded-xl flex items-center gap-4 hover:opacity-90 transition-opacity"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
                <span className="text-deep-blue-100 text-xs font-medium leading-4">
                  Siguiente Clase
                </span>
                <span className="text-text-white text-base font-semibold leading-5 truncate">
                  Clase {nextEvent.sessionNumber}: {nextEvent.topic}
                </span>
              </div>
              <div className="w-10 h-10 bg-bg-accent-light rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon
                  name="arrow_forward"
                  size={24}
                  className="text-muted-indigo-700"
                />
              </div>
            </button>
          )}
        </div>

        {/* Right Column - Materials */}
        <div className="flex-1 min-w-0 self-start p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex flex-col gap-4">
          <h2 className="text-gray-600 text-base font-semibold leading-5">
            Materiales de esta clase
          </h2>

          {materials.length === 0 ? (
            <div className="self-stretch px-5 py-10 bg-bg-secondary rounded-lg inline-flex flex-col justify-center items-center gap-2">
              <div className="self-stretch text-center justify-center text-text-disabled text-xs font-normal font-['Poppins'] leading-4">
                No hay materiales disponibles para esta clase
              </div>
            </div>
          ) : (
            <div className={`flex flex-col gap-2 ${materials.length > 6 ? 'max-h-[420px] overflow-y-auto' : 'overflow-visible'}`}>
              {materials.map((mat, matIdx) => {
                const fileName =
                  mat.displayName || mat.fileResource.originalName;
                const ext = getFileExtension(fileName);
                const nameOnly = getFileNameWithoutExt(fileName);
                const iconPath = getFileIconPath(
                  mat.fileResource.mimeType,
                  fileName,
                );
                const lastModified = formatMaterialDate(
                  mat.fileResource.createdAt,
                );

                return (
                  <div key={mat.id} className="relative">
                    <div className="p-3 bg-bg-secondary rounded-lg flex items-center gap-3 hover:bg-bg-tertiary transition-colors w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIndex(matIdx);
                          setShowPreview(true);
                        }}
                        className="flex-1 flex items-center gap-1 min-w-0 text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={iconPath}
                          alt={ext || "file"}
                          className="w-8 h-8 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-start min-w-0">
                            <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
                              {nameOnly}
                            </span>
                            <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">
                              {ext}
                            </span>
                            {hiddenMatIds.has(mat.id) && (
                              <Icon
                                name="visibility_off"
                                size={14}
                                className="text-icon-tertiary flex-shrink-0 ml-1"
                                variant="rounded"
                              />
                            )}
                          </div>
                          <span className="text-text-tertiary text-[10px] font-normal leading-3">
                            Última modificación: {lastModified}
                          </span>
                        </div>
                      </button>

                      {canUploadMaterials ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            setContextMenuMat({
                              mat,
                              x: rect.right,
                              y: rect.bottom,
                            });
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors flex-shrink-0"
                          title="Opciones"
                        >
                          <Icon
                            name="more_vert"
                            size={20}
                            className="text-icon-tertiary"
                          />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            materialsService.downloadMaterial(mat.id, fileName);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors flex-shrink-0"
                          title="Descargar"
                        >
                          <Icon
                            name="download"
                            size={20}
                            className="text-icon-tertiary"
                          />
                        </button>
                      )}
                    </div>

                    {/* Context Menu */}
                    {contextMenuMat?.mat.id === mat.id && (
                      <div
                        ref={contextMenuRef}
                        className="absolute right-0 top-full z-50 w-60 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col"
                      >
                        <button
                          onClick={() => {
                            setContextMenuMat(null);
                            setPreviewIndex(matIdx);
                            setShowPreview(true);
                          }}
                          className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="open_in_full"
                            size={20}
                            className="text-icon-secondary"
                            variant="rounded"
                          />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            Abrir
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setContextMenuMat(null);
                            setRenameMat(mat);
                            setRenameMatValue(
                              getFileNameWithoutExt(
                                mat.displayName ||
                                  mat.fileResource.originalName,
                              ),
                            );
                          }}
                          className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="edit"
                            size={20}
                            className="text-icon-secondary"
                            variant="rounded"
                          />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            Cambiar nombre
                          </span>
                        </button>

                        <div className="h-px bg-stroke-secondary" />

                        <button
                          onClick={() => {
                            setContextMenuMat(null);
                            materialsService.downloadMaterial(mat.id, fileName);
                          }}
                          className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="download"
                            size={20}
                            className="text-icon-secondary"
                            variant="rounded"
                          />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            Descargar
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setContextMenuMat(null);
                            setInfoMat(mat);
                          }}
                          className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="info"
                            size={20}
                            className="text-icon-secondary"
                            variant="rounded"
                          />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            Información del material
                          </span>
                        </button>

                        <div className="h-px bg-stroke-secondary" />

                        <button
                          onClick={() => {
                            setContextMenuMat(null);
                            setDeleteMat(mat);
                          }}
                          className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="delete"
                            size={20}
                            className="text-icon-secondary"
                            variant="rounded"
                          />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            Eliminar
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canUploadMaterials && (
            <div className="border-t border-gray-300 pt-6 flex justify-center">
              <button
                onClick={() => setShowUploadView(true)}
                className="p-1 rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
              >
                <Icon
                  name="add_circle"
                  size={16}
                  className="text-icon-accent-primary"
                  variant="rounded"
                />
                <span className="text-text-accent-primary text-sm font-medium leading-4">
                  Subir Material
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Material Preview Modal */}
      {showPreview && materials.length > 0 && (
        <MaterialPreviewModal
          materials={materials}
          initialIndex={previewIndex}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Material Info Modal */}
      {infoMat &&
        (() => {
          const infoFileName =
            infoMat.displayName || infoMat.fileResource.originalName;
          const infoExt = getFileExtension(infoFileName)
            .replace(".", "")
            .toUpperCase();
          const infoNameOnly = getFileNameWithoutExt(infoFileName);
          const infoSize = formatBytes(
            parseInt(infoMat.fileResource.sizeBytes, 10) || 0,
          );
          const infoModified = new Date(
            infoMat.fileResource.createdAt,
          ).toLocaleDateString("es-PE", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "America/Lima",
          });
          const infoUploaded = new Date(infoMat.createdAt).toLocaleDateString(
            "es-PE",
            {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "America/Lima",
            },
          );

          return (
            <Modal
              isOpen
              onClose={() => setInfoMat(null)}
              title="Información del material"
              size="md"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Nombre
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    {infoNameOnly}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Tipo
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    {infoExt || "Desconocido"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Tamaño
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    {infoSize}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Ubicación
                  </span>
                  <span className="px-2.5 py-1.5 bg-bg-info-primary-light rounded inline-flex w-fit">
                    <span className="text-text-info-primary text-xs font-medium leading-3">
                      Clase {event?.sessionNumber}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Propietario
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    yo
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Modificado
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    {infoModified} por yo
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary text-xs font-medium leading-4">
                    Subido
                  </span>
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    {infoUploaded} por yo
                  </span>
                </div>
              </div>
            </Modal>
          );
        })()}

      {/* Delete Material Modal */}
      <Modal
        isOpen={!!deleteMat}
        onClose={() => setDeleteMat(null)}
        title="¿Eliminar este material?"
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setDeleteMat(null)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant="danger"
              loading={deleteLoading}
              loadingText="Eliminando..."
              onClick={async () => {
                if (!deleteMat) return;
                setDeleteLoading(true);
                try {
                  await materialsService.requestDeletion(
                    deleteMat.id,
                    "Eliminado por docente",
                  );
                  setHiddenMatIds((prev) => new Set(prev).add(deleteMat.id));
                  setDeleteMat(null);
                  showToast({
                    type: "success",
                    title: "Solicitud enviada",
                    description:
                      "El material se ocultará hasta que los administradores aprueben la eliminación.",
                  });
                } catch (err) {
                  console.error("Error al solicitar eliminación:", err);
                  setDeleteMat(null);
                  showToast({
                    type: "error",
                    title: "Error",
                    description:
                      err instanceof Error
                        ? err.message
                        : "No se pudo enviar la solicitud.",
                  });
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              Eliminar
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-4">
          ¿Estás seguro de que deseas eliminar este material? La solicitud de
          eliminación será enviada a los administradores y el material se
          ocultará hasta que sea aprobada.
        </p>
      </Modal>

      {/* Rename Material Modal */}
      <Modal
        isOpen={!!renameMat}
        onClose={() => setRenameMat(null)}
        title="Cambiar nombre"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setRenameMat(null)}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!renameMatValue.trim()}
              loading={renameMatLoading}
              loadingText="Guardando..."
              onClick={async () => {
                if (!renameMat || !renameMatValue.trim()) return;
                setRenameMatLoading(true);
                try {
                  const ext = getFileExtension(
                    renameMat.displayName ||
                      renameMat.fileResource.originalName,
                  );
                  const newDisplayName = renameMatValue.trim() + ext;
                  await materialsService.renameDisplayName(
                    renameMat.id,
                    newDisplayName,
                  );
                  setMaterials((prev) =>
                    prev.map((m) =>
                      m.id === renameMat.id
                        ? { ...m, displayName: newDisplayName }
                        : m,
                    ),
                  );
                  setRenameMat(null);
                  showToast({
                    type: "success",
                    title: "Nombre cambiado",
                    description:
                      "El nombre del material ha sido actualizado con éxito.",
                  });
                } catch (err) {
                  console.error("Error al renombrar material:", err);
                  showToast({
                    type: "error",
                    title: "Error",
                    description:
                      err instanceof Error
                        ? err.message
                        : "No se pudo renombrar el material.",
                  });
                } finally {
                  setRenameMatLoading(false);
                }
              }}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <FloatingInput
          id="rename-material"
          label="Nombre"
          value={renameMatValue}
          onChange={setRenameMatValue}
        />
      </Modal>
    </div>
  );
}
