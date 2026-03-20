'use client';

import { useCallback, useState } from 'react';
import { coursesService } from '@/services/courses.service';
import { classEventService } from '@/services/classEvent.service';
import type { CourseCycle } from '@/types/api';
import type { ClassEvent } from '@/types/classEvent';
import VideoPageLayout from '@/components/shared/VideoPageLayout';
import Icon from '@/components/ui/Icon';

interface VideoPageContentProps {
  cursoId: string;
  evalId: string;
  eventId: string;
}

// ============================================
// UpdateVideoModal
// ============================================

function UpdateVideoModal({
  event,
  onClose,
  onSaved,
}: {
  event: ClassEvent;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [recordingUrl, setRecordingUrl] = useState(event.recordingUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!recordingUrl.trim()) {
      setError('Ingresa una URL de grabación válida');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await classEventService.updateEvent(event.id, { recordingUrl: recordingUrl.trim() });
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error al actualizar video:', err);
      setError('Error al actualizar la grabación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-primary rounded-2xl shadow-xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-semibold leading-6">
            Actualizar Grabación
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <Icon name="close" size={20} className="text-icon-secondary" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-text-secondary text-sm font-medium leading-4">
            URL de la grabación
          </label>
          <input
            type="url"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full px-4 py-3 bg-bg-secondary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-sm leading-4 placeholder:text-text-tertiary focus:outline-stroke-accent-primary focus:outline-2 transition-colors"
          />
          {error && (
            <span className="text-text-error text-xs leading-3">{error}</span>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-secondary text-sm font-medium leading-4 hover:bg-bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium leading-4 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EditInfoModal
// ============================================

function toLocalDatetimeValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function EditInfoModal({
  event,
  onClose,
  onSaved,
}: {
  event: ClassEvent;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [topic, setTopic] = useState(event.topic);
  const [startDatetime, setStartDatetime] = useState(toLocalDatetimeValue(event.startDatetime));
  const [endDatetime, setEndDatetime] = useState(toLocalDatetimeValue(event.endDatetime));
  const [liveMeetingUrl, setLiveMeetingUrl] = useState(event.liveMeetingUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!topic.trim()) {
      setError('El tema es obligatorio');
      return;
    }

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      setError('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};

      if (topic.trim() !== event.topic) payload.topic = topic.trim();
      if (new Date(startDatetime).toISOString() !== new Date(event.startDatetime).toISOString()) {
        payload.startDatetime = new Date(startDatetime).toISOString();
      }
      if (new Date(endDatetime).toISOString() !== new Date(event.endDatetime).toISOString()) {
        payload.endDatetime = new Date(endDatetime).toISOString();
      }
      const trimmedUrl = liveMeetingUrl.trim();
      if (trimmedUrl !== (event.liveMeetingUrl || '')) {
        payload.liveMeetingUrl = trimmedUrl;
      }

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      await classEventService.updateEvent(event.id, payload);
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error al actualizar evento:', err);
      setError('Error al actualizar la información');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-primary rounded-2xl shadow-xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-semibold leading-6">
            Editar Información de Clase
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <Icon name="close" size={20} className="text-icon-secondary" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium leading-4">
              Tema
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              className="w-full px-4 py-3 bg-bg-secondary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-sm leading-4 focus:outline-stroke-accent-primary focus:outline-2 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium leading-4">
                Inicio
              </label>
              <input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-sm leading-4 focus:outline-stroke-accent-primary focus:outline-2 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium leading-4">
                Fin
              </label>
              <input
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-sm leading-4 focus:outline-stroke-accent-primary focus:outline-2 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium leading-4">
              URL de reunión en vivo
            </label>
            <input
              type="url"
              value={liveMeetingUrl}
              onChange={(e) => setLiveMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-4 py-3 bg-bg-secondary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-sm leading-4 placeholder:text-text-tertiary focus:outline-stroke-accent-primary focus:outline-2 transition-colors"
            />
          </div>

          {error && (
            <span className="text-text-error text-xs leading-3">{error}</span>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-secondary text-sm font-medium leading-4 hover:bg-bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium leading-4 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function VideoPageContent({ cursoId, evalId, eventId }: VideoPageContentProps) {
  const [modalState, setModalState] = useState<{
    type: 'updateVideo' | 'editInfo';
    event: ClassEvent;
    reload: () => Promise<void>;
  } | null>(null);

  const resolveNames = useCallback(async (cId: string, eId: string) => {
    let courseName = '';
    let evalShortName = '';

    try {
      const courses = await coursesService.getMyCourseCycles();
      const found = (Array.isArray(courses) ? courses : []).find(
        (cc: CourseCycle) => cc.id === cId,
      );
      if (found) courseName = found.course?.name || '';
    } catch (err) {
      console.error('Error al cargar nombre del curso:', err);
    }

    try {
      const data = await coursesService.getCourseContent(cId);
      const eval_ = data.evaluations.find((e) => e.id === eId);
      if (eval_) evalShortName = eval_.name || eval_.evaluationType;
    } catch (err) {
      console.error('Error al cargar datos de evaluación:', err);
    }

    return { courseName, evalShortName };
  }, []);

  const renderActions = useCallback((event: ClassEvent, reloadEvent: () => Promise<void>) => {
    const isFinished = event.sessionStatus === 'FINALIZADA';
    const isLive = event.sessionStatus === 'EN_CURSO';
    const isScheduled = event.sessionStatus === 'PROGRAMADA';
    const isLiveSoonLocal = isLive || (isScheduled && (new Date(event.startDatetime).getTime() - Date.now()) <= 60 * 60 * 1000 && (new Date(event.startDatetime).getTime() - Date.now()) > 0);

    const renderPrimaryButton = () => {
      if (isFinished) {
        return (
          <button
            onClick={() => setModalState({ type: 'updateVideo', event, reload: reloadEvent })}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="videocam" size={16} className="text-icon-white" variant="rounded" />
            <span className="text-text-white text-sm font-medium leading-4">Actualizar Video</span>
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
            <span className={`text-sm font-medium leading-4 ${event.liveMeetingUrl ? 'text-text-white' : 'text-text-disabled'}`}>
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
        <button
          onClick={() => setModalState({ type: 'editInfo', event, reload: reloadEvent })}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
        >
          <Icon name="edit" size={16} className="text-icon-accent-primary" variant="rounded" />
          <span className="text-text-accent-primary text-sm font-medium leading-4">Editar Info</span>
        </button>
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
        <EditInfoModal
          event={modalState.event}
          onClose={closeModal}
          onSaved={modalState.reload}
        />
      )}
    </>
  );
}
