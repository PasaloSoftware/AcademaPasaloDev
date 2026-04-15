'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { classEventService } from '@/services/classEvent.service';
import { evaluationsService } from '@/services/evaluations.service';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassEvent } from '@/types/classEvent';
import type { Evaluation } from '@/types/api';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContainer';
import ClassFormFields, { InteractiveProfessorField, ProfessorConflictAlert } from './ClassFormFields';
import type { ProfessorOption } from './ClassFormFields';

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

/** Check if two time ranges overlap */
function timeRangesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = new Date(s1).getTime();
  const end1 = new Date(e1).getTime();
  const start2 = new Date(s2).getTime();
  const end2 = new Date(e2).getTime();
  return start1 < end2 && start2 < end1;
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
// Course option for dropdown
// ============================================

export interface CourseOption {
  id: string; // courseCycleId
  name: string;
  professors: ProfessorOption[];
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
  /** Professor objects from the course (for interactive field) */
  courseProfessors?: ProfessorOption[];
  /** @deprecated Use courseProfessors instead */
  professorNames?: string[];
  /** If true, allows changing evaluation (calendar mode) */
  allowEvalSelection?: boolean;
  /** Available courses for multi-course teachers (calendar mode) */
  courseOptions?: CourseOption[];
}

export default function CreateClassModal({
  isOpen,
  onClose,
  onCreated,
  duplicateFrom,
  courseName,
  courseCycleId: initialCourseCycleId,
  evaluationId: lockedEvalId,
  evaluationName: lockedEvalName,
  courseProfessors: initialProfessors = [],
  professorNames = [],
  allowEvalSelection = false,
  courseOptions,
}: CreateClassModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();

  // ---- Course selection state (multi-course teachers) ----
  const [selectedCourseCycleId, setSelectedCourseCycleId] = useState(initialCourseCycleId);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const courseTriggerRef = useRef<HTMLDivElement | null>(null);
  const courseDropdownRef = useRef<HTMLDivElement | null>(null);

  const hasMultipleCourses = courseOptions && courseOptions.length > 1;
  const effectiveCourseCycleId = hasMultipleCourses ? selectedCourseCycleId : initialCourseCycleId;
  const effectiveCourseName = hasMultipleCourses
    ? (courseOptions.find((c) => c.id === selectedCourseCycleId)?.name || '')
    : courseName;

  // Get professors for the effective course
  const courseProfessors = useMemo(() => {
    if (hasMultipleCourses) {
      return courseOptions.find((c) => c.id === selectedCourseCycleId)?.professors || [];
    }
    return initialProfessors;
  }, [hasMultipleCourses, courseOptions, selectedCourseCycleId, initialProfessors]);

  // ---- Professor selection state ----
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>(() => {
    if (user?.id && initialProfessors.some((p) => p.id === user.id)) return [user.id];
    if (initialProfessors.length > 0) return [initialProfessors[0].id];
    return [];
  });

  // Reset professor selection when course changes
  useEffect(() => {
    if (user?.id && courseProfessors.some((p) => p.id === user.id)) {
      setSelectedProfIds([user.id]);
    } else if (courseProfessors.length > 0) {
      setSelectedProfIds([courseProfessors[0].id]);
    } else {
      setSelectedProfIds([]);
    }
  }, [courseProfessors, user?.id]);

  // Pre-select from duplicate
  useEffect(() => {
    if (duplicateFrom && initialCourseCycleId) {
      setSelectedCourseCycleId(initialCourseCycleId);
    }
  }, [duplicateFrom, initialCourseCycleId]);

  // ---- Evaluation selection state ----
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState(lockedEvalId || '');
  const [evalDropdownOpen, setEvalDropdownOpen] = useState(false);
  const evalTriggerRef = useRef<HTMLDivElement | null>(null);
  const evalDropdownRef = useRef<HTMLDivElement | null>(null);

  const effectiveEvalId = lockedEvalId || selectedEvalId;
  const effectiveEvalName = lockedEvalId
    ? (lockedEvalName || '')
    : (evaluations.find((e) => e.id === selectedEvalId) ? getEvalLabel(evaluations.find((e) => e.id === selectedEvalId)!) : '');

  // Load evaluations for calendar mode
  useEffect(() => {
    if (!allowEvalSelection || !effectiveCourseCycleId || !isOpen) return;
    evaluationsService.findByCourseCycle(effectiveCourseCycleId).then(setEvaluations).catch(() => setEvaluations([]));
  }, [allowEvalSelection, effectiveCourseCycleId, isOpen]);

  // Reset eval when course changes in multi-course mode
  useEffect(() => {
    if (hasMultipleCourses && !duplicateFrom) {
      setSelectedEvalId('');
    }
  }, [selectedCourseCycleId, hasMultipleCourses, duplicateFrom]);

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

  // ---- Professor schedule (for conflict detection) ----
  const [profSchedule, setProfSchedule] = useState<ClassEvent[]>([]);

  useEffect(() => {
    if (!isOpen || !startDate) { setProfSchedule([]); return; }
    classEventService.getMySchedule({ start: startDate, end: endDate || startDate })
      .then((evts) => setProfSchedule(evts.filter((e) => !e.isCancelled)))
      .catch(() => setProfSchedule([]));
  }, [isOpen, startDate, endDate]);

  // ---- Overlap & conflict detection ----
  const { sameCourseOverlap, diffCourseOverlap, professorConflict } = useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) {
      return { sameCourseOverlap: false, diffCourseOverlap: false, professorConflict: false };
    }
    const newStart = `${startDate}T${startTime}:00`;
    const newEnd = `${endDate}T${endTime}:00`;

    // Same course overlap: check existingEvents (same evaluation, same course)
    const sameOverlap = existingEvents.some((evt) =>
      timeRangesOverlap(newStart, newEnd, evt.startDatetime, evt.endDatetime)
    );

    // Different course overlap: check profSchedule for events from OTHER courses
    const diffOverlap = profSchedule.some((evt) =>
      evt.courseCycleId !== effectiveCourseCycleId &&
      timeRangesOverlap(newStart, newEnd, evt.startDatetime, evt.endDatetime)
    );

    // Professor conflict: any overlap from profSchedule (for the professor alert below the professor field)
    const profConflict = profSchedule.some((evt) =>
      timeRangesOverlap(newStart, newEnd, evt.startDatetime, evt.endDatetime)
    );

    return { sameCourseOverlap: sameOverlap, diffCourseOverlap: diffOverlap, professorConflict: profConflict };
  }, [startDate, startTime, endDate, endTime, existingEvents, profSchedule, effectiveCourseCycleId]);

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

  const canSubmit =
    topic.trim().length > 0 &&
    meetingUrl.trim().length > 0 &&
    startDate && startTime && endDate && endTime &&
    effectiveEvalId &&
    alert?.type !== 'error' &&
    !sameCourseOverlap &&
    !diffCourseOverlap &&
    !professorConflict &&
    selectedProfIds.length > 0;

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
      const created = await classEventService.createEvent({
        evaluationId: effectiveEvalId,
        sessionNumber,
        title: autoTitle,
        topic: topic.trim(),
        startDatetime: startDt,
        endDatetime: endDt,
        liveMeetingUrl: meetingUrl.trim(),
      });

      // Assign additional professor if selected (the creator is auto-assigned)
      const otherProfId = selectedProfIds.find((id) => id !== user?.id);
      if (otherProfId) {
        try {
          await classEventService.assignProfessor(created.id, otherProfId);
        } catch {
          // Non-blocking: if assignment fails, event is still created
        }
      }

      onCreated();
      onClose();
      showToast({ type: 'success', title: 'Evento guardado con éxito', description: 'La clase ha sido guardada correctamente.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error al crear clase', description: err instanceof Error ? err.message : 'No se pudo crear la clase.' });
    } finally {
      setSaving(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    if (!evalDropdownOpen && !courseDropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (evalDropdownOpen) {
        const trigger = evalTriggerRef.current;
        const dropdown = evalDropdownRef.current;
        if (trigger && !trigger.contains(e.target as Node) && dropdown && !dropdown.contains(e.target as Node)) {
          setEvalDropdownOpen(false);
        }
      }
      if (courseDropdownOpen) {
        const trigger = courseTriggerRef.current;
        const dropdown = courseDropdownRef.current;
        if (trigger && !trigger.contains(e.target as Node) && dropdown && !dropdown.contains(e.target as Node)) {
          setCourseDropdownOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [evalDropdownOpen, courseDropdownOpen]);

  // ---- Render helpers ----

  const renderErrorAlert = (title: string, detail: string) => (
    <div className="self-stretch flex-1 px-2 py-3 bg-red-50 rounded-lg outline outline-2 outline-offset-[-2px] outline-red-200 flex justify-start items-center gap-2">
      <div className="px-2 py-1 rounded-full flex justify-start items-center">
        <Icon name="report" size={24} className="text-bg-error-solid" variant="rounded" />
      </div>
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
        <span className="self-stretch text-text-primary text-sm font-normal leading-4">{title}</span>
        <span className="self-stretch text-text-tertiary text-xs font-normal leading-4">{detail}</span>
      </div>
    </div>
  );

  const renderAfterDates = () => {
    const alerts: React.ReactNode[] = [];

    // Overlap alerts (below dates)
    if (sameCourseOverlap) {
      alerts.push(renderErrorAlert(
        'Superposición de clases',
        'La nueva clase se superpone con una clase ya registrada para este curso. No se puede registrar. Ajusta la fecha y vuelve a intentarlo.',
      ));
    }
    if (diffCourseOverlap) {
      alerts.push(renderErrorAlert(
        'Superposición de clases de cursos diferentes a cargo',
        'La nueva clase se superpone con una clase ya registrada en este horario. No se puede registrar. Ajusta la fecha y vuelve a intentarlo.',
      ));
    }

    return alerts.length > 0 ? <>{alerts}</> : null;
  };

  const renderAlert = () => {
    if (!alert) return null;
    const isError = alert.type === 'error';
    return (
      <div className={`self-stretch flex-1 px-2 py-3 ${isError ? 'bg-red-50' : 'bg-yellow-50'} rounded-lg outline outline-2 outline-offset-[-2px] ${isError ? 'outline-red-200' : 'outline-orange-200'} flex justify-start items-center gap-2`}>
        <div className="px-2 py-1 rounded-full flex justify-start items-center">
          <Icon name={isError ? 'report' : 'warning'} size={24} className={isError ? 'text-bg-error-solid' : 'text-orange-600'} variant="rounded" />
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
          <span className="self-stretch text-text-primary text-sm font-normal leading-4">{alert.title}</span>
          <span className="self-stretch text-text-tertiary text-xs font-normal leading-4">{alert.detail}</span>
        </div>
      </div>
    );
  };

  const renderCourseDropdown = () => {
    if (!hasMultipleCourses) return undefined;
    return (
      <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
        <div
          ref={(el) => { courseTriggerRef.current = el; }}
          onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
          className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${courseDropdownOpen ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'} inline-flex justify-start items-center gap-2 cursor-pointer`}
        >
          <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${effectiveCourseName ? 'text-text-primary' : 'text-text-tertiary'}`}>
            {effectiveCourseName || (courseDropdownOpen ? '\u00A0' : 'Curso')}
          </span>
          <Icon name="expand_more" size={20} className={courseDropdownOpen ? 'text-icon-accent-primary' : 'text-icon-tertiary'} />
        </div>
        {(effectiveCourseName || courseDropdownOpen) && (
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
            <span className={`text-xs font-normal leading-4 ${courseDropdownOpen ? 'text-text-accent-primary' : 'text-text-tertiary'}`}>Curso</span>
          </div>
        )}
        {courseDropdownOpen && createPortal(
          <div
            ref={(el) => { courseDropdownRef.current = el; }}
            style={{
              position: 'fixed',
              top: courseTriggerRef.current ? courseTriggerRef.current.getBoundingClientRect().bottom + 4 : 0,
              left: courseTriggerRef.current ? courseTriggerRef.current.getBoundingClientRect().left : 0,
              width: courseTriggerRef.current ? courseTriggerRef.current.getBoundingClientRect().width : 'auto',
              zIndex: 9999,
            }}
            className="p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col"
          >
            {courseOptions!.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => { setSelectedCourseCycleId(course.id); setCourseDropdownOpen(false); }}
                className="self-stretch px-2 py-3 rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
              >
                <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">{course.name}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
    );
  };

  // Use interactive professor field if we have professor objects, otherwise fall back to names
  const hasProfessorObjects = courseProfessors.length > 0;

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
        <ClassFormFields
          courseName={effectiveCourseName}
          evaluationName={effectiveEvalName}
          startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime}
          onStartDateChange={setStartDate} onStartTimeChange={setStartTime}
          onEndDateChange={setEndDate} onEndTimeChange={setEndTime}
          autoTitle={autoTitle}
          topic={topic} onTopicChange={setTopic}
          meetingUrl={meetingUrl} onMeetingUrlChange={setMeetingUrl}
          professorNames={professorNames}
          idPrefix="create-class"
          afterDates={renderAfterDates()}
          afterTitle={renderAlert()}
          courseField={renderCourseDropdown()}
          evaluationField={allowEvalSelection && !lockedEvalId ? (
            <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
              <div
                ref={(el) => { evalTriggerRef.current = el; }}
                onClick={() => setEvalDropdownOpen(!evalDropdownOpen)}
                className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${evalDropdownOpen ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'} inline-flex justify-start items-center gap-2 cursor-pointer`}
              >
                <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${effectiveEvalName ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {effectiveEvalName || (evalDropdownOpen ? '\u00A0' : 'Evaluación asociada')}
                </span>
                <Icon name="expand_more" size={20} className={evalDropdownOpen ? 'text-icon-accent-primary' : 'text-icon-tertiary'} />
              </div>
              {(effectiveEvalName || evalDropdownOpen) && (
                <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
                  <span className={`text-xs font-normal leading-4 ${evalDropdownOpen ? 'text-text-accent-primary' : 'text-text-tertiary'}`}>Evaluación asociada</span>
                </div>
              )}
              {evalDropdownOpen && createPortal(
                <div
                  ref={(el) => { evalDropdownRef.current = el; }}
                  style={{
                    position: 'fixed',
                    top: evalTriggerRef.current ? evalTriggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                    left: evalTriggerRef.current ? evalTriggerRef.current.getBoundingClientRect().left : 0,
                    width: evalTriggerRef.current ? evalTriggerRef.current.getBoundingClientRect().width : 'auto',
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
          ) : undefined}
          professorField={hasProfessorObjects ? (
            <InteractiveProfessorField
              allProfessors={courseProfessors}
              selectedIds={selectedProfIds}
              currentUserId={user?.id || ''}
              onAdd={(id) => setSelectedProfIds((prev) => [...prev, id])}
              onRemove={(id) => setSelectedProfIds((prev) => prev.filter((p) => p !== id))}
            />
          ) : undefined}
          afterProfessor={professorConflict ? <ProfessorConflictAlert /> : undefined}
        />
    </Modal>

    {/* Discard confirmation */}
    <Modal
      isOpen={showDiscard}
      onClose={() => setShowDiscard(false)}
      title="¿Descartar los cambios no guardados?"
      size="md"
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
