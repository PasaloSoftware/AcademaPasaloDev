'use client';

import FloatingInput from '@/components/ui/FloatingInput';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import Icon from '@/components/ui/Icon';

// ============================================
// Disabled field (floating label style)
// ============================================

export function DisabledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="self-stretch relative inline-flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{value}</span>
        <Icon name="expand_more" size={20} className="text-gray-500" />
      </div>
      <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
        <span className="text-text-tertiary text-xs font-normal leading-4">{label}</span>
      </div>
    </div>
  );
}

// ============================================
// Date/Time row
// ============================================

export function DateTimeRow({
  startDate, startTime, endDate, endTime,
  onStartDateChange, onStartTimeChange, onEndDateChange, onEndTimeChange,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
}) {
  return (
    <div className="self-stretch inline-flex justify-center items-center gap-2">
      <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
        <DatePicker value={startDate} onChange={(v) => { onStartDateChange(v); if (v > endDate) onEndDateChange(v); }} />
        <TimePicker value={startTime} onChange={onStartTimeChange} />
      </div>
      <Icon name="arrow_forward" size={16} className="text-icon-secondary" />
      <div className="flex-1 inline-flex flex-row gap-4 justify-start items-start">
        <DatePicker value={endDate} onChange={onEndDateChange} min={startDate} />
        <TimePicker value={endTime} onChange={onEndTimeChange} />
      </div>
    </div>
  );
}

// ============================================
// Auto-generated title field
// ============================================

export function AutoTitleField({ title }: { title: string }) {
  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center">
        <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${title ? 'text-text-primary' : 'text-text-tertiary'}`}>
          {title || 'Título de la clase (Autogenerado)'}
        </span>
      </div>
      {title && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span className="text-text-tertiary text-xs font-normal leading-4">Título de la clase (Autogenerado)</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Professor tags field (disabled / read-only)
// ============================================

export function ProfessorField({ names }: { names: string[] }) {
  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <div className="flex-1 flex justify-start items-center gap-1">
          {names.length > 0 ? names.map((name, i) => (
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
  );
}

// ============================================
// Interactive professor field (create/edit mode)
// ============================================

export interface ProfessorOption {
  id: string;
  firstName: string;
  lastName1: string;
}

export function InteractiveProfessorField({
  allProfessors,
  selectedIds,
  currentUserId,
  onAdd,
  onRemove,
}: {
  allProfessors: ProfessorOption[];
  selectedIds: string[];
  currentUserId: string;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const selected = allProfessors.filter((p) => selectedIds.includes(p.id));
  const canAdd = allProfessors.length > selected.length;
  const otherProfessor = allProfessors.find((p) => !selectedIds.includes(p.id));

  return (
    <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
        <div className="flex-1 flex justify-start items-center gap-2">
          {selected.length > 0 ? selected.map((prof) => {
            const isMe = prof.id === currentUserId;
            return (
              <div key={prof.id} className="px-2.5 py-1.5 bg-bg-info-primary-light rounded-full flex justify-center items-center gap-1">
                {isMe && <Icon name="person" size={14} className="text-icon-info-primary" variant="rounded" />}
                <span className="text-text-info-primary text-xs font-medium leading-3">
                  {prof.firstName} {prof.lastName1}
                </span>
                {!isMe && (
                  <button type="button" onClick={() => onRemove(prof.id)} className="flex items-center">
                    <Icon name="close" size={14} className="text-icon-info-primary" />
                  </button>
                )}
              </div>
            );
          }) : (
            <span className="text-text-tertiary text-base font-normal leading-4">Sin asignar</span>
          )}
        </div>
        {canAdd && otherProfessor && (
          <button type="button" onClick={() => onAdd(otherProfessor.id)} className="flex items-center">
            <Icon name="person_add_alt" size={16} className="text-icon-tertiary" />
          </button>
        )}
      </div>
      <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
        <span className="text-text-tertiary text-xs font-normal leading-4">Asesor asignado</span>
      </div>
    </div>
  );
}

// ============================================
// Professor conflict alert
// ============================================

export function ProfessorConflictAlert() {
  return (
    <div className="self-stretch flex-1 px-2 py-3 bg-red-50 rounded-lg outline outline-2 outline-offset-[-2px] outline-red-200 flex justify-start items-center gap-2">
      <div className="px-2 py-1 rounded-full flex justify-start items-center">
        <Icon name="report" size={24} className="text-bg-error-solid" variant="rounded" />
      </div>
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
        <span className="self-stretch text-text-primary text-sm font-normal leading-4">Conflicto con la disponibilidad del asesor asignado</span>
        <span className="self-stretch text-text-tertiary text-xs font-normal leading-4">El asesor asignado ya tiene una clase programada en este horario. No se puede registrar la clase. Ajusta la fecha y hora o asigna un nuevo asesor.</span>
      </div>
    </div>
  );
}

// ============================================
// Complete form fields layout
// ============================================

export interface ClassFormFieldsProps {
  courseName: string;
  evaluationName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  autoTitle: string;
  topic: string;
  onTopicChange: (v: string) => void;
  meetingUrl: string;
  onMeetingUrlChange: (v: string) => void;
  professorNames: string[];
  /** Extra content after dates (e.g. overlap alerts) */
  afterDates?: React.ReactNode;
  /** Extra content after title (e.g. schedule alerts) */
  afterTitle?: React.ReactNode;
  /** Custom evaluation field (e.g. dropdown for calendar mode) */
  evaluationField?: React.ReactNode;
  /** Custom course field (e.g. dropdown for multi-course teachers) */
  courseField?: React.ReactNode;
  /** Custom professor field (e.g. interactive for create mode) */
  professorField?: React.ReactNode;
  /** Extra content after professor field (e.g. conflict alerts) */
  afterProfessor?: React.ReactNode;
  /** Unique prefix for input IDs */
  idPrefix?: string;
}

export default function ClassFormFields({
  courseName,
  evaluationName,
  startDate, startTime, endDate, endTime,
  onStartDateChange, onStartTimeChange, onEndDateChange, onEndTimeChange,
  autoTitle,
  topic, onTopicChange,
  meetingUrl, onMeetingUrlChange,
  professorNames,
  afterDates,
  afterTitle,
  evaluationField,
  courseField,
  professorField,
  afterProfessor,
  idPrefix = 'class',
}: ClassFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      {courseField || <DisabledField label="Curso" value={courseName} />}

      {evaluationField || <DisabledField label="Evaluación asociada" value={evaluationName} />}

      <DateTimeRow
        startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime}
        onStartDateChange={onStartDateChange} onStartTimeChange={onStartTimeChange}
        onEndDateChange={onEndDateChange} onEndTimeChange={onEndTimeChange}
      />

      {afterDates}

      <AutoTitleField title={autoTitle} />

      {afterTitle}

      <FloatingInput id={`${idPrefix}-topic`} label="Tema" value={topic} onChange={onTopicChange} />
      <FloatingInput id={`${idPrefix}-url`} label="Enlace de la sesión" value={meetingUrl} onChange={onMeetingUrlChange} />

      {professorField || <ProfessorField names={professorNames} />}

      {afterProfessor}
    </div>
  );
}
