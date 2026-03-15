'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { classEventService } from '@/services/classEvent.service';
import { enrollmentService } from '@/services/enrollment.service';
import { coursesService } from '@/services/courses.service';
import { materialsService } from '@/services/materials.service';
import type { ClassEvent } from '@/types/classEvent';
import type { ClassEventMaterial } from '@/types/material';
import type { Enrollment } from '@/types/enrollment';
import Icon from '@/components/ui/Icon';
import MaterialPreviewModal from '@/components/materials/MaterialPreviewModal';

// ============================================
// Helpers
// ============================================

function formatDate(iso: string): string {
  const date = new Date(iso);
  const formatted = date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatSingleTime(date: Date, includeAmPm: boolean): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  const timeStr = m === 0 ? `${hourNum}` : `${hourNum}:${m.toString().padStart(2, '0')}`;
  return includeAmPm ? `${timeStr}${ampm}` : timeStr;
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${formatSingleTime(startDate, false)} - ${formatSingleTime(endDate, true)}`;
}

function getFileIconPath(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') return '/icons/files/pdf.svg';
  if (ext === 'doc' || ext === 'docx') return '/icons/files/doc.svg';
  if (ext === 'xls' || ext === 'xlsx') return '/icons/files/xls.svg';
  if (ext === 'ppt' || ext === 'pptx') return '/icons/files/ppt.svg';
  if (ext === 'txt') return '/icons/files/txt.svg';
  if (ext === 'csv') return '/icons/files/excel.svg';
  if (ext === 'zip' || ext === 'rar' || ext === '7z') return '/icons/files/zip.svg';
  if (ext === 'mp3' || ext === 'wav' || ext === 'ogg') return '/icons/files/mp3.svg';
  if (ext === 'mp4' || ext === 'avi' || ext === 'mov' || ext === 'mkv') return '/icons/files/video.svg';

  if (mimeType.includes('pdf')) return '/icons/files/pdf.svg';
  if (mimeType.includes('word') || mimeType.includes('document')) return '/icons/files/doc.svg';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '/icons/files/xls.svg';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '/icons/files/ppt.svg';
  if (mimeType.startsWith('image/')) return '/icons/files/image.svg';
  if (mimeType.startsWith('video/')) return '/icons/files/video.svg';
  if (mimeType.startsWith('audio/')) return '/icons/files/mp3.svg';
  if (mimeType.includes('text/')) return '/icons/files/txt.svg';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '/icons/files/zip.svg';

  return '/icons/files/text.svg';
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext ? `.${ext}` : '';
}

function getFileNameWithoutExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

function formatMaterialDate(iso: string): string {
  const date = new Date(iso);
  const d = date.getDate();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hourNum = h % 12 || 12;
  const timeStr = min === 0 ? `${hourNum}${ampm}` : `${hourNum}:${min.toString().padStart(2, '0')}${ampm}`;
  return `${d}/${m}/${y} - ${timeStr}`;
}

// ============================================
// Component
// ============================================

interface VideoPageContentProps {
  cursoId: string;
  evalId: string;
  eventId: string;
}

export default function VideoPageContent({ cursoId, evalId, eventId }: VideoPageContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const [event, setEvent] = useState<ClassEvent | null>(null);
  const [nextEvent, setNextEvent] = useState<ClassEvent | null>(null);
  const [materials, setMaterials] = useState<ClassEventMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Course + eval names for breadcrumb
  const [courseName, setCourseName] = useState('');
  const [evalShortName, setEvalShortName] = useState('');

  const evaluationPath = `/plataforma/curso/${cursoId}/evaluacion/${evalId}`;

  // Load event data + next event
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

        // Find next class by session number
        const sorted = allEvents
          .filter((e) => !e.isCancelled && e.id !== eventId)
          .sort((a, b) => a.sessionNumber - b.sessionNumber);
        const next = sorted.find((e) => e.sessionNumber > data.sessionNumber);
        setNextEvent(next || null);
      } catch (err) {
        console.error('Error al cargar evento:', err);
        setError('No se pudo cargar la información del video');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId, evalId]);

  // Load materials for current event
  useEffect(() => {
    async function loadMaterials() {
      try {
        const data = await materialsService.getClassEventMaterials(eventId);
        setMaterials(data);
      } catch (err) {
        console.error('Error al cargar materiales:', err);
      }
    }

    loadMaterials();
  }, [eventId]);

  // Load course name + eval short name for breadcrumb
  useEffect(() => {
    async function loadNames() {
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments: Enrollment[] = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find((e) => e.courseCycle.id === cursoId);
        if (found) setCourseName(found.courseCycle.course.name);
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }

      try {
        const data = await coursesService.getCurrentCycleContent(cursoId);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) setEvalShortName(eval_.shortName);
      } catch (err) {
        console.error('Error al cargar datos de evaluación:', err);
      }
    }

    loadNames();
  }, [cursoId, evalId]);

  // Set breadcrumb
  useEffect(() => {
    if (!event) return;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName || event.courseName, href: `/plataforma/curso/${cursoId}` },
      { label: 'Ciclo Vigente', href: `/plataforma/curso/${cursoId}` },
      { label: evalShortName || event.evaluationName, href: evaluationPath },
      { label: `Clase ${event.sessionNumber}` },
    ]);
  }, [setBreadcrumbItems, event, courseName, evalShortName, cursoId, evaluationPath]);

  // Back → go to evaluation page
  const handleBack = useCallback(() => {
    router.push(evaluationPath);
  }, [router, evaluationPath]);

  // Navigate to next class
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
        <p className="text-text-primary font-semibold">{error || 'Evento no encontrado'}</p>
        <button
          onClick={() => router.push(evaluationPath)}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium"
        >
          Volver
        </button>
      </div>
    );
  }

  const isLiveSoon = (() => {
    if (event.sessionStatus === 'EN_CURSO') return true;
    if (event.sessionStatus === 'PROGRAMADA') {
      const msUntil = new Date(event.startDatetime).getTime() - Date.now();
      return msUntil > 0 && msUntil <= 60 * 60 * 1000;
    }
    return false;
  })();
  const isScheduled = !isLiveSoon && (event.sessionStatus === 'PROGRAMADA' || event.sessionStatus === 'EN_CURSO');
  // Solo mostrar video si la clase ya finalizó Y tiene grabación lista
  const canWatch = !isScheduled && !isLiveSoon && event.canWatchRecording && event.recordingStatus === 'READY' && event.recordingUrl;

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Back link */}
      <button
        onClick={handleBack}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex items-center gap-2 self-start"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
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
              <Icon name="ondemand_video" size={56} className="text-icon-accent-primary" variant="rounded" />
              <span className="text-text-accent-primary text-lg font-semibold leading-5">
                EN VIVO PRONTO
              </span>
              <button
                onClick={() => {
                  if (event.liveMeetingUrl) {
                    window.open(event.liveMeetingUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                disabled={!event.liveMeetingUrl}
                className={`px-6 py-3 rounded-lg inline-flex justify-center items-center gap-1.5 ${
                  event.liveMeetingUrl
                    ? 'bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover'
                    : 'bg-bg-accent-primary-solid'
                }`}
              >
                <Icon name="videocam" size={16} className="text-icon-white" variant="rounded" />
                <span className="text-text-white text-sm font-medium leading-4">
                  Unirse a la Clase
                </span>
              </button>
            </div>
          ) : isScheduled ? (
            <div className="w-full aspect-video bg-bg-tertiary rounded-xl inline-flex flex-col justify-center items-center gap-4">
              <Icon name="calendar_month" size={56} className="text-icon-tertiary" variant="rounded" />
              <span className="text-text-quartiary text-lg font-semibold leading-5">
                CLASE PROGRAMADA
              </span>
              <button
                disabled
                className="px-6 py-3 bg-bg-disabled rounded-lg inline-flex justify-center items-center gap-1.5"
              >
                <Icon name="videocam" size={16} className="text-icon-disabled" variant="rounded" />
                <span className="text-text-disabled text-sm font-medium leading-4">
                  Unirse a la Clase
                </span>
              </button>
            </div>
          ) : (
            <div className="w-full aspect-video bg-bg-tertiary rounded-xl inline-flex flex-col justify-center items-center gap-4">
              <Icon name="videocam_off" size={56} className="text-icon-tertiary" variant="rounded" />
              <span className="text-text-quartiary text-lg font-semibold leading-5">
                {event.recordingStatus === 'PROCESSING' ? 'GRABACIÓN EN PROCESO' : 'GRABACIÓN NO DISPONIBLE'}
              </span>
            </div>
          )}

          {/* Event Info */}
          <div className="flex flex-col gap-2">
            {/* Course name */}
            <div className="flex items-center gap-1.5">
              <Icon name="school" size={16} className="text-icon-accent-primary" />
              <span className="text-text-accent-primary text-sm font-semibold leading-4 uppercase">
                {courseName || event.courseName}
              </span>
            </div>

            {/* Class title */}
            <h1 className="text-text-primary text-3xl font-bold leading-9">
              Clase {event.sessionNumber}: {event.topic}
            </h1>

            {/* Date + Time */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1.5">
                <Icon name="calendar_today" size={16} className="text-icon-secondary" />
                <span className="text-text-tertiary text-sm font-normal leading-4">
                  {formatDate(event.startDatetime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="schedule" size={16} className="text-icon-secondary" />
                <span className="text-text-tertiary text-sm font-normal leading-4">
                  {formatTimeRange(event.startDatetime, event.endDatetime)}
                </span>
              </div>
            </div>
          </div>

          {/* Next Class Card */}
          {nextEvent && (
            <button
              onClick={handleNextClass}
              className="w-full px-5 py-4 bg-deep-blue-800 rounded-xl flex items-center gap-4 hover:opacity-90 transition-opacity"
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
                <Icon name="arrow_forward" size={24} className="text-icon-accent-primary" />
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
              <p className="text-text-tertiary text-sm">No hay materiales disponibles</p>
            ) : (
              <div className="flex flex-col gap-2 overflow-hidden">
                {materials.map((mat, matIdx) => {
                  const fileName = mat.displayName || mat.fileResource.originalName;
                  const ext = getFileExtension(fileName);
                  const nameOnly = getFileNameWithoutExt(fileName);
                  const iconPath = getFileIconPath(mat.fileResource.mimeType, fileName);
                  const lastModified = formatMaterialDate(mat.fileResource.createdAt);

                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => { setPreviewIndex(matIdx); setShowPreview(true); }}
                      className="p-3 bg-bg-secondary rounded-lg flex items-center gap-3 hover:bg-bg-tertiary transition-colors text-left w-full"
                    >
                      <div className="flex-1 flex items-center gap-1 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={iconPath}
                          alt={ext || 'file'}
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
                          </div>
                          <span className="text-text-tertiary text-[10px] font-normal leading-3">
                            Última modificación: {lastModified}
                          </span>
                        </div>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          materialsService.downloadMaterial(mat.id, fileName);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            materialsService.downloadMaterial(mat.id, fileName);
                          }
                        }}
                        className="p-1 rounded-full flex items-center justify-center hover:bg-bg-quaternary transition-colors flex-shrink-0"
                        title="Descargar"
                      >
                        <Icon name="download" size={20} className="text-icon-tertiary" />
                      </div>
                    </button>
                  );
                })}
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
    </div>
  );
}
