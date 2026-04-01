'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { classEventService } from '@/services/classEvent.service';
import { evaluationsService } from '@/services/evaluations.service';
import type { ClassEvent } from '@/types/classEvent';
import type { Evaluation } from '@/types/api';
import Modal from '@/components/ui/Modal';
import FloatingInput from '@/components/ui/FloatingInput';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContainer';

// ============================================
// Helpers
// ============================================

function getSmartTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  if (m === 0 || m === 30) { /* use as-is */ }
  else if (m < 30) { m = 30; }
  else { m = 0; h += 1; }
  if (h >= 24) h = 0;
  const endH = m === 30 ? (h + 1 >= 24 ? 23 : h + 1) : h;
  const endM = m === 30 ? 0 : 30;
  const fmt = (hh: number, mm: number) => `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  return { startTime: fmt(h, m), endTime: fmt(endH, endM) };
}

function getSmartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function getEvalLabel(ev: Evaluation): string {
  if (ev.evaluationType) return `${ev.evaluationType.name} (${ev.evaluationType.code}${ev.number})`;
  return `Evaluación ${ev.number}`;
}

// ============================================
// Alert types
// ============================================

type AlertType = 'error' | 'warning' | null;

interface ScheduleAlert {
  type: AlertType;
  title: string;
  detail: string;
}

// ============================================
// Types
// ============================================

export interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  duplicateFrom?: ClassEvent;
  courseName: string;
  courseCycleId: string;
  /** If provided, locks evaluation field */
  evaluationId?: string;
  evaluationName?: string;
  professorNames?: string[];
  /** If true, allows changing evaluation (calendar mode) */
  allowEvalSelection?: boolean;
}

export default function CreateClassModal({
  isOpen,
  onClose,
  onCreated,
  duplicateFrom,
  courseName,
  courseCycleId,
  evaluationId: lockedEvalId,
  evaluationName: lockedEvalName,
  professorNames = [],
  allowEvalSelection = false,
}: CreateClassModalProps) {
  const { showToast } = useToast();

  // ---- Evaluation selection state ----
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState(lockedEvalId || '');
  const [evalDropdownOpen, setEvalDropdownOpen] = useState(false);
  const evalTriggerRef = useState<HTMLDivElement | null>(null);
  const evalDropdownRef = useState<HTMLDivElement | null>(null);

  const effectiveEvalId = lockedEvalId || selectedEvalId;
  const effectiveEvalName = lockedEvalId
    ? (lockedEvalName || '')
    : (evaluations.find((e) => e.id === selectedEvalId) ? getEvalLabel(evaluations.find((e) => e.id === selectedEvalId)!) : '');

  // Load evaluations for calendar mode
  useEffect(() => {
    if (!allowEvalSelection || !courseCycleId || !isOpen) return;
    evaluationsService.findByCourseCycle(courseCycleId).then(setEvaluations).catch(() => setEvaluations([]));
  }, [allowEvalSelection, courseCycleId, isOpen]);

  // Pre-select from duplicate
  useEffect(() => {
    if (duplicateFrom?.evaluationId && allowEvalSelection) {
      setSelectedEvalId(duplicateFrom.evaluationId);
    }
  }, [duplicateFrom, allowEvalSelection]);

  // ---- Date/Time state ----
  const smartDate = duplicateFrom ? nextDay(new Date(duplicateFrom.startDatetime).toISOString().split('T')[0]) : getSmartDate();
  const smartTimes = duplicateFrom
    ? { startTime: new Date(duplicateFrom.startDatetime).toTimeString().slice(0, 5), endTime: new Date(duplicateFrom.endDatetime).toTimeString().slice(0, 5) }
    : getSmartTimes();

  const [startDate, setStartDate] = useState(smartDate);
  const [startTime, setStartTime] = useState(smartTimes.startTime);
  const [endDate, setEndDate] = useState(smartDate);
  const [endTime, setEndTime] = useState(smartTimes.endTime);
  const [topic, setTopic] = useState(duplicateFrom?.topic || '');
  const [meetingUrl, setMeetingUrl] = useState(duplicateFrom?.liveMeetingUrl || '');
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  // ---- Existing events for validation ----
  const [existingEvents, setExistingEvents] = useState<ClassEvent[]>([]);

  useEffect(() => {
    if (!effectiveEvalId || !isOpen) { setExistingEvents([]); return; }
    classEventService.getEvaluationEvents(effectiveEvalId)
      .then((evts) => setExistingEvents(evts.filter((e) => !e.isCancelled)))
      .catch(() => setExistingEvents([]));
  }, [effectiveEvalId, isOpen]);

  // ---- Compute session number and alert ----
  const { sessionNumber, alert } = useMemo((): { sessionNumber: number; alert: ScheduleAlert | null } => {
    if (!startDate || !startTime || existingEvents.length === 0) {
      return { sessionNumber: existingEvents.length + 1, alert: null };
    }

    const newStart = new Date(`${startDate}T${startTime}:00`).getTime();
    const now = Date.now();

    // Sort existing by start datetime
    const sorted = [...existingEvents].sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

    // Find where the new class fits chronologically
    let insertIndex = sorted.length; // default: after all
    for (let i = 0; i < sorted.length; i++) {
      if (newStart < new Date(sorted[i].startDatetime).getTime()) {
        insertIndex = i;
        break;
      }
    }

    const newSessionNum = insertIndex + 1;

    // Check for conflicts with past classes
    if (insertIndex === 0 && sorted.length > 0) {
      const firstPast = new Date(sorted[0].startDatetime).getTime() < now;
      if (firstPast && newStart < new Date(sorted[0].startDatetime).getTime()) {
        return {
          sessionNumber: newSessionNum,
          alert: {
            type: 'error',
            title: 'Conflicto de fecha con la primera clase registrada',
            detail: 'La nueva clase está programada antes de la primera clase registrada, que ya ha pasado. No se puede registrar. Ajusta la fecha y vuelve a intentarlo.',
          },
        };
      }
      if (!firstPast) {
        return {
          sessionNumber: newSessionNum,
          alert: {
            type: 'warning',
            title: 'Clase registrada antes de la primera clase',
            detail: 'La nueva clase está antes de la primera clase registrada. Se ha asignado el número 1, y las clases posteriores se renumerarán.',
          },
        };
      }
    }

    if (insertIndex > 0 && insertIndex < sorted.length) {
      const prevPast = new Date(sorted[insertIndex - 1].startDatetime).getTime() < now;
      const nextPast = new Date(sorted[insertIndex].startDatetime).getTime() < now;

      if (prevPast && nextPast) {
        return {
          sessionNumber: newSessionNum,
          alert: {
            type: 'error',
            title: 'Conflicto de fecha entre clases ya pasadas',
            detail: `La nueva clase está entre las clases ${insertIndex} y ${insertIndex + 1}, ambas ya pasadas. No se puede registrar. Ajusta la fecha y vuelve a intentarlo.`,
          },
        };
      }

      return {
        sessionNumber: newSessionNum,
        alert: {
          type: 'warning',
          title: 'Clase registrada entre dos clases existentes',
          detail: `La nueva clase está entre las clases ${insertIndex} y ${insertIndex + 1}. Se ha asignado el número ${newSessionNum}, y las clases posteriores se renumerarán.`,
        },
      };
    }

    return { sessionNumber: newSessionNum, alert: null };
  }, [startDate, startTime, existingEvents]);

  const autoTitle = effectiveEvalName && sessionNumber ? `Clase ${sessionNumber} - ${effectiveEvalName}` : '';

  const hasChanges = topic.trim().length > 0 || meetingUrl.trim().length > 0 || startDate !== smartDate || startTime !== smartTimes.startTime;

  const canSubmit = topic.trim().length > 0 && meetingUrl.trim().length > 0 && startDate && startTime && endDate && endTime && effectiveEvalId && alert?.type !== 'error';

  const handleClose = useCallback(() => {
    if (hasChanges) { setShowDiscard(true); } else { onClose(); }
  }, [hasChanges, onClose]);

  const handleSave = async () => {
    if (!canSubmit || !effectiveEvalId) return;
    const startDt = `${startDate}T${startTime}:00`;
    const endDt = `${endDate}T${endTime}:00`;
    if (new Date(endDt) <= new Date(startDt)) {
      showToast({ type: 'error', title: 'Error', description: 'La hora de fin debe ser posterior a la de inicio.' });
      return;
    }
    setSaving(true);
    try {
      await classEventService.createEvent({
        evaluationId: effectiveEvalId,
        sessionNumber,
        title: autoTitle,
        topic: topic.trim(),
        startDatetime: startDt,
        endDatetime: endDt,
        liveMeetingUrl: meetingUrl.trim(),
      });
      onCreated();
      onClose();
      showToast({ type: 'success', title: 'Clase creada', description: `${autoTitle} ha sido programada correctamente.` });
    } catch (err) {
      showToast({ type: 'error', title: 'Error al crear clase', description: err instanceof Error ? err.message : 'No se pudo crear la clase.' });
    } finally {
      setSaving(false);
    }
  };

  // Close eval dropdown on outside click
  useEffect(() => {
    if (!evalDropdownOpen) return;
    const h = (e: MouseEvent) => {
      const trigger = evalTriggerRef[0];
      const dropdown = evalDropdownRef[0];
      if (trigger && !trigger.contains(e.target as Node) && dropdown && !dropdown.contains(e.target as Node)) {
        setEvalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [evalDropdownOpen, evalTriggerRef, evalDropdownRef]);

  // ---- Render ----

  const renderAlert = () => {
    if (!alert) return null;
    const isError = alert.type === 'error';
    return (
      <div className={`self-stretch flex-1 px-2 py-3 ${isError ? 'bg-bg-error-light' : 'bg-bg-warning-light'} rounded-lg outline outline-2 outline-offset-[-2px] ${isError ? 'outline-stroke-error-secondary' : 'outline-stroke-warning-secondary'} flex justify-start items-center gap-2`}>
        <div className="px-2 py-1 rounded-full flex justify-start items-center">
          <Icon name={isError ? 'error' : 'warning'} size={24} className={isError ? 'text-bg-error-solid' : 'text-icon-warning-primary'} variant="rounded" />
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
          <span className="self-stretch text-text-primary text-sm font-normal leading-4">{alert.title}</span>
          <span className="self-stretch text-text-tertiary text-xs font-normal leading-4">{alert.detail}</span>
        </div>
      </div>
    );
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nueva Clase"
      size="lg"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose}>Cancelar</Modal.Button>
          <Modal.Button disabled={!canSubmit} loading={saving} loadingText="Creando..." onClick={handleSave}>Guardar</Modal.Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Curso (disabled) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{courseName}</span>
            <Icon name="expand_more" size={20} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Curso</span>
          </div>
        </div>

        {/* Evaluación asociada */}
        {allowEvalSelection && !lockedEvalId ? (
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div
              ref={(el) => { evalTriggerRef[0] = el; }}
              onClick={() => setEvalDropdownOpen(!evalDropdownOpen)}
              className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${evalDropdownOpen ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'} inline-flex justify-start items-center gap-2 cursor-pointer`}
            >
              <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${effectiveEvalName ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {effectiveEvalName || 'Evaluación asociada'}
              </span>
              <Icon name="expand_more" size={20} className={evalDropdownOpen ? 'text-icon-accent-primary' : 'text-icon-tertiary'} />
            </div>
            {effectiveEvalName && (
              <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
                <span className={`text-xs font-normal leading-4 ${evalDropdownOpen ? 'text-text-accent-primary' : 'text-text-tertiary'}`}>Evaluación asociada</span>
              </div>
            )}
            {evalDropdownOpen && createPortal(
              <div
                ref={(el) => { evalDropdownRef[0] = el; }}
                style={{
                  position: 'fixed',
                  top: evalTriggerRef[0] ? evalTriggerRef[0].getBoundingClientRect().bottom + 4 : 0,
                  left: evalTriggerRef[0] ? evalTriggerRef[0].getBoundingClientRect().left : 0,
                  width: evalTriggerRef[0] ? evalTriggerRef[0].getBoundingClientRect().width : 'auto',
                  zIndex: 9999,
                }}
                className="p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col"
              >
                {evaluations.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => { setSelectedEvalId(ev.id); setEvalDropdownOpen(false); }}
                    className="self-stretch px-2 py-3 rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
                  >
                    <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">{getEvalLabel(ev)}</span>
                  </button>
                ))}
              </div>,
              document.body,
            )}
          </div>
        ) : (
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
              <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${effectiveEvalName ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {effectiveEvalName || 'Evaluación asociada'}
              </span>
              <Icon name="expand_more" size={20} className="text-gray-500" />
            </div>
            {effectiveEvalName && (
              <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
                <span className="text-text-tertiary text-xs font-normal leading-4">Evaluación asociada</span>
              </div>
            )}
          </div>
        )}

        {/* Date/Time grid */}
        <div className="self-stretch inline-flex justify-center items-center gap-2">
          <div className="flex-1 inline-flex flex-col justify-start items-start">
            <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (!endDate || v > endDate) setEndDate(v); }} />
            <TimePicker value={startTime} onChange={setStartTime} />
          </div>
          <Icon name="arrow_forward" size={16} className="text-icon-secondary" />
          <div className="flex-1 inline-flex flex-col justify-start items-start">
            <DatePicker value={endDate} onChange={setEndDate} min={startDate} />
            <TimePicker value={endTime} onChange={setEndTime} />
          </div>
        </div>

        {/* Título (disabled, auto-generated) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
            <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${autoTitle ? 'text-text-primary' : 'text-text-tertiary'}`}>
              {autoTitle || 'Título de la clase (Autogenerado)'}
            </span>
          </div>
          {autoTitle && (
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">Título de la clase (Autogenerado)</span>
            </div>
          )}
        </div>

        {/* Schedule alert */}
        {renderAlert()}

        {/* Tema */}
        <FloatingInput id="create-class-topic" label="Tema" value={topic} onChange={setTopic} />

        {/* Enlace */}
        <FloatingInput id="create-class-url" label="Enlace de la sesión" value={meetingUrl} onChange={setMeetingUrl} />

        {/* Asesor asignado (disabled) */}
        <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
          <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
            <div className="flex-1 flex justify-start items-center gap-1">
              {professorNames.length > 0 ? professorNames.map((name, i) => (
                <div key={i} className="px-2.5 py-1.5 bg-bg-quartiary rounded-full flex justify-center items-center gap-1">
                  <Icon name="person" size={14} className="text-gray-500" variant="rounded" />
                  <span className="text-text-secondary text-xs font-medium leading-3">{name}</span>
                </div>
              )) : (
                <span className="text-text-tertiary text-base font-normal leading-4">Sin asignar</span>
              )}
            </div>
            <Icon name="person_add_alt" size={16} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className="text-text-tertiary text-xs font-normal leading-4">Asesor asignado</span>
          </div>
        </div>
      </div>
    </Modal>

    {/* Discard confirmation */}
    <Modal
      isOpen={showDiscard}
      onClose={() => setShowDiscard(false)}
      title="¿Descartar los cambios no guardados?"
      size="sm"
      zIndex={60}
      footer={
        <>
          <Modal.Button variant="secondary" onClick={() => setShowDiscard(false)}>Cancelar</Modal.Button>
          <Modal.Button variant="danger" onClick={() => { setShowDiscard(false); onClose(); }}>Descartar</Modal.Button>
        </>
      }
    >
      <p className="text-text-tertiary text-base font-normal leading-4">
        Si cancelas, perderás todos los cambios no guardados en esta clase. ¿Seguro que deseas descartar los cambios?
      </p>
    </Modal>
    </>
  );
}
