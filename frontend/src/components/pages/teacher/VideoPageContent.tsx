'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { coursesService } from '@/services/courses.service';
import { classEventService } from '@/services/classEvent.service';
import { useToast } from '@/components/ui/ToastContainer';
import { formatSingleTime } from '@/components/pages/student/EvaluationShared';
import type { Enrollment } from '@/types/enrollment';
import type { ClassEvent } from '@/types/classEvent';
import VideoPageLayout from '@/components/shared/VideoPageLayout';
import Modal from '@/components/ui/Modal';
import EditClassModal from '@/components/modals/EditClassModal';
import Icon from '@/components/ui/Icon';

interface VideoPageContentProps {
  cursoId: string;
  evalId: string;
  eventId: string;
}

// ============================================
// UpdateVideoModal
// ============================================

const VIDEO_EXTENSIONS = ['mp4', 'mkv'];
const MAX_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB

function formatVideoSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isAllowedVideo(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext) && file.size <= MAX_VIDEO_SIZE;
}

function getVideoFileIcon(fileName: string): string {
  return '/icons/files/video.svg';
}

function getVideoExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.substring(dotIndex);
}

function getVideoNameWithoutExt(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
}

function UpdateVideoModal({
  event,
  onClose,
  onSaved,
}: {
  event: ClassEvent;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeUpload, setActiveUpload] = useState<{
    mode: 'initial' | 'replacement';
    expiresAt: string | null;
  } | null>(null);
  const [canceling, setCanceling] = useState(false);
  const hasPublishedRecording =
    event.recordingStatus === 'READY' && !!event.recordingUrl;
  const isFirstUpload = !hasPublishedRecording;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDriveTokenResolveRef = useRef<((token: string) => void) | null>(null);
  const pendingDriveTokenRejectRef = useRef<((reason?: unknown) => void) | null>(null);

  const loadUploadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await classEventService.getRecordingUploadStatus(event.id);
      if (status.hasActiveRecordingUpload && status.activeUploadMode) {
        setActiveUpload({
          mode: status.activeUploadMode,
          expiresAt: status.uploadExpiresAt,
        });
      } else {
        setActiveUpload(null);
      }
    } catch (statusError) {
      console.warn('[recording-upload] status check failed', statusError);
      setActiveUpload(null);
    } finally {
      setStatusLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    void loadUploadStatus();
  }, [loadUploadStatus]);

  const requestDriveAccessToken = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: (tokenResponse) => {
      const token = String(tokenResponse.access_token || '').trim();
      if (!token) {
        pendingDriveTokenRejectRef.current?.(
          new Error('Google no devolvio access token para Drive'),
        );
      } else {
        pendingDriveTokenResolveRef.current?.(token);
      }
      pendingDriveTokenResolveRef.current = null;
      pendingDriveTokenRejectRef.current = null;
    },
    onError: () => {
      pendingDriveTokenRejectRef.current?.(
        new Error('No se pudo obtener autorizacion de Google Drive'),
      );
      pendingDriveTokenResolveRef.current = null;
      pendingDriveTokenRejectRef.current = null;
    },
  });

  const getDriveAccessToken = () =>
    new Promise<string>((resolve, reject) => {
      pendingDriveTokenResolveRef.current = resolve;
      pendingDriveTokenRejectRef.current = reject;
      requestDriveAccessToken();
    });

  const createBrowserResumableSession = async (input: {
    accessToken: string;
    driveVideosFolderId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }) => {
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,parents&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': input.mimeType,
          'X-Upload-Content-Length': String(input.sizeBytes),
        },
        body: JSON.stringify({
          name: input.fileName,
          parents: [input.driveVideosFolderId],
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `No se pudo crear sesion resumable en Drive (${response.status}) ${body}`.trim(),
      );
    }

    const resumableSessionUrl = String(response.headers.get('location') || '').trim();
    if (!resumableSessionUrl) {
      throw new Error('Drive no devolvio Location para sesion resumable');
    }
    return resumableSessionUrl;
  };

  const handleSave = async () => {
    if (activeUpload) {
      setError(
        'Ya existe una carga activa para este evento. Cancela la carga activa para iniciar una nueva.',
      );
      return;
    }
    if (!selectedFile) {
      setError('Selecciona un video para subir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const fileMimeType = selectedFile.type || 'video/mp4';

      console.log('[recording-upload] starting upload', {
        classEventId: event.id,
        fileName: selectedFile.name,
        mimeType: fileMimeType,
        sizeBytes: selectedFile.size,
      });

      const startResponse = await classEventService.startRecordingUpload(event.id, {
        fileName: selectedFile.name,
        mimeType: fileMimeType,
        sizeBytes: selectedFile.size,
      });

      console.log('[recording-upload] start response', startResponse);

      if (!startResponse.driveVideosFolderId) {
        throw new Error('El backend no devolvio driveVideosFolderId');
      }

      const driveAccessToken = await getDriveAccessToken();

      const resumableSessionUrl = await createBrowserResumableSession({
        accessToken: driveAccessToken,
        driveVideosFolderId: startResponse.driveVideosFolderId,
        fileName: selectedFile.name,
        mimeType: fileMimeType,
        sizeBytes: selectedFile.size,
      });

      const heartbeatInterval = window.setInterval(() => {
        void classEventService
          .heartbeatRecordingUpload(event.id, {
            uploadToken: startResponse.uploadToken,
          })
          .catch((heartbeatError) => {
            console.warn('[recording-upload] heartbeat failed', heartbeatError);
          });
      }, 25_000);

      setUploadStartTime(Date.now());

      let fileId: string;
      try {
        fileId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                const id = String(data?.id || '').trim();
                if (!id) reject(new Error('Drive no devolvió el fileId final'));
                else resolve(id);
              } catch { reject(new Error('Error al parsear respuesta de Drive')); }
            } else {
              reject(new Error(`Error subiendo archivo a Drive: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Error de red al subir a Drive'));

          xhr.open('PUT', resumableSessionUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${driveAccessToken}`);
          xhr.setRequestHeader('Content-Type', fileMimeType);
          xhr.send(selectedFile);
        });
      } finally {
        window.clearInterval(heartbeatInterval);
      }

      if (!fileId) {
        throw new Error('Drive no devolvio el fileId final');
      }

      const finalizeResponse = await classEventService.finalizeRecordingUpload(event.id, {
        uploadToken: startResponse.uploadToken,
        fileId,
      });

      console.log('[recording-upload] finalize response', finalizeResponse);

      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error al subir video:', err);
      if (err instanceof Error && err.message.includes('Ya existe una carga activa')) {
        await loadUploadStatus();
      }
      setError(err instanceof Error ? err.message : 'Error al subir la grabacion');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelActiveUpload = async () => {
    setCanceling(true);
    setError(null);
    try {
      const status = await classEventService.cancelRecordingUpload(event.id);
      if (status.hasActiveRecordingUpload && status.activeUploadMode) {
        setActiveUpload({
          mode: status.activeUploadMode,
          expiresAt: status.uploadExpiresAt,
        });
      } else {
        setActiveUpload(null);
      }
      await onSaved();
    } catch (cancelError) {
      console.error('Error cancelando upload activo:', cancelError);
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : 'No se pudo cancelar la carga activa',
      );
    } finally {
      setCanceling(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isAllowedVideo(file)) {
      setError(file.size > MAX_VIDEO_SIZE ? 'El video excede el tamaño máximo de 10 GB' : 'Formato no permitido. Usa MP4 o MKV.');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setUploadProgress(0);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAllowedVideo(file)) {
        setError(file.size > MAX_VIDEO_SIZE ? 'El video excede el tamaño máximo de 10 GB' : 'Formato no permitido. Usa MP4 o MKV.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setUploadProgress(0);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTimeRemaining = () => {
    if (uploadProgress <= 0 || !uploadStartTime) return '';
    const elapsed = (Date.now() - uploadStartTime) / 1000;
    if (elapsed < 1) return '';
    const totalEstimate = elapsed / (uploadProgress / 100);
    const remaining = Math.max(0, totalEstimate - elapsed);
    if (remaining < 60) return `Quedan ${Math.ceil(remaining)} segundos`;
    return `Quedan ${Math.ceil(remaining / 60)} minutos`;
  };

  const canSubmit = !!selectedFile && !saving && !statusLoading && !activeUpload;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={!saving ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-bg-primary rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="pl-6 pr-3 py-4 border-b border-stroke-secondary flex items-center gap-3">
          <h2 className="flex-1 text-text-primary text-xl font-semibold leading-6">
            {isFirstUpload ? 'Subir Grabación' : 'Actualizar Grabación'}
          </h2>
          {!saving && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-bg-secondary transition-colors">
              <Icon name="close" size={24} className="text-icon-tertiary" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {isFirstUpload && !activeUpload && (
            <div className="rounded-lg bg-bg-info-primary-light p-3 outline outline-1 outline-stroke-info-secondary flex flex-col gap-1.5">
              <span className="text-text-info-primary text-sm font-medium leading-4">
                Esta clase todavía no tiene una grabación publicada.
              </span>
              <span className="text-text-secondary text-xs leading-4">
                Sube el video final para publicarlo por primera vez en la plataforma.
              </span>
            </div>
          )}

          {/* Active upload warning */}
          {statusLoading && (
            <span className="text-text-tertiary text-xs leading-3">Verificando estado de carga...</span>
          )}
          {activeUpload && (
            <div className="rounded-lg bg-bg-secondary p-3 outline outline-1 outline-stroke-primary flex flex-col gap-2">
              <p className="text-text-primary text-sm leading-4">
                Ya existe una carga activa ({activeUpload.mode === 'initial' ? 'inicial' : 'reemplazo'}).
              </p>
              <p className="text-text-tertiary text-xs leading-3">
                {activeUpload.expiresAt
                  ? `Expira: ${new Date(activeUpload.expiresAt).toLocaleString()}`
                  : 'La carga activa sigue bloqueando nuevos intentos.'}
              </p>
              <button
                onClick={handleCancelActiveUpload}
                disabled={canceling}
                className="self-start px-4 py-2 bg-bg-accent-primary-solid rounded-lg text-text-white text-xs font-medium leading-4 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {canceling ? 'Cancelando...' : 'Cancelar carga activa'}
              </button>
            </div>
          )}

          {/* Drop Zone */}
          {!saving && !activeUpload && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ backgroundImage: 'url(/images/upload-dropzone.png)', backgroundSize: 'contain', backgroundPosition: 'center' }}
              className={`px-5 py-8 rounded-xl border-2 border-dashed flex flex-col justify-center items-center gap-3 transition-colors ${
                isDragOver ? 'border-deep-blue-700 bg-bg-accent-light' : 'border-stroke-primary'
              }`}
            >
              <div className="w-12 h-12 bg-bg-info-primary-light rounded-full flex items-center justify-center">
                <Icon name="cloud_upload" size={24} className="text-icon-info-primary" variant="rounded" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-text-primary text-base font-semibold leading-5">
                  Arrastra y suelta tu video aquí
                </span>
                <span className="text-gray-600 text-xs font-normal leading-4">
                  MP4, MKV (Máx. 10 GB)
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mp4,.mkv,video/mp4,video/x-matroska"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-bg-info-primary-light rounded-lg inline-flex items-center gap-1.5 hover:bg-bg-info-primary-light/80 transition-colors"
              >
                <Icon name="file_upload" size={16} className="text-icon-info-primary" variant="outlined" />
                <span className="text-text-info-primary text-sm font-medium leading-4">Seleccionar Video</span>
              </button>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && (
            <div className="p-3 bg-bg-secondary rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getVideoFileIcon(selectedFile.name)} alt="video" className="w-8 h-8 flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-start">
                    <span className="text-text-primary text-sm font-normal leading-4 truncate">
                      {getVideoNameWithoutExt(selectedFile.name)}
                    </span>
                    <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">
                      {getVideoExtension(selectedFile.name)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary text-[10px] font-normal leading-3">
                      {formatVideoSize(selectedFile.size)}
                    </span>
                    {saving && uploadProgress > 0 && (
                      <>
                        <div className="w-0.5 h-0.5 bg-gray-900 rounded-full" />
                        <span className="text-text-tertiary text-[10px] font-normal leading-3">
                          {getTimeRemaining()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {!saving && (
                  <button
                    onClick={() => { setSelectedFile(null); setUploadProgress(0); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors"
                  >
                    <Icon name="close" size={16} className="text-icon-tertiary" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {saving && (
                <div className="w-full h-1 bg-bg-disabled rounded-full overflow-hidden">
                  <div
                    className="h-full bg-deep-blue-700 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <span className="text-text-error-primary text-sm">{error}</span>}

          {/* Warning */}
          {saving && (
            <span className="text-text-tertiary text-xs leading-3">
              No cierres ni recargues esta pestaña mientras la carga esté en progreso.
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stroke-secondary flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-tertiary text-sm font-medium leading-4 hover:bg-bg-secondary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSubmit}
            className={`px-6 py-3 rounded-lg text-sm font-medium leading-4 ${
              canSubmit
                ? 'bg-bg-accent-primary-solid text-text-white hover:opacity-90 transition-opacity'
                : 'bg-bg-disabled text-text-disabled'
            }`}
          >
            {saving ? 'Subiendo...' : isFirstUpload ? 'Subir Video' : 'Actualizar Video'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Delete Class Modal
// ============================================

function DeleteClassModal({ event, onClose, onDeleted }: { event: ClassEvent; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <Modal isOpen onClose={onClose} title="¿Eliminar esta clase?" size="sm" footer={
      <>
        <Modal.Button variant="secondary" onClick={onClose}>Cancelar</Modal.Button>
        <Modal.Button variant="danger" loading={loading} loadingText="Eliminando..." onClick={async () => {
          setLoading(true);
          try {
            await classEventService.cancelEvent(event.id);
            showToast({ type: 'success', title: 'Clase eliminada', description: 'La clase ha sido cancelada.' });
            await onDeleted();
            router.push(`/plataforma/curso/${event.courseCycleId}/evaluacion/${event.evaluationId}`);
          } catch (err) {
            showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar.' });
          } finally { setLoading(false); }
        }}>Eliminar</Modal.Button>
      </>
    }>
      <p className="text-text-tertiary text-base font-normal leading-5">
        ¿Estás seguro de que deseas eliminar <strong>Clase {event.sessionNumber}: {event.topic}</strong>? Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
}

// ============================================
// Context Menu for three-dot button
// ============================================

function ContextMenuButton({
  event,
  reloadEvent,
  setModalState,
}: {
  event: ClassEvent;
  reloadEvent: () => Promise<void>;
  setModalState: (s: { type: 'updateVideo' | 'editInfo' | 'deleteClass'; event: ClassEvent; reload: () => Promise<void> } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleCopySummary = async () => {
    setOpen(false);
    const start = new Date(event.startDatetime);
    const end = new Date(event.endDatetime);
    const dayStr = start.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Lima' });
    const profNames = event.professors.map((p) => `${p.firstName} ${p.lastName1}`).join(', ') || 'Sin asignar';
    const summary = [
      `▶️ CLASE ${event.sessionNumber} - ${event.evaluationName}`,
      `Curso: ${event.courseName}`,
      `📒 Tema: ${event.topic}`,
      `🎙️ Asesor(a): ${profNames}`,
      `🗓 Fecha: ${dayStr.charAt(0).toUpperCase() + dayStr.slice(1)}`,
      `⏰ Hora: ${formatSingleTime(start, true).toUpperCase()} - ${formatSingleTime(end, true).toUpperCase()}`,
      `🔗 Enlace: ${event.liveMeetingUrl || 'No disponible'}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      showToast({ type: 'success', title: 'Resumen del evento copiado', description: 'Ahora puedes compartirlo fácilmente.' });
    } catch {
      showToast({ type: 'error', title: 'Error', description: 'No se pudo copiar.' });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
      >
        <Icon name="more_vert" size={16} className="text-icon-accent-primary" variant="rounded" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 w-48 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col">
          <button onClick={() => { setOpen(false); setModalState({ type: 'editInfo', event, reload: reloadEvent }); }} className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors">
            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Editar</span>
          </button>
          <button onClick={handleCopySummary} className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors">
            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Copiar resumen</span>
          </button>
          <div className="h-px bg-stroke-secondary" />
          <button onClick={() => { setOpen(false); setModalState({ type: 'deleteClass', event, reload: reloadEvent }); }} className="self-stretch px-2 py-3 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors">
            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function VideoPageContent({ cursoId, evalId, eventId }: VideoPageContentProps) {
  const [modalState, setModalState] = useState<{
    type: 'updateVideo' | 'editInfo' | 'deleteClass';
    event: ClassEvent;
    reload: () => Promise<void>;
  } | null>(null);

  const resolveNames = useCallback(async (cId: string, eId: string) => {
    let courseName = '';
    let evalShortName = '';

    try {
      const enrollments = await coursesService.getMyCourseCycles();
      const found = enrollments.find(
        (e: Enrollment) => e.courseCycle.id === cId,
      );
      if (found) courseName = found.courseCycle.course.name;
    } catch (err) {
      console.error('Error al cargar nombre del curso:', err);
    }

    try {
      const data = await coursesService.getCourseContent(cId);
      const eval_ = data.evaluations.find((e) => e.id === eId);
      if (eval_) evalShortName = eval_.shortName || eval_.fullName;
    } catch (err) {
      console.error('Error al cargar datos de evaluacion:', err);
    }

    return { courseName, evalShortName };
  }, []);

  const renderActions = useCallback((event: ClassEvent, reloadEvent: () => Promise<void>) => {
    const isFinished = event.sessionStatus === 'FINALIZADA';
    const isLive = event.sessionStatus === 'EN_CURSO';
    const isScheduled = event.sessionStatus === 'PROGRAMADA';
    const hasPublishedRecording =
      event.recordingStatus === 'READY' && !!event.recordingUrl;
    const isLiveSoonLocal =
      isLive ||
      (isScheduled &&
        new Date(event.startDatetime).getTime() - Date.now() <= 60 * 60 * 1000 &&
        new Date(event.startDatetime).getTime() - Date.now() > 0);

    const renderPrimaryButton = () => {
      if (isFinished) {
        return (
          <button
            onClick={() => setModalState({ type: 'updateVideo', event, reload: reloadEvent })}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="videocam" size={16} className="text-icon-white" variant="rounded" />
            <span className="text-text-white text-sm font-medium leading-4">
              {hasPublishedRecording ? 'Actualizar Video' : 'Subir Video'}
            </span>
          </button>
        );
      }

      if (isLiveSoonLocal) {
        return (
          <button
            onClick={() => {
              if (event.liveMeetingUrl) {
                window.open(event.liveMeetingUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={!event.liveMeetingUrl}
            className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 ${
              event.liveMeetingUrl
                ? 'bg-bg-accent-primary-solid hover:opacity-90 transition-opacity'
                : 'bg-bg-disabled cursor-not-allowed'
            }`}
          >
            <Icon
              name="videocam"
              size={16}
              className={event.liveMeetingUrl ? 'text-icon-white' : 'text-icon-disabled'}
              variant="rounded"
            />
            <span
              className={`text-sm font-medium leading-4 ${event.liveMeetingUrl ? 'text-text-white' : 'text-text-disabled'}`}
            >
              Unirme a la Clase
            </span>
          </button>
        );
      }

      return (
        <button
          disabled
          className="px-6 py-3 bg-bg-disabled rounded-lg flex justify-center items-center gap-1.5 cursor-not-allowed"
        >
          <Icon name="videocam" size={16} className="text-icon-disabled" variant="rounded" />
          <span className="text-text-disabled text-sm font-medium leading-4">Unirme a la Clase</span>
        </button>
      );
    };

    return (
      <div className="self-stretch inline-flex justify-end items-center gap-4">
        {renderPrimaryButton()}
        <ContextMenuButton event={event} reloadEvent={reloadEvent} setModalState={setModalState} />
      </div>
    );
  }, []);

  const closeModal = useCallback(() => setModalState(null), []);

  return (
    <>
      <VideoPageLayout
        cursoId={cursoId}
        evalId={evalId}
        eventId={eventId}
        resolveNames={resolveNames}
        renderActions={renderActions}
        canUploadMaterials
      />

      {modalState?.type === 'updateVideo' && (
        <UpdateVideoModal
          event={modalState.event}
          onClose={closeModal}
          onSaved={modalState.reload}
        />
      )}

      {modalState?.type === 'editInfo' && (
        <EditClassModal
          isOpen
          event={modalState.event}
          onClose={closeModal}
          onSaved={() => { modalState.reload(); }}
        />
      )}

      {modalState?.type === 'deleteClass' && (
        <DeleteClassModal
          event={modalState.event}
          onClose={closeModal}
          onDeleted={async () => { await modalState.reload(); closeModal(); }}
        />
      )}
    </>
  );
}
